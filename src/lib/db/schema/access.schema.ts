import {
  sqliteTable,
  text,
  integer,
  index,
  unique,
} from "drizzle-orm/sqlite-core";

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
  "panorama",
  "tasks",
  "parameters",
  "admin",
] as const;
export type ModuleKey = (typeof MODULE_KEYS)[number];

export const MODULE_LABELS: Record<ModuleKey, string> = {
  name_generator: "Gerador de Nomes",
  documentation: "Documentação",
  personas: "Personas",
  strategy: "Planejamento",
  panorama: "Panorama",
  tasks: "Tarefas",
  // A chave continua `parameters` porque é ela que está gravada nas linhas da
  // matriz; o que mudou foi o alcance. Deixou de ser um menu à parte e passou a
  // ser o que separa quem USA o Gerador de Nomes de quem DEFINE os modelos que
  // ele monta — a única coisa que aquele menu de fato controlava.
  parameters: "Modelos de nomenclatura",
  admin: "Administração",
};

export const MODULE_DESCRIPTIONS: Record<ModuleKey, string> = {
  name_generator: "Montar nomes padronizados a partir dos modelos.",
  documentation: "Biblioteca de processos, bases e regras de negócio.",
  personas: "Personas de cada Business Unit.",
  strategy: "Planejamento anual, calendário, metas e diagnóstico das BUs.",
  panorama:
    "Números e agenda de todas as BUs de uma vez. Editar aqui é lançar o resultado semanal.",
  tasks: "Delegar tarefas. Executar as próprias não depende desta permissão.",
  parameters: "Criar e editar os modelos que o Gerador de Nomes monta.",
  admin: "Usuários, acessos, bases oficiais e auditoria.",
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

/**
 * Sobre QUE entidades a pessoa exerce o que o papel lhe permite.
 *
 * O papel (`role_permission`) responde "o que ela pode fazer"; esta tabela
 * responde "sobre o quê". Os dois são necessários porque nenhum dos dois
 * sozinho descreve a realidade: duas pessoas com o mesmo cargo e o mesmo papel
 * têm alcances diferentes — uma responde por um time, a outra por três.
 *
 * O escopo HERDA para baixo. Responsabilidade sobre o subsetor Conteúdo alcança
 * Design, Copy, Videomakers, Social e Comunicação sem cadastrar os cinco;
 * responsabilidade sobre uma divisão alcança as BUs dela e os squads delas.
 * Cadastrar folha por folha é o que faz um modelo de acesso apodrecer: o time
 * novo nasce fora do escopo de quem deveria responder por ele, e ninguém nota.
 */
export const SCOPE_TYPES = [
  "organization",
  "org_unit",
  "division",
  "business_unit",
  "squad",
] as const;
export type ScopeType = (typeof SCOPE_TYPES)[number];

export const SCOPE_TYPE_LABELS: Record<ScopeType, string> = {
  organization: "Toda a organização",
  org_unit: "Área, subárea ou time",
  division: "Divisão de negócio",
  business_unit: "Business Unit",
  squad: "Squad",
};

/**
 * Um escopo de responsabilidade concedido a uma pessoa.
 *
 * `scopeId` é nulo apenas em `organization`, que não tem alvo — é o escopo de
 * quem responde pela frente inteira.
 *
 * NÃO confundir com administração da plataforma (`user.isSuperAdmin`): quem
 * responde pelo negócio inteiro não necessariamente mexe em permissões,
 * domínios de e-mail e auditoria, e quem constrói a plataforma não
 * necessariamente responde por alguma frente. Os dois conceitos ficam
 * separados porque são revogáveis em separado.
 */
export const accessGrant = sqliteTable(
  "access_grant",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    scopeType: text("scope_type").notNull().$type<ScopeType>(),
    /** Alvo do escopo. Nulo em `organization`. */
    scopeId: text("scope_id"),
    /** Anotação de quem concedeu — por que essa pessoa tem esse alcance. */
    note: text("note"),
    grantedBy: text("granted_by"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    unique("access_grant_unique").on(
      table.userId,
      table.scopeType,
      table.scopeId,
    ),
    index("access_grant_user_idx").on(table.userId),
    index("access_grant_scope_idx").on(table.scopeType, table.scopeId),
  ],
);

export type AccessGrant = typeof accessGrant.$inferSelect;
