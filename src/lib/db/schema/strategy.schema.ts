import {
  sqliteTable,
  text,
  integer,
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
    isCurrent: integer("is_current", { mode: "boolean" }).notNull().default(false),
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
