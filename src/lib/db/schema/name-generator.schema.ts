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
 * - official_base: dropdown alimentado por uma BASE OFICIAL do sistema
 *                  (divisão, BU, produto…). Qual base é dita por `sourceKey`.
 * - select:        dropdown com opções fixas definidas no próprio modelo
 * - text:          texto livre, convertido automaticamente para snake_case
 * - date:          data, no formato dito por `dateFormat`
 *
 * `official_base` substituiu o antigo tipo `business_unit`, que amarrava o
 * gerador a UMA base. Com uma base por tipo de campo, acrescentar Produto
 * exigiria um tipo novo, um `case` novo no formulário e outro na validação — e
 * assim a cada base. Agora a base é um dado do campo, e o conjunto de bases
 * vive num registro só (`lib/modules/bases`).
 *
 * `date` substituiu `month_year` pelo mesmo motivo: o formato virou dado em vez
 * de tipo, para "dia, mês e ano" não exigir um segundo tipo com a mesma
 * descrição, o mesmo formulário e a mesma validação.
 */
export const FIELD_TYPES = ["official_base", "select", "text", "date"] as const;
export type FieldType = (typeof FIELD_TYPES)[number];

export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  official_base: "Base oficial do sistema",
  select: "Lista de opções fixas",
  text: "Texto livre",
  date: "Data",
};

export const FIELD_TYPE_DESCRIPTIONS: Record<FieldType, string> = {
  official_base:
    "Divisão, BU ou Produto, sempre em dia com o cadastro oficial. Quando a base depende de outra, a lista se filtra sozinha.",
  select: "Dropdown com opções que você mesmo define. Ex.: lead, aluno.",
  text: "A pessoa digita livremente; a padronização é automática.",
  date: "Seletor de data. Você escolhe se pede o dia ou só o mês e o ano.",
};

/**
 * Formatos de data disponíveis num bloco `date`.
 *
 * Ambos põem o componente maior à direita (`MM_AAAA`, `DD_MM_AAAA`) porque é
 * assim que os nomes já gerados estão escritos — mudar a ordem agora quebraria
 * a correspondência com o que está registrado no CRM.
 */
export const DATE_FORMATS = ["month_year", "day_month_year"] as const;
export type DateFormat = (typeof DATE_FORMATS)[number];

export const DATE_FORMAT_LABELS: Record<DateFormat, string> = {
  month_year: "Mês e ano",
  day_month_year: "Dia, mês e ano",
};

export const DATE_FORMAT_EXAMPLES: Record<DateFormat, string> = {
  month_year: "11_2026",
  day_month_year: "05_11_2026",
};

/** Apelido do bloco ao descrever o formato de um modelo. */
export const DATE_FORMAT_PLACEHOLDERS: Record<DateFormat, string> = {
  month_year: "mm_aaaa",
  day_month_year: "dd_mm_aaaa",
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
    /**
     * Qual base oficial alimenta o campo, quando `fieldType` = "official_base".
     * Ex.: `business_unit`, `product`. As chaves válidas vivem no registro de
     * bases, não aqui — a tabela só guarda a escolha.
     */
    sourceKey: text("source_key"),
    /** Formato da data, quando `fieldType` = "date". */
    dateFormat: text("date_format").$type<DateFormat>(),
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
