import {
  sqliteTable,
  text,
  integer,
  index,
  unique,
} from "drizzle-orm/sqlite-core";

import { businessUnit } from "./business-units.schema";

/**
 * Estrutura ORGANIZACIONAL: Setor → Subsetor → Time.
 *
 * Separada da estrutura de NEGÓCIO (Divisão → BU → Produto, em
 * `business.schema.ts`) porque as duas respondem a perguntas diferentes: aqui
 * é "onde a pessoa trabalha"; lá é "sobre o que ela trabalha". Um designer
 * atende BUs de duas divisões sem mudar de time, e um coordenador médico
 * pertence a uma BU sem estar em time nenhum do marketing — nenhum dos dois
 * caberia numa árvore só.
 */

/**
 * Que nível da estrutura esta unidade ocupa.
 *
 * Os três níveis moram na MESMA tabela, com `parentOrgUnitId` ligando um ao
 * outro, em vez de três tabelas. Três tabelas obrigariam a escrever "de que
 * nível é este id?" em cada consulta de escopo, e a duplicar a lógica de
 * descendência três vezes — sendo que a pergunta que o sistema faz é sempre a
 * mesma: "o que está abaixo disto?".
 */
export const ORG_UNIT_KINDS = ["sector", "subsector", "team"] as const;
export type OrgUnitKind = (typeof ORG_UNIT_KINDS)[number];

export const ORG_UNIT_KIND_LABELS: Record<OrgUnitKind, string> = {
  sector: "Setor",
  subsector: "Subsetor",
  team: "Time",
};

/** Plural, para títulos de listagem. */
export const ORG_UNIT_KIND_PLURALS: Record<OrgUnitKind, string> = {
  sector: "Setores",
  subsector: "Subsetores",
  team: "Times",
};

/**
 * Unidade organizacional: um setor, um subsetor ou um time.
 *
 * A tabela continua se chamando `team` por compatibilidade — tarefas,
 * vínculos e cargos já apontam para ela, e renomear a tabela custaria uma
 * migração grande sem mudar nada de comportamento. O que mudou é a natureza:
 * `kind` diz qual nível, `parentOrgUnitId` diz de quem depende.
 */
export const team = sqliteTable(
  "team",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    description: text("description"),
    kind: text("kind").notNull().default("team").$type<OrgUnitKind>(),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    /**
     * Unidade acima desta. `null` = raiz (um setor).
     *
     * É o que permite que responsabilidade sobre "Conteúdo" alcance Design,
     * Copy, Videomakers, Social e Comunicação sem que ninguém precise cadastrar
     * as cinco: o escopo desce a árvore.
     */
    parentOrgUnitId: text("parent_org_unit_id"),
    createdBy: text("created_by"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    index("team_is_active_idx").on(table.isActive),
    index("team_parent_idx").on(table.parentOrgUnitId),
    index("team_kind_idx").on(table.kind),
  ],
);

/**
 * Quem está em qual unidade organizacional.
 *
 * Plural por natureza: um designer atende três frentes, quem coordena responde
 * por mais de uma. Com uma coluna em `user`, qualquer um desses casos obrigava
 * a escolher um time e mentir sobre o resto.
 *
 * O CARGO não mora aqui — mora na pessoa (`user.jobTitleId`). Já morou aqui, e
 * estava errado: "Supervisor de Design" é o cargo da pessoa, não um papel que
 * ela assume ao entrar num time. Quem participa de três times não tem três
 * cargos; tem um cargo e três frentes de trabalho.
 */
