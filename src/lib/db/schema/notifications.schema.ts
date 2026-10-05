import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { user } from "./auth.schema";

export const NOTIFICATION_TYPES = [
  "mention",
  "review_followup",
  "assigned_task",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const userNotification = sqliteTable(
  "user_notification",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    actorId: text("actor_id"),
    actorName: text("actor_name").notNull(),
    type: text("type").$type<NotificationType>().notNull().default("mention"),
    title: text("title").notNull(),
    content: text("content").notNull(),
    link: text("link"),
    isRead: integer("is_read").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    index("user_notification_user_idx").on(table.userId, table.isRead),
    index("user_notification_created_idx").on(table.createdAt),
  ]
);

export type UserNotification = typeof userNotification.$inferSelect;
