"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

import type { BusinessUnitFormState } from "./form-state";
import { requireAdmin } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { businessUnit } from "@/lib/db/schema";
import { writeAuditLog } from "@/lib/modules/audit/log";
import { toSnakeCase } from "@/lib/modules/name-generator/slugify";
import { newId } from "@/lib/utils/id";

/** Revalida as telas que dependem da lista de BUs. */
function revalidateBusinessUnitViews() {
  revalidatePath("/admin/business-units");
  revalidatePath("/gerador-de-nomes");
  // A página de referência na documentação lê a tabela ao vivo. Revalidamos a
  // seção inteira porque o endereço dela depende do slug, que muda junto com o
  // título — apontar para um caminho fixo aqui deixaria de acertar a página.
  revalidatePath("/documentacao", "layout");
  revalidatePath("/planejamento", "layout");
}

/** Cadastra uma nova Business Unit. */
export async function createBusinessUnit(
  _previousState: BusinessUnitFormState,
  formData: FormData,
): Promise<BusinessUnitFormState> {
  const admin = await requireAdmin();

  const label = String(formData.get("label") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const slugInput = String(formData.get("slug") ?? "").trim();

  if (!label) {
    return { status: "error", message: "Informe o nome da Business Unit." };
  }

  // O slug pode ser digitado manualmente; se vier vazio, derivamos do nome.
  const slug = toSnakeCase(slugInput || label);
  if (!slug) {
    return {
      status: "error",
      message: "O nome precisa ter ao menos uma letra ou número.",
    };
  }

  const db = await getDb();

  const duplicate = await db
    .select({ id: businessUnit.id, label: businessUnit.label })
    .from(businessUnit)
    .where(eq(businessUnit.slug, slug))
    .get();

  if (duplicate) {
    return {
      status: "error",
      message: `Já existe uma BU com o slug "${slug}" (${duplicate.label}).`,
    };
  }

  const id = newId("bu");
  const now = new Date();

  await db.insert(businessUnit).values({
    id,
    slug,
    label,
    description: description || null,
    isActive: true,
    sortOrder: 1000,
    createdAt: now,
    updatedAt: now,
  });

  await writeAuditLog({
    actorUserId: admin.id,
    actorEmail: admin.email,
    action: "business_unit.create",
    entityType: "business_unit",
    entityId: id,
    summary: `Cadastrou a Business Unit "${label}" (${slug})`,
    afterData: { slug, label, description: description || null, isActive: true },
  });

  revalidateBusinessUnitViews();
  return {
    status: "success",
    message: `Business Unit "${label}" cadastrada com o slug ${slug}.`,
  };
}

/**
 * Edita nome/descrição de uma BU. O slug NÃO é editável: ele já foi usado em
 * nomes de listas registrados no histórico e no CRM, e mudá-lo quebraria essa
 * correspondência.
 */
export async function updateBusinessUnit(formData: FormData): Promise<void> {
  const admin = await requireAdmin();

  const id = String(formData.get("businessUnitId") ?? "");
  const label = String(formData.get("label") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  // Vazio = ninguém responde pela BU; nesse caso só administradores editam o
  // planejamento dela.
  const strategyOwnerId = String(formData.get("strategyOwnerId") ?? "").trim() || null;
  if (!id || !label) return;

  const db = await getDb();
  const before = await db
    .select()
    .from(businessUnit)
    .where(eq(businessUnit.id, id))
    .get();

  if (!before) return;

  await db
    .update(businessUnit)
    .set({
      label,
      description: description || null,
      strategyOwnerId,
      updatedAt: new Date(),
    })
    .where(eq(businessUnit.id, id));

  await writeAuditLog({
    actorUserId: admin.id,
    actorEmail: admin.email,
    action: "business_unit.update",
    entityType: "business_unit",
    entityId: id,
    summary: `Editou a Business Unit "${before.label}"`,
    beforeData: {
      label: before.label,
      description: before.description,
      strategyOwnerId: before.strategyOwnerId,
    },
    afterData: { label, description: description || null, strategyOwnerId },
  });

  revalidateBusinessUnitViews();
}

/**
 * Ativa ou desativa uma BU.
 *
 * Não existe exclusão de verdade: o histórico de nomes gerados aponta para a BU,
 * e apagá-la deixaria esse histórico órfão. Desativar remove a BU do dropdown
 * do gerador, mas preserva o passado.
 */
export async function toggleBusinessUnit(formData: FormData): Promise<void> {
  const admin = await requireAdmin();

  const id = String(formData.get("businessUnitId") ?? "");
  if (!id) return;

  const db = await getDb();
  const before = await db
    .select()
    .from(businessUnit)
    .where(eq(businessUnit.id, id))
    .get();

  if (!before) return;

  const nextIsActive = !before.isActive;

  await db
    .update(businessUnit)
    .set({ isActive: nextIsActive, updatedAt: new Date() })
    .where(eq(businessUnit.id, id));

  await writeAuditLog({
    actorUserId: admin.id,
    actorEmail: admin.email,
    action: nextIsActive
      ? "business_unit.reactivate"
      : "business_unit.deactivate",
    entityType: "business_unit",
    entityId: id,
    summary: nextIsActive
      ? `Reativou a Business Unit "${before.label}"`
      : `Desativou a Business Unit "${before.label}"`,
    beforeData: { isActive: before.isActive },
    afterData: { isActive: nextIsActive },
  });

  revalidateBusinessUnitViews();
}
