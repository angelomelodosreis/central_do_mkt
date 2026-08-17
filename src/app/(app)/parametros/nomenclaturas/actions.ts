"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { asc, eq, max } from "drizzle-orm";

import type { TemplateFormState } from "./form-state";
import { requirePermission } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import {
  FIELD_TYPES,
  namingTemplate,
  namingTemplateField,
  type FieldType,
  type SelectOption,
} from "@/lib/db/schema";
import { writeAuditLog } from "@/lib/modules/audit/log";
import { getTemplateById } from "@/lib/modules/name-generator/queries";
import { toKebabCase } from "@/lib/modules/documentation/slug";
import { newId } from "@/lib/utils/id";

/** Revalida tudo que depende dos modelos de nomenclatura. */
function revalidateTemplateViews() {
  revalidatePath("/parametros/nomenclaturas");
  revalidatePath("/gerador-de-nomes");
  revalidatePath("/painel");
}

function isFieldType(value: unknown): value is FieldType {
  return typeof value === "string" && FIELD_TYPES.includes(value as FieldType);
}

/**
 * Converte o texto do campo de opções em uma lista estruturada.
 * Aceita uma opção por linha, nos formatos `valor` ou `valor | Rótulo`.
 */
function parseOptions(raw: string): SelectOption[] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [valuePart, labelPart] = line.split("|").map((part) => part.trim());
      const value = toKebabCase(valuePart).replace(/-/g, "_");
      return { value, label: labelPart || valuePart };
    })
    .filter((option) => option.value.length > 0);
}

/** Cria um modelo de nomenclatura vazio e leva direto para a edição dos campos. */
export async function createTemplate(
  _previousState: TemplateFormState,
  formData: FormData,
): Promise<TemplateFormState> {
  const admin = await requirePermission("parameters", "edit");

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (!name) {
    return { status: "error", message: "Informe o nome do modelo." };
  }

  const slug = toKebabCase(name);
  if (!slug) {
    return {
      status: "error",
      message: "O nome precisa ter ao menos uma letra ou número.",
    };
  }

  const db = await getDb();

  const duplicate = await db
    .select({ id: namingTemplate.id })
    .from(namingTemplate)
    .where(eq(namingTemplate.slug, slug))
    .get();

  if (duplicate) {
    return { status: "error", message: "Já existe um modelo com esse nome." };
  }

  const id = newId("tpl");
  const now = new Date();

  await db.insert(namingTemplate).values({
    id,
    slug,
    name,
    description: description || null,
    blockSeparator: "-",
    // Nasce inativo: só aparece no gerador depois que tiver campos definidos.
    isActive: false,
    sortOrder: 1000,
    createdBy: admin.id,
    updatedBy: admin.id,
    createdAt: now,
    updatedAt: now,
  });

  await writeAuditLog({
    actorUserId: admin.id,
    actorEmail: admin.email,
    action: "naming_template.create",
    entityType: "naming_template",
    entityId: id,
    summary: `Criou o modelo de nomenclatura "${name}"`,
    afterData: { name, slug, description: description || null },
  });

  revalidateTemplateViews();
  redirect(`/parametros/nomenclaturas/${id}`);
}

