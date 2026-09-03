import {
  sqliteTable,
  text,
  integer,
  real,
  index,
  unique,
} from "drizzle-orm/sqlite-core";

import { businessUnit } from "./business-units.schema";
import { timelineItem } from "./strategy.schema";

/**
 * ── RESULTADOS ─────────────────────────────────────────────────────────────
 *
 * O realizado de cada BU, digitado à mão.
 *
 * As metas guardam o COMPROMISSO — o que a BU disse que vai entregar — e por
 * muito tempo esta plataforma não guardou o realizado de propósito: o número
 * vinha de outro sistema, e duas fontes para a mesma verdade divergem. A
 * decisão mudou porque o dashboard que existia fora daqui não existe de fato:
 * a liderança precisa comparar BUs, e o dado só está comparável se ele mora no
 * mesmo lugar em que a meta mora. Enquanto a integração não vem, o lançamento
 * é manual e semanal.
 *
 * Só entram DADOS-BASE — o que alguém consegue ler de um relatório e digitar.
 * Ticket médio, conversão, CPL e CAC não têm coluna: são conta, e conta feita
 * na leitura nunca discorda da sua própria origem. Guardar ticket médio
 * separado é criar a possibilidade de ele não bater com faturamento ÷ vendas.
 */

/**
 * O fechamento semanal de uma BU.
 *
 * A semana começa na SEGUNDA, e `weekStart` guarda a meia-noite dessa segunda.
 * Uma linha por (BU, semana) — é a chave única que impede duas versões do mesmo
 * fechamento aparecerem no gráfico.
 *
 * Todo número é opcional. A infraestrutura de dados ainda não entrega tudo, e
 * exigir os quatro campos faria o time inventar zeros — um zero inventado é
 * pior que um vazio, porque entra na média.
 */
export const weeklyResult = sqliteTable(
  "weekly_result",
  {
    id: text("id").primaryKey(),
    businessUnitId: text("business_unit_id")
      .notNull()
      .references(() => businessUnit.id, { onDelete: "cascade" }),
    /** Meia-noite da segunda-feira que abre a semana. */
    weekStart: integer("week_start", { mode: "timestamp" }).notNull(),

    /** Faturamento no período, em reais. */
    revenue: real("revenue"),
    /** Número de vendas (matrículas, inscrições). */
    sales: integer("sales"),
    /** Leads captados. */
    leads: integer("leads"),
    /** Investimento em mídia paga, em reais. */
    mediaSpend: real("media_spend"),

    /** O que explica um número fora da curva. Aparece ao lado dele. */
    note: text("note"),

    createdBy: text("created_by"),
    updatedBy: text("updated_by"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    unique("weekly_result_unique").on(table.businessUnitId, table.weekStart),
    index("weekly_result_week_idx").on(table.weekStart),
  ],
);

/**
 * O resultado de uma iniciativa — um lançamento, um jantar, um congresso.
 *
 * Responde "quanto rendeu aquilo", que o fechamento semanal não responde: a
 * semana mistura tudo que aconteceu nela.
 *
 * NÃO se soma ao semanal. O semanal é o total da BU; isto é a fatia atribuída
 * a uma ação — e atribuição é sempre uma estimativa de quem estava lá. As duas
 * leituras convivem em telas separadas justamente por isso.
 */
export const initiativeResult = sqliteTable(
  "initiative_result",
  {
    id: text("id").primaryKey(),
    timelineItemId: text("timeline_item_id")
      .notNull()
      .references(() => timelineItem.id, { onDelete: "cascade" }),

    revenue: real("revenue"),
    sales: integer("sales"),
    leads: integer("leads"),
    mediaSpend: real("media_spend"),

    /** Presença confirmada, para eventos. Vazio quando não se aplica. */
    attendance: integer("attendance"),

    /** O que aprendemos. É o campo que faz o registro valer no ano seguinte. */
    note: text("note"),

    createdBy: text("created_by"),
    updatedBy: text("updated_by"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [unique("initiative_result_unique").on(table.timelineItemId)],
);

export type WeeklyResult = typeof weeklyResult.$inferSelect;
export type InitiativeResult = typeof initiativeResult.$inferSelect;
