import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

/**
 * Papéis de acesso da plataforma.
 * - admin:  acesso total, aprova cadastros, gerencia permissões
 * - leader: líder de frente; pode receber permissão de aprovar membros (futuro)
 * - member: usuário comum do time de marketing
 */
/**
 * Papéis, do maior para o menor alcance — é a ordem em que aparecem no seletor.
 *
 * - admin:  governa acessos, permissões e auditoria
 * - leader: define os parâmetros que os outros usam (nomenclaturas)
 * - editor: produz conteúdo — documentação, personas e calendário estratégico
 * - member: consulta
 *
 * A escada é só de leitura: quem manda de fato é a matriz `role_permission`,
 * papel × módulo, editável na tela de Permissões sem deploy.
 */
export const USER_ROLES = ["admin", "leader", "editor", "member"] as const;
export type UserRole = (typeof USER_ROLES)[number];

/**
 * Rótulos dos papéis.
 *
 * Ficam aqui, ao lado do enum, para haver uma só fonte: já existiram duas
 * cópias desta tabela (interface e tela de permissões) e elas divergiram na
 * primeira vez que um papel foi acrescentado.
 */
export const USER_ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrador",
  leader: "Líder",
  editor: "Editor",
  member: "Membro",
};

/**
 * Situação do cadastro.
 * - pending:   cadastrou-se, aguarda aprovação manual. Não acessa nada.
 * - active:    aprovado, acessa conforme o papel.
 * - suspended: acesso revogado. As sessões são derrubadas imediatamente.
 */
export const USER_STATUSES = ["pending", "active", "suspended"] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

/**
 * Tabela de usuários. Os campos `id`, `name`, `email`, `emailVerified`, `image`,
 * `createdAt` e `updatedAt` são exigidos pelo better-auth; os demais são nossos.
 */
export const user = sqliteTable(
  "user",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: integer("email_verified", { mode: "boolean" })
      .notNull()
      .default(false),
    image: text("image"),

    // Domínio do e-mail, desnormalizado para facilitar filtros e relatórios no admin.
    emailDomain: text("email_domain").notNull(),

    status: text("status").notNull().default("pending").$type<UserStatus>(),
    role: text("role").notNull().default("member").$type<UserRole>(),

    approvedBy: text("approved_by"),
    approvedAt: integer("approved_at", { mode: "timestamp" }),

    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    index("user_status_idx").on(table.status),
    index("user_role_idx").on(table.role),
  ],
);

/**
 * Sessões persistidas no banco (não JWT). É isso que permite derrubar o acesso
 * de um usuário suspenso imediatamente, em vez de esperar um token expirar.
 */
export const session = sqliteTable(
  "session",
  {
    id: text("id").primaryKey(),
    token: text("token").notNull().unique(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [index("session_user_id_idx").on(table.userId)],
);

/** Vínculo com o provedor social (Google). Gerenciado pelo better-auth. */
export const account = sqliteTable(
  "account",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    accessTokenExpiresAt: integer("access_token_expires_at", {
      mode: "timestamp",
    }),
    refreshTokenExpiresAt: integer("refresh_token_expires_at", {
      mode: "timestamp",
    }),
    scope: text("scope"),
    idToken: text("id_token"),
    password: text("password"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [index("account_user_id_idx").on(table.userId)],
);

/** Tokens de verificação. Exigida pelo better-auth. */
export const verification = sqliteTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);
