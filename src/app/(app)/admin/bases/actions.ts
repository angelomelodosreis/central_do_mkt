"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

import type { BaseFormState } from "./form-state";
import { requireAdmin } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import {
  businessDivision,
  businessUnit,
  product,
  squad,
} from "@/lib/db/schema";
import { writeAuditLog } from "@/lib/modules/audit/log";
import { toSnakeCase } from "@/lib/modules/name-generator/slugify";
import { newId } from "@/lib/utils/id";

function field(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

/**
 * Revalida quem consome as bases oficiais.
 *
 * São muitos lugares porque essa é justamente a intenção do desenho: uma base
 * só, lida pelo Gerador de Nomes, pela Documentação, pelo Planejamento e pela
 * administração. Cadastrar aqui aparece nos quatro sem cópia nenhuma.
 */
function revalidateBases() {
  revalidatePath("/admin", "layout");
  revalidatePath("/gerador-de-nomes", "layout");
  revalidatePath("/documentacao", "layout");
  revalidatePath("/planejamento", "layout");
}

// ---------------------------------------------------------------------------
// Divisões de negócio
// ---------------------------------------------------------------------------

export async function createDivision(
  _previousState: BaseFormState,
  formData: FormData,
): Promise<BaseFormState> {
  const admin = await requireAdmin();

  const name = field(formData, "name");
  const description = field(formData, "description");
  if (!name) return { status: "error", message: "Informe o nome da divisão." };

  const slug = toSnakeCase(field(formData, "slug") || name);
  if (!slug) {
    return {
      status: "error",
      message: "O nome precisa ter ao menos uma letra ou número.",
    };
  }

  const db = await getDb();
  const duplicate = await db
    .select({ id: businessDivision.id })
    .from(businessDivision)
    .where(eq(businessDivision.slug, slug))
    .get();

  if (duplicate) {
    return {
      status: "error",
      message: `Já existe uma divisão com o identificador "${slug}".`,
    };
  }

  const id = newId("div");
  const now = new Date();

  await db.insert(businessDivision).values({
    id,
    slug,
    name,
    description: description || null,
    isActive: true,
    sortOrder: 1000,
    createdBy: admin.id,
    createdAt: now,
    updatedAt: now,
  });

  await writeAuditLog({
    actorUserId: admin.id,
    actorEmail: admin.email,
    action: "business_division.create",
    entityType: "business_division",
    entityId: id,
    summary: `Cadastrou a divisão "${name}"`,
    afterData: { slug, name },
  });

  revalidateBases();
  return { status: "success", message: `Divisão "${name}" cadastrada.` };
}

/** Edita nome e descrição. O identificador não muda: ele já circulou fora. */
export async function updateDivision(formData: FormData): Promise<void> {
  const admin = await requireAdmin();

  const id = field(formData, "divisionId");
  const name = field(formData, "name");
  if (!id || !name) return;

  const db = await getDb();
  const before = await db
    .select()
    .from(businessDivision)
    .where(eq(businessDivision.id, id))
    .get();
  if (!before) return;

  const description = field(formData, "description");

  await db
    .update(businessDivision)
    .set({ name, description: description || null, updatedAt: new Date() })
    .where(eq(businessDivision.id, id));

  await writeAuditLog({
    actorUserId: admin.id,
    actorEmail: admin.email,
    action: "business_division.update",
    entityType: "business_division",
    entityId: id,
    summary: `Editou a divisão "${before.name}"`,
    beforeData: { name: before.name, description: before.description },
    afterData: { name, description: description || null },
  });

  revalidateBases();
}

export async function toggleDivision(formData: FormData): Promise<void> {
  const admin = await requireAdmin();

  const id = field(formData, "divisionId");
  if (!id) return;

  const db = await getDb();
  const before = await db
    .select()
    .from(businessDivision)
    .where(eq(businessDivision.id, id))
    .get();
  if (!before) return;

  await db
    .update(businessDivision)
    .set({ isActive: !before.isActive, updatedAt: new Date() })
    .where(eq(businessDivision.id, id));

  await writeAuditLog({
    actorUserId: admin.id,
    actorEmail: admin.email,
    action: "business_division.toggle",
    entityType: "business_division",
    entityId: id,
    summary: before.isActive
      ? `Desativou a divisão "${before.name}"`
      : `Reativou a divisão "${before.name}"`,
    beforeData: { isActive: before.isActive },
    afterData: { isActive: !before.isActive },
  });

  revalidateBases();
}

// ---------------------------------------------------------------------------
// Business Units
// ---------------------------------------------------------------------------

/**
 * Cadastra uma BU — e o squad dela junto.
 *
 * O squad nasce com a BU porque uma BU sem squad é um beco: ninguém teria como
 * ser vinculado a ela, e portanto ninguém a enxergaria. Criar em dois passos
 * deixaria esse buraco aberto entre um passo e outro.
 */
export async function createBusinessUnit(
  _previousState: BaseFormState,
  formData: FormData,
): Promise<BaseFormState> {
  const admin = await requireAdmin();

  const label = field(formData, "label");
  const description = field(formData, "description");
  const slugInput = field(formData, "slug");
  const divisionId = field(formData, "divisionId") || null;

  if (!label) {
    return { status: "error", message: "Informe o nome da Business Unit." };
  }

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
      message: `Já existe uma BU com o identificador "${slug}" (${duplicate.label}).`,
    };
  }

  if (divisionId) {
    const divisao = await db
      .select({ id: businessDivision.id })
      .from(businessDivision)
      .where(eq(businessDivision.id, divisionId))
      .get();
    if (!divisao) {
      return { status: "error", message: "Essa divisão não existe mais." };
    }
  }

  const id = newId("bu");
  const now = new Date();

  await db.insert(businessUnit).values({
    id,
    slug,
    label,
    description: description || null,
    divisionId,
    isActive: true,
    sortOrder: 1000,
    createdAt: now,
    updatedAt: now,
  });

  await db.insert(squad).values({
    id: newId("sqd"),
    businessUnitId: id,
    slug,
    name: `Squad ${label}`,
    isActive: true,
    createdBy: admin.id,
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
    afterData: { slug, label, divisionId, isActive: true },
  });

  revalidateBases();
  return {
    status: "success",
    message: `Business Unit "${label}" cadastrada com o identificador ${slug}.`,
  };
}

