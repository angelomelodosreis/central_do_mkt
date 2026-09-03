import {
  sqliteTable,
  text,
  integer,
  index,
  unique,
} from "drizzle-orm/sqlite-core";

import { businessUnit } from "./business-units.schema";
import { task } from "./tasks.schema";
import { user } from "./auth.schema";

/**
 * ── ACOMPANHAMENTO ─────────────────────────────────────────────────────────
 *
 * O ritual de weekly/quinzenal da BU, virado sistema.
 *
 * O que existia era um documento de checklist preenchido a cada reunião e
 * arquivado depois. O problema do documento não é ele ser manual: é ser
 * ISOLADO. A reunião de hoje não sabe o que a de duas semanas atrás decidiu, e
 * a ação combinada lá morre no arquivo se ninguém reabrir.
 *
 * O que muda aqui é a continuidade. Uma reunião puxa o que ficou em aberto na
 * anterior, o que foi decidido continua consultável, e a ação combinada vira
 * trabalho de verdade no board de alguém.
 *
 * A leitura da tela responde cinco perguntas, nesta ordem: como estamos, o que
 * aconteceu, por quê, o que aprendemos e o que precisa acontecer agora.
 */

/** Como a BU está. Exige justificativa — semáforo sem motivo não informa. */
export const REVIEW_STATUSES = ["on_track", "attention", "critical"] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export const REVIEW_STATUS_LABELS: Record<ReviewStatus, string> = {
  on_track: "No caminho",
  attention: "Atenção",
  critical: "Crítico",
};

export const REVIEW_STATUS_DOTS: Record<ReviewStatus, string> = {
  on_track: "bg-emerald-500",
  attention: "bg-amber-500",
  critical: "bg-danger-600",
};

