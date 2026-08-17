import { sqliteTable, text, integer, unique } from "drizzle-orm/sqlite-core";

/**
 * Domínios de e-mail autorizados a se cadastrar na plataforma.
 *
 * O Google OAuth aceita qualquer conta Google; é ESTA tabela que decide quem
 * pode existir na plataforma. A verificação acontece no primeiro login
 * (hook do better-auth) e é revalidada em todo request autenticado, para que
 * desativar um domínio tenha efeito imediato.
 */
export const allowedDomain = sqliteTable("allowed_domain", {
  id: text("id").primaryKey(),
  domain: text("domain").notNull().unique(),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdBy: text("created_by"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

/**
 * Módulos da plataforma sujeitos a controle de acesso.
 * Ao criar um módulo novo, adicione a chave aqui e uma linha por papel em
 * `role_permission` (via migration/seed) — nada mais precisa mudar.
 */
export const MODULE_KEYS = [
  "name_generator",
  "documentation",
  "personas",
  "strategy",
  "parameters",
  "admin",
] as const;
export type ModuleKey = (typeof MODULE_KEYS)[number];

export const MODULE_LABELS: Record<ModuleKey, string> = {
  name_generator: "Gerador de Nomes",
  documentation: "Documentação",
  personas: "Personas",
  strategy: "Planejamento",
  parameters: "Parâmetros",
  admin: "Administração",
};

/**
 * Matriz de permissões papel × módulo, editável pelo admin na interface —
 * mudar quem vê ou edita o quê não exige alterar código nem fazer deploy.
 */
export const rolePermission = sqliteTable(
  "role_permission",
  {
    id: text("id").primaryKey(),
    role: text("role").notNull(),
    moduleKey: text("module_key").notNull().$type<ModuleKey>(),
    canView: integer("can_view", { mode: "boolean" }).notNull().default(false),
    canEdit: integer("can_edit", { mode: "boolean" }).notNull().default(false),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [unique("role_permission_unique").on(table.role, table.moduleKey)],
);
