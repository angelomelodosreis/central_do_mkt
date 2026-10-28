import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

/**
 * Tabela de Growth Sessions & Treinamentos da Central do Marketing.
 * Armazena gravações, playbooks, atas/resumos de IA, apresentações de slides
 * e ferramentas das capacitações da equipe MedCof.
 */
export const growthSession = sqliteTable(
  "growth_session",
  {
    id: text("id").primaryKey(),
    uploadOrder: integer("upload_order").notNull().default(1),
    title: text("title").notNull(),
    theme: text("theme").notNull(),
    date: text("date").notNull(),
    time: text("time"),
    presenter: text("presenter").notNull(),
    category: text("category").notNull().default("Estratégia"),
    youtubeId: text("youtube_id"),
    videoUrl: text("video_url"),
    toolUrl: text("tool_url"),
    summaryUrl: text("summary_url"),
    presentationUrl: text("presentation_url"),
    /** JSON serializado com array de { label: string; url: string } */
    links: text("links"),
    description: text("description").notNull(),
    createdBy: text("created_by"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    index("growth_session_order_idx").on(table.uploadOrder),
    index("growth_session_category_idx").on(table.category),
    index("growth_session_presenter_idx").on(table.presenter),
  ],
);

export type GrowthSession = typeof growthSession.$inferSelect;
export type NewGrowthSession = typeof growthSession.$inferInsert;

export type GrowthSessionExtraLink = {
  label: string;
  url: string;
};