/**
 * Edita nome, descrição e divisão de uma BU.
 *
 * O identificador NÃO é editável: ele já foi usado em nomes de listas
 * registrados no histórico e no CRM, e mudá-lo quebraria essa correspondência.
 */
export async function updateBusinessUnit(formData: FormData): Promise<void> {
  const admin = await requireAdmin();

  const id = field(formData, "businessUnitId");
  const label = field(formData, "label");
  if (!id || !label) return;

  const db = await getDb();
  const before = await db
    .select()
    .from(businessUnit)
    .where(eq(businessUnit.id, id))
    .get();
  if (!before) return;

  const description = field(formData, "description");
  const divisionId = formData.has("divisionId")
    ? field(formData, "divisionId") || null
    : before.divisionId;

  await db
    .update(businessUnit)
    .set({
      label,
      description: description || null,
      divisionId,
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
      divisionId: before.divisionId,
    },
    afterData: { label, description: description || null, divisionId },
  });

  revalidateBases();
}

/**
 * Ativa ou desativa uma BU.
 *
 * Não existe exclusão: o histórico de nomes gerados aponta para a BU, e
 * apagá-la deixaria esse histórico órfão. Desativar tira a BU do gerador, mas
 * preserva o passado.
 */
export async function toggleBusinessUnit(formData: FormData): Promise<void> {
  const admin = await requireAdmin();

  const id = field(formData, "businessUnitId");
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

  revalidateBases();
}

// ---------------------------------------------------------------------------
// Produtos
// ---------------------------------------------------------------------------

