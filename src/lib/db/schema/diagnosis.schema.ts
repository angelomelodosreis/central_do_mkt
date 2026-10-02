import {
  sqliteTable,
  text,
  integer,
  real,
  index,
  primaryKey,
  unique,
} from "drizzle-orm/sqlite-core";

import {
  strategyCycle,
  strategyGoal,
  type GoalMetric,
} from "./strategy.schema";
import { businessUnit } from "./business-units.schema";

/**
 * ── DIAGNÓSTICO ────────────────────────────────────────────────────────────
 *
 * A meta precisa apoiar-se em algo verificável. O campo "por que este é o foco
 * agora", em Metas, é a CONCLUSÃO de um diagnóstico; é aqui que fica o
 * diagnóstico em si.
 *
 * O risco desta ferramenta é conhecido: virar um formulário de dezenas de campos
 * que alguém preenche às pressas em janeiro e ninguém abre de novo. Duas regras
 * de projeto existem para evitá-lo:
 *
 *   1. As lentes já chegam preenchidas com o que a plataforma sabe (produtos sem
 *      janela de venda, dores de persona sem solução, meses vazios no
 *      calendário, a meta do ciclo passado). O analista julga a evidência em vez
 *      de redigitá-la.
 *   2. Todo achado pode ser apontado por uma meta, e a tela mostra os dois lados
 *      órfãos: achado sem meta é pauta que se decidiu ignorar; meta sem achado é
 *      meta que ninguém sustentou. Sem esse fechamento, o diagnóstico seria
 *      decoração.
 */

/**
 * As lentes do diagnóstico.
 *
 * Não é SWOT de propósito: "oportunidade" e "ameaça" produzem listas que ninguém
 * usa. Cada lente aqui corresponde a uma decisão de marketing que a BU toma de
 * fato, e as quatro primeiras têm evidência que a própria plataforma calcula.
 */
export const DIAGNOSIS_LENSES = [
  "negocio_mercado",
  "cliente_marca",
  "portfolio_oferta",
  "funil_conversao",
  "contexto_capacidade",
] as const;
export type DiagnosisLens =
  | (typeof DIAGNOSIS_LENSES)[number]
  | "portfolio"
  | "audience"
  | "seasonality"
  | "previous_cycle"
  | "external";

export const DIAGNOSIS_LENS_LABELS: Record<string, string> = {
  negocio_mercado: "1. Negócio e mercado",
  cliente_marca: "2. Cliente e marca",
  portfolio_oferta: "3. Portfólio e oferta",
  funil_conversao: "4. Funil e conversão",
  contexto_capacidade: "5. Contexto e capacidade",
  portfolio: "Portfólio e oferta",
  audience: "Cliente e marca",
  seasonality: "Contexto e capacidade",
  previous_cycle: "Negócio e mercado",
  external: "Funil e conversão",
};

export const DIAGNOSIS_LENS_QUESTIONS: Record<string, string> = {
  negocio_mercado: "Onde estamos e como estamos em relação ao mercado?",
  cliente_marca: "Estamos relevantes para o público certo?",
  portfolio_oferta: "Nossa oferta continua competitiva e adequada ao mercado?",
  funil_conversao: "Estamos conseguindo transformar demanda em resultado?",
  contexto_capacidade: "Temos as condições para sustentar o crescimento?",
  portfolio: "Nossa oferta continua competitiva e adequada ao mercado?",
  audience: "Estamos relevantes para o público certo?",
  seasonality: "Temos as condições para sustentar o crescimento?",
  previous_cycle: "Onde estamos e como estamos em relação ao mercado?",
  external: "Estamos conseguindo transformar demanda em resultado?",
};

export const DIAGNOSIS_LENS_PROVOCATIONS: Record<string, string> = {
  negocio_mercado:
    "Estamos crescendo? Perdemos volume? O mercado cresceu mais que a MedCof? Estamos ganhando ou perdendo participação? Entraram concorrentes mais agressivos?",
  cliente_marca:
    "Perdemos algum público? Estamos conseguindo alcançar novos segmentos? A marca continua sendo considerada? Perdemos relevância ou diferenciação? As necessidades do público mudaram?",
  portfolio_oferta:
    "Estamos concentrados demais em um produto? Algum produto perdeu relevância? Temos alguma necessidade importante sem solução? Perdemos competitividade em preço ou valor percebido?",
  funil_conversao:
    "A conversão piorou? Estamos gerando leads suficientes? Em qual etapa estamos perdendo pessoas? O problema está em aquisição, oferta, experiência ou venda?",
  contexto_capacidade:
    "Estamos aproveitando as melhores janelas do ano? Existem períodos em que deixamos oportunidades na mesa? Temos equipe, verba e capacidade operacional para crescer? O que pode limitar o próximo ciclo?",
};

