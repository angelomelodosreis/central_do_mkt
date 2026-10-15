import {
  sqliteTable,
  text,
  integer,
  index,
} from "drizzle-orm/sqlite-core";

/**
 * Tipos de eventos comportamentais rastreados nas Landing Pages
 */
export const INSIGHT_EVENT_TYPES = [
  "page_view",
  "click",
  "cta_click",
  "form_start",
  "form_submit",
  "scroll_depth",
] as const;

export type InsightEventType = (typeof INSIGHT_EVENT_TYPES)[number];

export const INSIGHT_VIEWPORTS = ["desktop", "mobile"] as const;
export type InsightViewport = (typeof INSIGHT_VIEWPORTS)[number];

/**
 * Landing Pages cadastradas para monitoramento de comportamento e mapa de calor
 */
export const insightPage = sqliteTable(
  "insight_page",
  {
    id: text("id").primaryKey(), // slug único ex: lp-extensivo-2025
    name: text("name").notNull(),
    url: text("url").notNull(),
    businessUnitId: text("business_unit_id"),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    version: text("version").notNull().default("v1"),
    screenshotUrlDesktop: text("screenshot_url_desktop"),
    screenshotUrlMobile: text("screenshot_url_mobile"),
    screenshotUpdatedAt: integer("screenshot_updated_at", { mode: "timestamp" }),
    trackedElements: text("tracked_elements"), // JSON array com IDs e labels mapeados
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    index("insight_page_bu_idx").on(table.businessUnitId),
    index("insight_page_active_idx").on(table.isActive),
  ],
);

export type InsightPage = typeof insightPage.$inferSelect;
export type NewInsightPage = typeof insightPage.$inferInsert;

/**
 * Eventos agregados e anônimos de telemetria das LPs
 *
 * NUNCA armazena conteúdo de inputs, senhas, e-mails, telefones ou CPF.
 * Coordenadas x e y são normalizadas de 0 a 1000 em relação à página.
 */
export const insightEvent = sqliteTable(
  "insight_event",
  {
    id: text("id").primaryKey(),
    pageId: text("page_id").notNull(),
    pageUrl: text("page_url").notNull(),
    pagePath: text("page_path").notNull(),
    pageVersion: text("page_version").notNull().default("v1"),
    eventType: text("event_type").notNull().$type<InsightEventType>(),
    elementId: text("element_id"),
    elementLabel: text("element_label"),
    sectionId: text("section_id"),
    viewport: text("viewport").notNull().default("desktop").$type<InsightViewport>(),
    x: integer("x"), // normalizado de 0 a 1000
    y: integer("y"), // normalizado de 0 a 1000
    scrollPercent: integer("scroll_percent"), // 0 a 100
    utmSource: text("utm_source"),
    utmMedium: text("utm_medium"),
    utmCampaign: text("utm_campaign"),
    referrer: text("referrer"),
    sessionId: text("session_id"), // hash efêmero anônimo para funil
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    index("insight_event_page_idx").on(table.pageId),
    index("insight_event_type_idx").on(table.eventType),
    index("insight_event_created_idx").on(table.createdAt),
    index("insight_event_page_type_idx").on(table.pageId, table.eventType),
    index("insight_event_page_vp_idx").on(table.pageId, table.viewport),
  ],
);

export type InsightEvent = typeof insightEvent.$inferSelect;
export type NewInsightEvent = typeof insightEvent.$inferInsert;
