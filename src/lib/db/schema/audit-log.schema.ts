import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

/**
 * Ações registradas na trilha de auditoria.
 * As marcadas como "reversível" gravam `beforeData` e recebem `isUndoable = 1`,
 * habilitando o botão de desfazer na tela de auditoria.
 */
export const AUDIT_ACTIONS = [
  // Usuários e acesso
  "user.signup",
  "user.approve",
  "user.suspend", // reversível
  "user.reactivate",
  "user.role_change", // reversível
  "allowed_domain.create",
  "allowed_domain.toggle", // reversível
  "role_permission.update", // reversível
  // Business Units
  "business_unit.create",
  "business_unit.update", // reversível
  "business_unit.deactivate", // reversível
  "business_unit.reactivate",
  // Documentação
  "doc_category.create",
  "doc_category.update", // reversível
  "doc_category.delete", // reversível
  "doc_page.create",
  "doc_page.update", // reversível
  "doc_page.delete", // reversível
  // Modelos de nomenclatura
  // (os nomes gerados em si não são registrados: a ferramenta é auxiliar,
  //  não um sistema de registro)
  "naming_template.create",
  "naming_template.update", // reversível
  "naming_template.toggle", // reversível
  "naming_template.delete", // reversível
  // Personas
  "persona.create",
  "persona.update", // reversível
  // Planejamento estratégico
  "strategy_cycle.create",
  "strategy_product.create",
  "timeline_item.create",
  "timeline_item.update", // reversível
  "timeline_item.delete", // reversível
  // Meta
  "audit.undo",
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export const AUDIT_ENTITY_TYPES = [
  "user",
  "allowed_domain",
  "role_permission",
  "business_unit",
  "doc_category",
  "doc_page",
  "naming_template",
  "persona",
  "strategy_cycle",
  "strategy_product",
  "timeline_item",
  "audit_log",
] as const;
export type AuditEntityType = (typeof AUDIT_ENTITY_TYPES)[number];

/**
 * Trilha de auditoria append-only: quem fez o quê, quando, e qual era o estado
 * anterior. Também serve de histórico de fato das edições de documentação
 * (`beforeData`/`afterData` de cada `doc_page.update`).
 */
export const auditLog = sqliteTable(
  "audit_log",
  {
    id: text("id").primaryKey(),
    /** Nulo quando a ação foi do sistema (ex.: bootstrap do primeiro admin). */
    actorUserId: text("actor_user_id"),
    /** Guardado desnormalizado para o log continuar legível se o usuário sair. */
    actorEmail: text("actor_email"),
    action: text("action").notNull().$type<AuditAction>(),
    entityType: text("entity_type").notNull().$type<AuditEntityType>(),
    entityId: text("entity_id").notNull(),
    /** Descrição curta em português, pronta para exibir na tela. */
    summary: text("summary").notNull(),
    /** Estado anterior (JSON). É o que o "desfazer" restaura. */
    beforeData: text("before_data", { mode: "json" }),
    /** Estado posterior (JSON). */
    afterData: text("after_data", { mode: "json" }),
    isUndoable: integer("is_undoable", { mode: "boolean" })
      .notNull()
      .default(false),
    undoneAt: integer("undone_at", { mode: "timestamp" }),
    undoneBy: text("undone_by"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    index("audit_log_created_at_idx").on(table.createdAt),
    index("audit_log_actor_idx").on(table.actorUserId),
    index("audit_log_entity_idx").on(table.entityType, table.entityId),
  ],
);
