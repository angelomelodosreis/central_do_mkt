import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

/**
 * Business Units da MedCof — FONTE ÚNICA DE VERDADE.
 *
 * Esta tabela alimenta simultaneamente o dropdown do Gerador de Nomes e a
 * página de referência no módulo de Documentação. Adicionar ou renomear uma BU
 * aqui reflete automaticamente nos dois lugares.
 *
 * Importante: BUs nunca são apagadas de verdade (só `isActive = false`), porque
 * o histórico de nomes gerados aponta para elas.
 */
export const businessUnit = sqliteTable(
  "business_unit",
  {
    id: text("id").primaryKey(),
    /** Valor usado na nomenclatura, já em snake_case. Ex.: `clinica_medica` */
    slug: text("slug").notNull().unique(),
    /** Código oficial padronizado da BU. Ex.: `MEDCOF_CLINICA_MEDICA` */
    code: text("code"),
    /** Nome de exibição na interface. Ex.: `Clínica Médica` */
    label: text("label").notNull(),
    description: text("description"),
    /**
     * Divisão de negócio a que a BU pertence. Ex.: MedCof Especialidades.
     *
     * Mora aqui, e não numa condicional no frontend, porque a composição das
     * divisões muda: uma BU nova nasce dentro de uma delas, outra migra. Como
     * regra em código, cada mudança dessas exigiria deploy.
     *
     * Nulo é tolerado para não travar o cadastro de uma BU antes de decidirem a
     * qual divisão ela pertence — a administração marca essas como pendentes.
     */
    divisionId: text("division_id"),
    /**
     * Quem trabalha nesta BU não vive mais aqui: virou o squad da BU
     * (`squad` + `squad_member`). Com uma coluna só, um analista responsável
     * por duas BUs ficava de fora de uma, e duas pessoas na mesma BU eram
     * impossíveis de representar.
     */
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    index("business_unit_is_active_idx").on(table.isActive),
    index("business_unit_division_idx").on(table.divisionId),
  ],
);

export type BusinessUnit = typeof businessUnit.$inferSelect;
