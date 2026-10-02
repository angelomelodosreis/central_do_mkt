import {
  sqliteTable,
  text,
  integer,
  real,
  index,
  unique,
} from "drizzle-orm/sqlite-core";

import { businessUnit } from "./business-units.schema";

/**
 * Ciclo de planejamento de uma BU.
 *
 * Tem início e fim próprios, e não ano-calendário: o ano útil de Residência é
 * ditado pelo calendário de provas, não por janeiro–dezembro. Tudo no módulo
 * pendura num ciclo, o que também é o que permite virar o ano sem apagar o
 * planejamento anterior.
 */
export const strategyCycle = sqliteTable(
  "strategy_cycle",
  {
    id: text("id").primaryKey(),
    businessUnitId: text("business_unit_id")
      .notNull()
      .references(() => businessUnit.id, { onDelete: "restrict" }),
    /** Único dentro da BU. Ex.: `2026` */
    slug: text("slug").notNull(),
    /** Nome exibido no seletor. Ex.: "Residência · 2026" */
    name: text("name").notNull(),
    startsAt: integer("starts_at", { mode: "timestamp" }).notNull(),
    endsAt: integer("ends_at", { mode: "timestamp" }).notNull(),
    /** O ciclo que abre por padrão para esta BU. */
    isCurrent: integer("is_current", { mode: "boolean" })
      .notNull()
      .default(false),
    createdBy: text("created_by"),
    updatedBy: text("updated_by"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    unique("strategy_cycle_slug_unique").on(table.businessUnitId, table.slug),
    index("strategy_cycle_business_unit_idx").on(table.businessUnitId),
  ],
);

/**
 * Como um produto ocupa o calendário.
 *
 * - `one_time`: acontece em janelas (Atualizações, Boot Camp, Revisão, Hands On)
 * - `ongoing`:  corre ao longo do ciclo (Extensivo, Semi-extensivo, HIIT)
 *
 * É esta distinção que a "esteira de produtos" mostra de bater o olho.
 */
export const PRODUCT_CADENCES = ["one_time", "ongoing"] as const;
export type ProductCadence = (typeof PRODUCT_CADENCES)[number];

export const PRODUCT_CADENCE_LABELS: Record<ProductCadence, string> = {
  one_time: "Pontual",
  ongoing: "Contínuo",
};

/**
 * Produto de uma BU.
 *
 * Nasce enxuto de propósito: no calendário ele serve para agrupar e colorir a
 * esteira. A estratégia completa de cada produto (proposta de valor, ciclo de
 * vida, metas) entra em `details` quando a área de Portfólio for construída —
 * o campo já existe para não exigir migração depois.
 */
export const strategyProduct = sqliteTable(
  "strategy_product",
  {
    id: text("id").primaryKey(),
    businessUnitId: text("business_unit_id")
      .notNull()
      .references(() => businessUnit.id, { onDelete: "restrict" }),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    cadence: text("cadence").notNull().$type<ProductCadence>(),
    /** Ex.: "Boot Camp", "Extensivo". Livre, para não engessar o portfólio. */
    family: text("family"),
    /** Campos estratégicos, definidos por preset em código. */
    details: text("details", { mode: "json" }).$type<Record<string, string>>(),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdBy: text("created_by"),
    updatedBy: text("updated_by"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    unique("strategy_product_slug_unique").on(table.businessUnitId, table.slug),
    index("strategy_product_business_unit_idx").on(table.businessUnitId),
  ],
);

/**
 * Camadas da linha do tempo.
 *
 * São o eixo de leitura do calendário: o analista liga e desliga camadas em vez
 * de caçar itens. Cada uma tem campos próprios, definidos em
 * `src/lib/modules/strategy/timeline-kinds.ts`.
 */
export const TIMELINE_KINDS = [
  "milestone",
  "seasonality",
  "launch",
  "event",
  "product_window",
  "communication",
] as const;
export type TimelineKind = (typeof TIMELINE_KINDS)[number];

/** Situação de um item, usada para os sinais visuais do calendário. */
export const TIMELINE_STATUSES = [
  "planned",
  "confirmed",
  "in_progress",
  "done",
  "at_risk",
  "cancelled",
] as const;
export type TimelineStatus = (typeof TIMELINE_STATUSES)[number];

/**
 * Tudo que tem data.
 *
 * Marco, sazonalidade, lançamento, evento, janela de venda de um produto e
 * frente de comunicação são o MESMO registro, distinguidos por `kind`. É esta
 * decisão que faz o calendário mostrar o ano inteiro sem que nada seja
 * cadastrado duas vezes — e que faz "principais momentos do ano", no
 * planejamento, ser literalmente este calendário filtrado.
 */
export const timelineItem = sqliteTable(
  "timeline_item",
  {
    id: text("id").primaryKey(),
    cycleId: text("cycle_id")
      .notNull()
      .references(() => strategyCycle.id, { onDelete: "cascade" }),
    kind: text("kind").notNull().$type<TimelineKind>(),
    title: text("title").notNull(),
    /** Uma frase de contexto. Aparece no painel, não no card. */
    summary: text("summary"),

    /** Período. Item de um dia só tem `startsAt` e `endsAt` no mesmo dia. */
    startsAt: integer("starts_at", { mode: "timestamp" }).notNull(),
    endsAt: integer("ends_at", { mode: "timestamp" }).notNull(),

    /** Vínculo opcional com um produto — é o que monta a esteira. */
    productId: text("product_id").references(() => strategyProduct.id, {
      onDelete: "set null",
    }),
    /** Responsável. Texto livre: nem todo responsável tem conta na plataforma. */
    owner: text("owner"),
    status: text("status").notNull().default("planned").$type<TimelineStatus>(),

    /** Campos próprios da categoria, conforme o preset em código. */
    details: text("details", { mode: "json" }).$type<Record<string, string>>(),

    createdBy: text("created_by"),
    updatedBy: text("updated_by"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    index("timeline_item_cycle_idx").on(table.cycleId),
    index("timeline_item_starts_at_idx").on(table.startsAt),
    index("timeline_item_product_idx").on(table.productId),
  ],
);

export type StrategyCycle = typeof strategyCycle.$inferSelect;
export type StrategyProduct = typeof strategyProduct.$inferSelect;
export type TimelineItem = typeof timelineItem.$inferSelect;

/**
 * ── METAS ──────────────────────────────────────────────────────────────────
 *
 * A meta é uma DEFINIÇÃO. O realizado mora ao lado, em `weekly_result`.
 *
 * Por muito tempo estas tabelas guardaram só o compromisso, e este comentário
 * explicava por quê: o realizado viria de um dashboard fora da plataforma, e
 * duas fontes para a mesma verdade divergem. A premissa caiu — o dashboard de
 * fora não existe de fato, e comparar BUs exige meta e realizado no mesmo
 * lugar. As duas coisas continuam em tabelas separadas porque são naturezas
 * diferentes: a meta se escreve uma vez por ciclo, o realizado toda semana.
 */

/**
 * Os três escopos em que uma meta é definida.
 *
 * O ciclo dá a direção do ano; os semestres a quebram em dois compromissos
 * verificáveis. Não há nível mensal de propósito: meta mensal é gestão de
 * execução, e a execução mora no calendário e nas tarefas.
 */
export const GOAL_SCOPES = ["cycle", "h1", "h2"] as const;
export type GoalScope = (typeof GOAL_SCOPES)[number];

export const GOAL_SCOPE_LABELS: Record<GoalScope, string> = {
  cycle: "Meta geral do ciclo",
  h1: "1º semestre",
  h2: "2º semestre",
};

export const GOAL_SCOPE_SHORT: Record<GoalScope, string> = {
  cycle: "Ciclo",
  h1: "1º sem.",
  h2: "2º sem.",
};

/** Como o número é escrito na tela. */
export type GoalMetricUnit =
  "count" | "currency" | "percent" | "ratio" | "score";

/**
 * Catálogo de indicadores sugeridos.
 *
 * É um catálogo fechado em código, e não um cadastro livre, por um motivo
 * específico: nome e unidade iguais em todas as BUs é o que permite somar e
 * comparar. Se cada BU escrevesse o seu, "Leads" e "Captação" seriam duas
 * colunas diferentes para a mesma coisa.
 *
 * O que o analista escolhe é QUAIS indicadores entram na meta dele — nenhum é
 * obrigatório. Uma BU de conteúdo pode metar alcance e engajamento sem nunca
 * tocar em faturamento, e continua comparável a quem meta faturamento.
 */
export const GOAL_METRIC_CATALOG = {
  // ── Captação ──
  leads: { label: "Leads captados", unit: "count", group: "capture" },
  cpl: { label: "Custo por lead (CPL)", unit: "currency", group: "capture" },
  media_spend: {
    label: "Investimento em mídia",
    unit: "currency",
    group: "capture",
  },
  site_sessions: { label: "Sessões no site", unit: "count", group: "capture" },
  lead_conversion: {
    label: "Conversão visitante → lead",
    unit: "percent",
    group: "capture",
  },
  list_subscribers: {
    label: "Inscritos na base",
    unit: "count",
    group: "capture",
  },
  social_followers: {
    label: "Novos seguidores",
    unit: "count",
    group: "capture",
  },
  reach: { label: "Alcance", unit: "count", group: "capture" },

  // ── Vendas ──
  sales: { label: "Vendas (matrículas)", unit: "count", group: "sales" },
  revenue: { label: "Faturamento", unit: "currency", group: "sales" },
  average_ticket: { label: "Ticket médio", unit: "currency", group: "sales" },
  sales_conversion: {
    label: "Conversão lead → venda",
    unit: "percent",
    group: "sales",
  },
  cac: { label: "Custo de aquisição (CAC)", unit: "currency", group: "sales" },
  roas: { label: "ROAS", unit: "ratio", group: "sales" },

  // ── Base e retenção ──
  active_students: {
    label: "Alunos ativos",
    unit: "count",
    group: "retention",
  },
  renewal_rate: {
    label: "Taxa de renovação",
    unit: "percent",
    group: "retention",
  },
  churn_rate: { label: "Churn", unit: "percent", group: "retention" },
  nps: { label: "NPS", unit: "score", group: "retention" },

  // ── Marca e conteúdo ──
  engagement_rate: {
    label: "Taxa de engajamento",
    unit: "percent",
    group: "brand",
  },
  email_open_rate: {
    label: "Abertura de e-mail",
    unit: "percent",
    group: "brand",
  },
  content_published: {
    label: "Conteúdos publicados",
    unit: "count",
    group: "brand",
  },
  events_held: { label: "Eventos realizados", unit: "count", group: "brand" },
} as const satisfies Record<
  string,
  { label: string; unit: GoalMetricUnit; group: string }
>;

export type GoalMetric = keyof typeof GOAL_METRIC_CATALOG;

export const GOAL_METRICS = Object.keys(GOAL_METRIC_CATALOG) as GoalMetric[];

export function isGoalMetric(value: string): value is GoalMetric {
  return Object.prototype.hasOwnProperty.call(GOAL_METRIC_CATALOG, value);
}

/** Agrupamento usado para organizar o seletor de indicadores. */
export const GOAL_METRIC_GROUPS = [
  { key: "capture", label: "Captação" },
  { key: "sales", label: "Vendas" },
  { key: "retention", label: "Base e retenção" },
  { key: "brand", label: "Marca e conteúdo" },
] as const;

/**
 * A meta de um escopo, seguindo o template que o analista preenche.
 *
 * Uma linha por (ciclo, escopo) — no máximo três por ciclo. Os campos são
 * colunas explícitas, e não um `details` em JSON como no calendário, porque
 * aqui a estrutura é a mesma para toda BU e é justamente o template que se quer
 * impor: campo nomeado é campo que aparece em branco quando ninguém respondeu.
 */
export const strategyGoal = sqliteTable(
  "strategy_goal",
  {
    id: text("id").primaryKey(),
    cycleId: text("cycle_id")
      .notNull()
      .references(() => strategyCycle.id, { onDelete: "cascade" }),
    scope: text("scope").notNull().$type<GoalScope>(),

    /** A frase única: onde queremos chegar. */
    objective: text("objective").notNull(),
    /** O que no cenário justifica essa escolha agora. */
    rationale: text("rationale"),
    /**
     * As apostas de como chegar lá — 2 a 4. Vetor JSON porque a quantidade
     * varia e cada frente tem título e detalhe próprios; virar tabela só se
     * algum dia uma frente precisar de dono e prazo.
     */
    fronts: text("fronts", { mode: "json" }).$type<
      { title: string; detail?: string }[]
    >(),
    /** Recusas explícitas. É o campo que protege o foco no meio do ciclo. */
    nonGoals: text("non_goals"),
    /** O sinal de sucesso que o número não captura. */
    successSignal: text("success_signal"),
    /** O que pode derrubar a meta e de quem ela depende. */
    risks: text("risks"),

    /** Metas 2.0: Embasamento no Diagnóstico */
    diagnosisBaseline: text("diagnosis_baseline"),
    /** Metas 2.0: KPI Principal */
    primaryKpiName: text("primary_kpi_name"),
    primaryKpiTarget: text("primary_kpi_target"),
    /** Metas 2.0: KPI Secundário */
    secondaryKpiName: text("secondary_kpi_name"),
    secondaryKpiTarget: text("secondary_kpi_target"),

    createdBy: text("created_by"),
    updatedBy: text("updated_by"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    unique("strategy_goal_scope_unique").on(table.cycleId, table.scope),
    index("strategy_goal_cycle_idx").on(table.cycleId),
  ],
);

/**
 * Um indicador escolhido para uma meta, com o número-alvo.
 *
 * Tabela separada, e não colunas fixas, porque o analista escolhe quais
 * indicadores fazem sentido: com colunas, incluir um indicador novo no catálogo
 * exigiria migração, e toda BU carregaria colunas vazias das métricas que não
 * usa.
 *
 * Só `target`. Não existe coluna de realizado — ver a nota no topo da seção.
 */
export const strategyGoalTarget = sqliteTable(
  "strategy_goal_target",
  {
    id: text("id").primaryKey(),
    goalId: text("goal_id")
      .notNull()
      .references(() => strategyGoal.id, { onDelete: "cascade" }),
    metric: text("metric").notNull().$type<GoalMetric>(),
    target: real("target").notNull(),
    /** Contexto do número: de onde ele saiu, de que base parte. */
    note: text("note"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    unique("strategy_goal_target_unique").on(table.goalId, table.metric),
    index("strategy_goal_target_goal_idx").on(table.goalId),
  ],
);

export type StrategyGoal = typeof strategyGoal.$inferSelect;
export type StrategyGoalTarget = typeof strategyGoalTarget.$inferSelect;
