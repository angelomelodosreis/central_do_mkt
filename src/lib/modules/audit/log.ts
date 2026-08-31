import { desc, eq, like, or } from "drizzle-orm";

import { getDb } from "@/lib/db/client";
import {
  auditLog,
  type AuditAction,
  type AuditEntityType,
} from "@/lib/db/schema";
import { newId } from "@/lib/utils/id";

/**
 * Ações consideradas destrutivas ou sensíveis. São as únicas que ganham botão
 * de desfazer — para isso, precisam gravar `beforeData`.
 */
const UNDOABLE_ACTIONS = new Set<AuditAction>([
  "user.suspend",
  "user.role_change",
  "allowed_domain.toggle",
  "role_permission.update",
  "business_unit.update",
  "business_unit.deactivate",
  "doc_category.update",
  "doc_category.delete",
  "doc_page.update",
  "doc_page.delete",
  "naming_template.update",
  "naming_template.toggle",
  "naming_template.delete",
  "persona.update",
]);

export type WriteAuditLogInput = {
  actorUserId: string | null;
  actorEmail: string | null;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  /** Frase curta em português exibida na tela de auditoria. */
  summary: string;
  beforeData?: unknown;
  afterData?: unknown;
};

/**
 * Grava uma entrada na trilha de auditoria.
 *
 * Nunca lança exceção: uma falha ao registrar o log não deve desfazer a ação do
 * usuário que já aconteceu. O erro é apenas reportado no console do servidor.
 */
export async function writeAuditLog(input: WriteAuditLogInput): Promise<void> {
  try {
    const db = await getDb();
    const isUndoable =
      UNDOABLE_ACTIONS.has(input.action) && input.beforeData !== undefined;

    await db.insert(auditLog).values({
      id: newId("log"),
      actorUserId: input.actorUserId,
      actorEmail: input.actorEmail,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      summary: input.summary,
      beforeData: input.beforeData ?? null,
      afterData: input.afterData ?? null,
      isUndoable,
      createdAt: new Date(),
    });
  } catch (error) {
    console.error("[auditoria] falha ao registrar ação", input.action, error);
  }
}

export type AuditLogEntry = typeof auditLog.$inferSelect;

export type ListAuditLogOptions = {
  limit?: number;
  offset?: number;
  /** Busca livre por resumo, ação ou e-mail de quem executou. */
  search?: string;
};

export async function listAuditLog(
  options: ListAuditLogOptions = {},
): Promise<AuditLogEntry[]> {
  const { limit = 100, offset = 0, search } = options;
  const db = await getDb();

  const term = search?.trim();
  const filter = term
    ? or(
        like(auditLog.summary, `%${term}%`),
        like(auditLog.action, `%${term}%`),
        like(auditLog.actorEmail, `%${term}%`),
      )
    : undefined;

  return db
    .select()
    .from(auditLog)
    .where(filter)
    .orderBy(desc(auditLog.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function getAuditLogEntry(
  id: string,
): Promise<AuditLogEntry | undefined> {
  const db = await getDb();
  return db.select().from(auditLog).where(eq(auditLog.id, id)).get();
}

/** Marca uma entrada como desfeita, para o botão não aparecer duas vezes. */
export async function markAuditLogUndone(
  id: string,
  undoneBy: string,
): Promise<void> {
  const db = await getDb();
  await db
    .update(auditLog)
    .set({ undoneAt: new Date(), undoneBy })
    .where(eq(auditLog.id, id));
}
