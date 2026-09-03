import {
  sqliteTable,
  text,
  integer,
  index,
  unique,
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
    priority: text("priority")
      .notNull()
      .default("normal")
      .$type<TaskPriority>(),
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

    /**
     * O molde que gerou esta tarefa, quando ela veio de uma recorrência.
     *
     * Junto com `occurrenceDate` forma a chave única que impede a mesma
     * ocorrência nascer duas vezes — duas abas abertas na sexta gerariam duas
     * tarefas idênticas sem isso.
     */
    recurrenceId: text("recurrence_id"),
    /** A data da ocorrência: a sexta a que esta tarefa se refere. */
    occurrenceDate: integer("occurrence_date", { mode: "timestamp" }),

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
    unique("task_occurrence_unique").on(
      table.recurrenceId,
      table.occurrenceDate,
    ),
  ],
);

export type Task = typeof task.$inferSelect;

/**
 * ── RECORRÊNCIA ────────────────────────────────────────────────────────────
 *
 * O molde de uma tarefa que se repete.
 *
 * NÃO é uma tarefa. É a regra que produz tarefas: "toda sexta, fechar os
 * números da semana". Cada ocorrência vira uma `task` de verdade — com dono,
 * situação e histórico próprios — porque a pergunta que o time faz é "fiz a
 * desta semana?", e uma linha só que muda de estado toda semana não responde
 * isso nem deixa rastro de quando falhou.
 */
export const RECURRENCE_FREQUENCIES = [
  "weekly",
  "biweekly",
  "monthly",
] as const;
export type RecurrenceFrequency = (typeof RECURRENCE_FREQUENCIES)[number];

export const RECURRENCE_FREQUENCY_LABELS: Record<RecurrenceFrequency, string> =
  {
    weekly: "Toda semana",
    biweekly: "A cada duas semanas",
    monthly: "Todo mês",
  };

export const WEEKDAY_LABELS = [
  "domingo",
  "segunda",
  "terça",
  "quarta",
  "quinta",
  "sexta",
  "sábado",
] as const;

export const taskRecurrence = sqliteTable(
  "task_recurrence",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    description: text("description"),
    priority: text("priority")
      .notNull()
      .default("normal")
      .$type<TaskPriority>(),

    /** Mesma exclusividade da tarefa: alguém OU um time. */
    assigneeId: text("assignee_id"),
    assignedTeamId: text("assigned_team_id").references(() => team.id, {
      onDelete: "cascade",
    }),
    businessUnitId: text("business_unit_id").references(() => businessUnit.id, {
      onDelete: "set null",
    }),

    frequency: text("frequency").notNull().$type<RecurrenceFrequency>(),
    /** 0 = domingo. Usado em `weekly` e `biweekly`. */
    weekday: integer("weekday").notNull().default(1),
    /** Dia do mês em `monthly`. 29–31 caem no último dia dos meses curtos. */
    dayOfMonth: integer("day_of_month").notNull().default(1),
    /** Prazo em dias a partir da data em que a ocorrência nasce. */
    dueInDays: integer("due_in_days").notNull().default(0),

    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),

    createdBy: text("created_by"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    index("task_recurrence_active_idx").on(table.isActive),
    index("task_recurrence_assignee_idx").on(table.assigneeId),
  ],
);

export type TaskRecurrence = typeof taskRecurrence.$inferSelect;
