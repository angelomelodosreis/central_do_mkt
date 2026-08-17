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
    /** Nome de exibição na interface. Ex.: `Clínica Médica` */
    label: text("label").notNull(),
    description: text("description"),
    /**
     * Quem responde pelo planejamento estratégico desta BU.
     *
     * É esta coluna que decide quem edita o módulo de Planejamento: o dono da
     * BU, mais os administradores. Sem ela, a permissão só saberia dizer "pode
     * editar planejamento", sem distinguir de qual BU.
     */
    strategyOwnerId: text("strategy_owner_id"),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [index("business_unit_is_active_idx").on(table.isActive)],
);