export const DIAGNOSIS_LENS_EVIDENCE_HINTS: Record<string, string> = {
  negocio_mercado:
    "Faturamento, vendas, crescimento, tamanho do mercado, market share, concorrência",
  cliente_marca:
    "Personas, base de alunos, aquisição, pesquisas, awareness, consideração, percepção de marca",
  portfolio_oferta:
    "Vendas e faturamento por produto, mix, ticket, preços, ofertas, concorrência, pesquisas de mercado",
  funil_conversao:
    "Leads, leads qualificados, conversão, CAC, CPL, ROAS, canais, vendas, funil",
  contexto_capacidade:
    "Sazonalidade, calendário, eventos, orçamento, equipe, capacidade operacional",
};

/**
 * A natureza de um achado.
 *
 * Três categorias que puxam decisão, em vez das quatro do SWOT que puxam lista:
 * uma alavanca pede que se empurre, uma fragilidade pede que se conserte, e uma
 * aposta em aberto pede que se teste ou se recuse explicitamente.
 */
export const FINDING_KINDS = ["lever", "weakness", "open_bet"] as const;
export type FindingKind = (typeof FINDING_KINDS)[number];

export const FINDING_KIND_LABELS: Record<FindingKind, string> = {
  lever: "Alavanca",
  weakness: "Fragilidade",
  open_bet: "Aposta em aberto",
};

export const FINDING_KIND_HINTS: Record<FindingKind, string> = {
  lever: "Funciona e dá para empurrar mais",
  weakness: "Não funciona e está custando",
  open_bet: "Incerteza que ninguém testou ainda",
};

/**
 * Uma rodada de diagnóstico.
 *
 * O diagnóstico é periódico (a cada 3 a 6 meses) e não anual: uma leitura de
 * janeiro está velha em julho, e é justamente na virada do semestre que a meta é
 * revisada. Cada rodada é um retrato datado — o que permite comparar o que a BU
 * enxergava em fevereiro com o que passou a enxergar em agosto.
 */