/** Salva nome e descrição de um modelo. */
export async function updateTemplate(
  _previousState: TemplateFormState,
  formData: FormData,
): Promise<TemplateFormState> {
  const admin = await requirePermission("parameters", "edit");

  const id = String(formData.get("templateId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (!id || !name) {
    return { status: "error", message: "Informe o nome do modelo." };
  }

  const db = await getDb();
  const before = await db
    .select()
    .from(namingTemplate)
    .where(eq(namingTemplate.id, id))
    .get();

  if (!before) {
    return { status: "error", message: "Esse modelo não existe mais." };
  }

  await db
    .update(namingTemplate)
    .set({
      name,
      description: description || null,
      updatedBy: admin.id,
      updatedAt: new Date(),
    })
    .where(eq(namingTemplate.id, id));

  await writeAuditLog({
    actorUserId: admin.id,
    actorEmail: admin.email,
    action: "naming_template.update",
    entityType: "naming_template",
    entityId: id,
    summary: `Editou o modelo de nomenclatura "${before.name}"`,
    beforeData: { name: before.name, description: before.description },
    afterData: { name, description: description || null },
  });

  revalidateTemplateViews();
  return { status: "success", message: "Modelo atualizado." };
}

/** Adiciona um bloco ao final do modelo. */
export async function addTemplateField(
  _previousState: TemplateFormState,
  formData: FormData,
): Promise<TemplateFormState> {
  const admin = await requirePermission("parameters", "edit");

  const templateId = String(formData.get("templateId") ?? "");
  const fieldType = String(formData.get("fieldType") ?? "");
  const label = String(formData.get("label") ?? "").trim();
  const hint = String(formData.get("hint") ?? "").trim();
  const placeholder = String(formData.get("placeholder") ?? "").trim();
  const rawOptions = String(formData.get("options") ?? "");

  if (!templateId) {
    return { status: "error", message: "Modelo não identificado." };
  }
  if (!isFieldType(fieldType)) {
    return { status: "error", message: "Escolha o tipo do campo." };
  }
  if (!label) {
    return { status: "error", message: "Informe o rótulo do campo." };
  }

  const options = fieldType === "select" ? parseOptions(rawOptions) : null;
  if (fieldType === "select" && (!options || options.length < 2)) {
    return {
      status: "error",
      message:
        "Um campo de opções fixas precisa de pelo menos duas opções, uma por linha.",
    };
  }

  const db = await getDb();
  const template = await db
    .select({ name: namingTemplate.name })
    .from(namingTemplate)
    .where(eq(namingTemplate.id, templateId))
    .get();

  if (!template) {
    return { status: "error", message: "Esse modelo não existe mais." };
  }

  // O novo bloco entra no fim da sequência.
  const [{ lastPosition }] = await db
    .select({ lastPosition: max(namingTemplateField.position) })
    .from(namingTemplateField)
    .where(eq(namingTemplateField.templateId, templateId));

  const fieldId = newId("fld");

  await db.insert(namingTemplateField).values({
    id: fieldId,
    templateId,
    position: (lastPosition ?? -1) + 1,
    fieldType,
    label,
    hint: hint || null,
    placeholder: placeholder || null,
    isRequired: true,
    options,
  });

  await writeAuditLog({
    actorUserId: admin.id,
    actorEmail: admin.email,
    action: "naming_template.update",
    entityType: "naming_template",
    entityId: templateId,
    summary: `Adicionou o campo "${label}" ao modelo "${template.name}"`,
    afterData: { fieldId, fieldType, label },
  });

  revalidateTemplateViews();
  return { status: "success", message: `Campo "${label}" adicionado.` };
}

/**
 * Edita um bloco já existente, sem mexer na posição dele.
 *
 * O `fieldType` não é editável de propósito: trocar o tipo mudaria o significado
 * do bloco (e as opções gravadas deixariam de fazer sentido). Quem precisa disso
 * remove o bloco e adiciona outro.
 */
export async function updateTemplateField(
  _previousState: TemplateFormState,
  formData: FormData,
): Promise<TemplateFormState> {
  const admin = await requirePermission("parameters", "edit");

  const fieldId = String(formData.get("fieldId") ?? "");
  const label = String(formData.get("label") ?? "").trim();
  const hint = String(formData.get("hint") ?? "").trim();
  const placeholder = String(formData.get("placeholder") ?? "").trim();
  const rawOptions = String(formData.get("options") ?? "");

  if (!fieldId) {
    return { status: "error", message: "Bloco não identificado." };
  }
  if (!label) {
    return { status: "error", message: "Informe o rótulo do campo." };
  }

  const db = await getDb();
  const before = await db
    .select()
    .from(namingTemplateField)
    .where(eq(namingTemplateField.id, fieldId))
    .get();

  if (!before) {
    return { status: "error", message: "Esse bloco não existe mais." };
  }

  // O tipo vem do banco, e não do formulário: é ele que decide se as opções
  // ainda fazem sentido.
  const options =
    before.fieldType === "select" ? parseOptions(rawOptions) : null;
  if (before.fieldType === "select" && (!options || options.length < 2)) {
    return {
      status: "error",
      message:
        "Um campo de opções fixas precisa de pelo menos duas opções, uma por linha.",
    };
  }

  const template = await db
    .select({ name: namingTemplate.name })
    .from(namingTemplate)
    .where(eq(namingTemplate.id, before.templateId))
    .get();

  await db
    .update(namingTemplateField)
    .set({
      label,
      hint: hint || null,
      placeholder: placeholder || null,
      options,
    })
    .where(eq(namingTemplateField.id, fieldId));

  await writeAuditLog({
    actorUserId: admin.id,
    actorEmail: admin.email,
    action: "naming_template.update",
    entityType: "naming_template",
    entityId: before.templateId,
    summary: `Editou o campo "${before.label}" do modelo "${template?.name ?? ""}"`,
    beforeData: {
      label: before.label,
      hint: before.hint,
      placeholder: before.placeholder,
      options: before.options,
    },
    afterData: {
      label,
      hint: hint || null,
      placeholder: placeholder || null,
      options,
    },
  });

  revalidateTemplateViews();
  return { status: "success", message: `Campo "${label}" atualizado.` };
}

/** Remove um bloco e reordena os restantes, para não deixar buracos. */
export async function removeTemplateField(formData: FormData): Promise<void> {
  const admin = await requirePermission("parameters", "edit");

  const fieldId = String(formData.get("fieldId") ?? "");
  if (!fieldId) return;

  const db = await getDb();
  const field = await db
    .select()
    .from(namingTemplateField)
    .where(eq(namingTemplateField.id, fieldId))
    .get();

  if (!field) return;

  await db
    .delete(namingTemplateField)
    .where(eq(namingTemplateField.id, fieldId));

  await renumberFields(field.templateId);

  await writeAuditLog({
    actorUserId: admin.id,
    actorEmail: admin.email,
    action: "naming_template.update",
    entityType: "naming_template",
    entityId: field.templateId,
    summary: `Removeu o campo "${field.label}" do modelo`,
    beforeData: {
      label: field.label,
      fieldType: field.fieldType,
      hint: field.hint,
      placeholder: field.placeholder,
      options: field.options,
    },
  });

  revalidateTemplateViews();
}

/** Move um bloco para cima ou para baixo na sequência. */
export async function moveTemplateField(formData: FormData): Promise<void> {
  await requirePermission("parameters", "edit");

  const fieldId = String(formData.get("fieldId") ?? "");
  const direction = String(formData.get("direction") ?? "");
  if (!fieldId || (direction !== "up" && direction !== "down")) return;

  const db = await getDb();
  const field = await db
    .select()
    .from(namingTemplateField)
    .where(eq(namingTemplateField.id, fieldId))
    .get();

  if (!field) return;

  const siblings = await db
    .select()
    .from(namingTemplateField)
    .where(eq(namingTemplateField.templateId, field.templateId))
    .orderBy(asc(namingTemplateField.position));

  const index = siblings.findIndex((item) => item.id === fieldId);
  const targetIndex = direction === "up" ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= siblings.length) return;

  // Reordena a lista inteira e regrava as posições. Como `position` é único por
  // modelo, primeiro afastamos os valores para evitar colisão no meio do caminho.
  const reordered = [...siblings];
  [reordered[index], reordered[targetIndex]] = [
    reordered[targetIndex],
    reordered[index],
  ];

  for (const [offset, item] of reordered.entries()) {
    await db
      .update(namingTemplateField)
      .set({ position: 1000 + offset })
      .where(eq(namingTemplateField.id, item.id));
  }
  for (const [offset, item] of reordered.entries()) {
    await db
      .update(namingTemplateField)
      .set({ position: offset })
      .where(eq(namingTemplateField.id, item.id));
  }

  revalidateTemplateViews();
}

