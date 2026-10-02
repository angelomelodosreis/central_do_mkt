import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { businessUnit } from "./business-units.schema";

export const PLANNING_REVIEW_STATUSES = [
  "novo",
  "em_andamento",
  "concluido",
  "pendente",
  "atrasado",
] as const;

export type PlanningReviewStatus = (typeof PLANNING_REVIEW_STATUSES)[number];

export const PLANNING_REVIEW_STATUS_LABELS: Record<PlanningReviewStatus, string> = {
  novo: "Novo",
  em_andamento: "Em andamento",
  concluido: "Concluído",
  pendente: "Pendente",
  atrasado: "Atrasado",
};

export const PLANNING_REVIEW_STATUS_COLORS: Record<
  PlanningReviewStatus,
  { bg: string; text: string; border: string; dot: string }
> = {
  novo: {
    bg: "bg-slate-100",
    text: "text-slate-700",
    border: "border-slate-200",
    dot: "bg-slate-400",
  },
  em_andamento: {
    bg: "bg-sky-50",
    text: "text-sky-700",
    border: "border-sky-200",
    dot: "bg-sky-500",
  },
  concluido: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    dot: "bg-emerald-700",
  },
  pendente: {
    bg: "bg-amber-50",
    text: "text-amber-800",
    border: "border-amber-200",
    dot: "bg-amber-500",
  },
  atrasado: {
    bg: "bg-rose-50",
    text: "text-rose-700",
    border: "border-rose-200",
    dot: "bg-rose-500",
  },
};

export const planningReviewItem = sqliteTable(
  "planning_review_item",
  {
    id: text("id").primaryKey(),
    businessUnitId: text("business_unit_id")
      .notNull()
      .references(() => businessUnit.id, { onDelete: "cascade" }),
    coordinatorName: text("coordinator_name").notNull().default("Ingrid Silva"),
    coordinatorEmail: text("coordinator_email"),
    meetingDate: integer("meeting_date", { mode: "timestamp" }).notNull(),
    followUpDate: integer("follow_up_date", { mode: "timestamp" }).notNull(),
    details: text("details").notNull(),
    assigneeName: text("assignee_name").notNull(),
    assigneeEmail: text("assignee_email"),
    assigneeAvatar: text("assignee_avatar"),
    status: text("status").$type<PlanningReviewStatus>().notNull().default("novo"),
    priority: text("priority").default("normal"),
    tags: text("tags"),
    createdBy: text("created_by"),
    updatedBy: text("updated_by"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    index("planning_review_item_bu_idx").on(table.businessUnitId),
    index("planning_review_item_date_idx").on(table.meetingDate),
    index("planning_review_item_status_idx").on(table.status),
  ]
);

export const planningReviewComment = sqliteTable(
  "planning_review_comment",
  {
    id: text("id").primaryKey(),
    reviewItemId: text("review_item_id")
      .notNull()
      .references(() => planningReviewItem.id, { onDelete: "cascade" }),
    authorName: text("author_name").notNull(),
    authorEmail: text("author_email"),
    authorAvatar: text("author_avatar"),
    authorRole: text("author_role"),
    content: text("content").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    index("planning_review_comment_item_idx").on(table.reviewItemId),
  ]
);

export type PlanningReviewItem = typeof planningReviewItem.$inferSelect;
export type PlanningReviewComment = typeof planningReviewComment.$inferSelect;
