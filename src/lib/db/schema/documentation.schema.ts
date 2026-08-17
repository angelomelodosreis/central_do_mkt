import {
  sqliteTable,
  text,
  integer,
  index,
  unique,
} from "drizzle-orm/sqlite-core";

/**
 * Tipo de página.
 * - standard:                 conteúdo em Markdown escrito pelo usuário
 * - business_units_reference: página especial que renderiza a tabela de BUs
 *                             ao vivo, direto do banco (não texto colado)
 */
export const DOC_PAGE_TYPES = ["standard", "business_units_reference"] as const;
export type DocPageType = (typeof DOC_PAGE_TYPES)[number];

/** Quem pode ver a página. Ortogonal à permissão de edição do módulo. */
export const DOC_VISIBILITIES = [
  "all_active_users",
  "leader_and_admin",
  "admin_only",
] as const;
export type DocVisibility = (typeof DOC_VISIBILITIES)[number];

export const DOC_VISIBILITY_LABELS: Record<DocVisibility, string> = {
  all_active_users: "Todos os membros aprovados",
  leader_and_admin: "Apenas líderes e administradores",
  admin_only: "Apenas administradores",
};

export const documentationCategory = sqliteTable("documentation_category", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  /**
   * Esqueleto em Markdown que já vem preenchido no corpo de uma página nova
   * criada nesta categoria.
   *
   * Serve para categorias em que toda página segue a mesma anatomia — o caso que
   * motivou isso são os alinhamentos entre setores, onde o conteúdo muda muito
   * de um para o outro, mas os tópicos (contexto, o que ficou decidido,
   * pendências) são sempre os mesmos. É só um ponto de partida: quem escreve
   * pode apagar tudo.
   */
  pageTemplate: text("page_template"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const documentationPage = sqliteTable(
  "documentation_page",
  {
    id: text("id").primaryKey(),
    categoryId: text("category_id")
      .notNull()
      .references(() => documentationCategory.id, { onDelete: "restrict" }),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    summary: text("summary"),
    pageType: text("page_type")
      .notNull()
      .default("standard")
      .$type<DocPageType>(),
    /** Reservado para um editor mais rico no futuro sem migrar dados. */
    contentFormat: text("content_format").notNull().default("markdown"),
    /**
     * Corpo da página. Markdown nas páginas antigas, documento estruturado
     * (JSON) nas novas — `contentFormat` diz qual. Ignorado quando
     * pageType = business_units_reference.
     */
    content: text("content"),
    /**
     * Cópia só-texto do corpo, sem acentos e em minúsculas, usada pela busca.
     *
     * Existe por dois motivos: o corpo estruturado é JSON, e procurar dentro
     * dele casaria com nomes de nó ("paragraph", "text"); e comparar sem acento
     * é o que faz "configuracao" encontrar "configuração".
     */
    searchText: text("search_text"),
    visibility: text("visibility")
      .notNull()
      .default("all_active_users")
      .$type<DocVisibility>(),
    sortOrder: integer("sort_order").notNull().default(0),
    createdBy: text("created_by"),
    updatedBy: text("updated_by"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    unique("documentation_page_slug_unique").on(table.categoryId, table.slug),
    index("documentation_page_category_idx").on(table.categoryId),
  ],
);