/** Fecha os buracos de `position` depois de uma remoção. */
async function renumberFields(templateId: string): Promise<void> {
  const db = await getDb();
  const remaining = await db
    .select({ id: namingTemplateField.id })
    .from(namingTemplateField)
    .where(eq(namingTemplateField.templateId, templateId))
    .orderBy(asc(namingTemplateField.position));

  for (const [offset, item] of remaining.entries()) {
    await db
      .update(namingTemplateField)
      .set({ position: 1000 + offset })
      .where(eq(namingTemplateField.id, item.id));
  }
  for (const [offset, item] of remaining.entries()) {
    await db
      .update(namingTemplateField)
      .set({ position: offset })
      .where(eq(namingTemplateField.id, item.id));
  }
}

/** Liga ou desliga o modelo no gerador. */
export async function toggleTemplate(formData: FormData): Promise<void> {
  const admin = await requirePermission("parameters", "edit");

  const id = String(formData.get("templateId") ?? "");
  if (!id) return;

  const template = await getTemplateById(id);
  if (!template) return;

  // Ativar um modelo sem campos deixaria o gerador com um formulário vazio.
  if (!template.isActive && template.fields.length === 0) return;

  const db = await getDb();
  const nextIsActive = !template.isActive;

  await db
    .update(namingTemplate)
    .set({ isActive: nextIsActive, updatedBy: admin.id, updatedAt: new Date() })
    .where(eq(namingTemplate.id, id));

  await writeAuditLog({
    actorUserId: admin.id,
    actorEmail: admin.email,
    action: "naming_template.toggle",
    entityType: "naming_template",
    entityId: id,
    summary: nextIsActive
      ? `Ativou o modelo de nomenclatura "${template.name}"`
      : `Desativou o modelo de nomenclatura "${template.name}"`,
    beforeData: { isActive: template.isActive },
    afterData: { isActive: nextIsActive },
  });

  revalidateTemplateViews();
}
