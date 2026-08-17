"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";

import { requireAdmin } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import {
  allowedDomain,
  businessUnit,
  documentationCategory,
  documentationPage,
  persona,
  personaPain,
  namingTemplate,
  rolePermission,
  user,
  type ModuleKey,
  type UserRole,
  type UserStatus,
} from "@/lib/db/schema";
import {
  buildSearchText,
  parseRichDoc,
} from "@/lib/modules/documentation/rich-text";
import { buildPersonaSearchText } from "@/lib/modules/personas/search-text";
import { newId } from "@/lib/utils/id";
import {
  getAuditLogEntry,
  markAuditLogUndone,
  writeAuditLog,
} from "@/lib/modules/audit/log";

export type UndoResult = { ok: boolean; message: string };

/**
 * Desfaz uma ação registrada na auditoria, restaurando o estado gravado em
 * `beforeData`.
 *
 * Só ações marcadas como reversíveis (destrutivas ou sensíveis) chegam aqui, e
 * cada uma só pode ser desfeita uma vez. O próprio desfazer também é registrado
 * na trilha — nada acontece fora do log.
 */
export async function undoAuditAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();

  const logId = String(formData.get("logId") ?? "");
  if (!logId) return;

  const entry = await getAuditLogEntry(logId);
  if (!entry || !entry.isUndoable || entry.undoneAt || !entry.beforeData) {
    return;
  }

  const before = entry.beforeData as Record<string, unknown>;
  const db = await getDb();
  let undone = false;

  switch (entry.action) {
    case "user.suspend":
    case "user.role_change": {
      const target = await db
        .select({ id: user.id })
        .from(user)
        .where(eq(user.id, entry.entityId))
        .get();

      if (target) {
        await db
          .update(user)
          .set({
            status: before.status as UserStatus,
            role: before.role as UserRole,
            updatedAt: new Date(),
          })
          .where(eq(user.id, entry.entityId));
        undone = true;
      }
      break;
    }

    case "allowed_domain.toggle": {
      const target = await db
        .select({ id: allowedDomain.id })
        .from(allowedDomain)
        .where(eq(allowedDomain.id, entry.entityId))
        .get();

      if (target) {
        await db
          .update(allowedDomain)
          .set({ isActive: Boolean(before.isActive) })
          .where(eq(allowedDomain.id, entry.entityId));
        undone = true;
      }
      break;
    }

    case "business_unit.update":
    case "business_unit.deactivate": {
      const target = await db
        .select({ id: businessUnit.id })
        .from(businessUnit)
        .where(eq(businessUnit.id, entry.entityId))
        .get();

      if (target) {
        const patch: Record<string, unknown> = { updatedAt: new Date() };
        if ("label" in before) patch.label = before.label;
        if ("description" in before) patch.description = before.description;
        if ("isActive" in before) patch.isActive = Boolean(before.isActive);
        if ("strategyOwnerId" in before) {
          patch.strategyOwnerId = before.strategyOwnerId;
        }

        await db
          .update(businessUnit)
          .set(patch)
          .where(eq(businessUnit.id, entry.entityId));
        undone = true;
      }
      break;
    }

    case "persona.update": {
      const target = await db
        .select({ id: persona.id })
        .from(persona)
        .where(eq(persona.id, entry.entityId))
        .get();

      if (target) {
        // O `beforeData` de uma desativação só tem `isActive`; o de uma edição
        // traz os campos e a lista de dores. Restauramos o que estiver lá.
        const patch: Record<string, unknown> = { updatedAt: new Date() };
        if ("isActive" in before) patch.isActive = Boolean(before.isActive);
        if ("name" in before) patch.name = before.name;
        if ("headline" in before) patch.headline = before.headline ?? null;
        if ("businessUnitId" in before) {
          patch.businessUnitId = before.businessUnitId;
        }

        await db.update(persona).set(patch).where(eq(persona.id, entry.entityId));

        if (Array.isArray(before.pains)) {
          await db
            .delete(personaPain)
            .where(eq(personaPain.personaId, entry.entityId));

          for (const [position, item] of (
            before.pains as { pain: string; solution: string | null }[]
          ).entries()) {
            await db.insert(personaPain).values({
              id: newId("pain"),
              personaId: entry.entityId,
              position,
              pain: item.pain,
              solution: item.solution ?? null,
            });
          }
        }

        // A busca guarda uma cópia normalizada dos campos; sem recalcular, ela
        // continuaria apontando para o estado que acabou de ser revertido.
        const restored = await db
          .select()
          .from(persona)
          .where(eq(persona.id, entry.entityId))
          .get();

        if (restored) {
          const pains = await db
            .select({ pain: personaPain.pain, solution: personaPain.solution })
            .from(personaPain)
            .where(eq(personaPain.personaId, entry.entityId));

          await db
            .update(persona)
            .set({ searchText: buildPersonaSearchText({ ...restored, pains }) })
            .where(eq(persona.id, entry.entityId));
        }

        undone = true;
      }
      break;
    }

    case "doc_category.update": {
      const target = await db
        .select({ id: documentationCategory.id })
        .from(documentationCategory)
        .where(eq(documentationCategory.id, entry.entityId))
        .get();

      if (target) {
        await db
          .update(documentationCategory)
          .set({
            name: String(before.name ?? ""),
            slug: String(before.slug ?? ""),
            description: (before.description as string | null) ?? null,
            pageTemplate: (before.pageTemplate as string | null) ?? null,
            updatedAt: new Date(),
          })
          .where(eq(documentationCategory.id, entry.entityId));
        undone = true;
      }
      break;
    }

    case "doc_page.update": {
      const target = await db
        .select({ id: documentationPage.id })
        .from(documentationPage)
        .where(eq(documentationPage.id, entry.entityId))
        .get();

      if (target) {
        const restored = restorePageBody(before);

        await db
          .update(documentationPage)
          .set({
            title: String(before.title ?? ""),
            slug: String(before.slug ?? ""),
            categoryId: String(before.categoryId ?? ""),
            summary: (before.summary as string | null) ?? null,
            content: restored.content,
            contentFormat: restored.contentFormat,
            searchText: buildSearchText({
              title: String(before.title ?? ""),
              summary: (before.summary as string | null) ?? null,
              content: restored.content,
              contentFormat: restored.contentFormat,
            }),
            visibility: before.visibility as never,
            updatedBy: admin.id,
            updatedAt: new Date(),
          })
          .where(eq(documentationPage.id, entry.entityId));
        undone = true;
      }
      break;
    }

    case "doc_page.delete": {
      // A página foi apagada de verdade: recriamos a linha inteira a partir do
      // snapshot, mantendo o id original para não quebrar links já salvos.
      const alreadyThere = await db
        .select({ id: documentationPage.id })
        .from(documentationPage)
        .where(eq(documentationPage.id, entry.entityId))
        .get();

      if (!alreadyThere) {
        const restored = restorePageBody(before);

        await db.insert(documentationPage).values({
          id: entry.entityId,
          categoryId: String(before.categoryId ?? ""),
          slug: String(before.slug ?? ""),
          title: String(before.title ?? ""),
          summary: (before.summary as string | null) ?? null,
          pageType: (before.pageType as never) ?? "standard",
          contentFormat: restored.contentFormat,
          content: restored.content,
          // Sem recalcular aqui, a página voltaria a existir mas continuaria
          // fora da busca.
          searchText: buildSearchText({
            title: String(before.title ?? ""),
            summary: (before.summary as string | null) ?? null,
            content: restored.content,
            contentFormat: restored.contentFormat,
          }),
          visibility: (before.visibility as never) ?? "all_active_users",
          sortOrder: Number(before.sortOrder ?? 100),
          createdBy: (before.createdBy as string | null) ?? null,
          updatedBy: admin.id,
          createdAt: parseDate(before.createdAt),
          updatedAt: new Date(),
        });
        undone = true;
      }
      break;
    }

    case "naming_template.toggle": {
      const target = await db
        .select({ id: namingTemplate.id })
        .from(namingTemplate)
        .where(eq(namingTemplate.id, entry.entityId))
        .get();

      if (target) {
        await db
          .update(namingTemplate)
          .set({ isActive: Boolean(before.isActive), updatedAt: new Date() })
          .where(eq(namingTemplate.id, entry.entityId));
        undone = true;
      }
      break;
    }

    case "naming_template.update": {
      // Edições de nome/descrição são restauráveis. Já as alterações de blocos
      // gravam apenas o bloco afetado, sem forma segura de recriar a sequência
      // inteira — nesses casos o log serve como registro, não como reversão.
      if (!("name" in before)) break;

      const target = await db
        .select({ id: namingTemplate.id })
        .from(namingTemplate)
        .where(eq(namingTemplate.id, entry.entityId))
        .get();

      if (target) {
        await db
          .update(namingTemplate)
          .set({
            name: String(before.name ?? ""),
            description: (before.description as string | null) ?? null,
            updatedBy: admin.id,
            updatedAt: new Date(),
          })
          .where(eq(namingTemplate.id, entry.entityId));
        undone = true;
      }
      break;
    }

    case "role_permission.update": {
      // `beforeData` guarda apenas as combinações que mudaram, no formato
      // "papel:modulo" -> { canView, canEdit }.
      for (const [key, value] of Object.entries(before)) {
        const [role, moduleKey] = key.split(":");
        if (!role || !moduleKey) continue;

        const permission = value as { canView: boolean; canEdit: boolean };

        await db
          .update(rolePermission)
          .set({
            canView: permission.canView,
            canEdit: permission.canEdit,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(rolePermission.role, role),
              eq(rolePermission.moduleKey, moduleKey as ModuleKey),
            ),
          );
      }
      undone = true;
      break;
    }

    default:
      // Ação sem rotina de reversão implementada: não fazemos nada, para não
      // corromper dados com um palpite.
      undone = false;
  }

  if (!undone) return;

  await markAuditLogUndone(entry.id, admin.id);

  await writeAuditLog({
    actorUserId: admin.id,
    actorEmail: admin.email,
    action: "audit.undo",
    entityType: "audit_log",
    entityId: entry.id,
    summary: `Desfez a ação: ${entry.summary}`,
    afterData: { undoneAction: entry.action, restoredTo: before },
  });

  // O desfazer pode ter mexido em qualquer módulo; revalidamos tudo.
  revalidatePath("/", "layout");
}

/**
 * Descobre o corpo e o formato a restaurar a partir do snapshot.
 *
 * O formato é deduzido do próprio conteúdo, e não de um campo do snapshot: um
 * corpo que se lê como documento estruturado É estruturado, o resto é Markdown.
 * Assim, entradas antigas — gravadas antes de o editor visual existir — também
 * são restauradas com o formato correto.
 *
 * Restaurar o conteúdo sem restaurar o formato foi um erro real: a página ficava
 * marcada como estruturada com Markdown dentro, e a tela de edição abria vazia.
 */
function restorePageBody(before: Record<string, unknown>): {
  content: string | null;
  contentFormat: string;
} {
  const content = (before.content as string | null) ?? null;
  return {
    content,
    contentFormat: parseRichDoc(content) ? "rich_text" : "markdown",
  };
}

/** Converte um valor de data vindo do JSON do snapshot. */
function parseDate(value: unknown): Date {
  if (typeof value === "number") return new Date(value * 1000);
  if (typeof value === "string") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return new Date();
}