export const buReview = sqliteTable(
  "bu_review",
  {
    id: text("id").primaryKey(),
    businessUnitId: text("business_unit_id")
      .notNull()
      .references(() => businessUnit.id, { onDelete: "cascade" }),
    /** O dia da reunião. Uma por BU por dia. */
    meetingDate: integer("meeting_date", { mode: "timestamp" }).notNull(),

    status: text("status").notNull().default("on_track").$type<ReviewStatus>(),
    /** Por que este status. Obrigatório na gravação. */
    statusNote: text("status_note"),

    /** O resultado mais importante do período. */
    highlight: text("highlight"),
    /** O principal ponto de atenção. */
    concern: text("concern"),

    /**
     * A reunião foi fechada.
     *
     * Fechar não trava a edição — trava a expectativa: uma reunião aberta é
     * uma pauta em preparação, uma fechada é o que de fato foi conversado.
     */
    closedAt: integer("closed_at", { mode: "timestamp" }),

    createdBy: text("created_by"),
    updatedBy: text("updated_by"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    unique("bu_review_unique").on(table.businessUnitId, table.meetingDate),
    index("bu_review_bu_idx").on(table.businessUnitId),
  ],
);

/**
 * Quem estava na reunião.
 *
 * `userId` quando a pessoa tem conta; `name` para quem não tem — um convidado,
 * alguém de fora. Sem a segunda opção, a lista de participantes ficaria falsa
 * na primeira reunião com visita.
 */
export const buReviewParticipant = sqliteTable(
  "bu_review_participant",
  {
    id: text("id").primaryKey(),
    reviewId: text("review_id")
      .notNull()
      .references(() => buReview.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
    name: text("name"),
  },
  (table) => [index("bu_review_participant_idx").on(table.reviewId)],
);

/**
 * Uma coisa que foi feita e o que ela ensinou.
 *
 * Quatro campos, sempre os mesmos: o que fizemos, o que aconteceu, o que
 * aprendemos, o que vamos fazer com isso. O documento antigo tinha um bloco
 * por tipo de ação — mídia, campanha, criativo, CRM, teste, benchmark — e a
 * maior parte deles voltava vazia toda semana. Aqui o tipo é uma etiqueta, e
 * registra-se só o que foi relevante no período.
 */
export const LEARNING_CATEGORIES = [
  "media",
  "campaign",
  "creative",
  "crm",
  "test",
  "benchmark",
  "audience",
  "other",
] as const;
export type LearningCategory = (typeof LEARNING_CATEGORIES)[number];

export const LEARNING_CATEGORY_LABELS: Record<LearningCategory, string> = {
  media: "Mídia",
  campaign: "Campanha",
  creative: "Criativo",
  crm: "CRM",
  test: "Teste",
  benchmark: "Benchmarking",
  audience: "Conversa com o público",
  other: "Outro",
};

export const buReviewLearning = sqliteTable(
  "bu_review_learning",
  {
    id: text("id").primaryKey(),
    reviewId: text("review_id")
      .notNull()
      .references(() => buReview.id, { onDelete: "cascade" }),
    category: text("category").notNull().$type<LearningCategory>(),
    /** O que fizemos. É o único obrigatório. */
    whatWeDid: text("what_we_did").notNull(),
    whatHappened: text("what_happened"),
    whatWeLearned: text("what_we_learned"),
    nextStep: text("next_step"),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [index("bu_review_learning_idx").on(table.reviewId)],
);

/**
 * O raciocínio da reunião: problema, oportunidade, hipótese, decisão, bloqueio.
 *
 * É o registro que o documento antigo não fazia. Sem ele a ferramenta guarda o
 * que foi feito e esquece POR QUE foi feito — e seis meses depois ninguém
 * lembra se a mudança de canal foi decisão consciente ou acidente.
 *
 * Decisão e bloqueio atravessam reuniões: a decisão continua valendo até
 * alguém revê-la, e o bloqueio continua bloqueando até ser resolvido.
 */
export const NOTE_KINDS = [
  "problem",
  "opportunity",
  "hypothesis",
  "decision",
  "blocker",
] as const;
export type NoteKind = (typeof NOTE_KINDS)[number];

export const NOTE_KIND_LABELS: Record<NoteKind, string> = {
  problem: "Problema",
  opportunity: "Oportunidade",
  hypothesis: "Hipótese",
  decision: "Decisão",
  blocker: "Bloqueio",
};

export const buReviewNote = sqliteTable(
  "bu_review_note",
  {
    id: text("id").primaryKey(),
    reviewId: text("review_id")
      .notNull()
      .references(() => buReview.id, { onDelete: "cascade" }),
    kind: text("kind").notNull().$type<NoteKind>(),
    text: text("text").notNull(),
    /** De quem depende, quando é bloqueio. Texto livre. */
    dependsOn: text("depends_on"),
    /** Bloqueio resolvido / hipótese verificada. */
    resolvedAt: integer("resolved_at", { mode: "timestamp" }),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    index("bu_review_note_idx").on(table.reviewId),
    index("bu_review_note_kind_idx").on(table.kind),
  ],
);

/**
 * A próxima ação combinada na reunião — que é uma TAREFA.
 *
 * Esta tabela é só o elo. A ação em si mora em `task`: tem responsável, prazo,
 * situação e histórico, aparece no board de quem ficou com ela e passa pela
 * mesma máquina de estados de todo o resto.
 *
 * A alternativa seria uma lista de ações própria do acompanhamento, com o
 * próprio status. Seriam dois sistemas de "coisas para fazer" na mesma
 * ferramenta, e o segundo — o que só existe dentro da reunião — é justamente o
 * que ninguém abre entre uma reunião e outra. O documento que estamos
 * substituindo já era isso.
 *
 * `expectedResult` fica aqui e não na tarefa porque é uma pergunta da reunião
 * ("o que esperamos que aconteça?"), não um atributo de toda tarefa.
 */
export const buReviewAction = sqliteTable(
  "bu_review_action",
  {
    id: text("id").primaryKey(),
    reviewId: text("review_id")
      .notNull()
      .references(() => buReview.id, { onDelete: "cascade" }),
    taskId: text("task_id")
      .notNull()
      .references(() => task.id, { onDelete: "cascade" }),
    expectedResult: text("expected_result"),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [
    unique("bu_review_action_unique").on(table.reviewId, table.taskId),
    index("bu_review_action_review_idx").on(table.reviewId),
    index("bu_review_action_task_idx").on(table.taskId),
  ],
);

export type BuReview = typeof buReview.$inferSelect;
export type BuReviewLearning = typeof buReviewLearning.$inferSelect;
export type BuReviewNote = typeof buReviewNote.$inferSelect;
export type BuReviewAction = typeof buReviewAction.$inferSelect;
