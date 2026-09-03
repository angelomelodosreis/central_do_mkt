import {
  sqliteTable,
  text,
  integer,
  index,
  unique,
} from "drizzle-orm/sqlite-core";

import { businessUnit } from "./business-units.schema";
import { task } from "./tasks.schema";

/**
 * ── ACOMPANHAMENTO ─────────────────────────────────────────────────────────
 *
 * O roteiro da weekly da BU — usado AO VIVO, e não preenchido depois.
 *
 * Quem abre a tela é o Coordenador Médico, durante a conversa com o Analista
 * de Marketing. Ele é leigo em marketing. A tela existe para dizer a ele o que
 * olhar e o que perguntar, não para coletar o que foi dito.
 *
 * Três consequências que atravessam todo o modelo:
 *
 * 1. NADA QUE A PLATAFORMA JÁ SABE é perguntado de novo. Os números vêm do
 *    fechamento semanal que o Analista lança em Resultados; a data é hoje; o
 *    que ficou pendente vem da reunião anterior.
 *
 * 2. SÓ A EXCEÇÃO É GRAVADA. Tema revisado sem problema gera uma linha com
 *    `status = ok` e nenhum texto. Digitar só acontece quando há problema,
 *    decisão ou ação.
 *
 * 3. O APRENDIZADO NASCE DENTRO DO ASSUNTO. Não há bloco de "aprendizados" no
 *    fim: a observação e a decisão moram no tema que as gerou, e a ação vira
 *    encaminhamento — que é uma tarefa de verdade.
 */

/** Como a BU está. Escolhido no FIM da reunião, não no começo. */
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
    /** O dia da reunião — sempre hoje. Uma por BU por dia. */
    meetingDate: integer("meeting_date", { mode: "timestamp" }).notNull(),

    /**
     * Nulo enquanto a reunião corre.
     *
     * A avaliação da BU é a última coisa que acontece: no começo o
     * Coordenador ainda não viu os números nem ouviu o Analista, e pedir o
     * semáforo ali é pedir um palpite.
     */
    status: text("status").$type<ReviewStatus>(),
    statusNote: text("status_note"),

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
 * Os temas do roteiro.
 *
 * Vêm do checklist que a BU já usava. A ordem é a da conversa: dinheiro
 * gasto, o que foi feito com ele, o que aconteceu no funil, e por último o que
 * é investigação (testes, benchmark, público) e olhar para a frente.
 *
 * Ficam em código e não em cadastro porque comparar BUs depende de todo mundo
 * responder às mesmas perguntas — e porque a pergunta certa a fazer sobre
 * mídia não muda de BU para BU.
 */
export const REVIEW_TOPICS = [
  "media",
  "campaigns",
  "funnel",
  "sales",
  "crm",
  "tracking",
  "tests",
  "benchmark",
  "audience",
  "projections",
] as const;
export type ReviewTopic = (typeof REVIEW_TOPICS)[number];

/** Como o tema foi resolvido na reunião. */
export const TOPIC_STATUSES = ["ok", "attention"] as const;
export type TopicStatus = (typeof TOPIC_STATUSES)[number];

/**
 * Um tema revisado nesta reunião.
 *
 * Só existe linha para tema que o Coordenador tocou — a ausência de linha
 * significa "não falamos disso hoje", que é um resultado legítimo e diferente
 * de "está tudo bem".
 */
export const buReviewTopic = sqliteTable(
  "bu_review_topic",
  {
    id: text("id").primaryKey(),
    reviewId: text("review_id")
      .notNull()
      .references(() => buReview.id, { onDelete: "cascade" }),
    topic: text("topic").notNull().$type<ReviewTopic>(),
    status: text("status").notNull().$type<TopicStatus>(),
    /** O que precisa ser acompanhado. Só aparece quando há atenção. */
    note: text("note"),
    /** A decisão tomada sobre este tema, quando houve uma. */
    decision: text("decision"),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    unique("bu_review_topic_unique").on(table.reviewId, table.topic),
    index("bu_review_topic_review_idx").on(table.reviewId),
  ],
);

/**
 * Um encaminhamento — que é uma TAREFA.
 *
 * Esta tabela é só o elo. A ação mora em `task`: tem responsável, prazo,
 * situação e histórico, aparece no board de quem ficou com ela e passa pela
 * mesma máquina de estados de todo o resto. Uma lista de ações própria da
 * reunião seria um segundo sistema de "coisas para fazer", e o segundo é
 * justamente o que ninguém abre entre uma reunião e outra.
 *
 * `topic` guarda de qual assunto o encaminhamento nasceu — é o que permite,
 * mais adiante, responder "quantas vezes mídia gerou pendência este
 * trimestre?".
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
    topic: text("topic").$type<ReviewTopic>(),
    /**
     * O que o Coordenador anotou sobre esta pendência na reunião seguinte.
     *
     * Fica no elo e não na tarefa porque é uma observação da REUNIÃO — "não
     * foi feito porque o fornecedor atrasou" —, não uma mudança no trabalho.
     */
    followUpNote: text("follow_up_note"),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [
    unique("bu_review_action_unique").on(table.reviewId, table.taskId),
    index("bu_review_action_review_idx").on(table.reviewId),
    index("bu_review_action_task_idx").on(table.taskId),
  ],
);

export type BuReview = typeof buReview.$inferSelect;
export type BuReviewTopic = typeof buReviewTopic.$inferSelect;
export type BuReviewAction = typeof buReviewAction.$inferSelect;
