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

    /**
     * Administrador da plataforma.
     *
     * SEPARADO do papel e dos escopos de propósito. Papel e escopo descrevem
     * responsabilidade sobre o negócio — quem responde por Conteúdo, por uma
     * divisão, por uma BU. Isto aqui é a chave de fenda: mexer em permissões,
     * domínios de e-mail, bases oficiais e auditoria.
     *
     * As duas coisas se acumulam na mesma pessoa hoje, mas são revogáveis em
     * separado, e é exatamente por isso que não podem ser o mesmo campo: no dia
     * em que alguém sair da gestão sem sair da plataforma (ou o contrário),
     * um campo só obrigaria a escolher entre tirar demais e tirar de menos.
     */
    isSuperAdmin: integer("is_super_admin", { mode: "boolean" })
      .notNull()
      .default(false),

    /**
     * Cargo da pessoa — informação organizacional, não permissão.
     *
     * Mora aqui, e não no vínculo com o time, porque o cargo acompanha a
     * pessoa: quem participa de três frentes não tem três cargos. Já morou no
     * vínculo, e produzia a pergunta sem resposta "qual dos três é o cargo
     * dela?" toda vez que a interface tinha uma linha só.
     *
     * Os TIMES continuam em `team_member`, no plural — essa parte estava certa.
     */
    jobTitleId: text("job_title_id"),

    /**
     * Se a pessoa já registrou um app autenticador e confirmou um código.
     *
     * Campo do plugin `twoFactor` do better-auth — o nome é contrato dele.
     * Não é a permissão de entrar: a exigência do segundo fator vale para todo
     * mundo, e é `false` aqui que manda a pessoa para o cadastro.
     */
    twoFactorEnabled: integer("two_factor_enabled", { mode: "boolean" })
      .notNull()
      .default(false),

    approvedBy: text("approved_by"),
    approvedAt: integer("approved_at", { mode: "timestamp" }),

    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    index("user_status_idx").on(table.status),
    index("user_role_idx").on(table.role),
    index("user_job_title_idx").on(table.jobTitleId),
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

    /**
     * Quando ESTA sessão confirmou um código do app autenticador.
     *
     * Fica na sessão, e não no usuário, porque é isso que faz o segundo fator
     * ser um segundo fator: guardado no usuário, ele valeria uma vez na vida e
     * qualquer cookie roubado depois disso entraria sem passar por nada.
     *
     * Nulo significa "esta sessão ainda não confirmou" — inclusive nas sessões
     * que já existiam antes desta coluna, que é o comportamento correto: todo
     * mundo confirma uma vez ao voltar.
     */
    twoFactorVerifiedAt: integer("two_factor_verified_at", {
      mode: "timestamp",
    }),

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

/**
 * ── SEGUNDO FATOR ──────────────────────────────────────────────────────────
 *
 * O segredo TOTP de cada pessoa, gerenciado pelo plugin `twoFactor` do
 * better-auth. A tabela é declarada aqui porque o adaptador do Drizzle precisa
 * encontrá-la pelo nome do modelo (`twoFactor`) — os nomes das PROPRIEDADES
 * abaixo são contrato do plugin e não podem ser renomeados; os nomes das
 * COLUNAS são nossos.
 *
 * `secret` e `backupCodes` são gravados CIFRADOS, com uma chave derivada de
 * `BETTER_AUTH_SECRET`. A consequência prática merece estar escrita: trocar
 * esse segredo invalida o cadastro de todo mundo, e cada pessoa precisará
 * registrar o app de novo.
 */
export const twoFactor = sqliteTable(
  "two_factor",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** Segredo TOTP cifrado. Nunca sai do servidor. */
    secret: text("secret").notNull(),
    /** Códigos de recuperação cifrados, para quando o celular se perde. */
    backupCodes: text("backup_codes").notNull(),
    /**
     * Se a pessoa chegou a confirmar um código depois de ler o QR.
     *
     * Existe porque cadastrar e confirmar são momentos diferentes: quem lê o
     * QR e fecha a aba antes de digitar o código não pode ficar trancado para
     * fora com um segredo que nunca entrou em nenhum app.
     */
    verified: integer("verified", { mode: "boolean" }).notNull().default(false),
    /** Tentativas erradas seguidas. Zera a cada acerto. */
    failedVerificationCount: integer("failed_verification_count")
      .notNull()
      .default(0),
    /** Até quando a conta fica bloqueada depois de erros demais. */
    lockedUntil: integer("locked_until", { mode: "timestamp" }),
  },
  (table) => [
    index("two_factor_user_idx").on(table.userId),
    index("two_factor_secret_idx").on(table.secret),
  ],
);

export type TwoFactor = typeof twoFactor.$inferSelect;
