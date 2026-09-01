import { asc, eq } from "drizzle-orm";

import { getDb } from "@/lib/db/client";
import {
  businessUnit,
  namingTemplate,
  namingTemplateField,
  type NamingTemplateWithFields,
} from "@/lib/db/schema";
import { sortByName } from "@/lib/utils/text";

/** Busca os modelos e junta cada um com seus campos, na ordem correta. */
async function attachFields(
  templates: (typeof namingTemplate.$inferSelect)[],
): Promise<NamingTemplateWithFields[]> {
  if (templates.length === 0) return [];

  const db = await getDb();
  const fields = await db
    .select()
    .from(namingTemplateField)
    .orderBy(asc(namingTemplateField.position));

  return templates.map((template) => ({
    ...template,
    fields: fields.filter((field) => field.templateId === template.id),
  }));
}

/** Modelos disponíveis para uso no gerador (apenas os ativos). */
export async function listActiveTemplates(): Promise<
  NamingTemplateWithFields[]
> {
  const db = await getDb();
  const templates = sortByName(
    await db
      .select()
      .from(namingTemplate)
      .where(eq(namingTemplate.isActive, true)),
    (template) => template.name,
  );

  // Um modelo sem campos não consegue gerar nada — não faz sentido oferecê-lo.
  return (await attachFields(templates)).filter(
    (template) => template.fields.length > 0,
  );
}

/** Todos os modelos, inclusive inativos e sem campos. Usado na administração. */
export async function listAllTemplates(): Promise<NamingTemplateWithFields[]> {
  const db = await getDb();
  const templates = sortByName(
    await db.select().from(namingTemplate),
    (template) => template.name,
  );

  return attachFields(templates);
}

export async function getTemplateById(
  id: string,
): Promise<NamingTemplateWithFields | undefined> {
  const db = await getDb();
  const template = await db
    .select()
    .from(namingTemplate)
    .where(eq(namingTemplate.id, id))
    .get();

  if (!template) return undefined;
  return (await attachFields([template]))[0];
}

export type BusinessUnitOption = { slug: string; label: string };

/**
 * BUs ativas, na ordem de exibição. Alimenta todo campo do tipo
 * `business_unit`, mantendo a tabela `business_unit` como fonte única.
 */
export async function listActiveBusinessUnits(): Promise<BusinessUnitOption[]> {
  const db = await getDb();
  return db
    .select({ slug: businessUnit.slug, label: businessUnit.label })
    .from(businessUnit)
    .where(eq(businessUnit.isActive, true))
    .orderBy(asc(businessUnit.sortOrder), asc(businessUnit.label));
}
