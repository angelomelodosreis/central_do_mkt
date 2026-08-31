import {
  sqliteTable,
  text,
  integer,
  index,
  unique,
} from "drizzle-orm/sqlite-core";

import { businessUnit } from "./business-units.schema";

/**
 * Tipo de página.
 *
 * - standard: conteúdo escrito pelo usuário
 * - as demais: páginas de REFERÊNCIA, que renderizam uma base oficial ao vivo,
 *   direto do banco
 *
 * A distinção existe porque a base oficial não pode ser texto colado. Uma
 * tabela de BUs escrita à mão fica errada no dia em que alguém cadastra uma BU
 * nova — e ninguém descobre, porque a página continua parecendo certa.
 */
export const DOC_PAGE_TYPES = [
  "standard",
  "business_units_reference",
  "divisions_reference",
  "products_reference",
] as const;
export type DocPageType = (typeof DOC_PAGE_TYPES)[number];

/** Páginas alimentadas por uma base oficial — corpo não editável. */
export const REFERENCE_PAGE_TYPES: DocPageType[] = [
  "business_units_reference",
  "divisions_reference",
  "products_reference",
];

export function isReferencePage(pageType: DocPageType): boolean {
  return REFERENCE_PAGE_TYPES.includes(pageType);
}

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

/**
 * Onde a página é visível.
 *
 * - `general`:       biblioteca geral, aberta a toda a plataforma
 * - `business_unit`: material interno de uma BU, visível só a quem trabalha nela
 *
 * A distinção existe porque os dois casos são reais e conflitantes: uma
 * pesquisa de mercado interessa a toda a empresa, enquanto o rascunho de
 * estratégia de uma BU não deve aparecer para quem cuida de outra. Antes disso,
 * documentar dentro da BU obrigava a escolher entre publicar para todos ou não
 * documentar.
 *
 * Mudar de `business_unit` para `general` é o ato de "publicar na biblioteca":
 * a página não é copiada nem movida, e continua listada dentro da BU que a
 * produziu — quem escreveu não perde o material de vista ao compartilhá-lo.
 */
export const DOC_SCOPES = ["general", "business_unit"] as const;
export type DocScope = (typeof DOC_SCOPES)[number];

export const DOC_SCOPE_LABELS: Record<DocScope, string> = {
  general: "Biblioteca geral (toda a plataforma)",
  business_unit: "Apenas a minha Business Unit",
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
    /**
     * BU que produziu a página. `null` = documento corporativo, que não pertence
     * a BU nenhuma (convenções, processos do time).
     */
    businessUnitId: text("business_unit_id").references(() => businessUnit.id, {
      onDelete: "set null",
    }),
    scope: text("scope").notNull().default("general").$type<DocScope>(),
    sortOrder: integer("sort_order").notNull().default(0),
    createdBy: text("created_by"),
    updatedBy: text("updated_by"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    unique("documentation_page_slug_unique").on(table.categoryId, table.slug),
    index("documentation_page_category_idx").on(table.categoryId),
    index("documentation_page_business_unit_idx").on(table.businessUnitId),
    index("documentation_page_scope_idx").on(table.scope),
  ],
);