export const teamMember = sqliteTable(
  "team_member",
  {
    id: text("id").primaryKey(),
    teamId: text("team_id")
      .notNull()
      .references(() => team.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    /** Responde pela unidade. */
    isLead: integer("is_lead", { mode: "boolean" }).notNull().default(false),
    /**
     * A unidade que representa a pessoa onde só cabe uma.
     *
     * Necessário porque a interface tem lugares de uma linha — o rodapé do
     * menu, a assinatura numa listagem. Sem eleger uma, esses lugares teriam de
     * escolher arbitrariamente, e a escolha mudaria a cada consulta.
     */
    isPrimary: integer("is_primary", { mode: "boolean" })
      .notNull()
      .default(false),
    createdBy: text("created_by"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    unique("team_member_unique").on(table.teamId, table.userId),
    index("team_member_user_idx").on(table.userId),
    index("team_member_team_idx").on(table.teamId),
  ],
);

/**
 * Catálogo de cargos da empresa. Ex.: Designer, Coordenadora de Branding.
 *
 * GLOBAL, e não por time — foi por time e estava errado. Os cargos reais já
 * carregam a área no próprio nome ("Analista de Planejamento de Marketing",
 * "Supervisor de Design"), então repetir a área na estrutura criava dois
 * lugares para a mesma informação, que divergiam. Além disso, cargo acompanha a
 * pessoa: quem muda de time continua Designer.
 *
 * DELIBERADAMENTE separado de `user.role`. O papel é a chave da matriz de
 * permissões; o cargo é organograma. Se o cargo fosse chave de permissão, criar
 * um cargo novo passaria a exigir uma linha por módulo na matriz — e duas
 * pessoas com o mesmo cargo têm, comprovadamente, responsabilidades diferentes.
 */
export const jobTitle = sqliteTable(
  "job_title",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    /**
     * Unidade organizacional típica deste cargo, quando existe.
     *
     * É só uma dica para agrupar o seletor — "Copywriter" costuma ser do Copy —
     * e NÃO restringe: nada impede atribuir um cargo a alguém de outra unidade.
     * Restringir travaria o caso real de quem acumula frentes.
     */
    suggestedTeamId: text("suggested_team_id"),
    /** Ordem hierárquica, do mais sênior para o mais júnior. */
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    createdBy: text("created_by"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    index("job_title_is_active_idx").on(table.isActive),
    index("job_title_team_idx").on(table.suggestedTeamId),
  ],
);

/**
 * Squad: a equipe multidisciplinar montada em torno de uma BU.
 *
 * NÃO é um time. O time diz onde a pessoa está organizacionalmente; o squad
 * reúne, para uma BU, gente de vários times mais os coordenadores e diretores
 * médicos — que não pertencem ao marketing. Tratar os dois como a mesma coisa
 * obrigaria a inventar um time falso para o médico, ou a deixá-lo de fora do
 * squad que ele integra.
 *
 * Nasce da BU (uma por BU, criada junto), mas é entidade própria: um squad pode
 * ser desativado enquanto a BU segue ativa — é o estado "esta BU ainda não tem
 * equipe montada", que sem a tabela ficaria indistinguível de "não sei".
 */
export const squad = sqliteTable(
  "squad",
  {
    id: text("id").primaryKey(),
    businessUnitId: text("business_unit_id")
      .notNull()
      .references(() => businessUnit.id, { onDelete: "cascade" }),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    description: text("description"),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    createdBy: text("created_by"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [index("squad_business_unit_idx").on(table.businessUnitId)],
);

/**
 * Quem compõe o squad.
 *
 * Substitui `business_unit_member`, e a diferença não é só de nome: o vínculo
 * agora é com o squad, que é a coisa administrável (participantes,
 * responsáveis, situação), enquanto a BU segue sendo o conceito de negócio.
 *
 * É esta tabela que recorta o que o analista vê: fora dos seus squads, o
 * planejamento alheio simplesmente não existe para ele.
 */
export const squadMember = sqliteTable(
  "squad_member",
  {
    id: text("id").primaryKey(),
    squadId: text("squad_id")
      .notNull()
      .references(() => squad.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    /**
     * Responde pelo squad. Vários membros trabalham nele; o responsável é quem
     * aparece como referência na listagem e nos relatórios.
     */
    isLead: integer("is_lead", { mode: "boolean" }).notNull().default(false),
    createdBy: text("created_by"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    unique("squad_member_unique").on(table.squadId, table.userId),
    index("squad_member_user_idx").on(table.userId),
    index("squad_member_squad_idx").on(table.squadId),
  ],
);

export type Team = typeof team.$inferSelect;
export type TeamMember = typeof teamMember.$inferSelect;
export type JobTitle = typeof jobTitle.$inferSelect;
export type Squad = typeof squad.$inferSelect;
export type SquadMember = typeof squadMember.$inferSelect;
