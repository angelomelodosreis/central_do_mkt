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
  "portfolio",
  "audience",
  "seasonality",
  "previous_cycle",
  "external",
] as const;
export type DiagnosisLens = (typeof DIAGNOSIS_LENSES)[number];

export const DIAGNOSIS_LENS_LABELS: Record<DiagnosisLens, string> = {
  portfolio: "Portfólio",
  audience: "Público",
  seasonality: "Ano e sazonalidade",
  previous_cycle: "Ciclo anterior",
  external: "Externo e capacidade",
};

export const DIAGNOSIS_LENS_QUESTIONS: Record<DiagnosisLens, string> = {
  portfolio:
    "O que carrega o ciclo, o que estagnou e onde está a lacuna do portfólio?",
  audience: "Quem atendemos e o que o público sente que ainda não respondemos?",
  seasonality: "O que dita a demanda ao longo do ano e onde estão os vazios?",
  previous_cycle:
    "O que prometemos no ciclo anterior e o que de fato aconteceu?",
  external:
    "O que muda fora de casa — concorrência, canais — e o que nos limita dentro?",
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
