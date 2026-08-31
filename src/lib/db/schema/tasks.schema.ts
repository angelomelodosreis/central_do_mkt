import {
  sqliteTable,
  text,
  integer,
  index,
} from "drizzle-orm/sqlite-core";

import { businessUnit } from "./business-units.schema";
import { team } from "./org.schema";

/**
 * Situação da tarefa.
 *
 * `blocked` existe porque é a informação mais útil que um analista pode dar a
 * quem passou a tarefa: "não está parado por esquecimento, está parado
 * esperando algo". Sem esse estado, tarefa travada e tarefa ignorada ficam
 * indistinguíveis no painel de quem delegou.
 */
export const TASK_STATUSES = [
  "todo",
  "in_progress",
  "blocked",
  "done",
  "cancelled",
] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "A fazer",
  in_progress: "Em andamento",
  blocked: "Travada",
  done: "Concluída",
  cancelled: "Cancelada",
};

/** Estados que saem da fila ativa — não aparecem no painel do dia a dia. */
export const TASK_CLOSED_STATUSES: TaskStatus[] = ["done", "cancelled"];

export const TASK_PRIORITIES = ["low", "normal", "high", "urgent"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: "Baixa",
  normal: "Normal",
  high: "Alta",
  urgent: "Urgente",
};

/**
 * Tarefa pontual passada a uma pessoa ou a um time inteiro.
 *
 * `assigneeId` e `assignedTeamId` são exclusivos entre si: a tarefa é de
 * alguém OU de um time. Endereçar ao time é o caso de "quem estiver livre
 * pega" — e é por isso que ela aparece no painel de todos os membros do time
 * até alguém assumi-la, momento em que passa a ter dono.
 */
export const task = sqliteTable(
  "task",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    /** Detalhamento no mesmo editor visual do resto da plataforma (JSON). */
    description: text("description"),

    status: text("status").notNull().default("todo").$type<TaskStatus>(),
    priority: text("priority").notNull().default("normal").$type<TaskPriority>(),
    dueDate: integer("due_date", { mode: "timestamp" }),

    /** Dono atual. `null` quando a tarefa está endereçada ao time. */
    assigneeId: text("assignee_id"),
    /** Time destinatário. `null` quando a tarefa tem dono nominal. */
    assignedTeamId: text("assigned_team_id").references(() => team.id, {
      onDelete: "set null",
    }),

    /** Contexto opcional: a que BU esse trabalho pertence. */
    businessUnitId: text("business_unit_id").references(() => businessUnit.id, {
      onDelete: "set null",
    }),

    /**
     * Por que a tarefa travou. Preenchido quando `status = blocked` — o painel
     * de quem delegou mostra este texto, que é a razão de o estado existir.
     */
    blockedReason: text("blocked_reason"),

    createdBy: text("created_by"),
    completedAt: integer("completed_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    index("task_assignee_idx").on(table.assigneeId),
    index("task_assigned_team_idx").on(table.assignedTeamId),
    index("task_status_idx").on(table.status),
    index("task_business_unit_idx").on(table.businessUnitId),
  ],
);

export type Task = typeof task.$inferSelect;
