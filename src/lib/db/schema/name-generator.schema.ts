import {
  sqliteTable,
  text,
  integer,
  index,
  unique,
} from "drizzle-orm/sqlite-core";

/**
 * Tipos de campo que um modelo de nomenclatura pode ter.
 *
 * - business_unit: dropdown alimentado pela tabela `business_unit` (fonte única
 *                  de verdade — cadastrar uma BU nova a faz aparecer aqui)
 * - select:        dropdown com opções fixas definidas no próprio modelo
 *                  (ex.: lead / aluno)
 * - text:          texto livre, convertido automaticamente para snake_case
 * - month_year:    mês e ano, gerados no formato MM_AAAA (ex.: 11_2026)
 */
export const FIELD_TYPES = [
  "business_unit",
  "select",
  "text",
  "month_year",
] as const;
export type FieldType = (typeof FIELD_TYPES)[number];

export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  business_unit: "Business Unit (lista oficial)",
  select: "Lista de opções fixas",
  text: "Texto livre",
  month_year: "Mês e ano",
};

export const FIELD_TYPE_DESCRIPTIONS: Record<FieldType, string> = {
  business_unit:
    "Dropdown com as BUs cadastradas. Sempre atualizado automaticamente.",
  select: "Dropdown com opções que você mesmo define. Ex.: lead, aluno.",
  text: "A pessoa digita livremente; a padronização é automática.",
  month_year: "Seletor de mês e ano. Resulta em algo como 11_2026.",
};

/**
 * Modelo de nomenclatura — define o que a ferramenta sabe nomear.
 *
 * Cada modelo é uma sequência de blocos unidos por um separador. Por exemplo,
 * "Lista do ActiveCampaign" é `bu` + `tipo_de_lista` + `nome_da_lista`, unidos
 * por hífen.
 *
 * Os modelos ficam no banco, e não no código, justamente para que um novo tipo
 * (campanha, automação, formulário...) possa ser criado pela tela de
 * administração, sem precisar de programação nem de nova publicação.
 */
export const namingTemplate = sqliteTable(
  "naming_template",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull().unique(),
    /** Nome exibido no seletor. Ex.: "Lista do ActiveCampaign" */
    name: text("name").notNull(),
    description: text("description"),
    /** Caractere que une os blocos. Padrão: hífen. */
    blockSeparator: text("block_separator").notNull().default("-"),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdBy: text("created_by"),
    updatedBy: text("updated_by"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [index("naming_template_is_active_idx").on(table.isActive)],
);

/** Opção de um campo do tipo `select`. */
export type SelectOption = { value: string; label: string };

/**
 * Um bloco do modelo. A ordem é dada por `position` e define a ordem no
 * nome final.
 */
export const namingTemplateField = sqliteTable(
  "naming_template_field",
  {
    id: text("id").primaryKey(),
    templateId: text("template_id")
      .notNull()
      .references(() => namingTemplate.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    fieldType: text("field_type").notNull().$type<FieldType>(),
    /** Rótulo exibido no formulário. Ex.: "Nome da lista" */
    label: text("label").notNull(),
    /** Texto de ajuda abaixo do campo. Opcional. */
    hint: text("hint"),
    placeholder: text("placeholder"),
    isRequired: integer("is_required", { mode: "boolean" })
      .notNull()
      .default(true),
    /** Opções do dropdown, quando `fieldType` = "select". */
    options: text("options", { mode: "json" }).$type<SelectOption[]>(),
  },
  (table) => [
    unique("naming_template_field_position_unique").on(
      table.templateId,
      table.position,
    ),
    index("naming_template_field_template_idx").on(table.templateId),
  ],
);

export type NamingTemplate = typeof namingTemplate.$inferSelect;
export type NamingTemplateField = typeof namingTemplateField.$inferSelect;

/** Modelo já com seus campos, na ordem correta. */
export type NamingTemplateWithFields = NamingTemplate & {
  fields: NamingTemplateField[];
};
