import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

import { businessUnit } from "./business-units.schema";

/**
 * Estrutura oficial de negócio: Divisão → BU → Produto.
 *
 * DELIBERADAMENTE separada da estrutura organizacional (Setor → Subsetor →
 * Time, em `org.schema.ts`). São duas dimensões que se cruzam mas não se
 * contêm: um designer do time de Design atende BUs de duas divisões, e um
 * coordenador médico pertence a uma BU sem estar em time nenhum do marketing.
 * Misturar as duas numa árvore só obrigaria a inventar um lugar falso para
 * cada pessoa que não cabe nela.
 */

/**
 * Divisão de negócio — o nível mais alto. Ex.: MedCof Especialidades.
 *
 * A BU aponta para cá em vez de a regra viver em condicional no frontend: as
 * divisões mudam de composição (uma BU nova nasce, outra migra), e uma regra
 * escrita em código exigiria deploy para cada mudança dessas.
 */
export const businessDivision = sqliteTable(
  "business_division",
  {
    id: text("id").primaryKey(),
    /** Identificador estável, em snake_case. Ex.: `especialidades` */
    slug: text("slug").notNull().unique(),
    /** Nome de exibição. Ex.: `MedCof Especialidades` */
    name: text("name").notNull(),
    description: text("description"),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdBy: text("created_by"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [index("business_division_is_active_idx").on(table.isActive)],
);

/**
 * Produto — o nível mais fino da estrutura de negócio.
 *
 * O `slug` é a chave estável que já circula fora daqui (planilhas, campanhas,
 * nomes gerados); o `name` existe só para a tela. Trocar o nome de exibição
 * nunca pode quebrar um nome já gerado, e é por isso que os dois são campos
 * diferentes em vez de um só derivado do outro.
 *
 * `businessUnitId` é NULO por padrão de propósito: o mapeamento completo
 * produto → BU ainda não foi informado, e chutá-lo produziria dado errado com
 * cara de dado certo. Produto sem BU aparece na administração marcado como
 * pendente, e continua utilizável.
 */
export const product = sqliteTable(
  "product",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    description: text("description"),
    businessUnitId: text("business_unit_id").references(() => businessUnit.id, {
      onDelete: "set null",
    }),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdBy: text("created_by"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    index("product_business_unit_idx").on(table.businessUnitId),
    index("product_is_active_idx").on(table.isActive),
  ],
);

export type BusinessDivision = typeof businessDivision.$inferSelect;
export type Product = typeof product.$inferSelect;