export async function createProduct(
  _previousState: BaseFormState,
  formData: FormData,
): Promise<BaseFormState> {
  const admin = await requireAdmin();

  const name = field(formData, "name");
  if (!name) return { status: "error", message: "Informe o nome do produto." };

  const slug = toSnakeCase(field(formData, "slug") || name);
  if (!slug) {
    return {
      status: "error",
      message: "O nome precisa ter ao menos uma letra ou número.",
    };
  }

  const db = await getDb();
  const duplicate = await db
    .select({ id: product.id, name: product.name })
    .from(product)
    .where(eq(product.slug, slug))
    .get();

  if (duplicate) {
    return {
      status: "error",
      message: `Já existe um produto com o identificador "${slug}" (${duplicate.name}).`,
    };
  }

  const businessUnitId = field(formData, "businessUnitId") || null;
  const id = newId("prd");
  const now = new Date();

  await db.insert(product).values({
    id,
    slug,
    name,
    description: field(formData, "description") || null,
    businessUnitId,
    isActive: true,
    sortOrder: 1000,
    createdBy: admin.id,
    createdAt: now,
    updatedAt: now,
  });

  await writeAuditLog({
    actorUserId: admin.id,
    actorEmail: admin.email,
    action: "product.create",
    entityType: "product",
    entityId: id,
    summary: `Cadastrou o produto "${name}" (${slug})`,
    afterData: { slug, name, businessUnitId },
  });

  revalidateBases();
  return { status: "success", message: `Produto "${name}" cadastrado.` };
}

/** Edita nome e descrição. O identificador não muda: ele já circulou fora. */
export async function updateProduct(formData: FormData): Promise<void> {
  const admin = await requireAdmin();

  const id = field(formData, "productId");
  const name = field(formData, "name");
  if (!id || !name) return;

  const db = await getDb();
  const before = await db
    .select()
    .from(product)
    .where(eq(product.id, id))
    .get();
  if (!before) return;

  const description = field(formData, "description");

  await db
    .update(product)
    .set({ name, description: description || null, updatedAt: new Date() })
    .where(eq(product.id, id));

  await writeAuditLog({
    actorUserId: admin.id,
    actorEmail: admin.email,
    action: "product.update",
    entityType: "product",
    entityId: id,
    summary: `Editou o produto "${before.name}"`,
    beforeData: { name: before.name, description: before.description },
    afterData: { name, description: description || null },
  });

  revalidateBases();
}

/**
 * Liga um produto a uma BU.
 *
 * É a ação que preenche o mapeamento que ainda falta. Fica separada da edição
 * de nome porque é a que vai ser repetida dezenas de vezes seguidas: obrigar a
 * abrir um formulário inteiro para cada produto transformaria isso em tarde de
 * trabalho.
 */
export async function setProductBusinessUnit(
  formData: FormData,
): Promise<void> {
  const admin = await requireAdmin();

  const id = field(formData, "productId");
  if (!id) return;

  const businessUnitId = field(formData, "businessUnitId") || null;

  const db = await getDb();
  const before = await db
    .select()
    .from(product)
    .where(eq(product.id, id))
    .get();
  if (!before) return;
  if (before.businessUnitId === businessUnitId) return;

  let rotulo = "nenhuma BU";
  if (businessUnitId) {
    const unidade = await db
      .select({ id: businessUnit.id, label: businessUnit.label })
      .from(businessUnit)
      .where(eq(businessUnit.id, businessUnitId))
      .get();
    if (!unidade) return;
    rotulo = unidade.label;
  }

  await db
    .update(product)
    .set({ businessUnitId, updatedAt: new Date() })
    .where(eq(product.id, id));

  await writeAuditLog({
    actorUserId: admin.id,
    actorEmail: admin.email,
    action: "product.assign_business_unit",
    entityType: "product",
    entityId: id,
    summary: `"${before.name}" passou a pertencer a ${rotulo}`,
    beforeData: { businessUnitId: before.businessUnitId },
    afterData: { businessUnitId },
  });

  revalidateBases();
}

export async function toggleProduct(formData: FormData): Promise<void> {
  const admin = await requireAdmin();

  const id = field(formData, "productId");
  if (!id) return;

  const db = await getDb();
  const before = await db
    .select()
    .from(product)
    .where(eq(product.id, id))
    .get();
  if (!before) return;

  await db
    .update(product)
    .set({ isActive: !before.isActive, updatedAt: new Date() })
    .where(eq(product.id, id));

  await writeAuditLog({
    actorUserId: admin.id,
    actorEmail: admin.email,
    action: "product.toggle",
    entityType: "product",
    entityId: id,
    summary: before.isActive
      ? `Desativou o produto "${before.name}"`
      : `Reativou o produto "${before.name}"`,
    beforeData: { isActive: before.isActive },
    afterData: { isActive: !before.isActive },
  });

  revalidateBases();
}