export const strategyRound = sqliteTable(
  "strategy_round",
  {
    id: text("id").primaryKey(),
    cycleId: text("cycle_id")
      .notNull()
      .references(() => strategyCycle.id, { onDelete: "cascade" }),
    /** Ordem dentro do ciclo: 1ª, 2ª, 3ª rodada. */
    sequence: integer("sequence").notNull(),
    /** Data de referência da leitura — não a de digitação. */
    referenceDate: integer("reference_date", { mode: "timestamp" }).notNull(),
    /**
     * Rodada aberta ainda aceita edição e é a que recebe o vínculo das metas.
     * Fechada fica como registro histórico.
     */
    isOpen: integer("is_open", { mode: "boolean" }).notNull().default(true),
    /** A leitura geral da rodada, escrita depois dos achados. */
    summary: text("summary"),
    /** Parte 2: Qual é o principal desafio da BU hoje? */
    mainChallenge: text("main_challenge"),
    /** Parte 2: Qual é a principal oportunidade de crescimento? */
    mainOpportunity: text("main_opportunity"),
    /** Parte 3: Objetivo do Ciclo (ex: Ser o preparatório número 1 de aprovados no TEGO) */
    cycleObjective: text("cycle_objective"),
    /** Parte 3: Período do Ciclo (ex: Jan - Jun/2027) */
    cyclePeriod: text("cycle_period"),
    createdBy: text("created_by"),
    updatedBy: text("updated_by"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    unique("strategy_round_sequence_unique").on(table.cycleId, table.sequence),
    index("strategy_round_cycle_idx").on(table.cycleId),
  ],
);

/** Um achado de uma lente, numa rodada. */
export const strategyFinding = sqliteTable(
  "strategy_finding",
  {
    id: text("id").primaryKey(),
    roundId: text("round_id")
      .notNull()
      .references(() => strategyRound.id, { onDelete: "cascade" }),
    lens: text("lens").notNull().$type<DiagnosisLens>(),
    kind: text("kind").notNull().$type<FindingKind>(),
    /** A frase do achado. Curta de propósito: achado longo é análise, não achado. */
    statement: text("statement").notNull(),
    /** De onde saiu — o dado, a conversa, o relatório. */
    evidence: text("evidence"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdBy: text("created_by"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    index("strategy_finding_round_idx").on(table.roundId),
    index("strategy_finding_lens_idx").on(table.roundId, table.lens),
  ],
);

/**
 * O realizado de um indicador, na data da rodada.
 *
 * É a base factual do diagnóstico: sem ela, "ficamos abaixo em captação" é
 * opinião. Fica na rodada, e não em grade mensal, porque o acompanhamento do dia
 * a dia é do dashboard — aqui só se registra o retrato que sustenta a leitura,
 * na frequência em que a leitura é feita.
 *
 * O alvo NÃO se repete aqui: ele vive na meta, e é de lá que a comparação sai.
 */
export const strategyMeasurement = sqliteTable(
  "strategy_measurement",
  {
    id: text("id").primaryKey(),
    roundId: text("round_id")
      .notNull()
      .references(() => strategyRound.id, { onDelete: "cascade" }),
    metric: text("metric").notNull().$type<GoalMetric>(),
    actual: real("actual").notNull(),
    note: text("note"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    unique("strategy_measurement_unique").on(table.roundId, table.metric),
    index("strategy_measurement_round_idx").on(table.roundId),
  ],
);

/**
 * O que liga a meta ao diagnóstico.
 *
 * Muitos-para-muitos porque um achado costuma justificar mais de uma meta (uma
 * fragilidade de captação aparece no ciclo e no semestre), e uma meta responde a
 * mais de um achado. É esta tabela que permite o relatório de órfãos das duas
 * pontas.
 */
export const strategyGoalFinding = sqliteTable(
  "strategy_goal_finding",
  {
    goalId: text("goal_id")
      .notNull()
      .references(() => strategyGoal.id, { onDelete: "cascade" }),
    findingId: text("finding_id")
      .notNull()
      .references(() => strategyFinding.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.goalId, table.findingId] }),
    index("strategy_goal_finding_finding_idx").on(table.findingId),
  ],
);

/**
 * O histórico de revisão de uma meta.
 *
 * Guarda o estado ANTERIOR a cada alteração, com o motivo e a rodada em que
 * aconteceu. A trilha de auditoria já registra quem mudou o quê, mas ela é
 * ferramenta de administração: aqui a revisão é conteúdo do produto — o time
 * precisa ver, na própria meta, que ela foi revisada em agosto e por quê.
 *
 * Sem isto não há como distinguir uma meta que foi revisada e mantida de uma que
 * ninguém nunca revisitou.
 */
export const strategyGoalRevision = sqliteTable(
  "strategy_goal_revision",
  {
    id: text("id").primaryKey(),
    goalId: text("goal_id")
      .notNull()
      .references(() => strategyGoal.id, { onDelete: "cascade" }),
    /** A rodada em que a revisão aconteceu, quando havia uma aberta. */
    roundId: text("round_id").references(() => strategyRound.id, {
      onDelete: "set null",
    }),
    /** Por que a meta mudou. Em branco quando foi só ajuste de redação. */
    reason: text("reason"),
    /** O estado anterior completo, para leitura lado a lado. */
    snapshot: text("snapshot", { mode: "json" }).$type<
      Record<string, unknown>
    >(),
    changedBy: text("changed_by"),
    changedAt: integer("changed_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [index("strategy_goal_revision_goal_idx").on(table.goalId)],
);

export type StrategyRound = typeof strategyRound.$inferSelect;
export type StrategyFinding = typeof strategyFinding.$inferSelect;
export type StrategyMeasurement = typeof strategyMeasurement.$inferSelect;
export type StrategyGoalRevision = typeof strategyGoalRevision.$inferSelect;

/**
 * ── REVISÃO TRIMESTRAL (CADÊNCIA DE 3 MESES) ──────────────────────────────
 *
 * Rito trimestral para checar a validade do diagnóstico inicial e das metas:
 * 1. O diagnóstico feito há 3 meses ainda é válido?
 * 2. O que mudou no mercado, no cliente ou na concorrência?
 * 3. Surgiram novos problemas que não estavam no diagnóstico inicial?
 * 4. Deixamos de aproveitar alguma oportunidade importante?
 * 5. As premissas que sustentavam o objetivo ainda se mantêm?
 * 6. Precisamos revisar alguma meta para o próximo trimestre?
 * 7. Qual é o foco principal dos próximos 3 meses?
 */
export const strategyQuarterlyReview = sqliteTable(
  "strategy_quarterly_review",
  {
    id: text("id").primaryKey(),
    businessUnitId: text("business_unit_id")
      .notNull()
      .references(() => businessUnit.id, { onDelete: "restrict" }),
    cycleId: text("cycle_id").references(() => strategyCycle.id, {
      onDelete: "cascade",
    }),
    roundId: text("round_id").references(() => strategyRound.id, {
      onDelete: "set null",
    }),
    quarter: text("quarter").notNull(), // "Q1", "Q2", "Q3", "Q4"
    reviewDate: integer("review_date", { mode: "timestamp" }).notNull(),
    diagnosticValid: text("diagnostic_valid"), // 'sim' | 'nao' | 'parcialmente'
    marketChanges: text("market_changes"),
    newProblems: text("new_problems"),
    missedOpportunities: text("missed_opportunities"),
    objectiveAssumptions: text("objective_assumptions"),
    needsGoalRevision: text("needs_goal_revision"), // 'sim' | 'nao'
    nextQuarterFocus: text("next_quarter_focus"),
    status: text("status").notNull().default("completed"),
    createdBy: text("created_by"),
    updatedBy: text("updated_by"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    index("strategy_quarterly_review_bu_idx").on(table.businessUnitId),
    index("strategy_quarterly_review_cycle_idx").on(table.cycleId),
  ],
);

export type StrategyQuarterlyReview =
  typeof strategyQuarterlyReview.$inferSelect;
