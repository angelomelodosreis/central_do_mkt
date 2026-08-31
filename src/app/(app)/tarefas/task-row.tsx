"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { reassignTask, updateTaskStatus } from "./actions";
import { EditTaskDrawer } from "./edit-task-drawer";
import { DeleteTaskButton } from "./[taskId]/delete-task-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { Select } from "@/components/ui/select";
import {
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
  type TaskPriority,
  type TaskStatus,
} from "@/lib/db/schema";
import {
  ACTION_LABELS,
  executionActionsFor,
  isOverdue,
  managementActionsFor,
  type TaskRelation,
} from "@/lib/modules/tasks/state";
import { cn } from "@/lib/utils/cn";
import { formatDate } from "@/lib/utils/format";

export type TaskRowData = {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  blockedReason: string | null;
  assigneeId: string | null;
  assigneeName: string | null;
  assignedTeamName: string | null;
  businessUnitLabel: string | null;
  businessUnitSlug: string | null;
  createdByName: string | null;
  createdAt: string;
  relation: TaskRelation;
};

export type Destino = { value: string; label: string; hint?: string };

const PRIORITY_TONE: Record<TaskPriority, "neutral" | "warning" | "danger"> = {
  low: "neutral",
  normal: "neutral",
  high: "warning",
  urgent: "danger",
};

const STATUS_TONE: Record<
  TaskStatus,
  "neutral" | "brand" | "warning" | "success" | "danger"
> = {
  todo: "neutral",
  in_progress: "brand",
  blocked: "warning",
  done: "success",
  cancelled: "neutral",
};

/** A que transição de situação cada ação de execução corresponde. */
const ACTION_STATUS: Record<string, TaskStatus> = {
  start: "in_progress",
  unblock: "in_progress",
  complete: "done",
  reopen: "todo",
  cancel: "cancelled",
};

/**
 * Uma tarefa na lista.
 *
 * As ações são escolhidas pelo RELACIONAMENTO da pessoa com a tarefa, não pela
 * permissão de módulo. Quem executa vê começar/travar/concluir; quem delegou vê
 * editar/redistribuir/cancelar. Antes, quem delegava recebia os botões
 * operacionais — e podia marcar como concluído um trabalho que não fez.
 *
 * As duas coisas se acumulam quando são a mesma pessoa: quem cria uma tarefa
 * para si vê os dois conjuntos, porque é os dois papéis.
 */
export function TaskRow({
  task,
  destinos,
}: {
  task: TaskRowData;
  /** Pessoas e unidades para redistribuir. Vazio para quem não delega. */
  destinos: Destino[];
}) {
  const [travando, setTravando] = useState(false);
  const [redistribuindo, setRedistribuindo] = useState(false);
  const [editando, setEditando] = useState(false);

  // Fecha os formulários quando o servidor confirma a mudança.
  //
  // São `<form action>` simples, então nada aqui sabe que a gravação terminou —
  // sem isto, o campo continuava aberto depois de salvar e parecia que o clique
  // não tinha surtido efeito. Observar o que voltou do servidor é o sinal mais
  // honesto disponível.
  useEffect(() => {
    if (task.status === "blocked") setTravando(false);
  }, [task.status]);

  useEffect(() => {
    setRedistribuindo(false);
  }, [task.assigneeId, task.assignedTeamName]);

  const execucao = executionActionsFor(task.status, task.relation);
  const gestao = managementActionsFor(task.status, task.relation);
  const atrasada = isOverdue(task.dueDate, task.status);

  return (
    <li
      className={cn(
        "px-5 py-3.5",
        (task.status === "done" || task.status === "cancelled") &&
          "bg-slate-50/60",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2">
            <Link
              href={`/tarefas/${task.id}`}
              className={cn(
                "font-medium text-slate-900 hover:text-brand-700 hover:underline",
                task.status === "done" && "text-slate-500 line-through",
              )}
            >
              {task.title}
            </Link>
            <Badge tone={STATUS_TONE[task.status]}>
              {TASK_STATUS_LABELS[task.status]}
            </Badge>
            {task.priority !== "normal" && task.priority !== "low" ? (
              <Badge tone={PRIORITY_TONE[task.priority]}>
                {TASK_PRIORITY_LABELS[task.priority]}
              </Badge>
            ) : null}
            {task.relation.canClaim ? (
              <Badge tone="brand">Aberta para a unidade</Badge>
            ) : null}
          </p>

          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500">
            {task.dueDate ? (
              <span
                className={atrasada ? "font-medium text-danger-700" : undefined}
              >
                {atrasada ? "atrasada · " : "prazo "}
                {formatDate(new Date(task.dueDate))}
              </span>
            ) : (
              <span className="text-slate-400">sem prazo</span>
            )}
            {task.assigneeName ? <span>· {task.assigneeName}</span> : null}
            {!task.assigneeName && task.assignedTeamName ? (
              <span>· {task.assignedTeamName}</span>
            ) : null}
            {task.businessUnitLabel && task.businessUnitSlug ? (
              <Link
                href={`/planejamento/${task.businessUnitSlug}`}
                className="hover:text-brand-700 hover:underline"
              >
                · {task.businessUnitLabel}
              </Link>
            ) : null}
            {task.createdByName ? (
              <span className="text-slate-400">· de {task.createdByName}</span>
            ) : null}
          </p>

          {task.status === "blocked" && task.blockedReason ? (
            <p className="mt-1.5 rounded-md bg-amber-50 px-2 py-1 text-xs text-amber-900">
              Travada: {task.blockedReason}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
          {/* Execução — de quem está fazendo */}
          {execucao.map((acao) => {
            if (acao === "claim") {
              return (
                <StatusButton
                  key={acao}
                  taskId={task.id}
                  status="in_progress"
                  label={ACTION_LABELS.claim}
                />
              );
            }
            if (acao === "block") {
              return (
                <Button
                  key={acao}
                  size="sm"
                  variant="ghost"
                  onClick={() => setTravando((aberto) => !aberto)}
                >
                  {ACTION_LABELS.block}
                </Button>
              );
            }
            return (
              <StatusButton
                key={acao}
                taskId={task.id}
                status={ACTION_STATUS[acao]}
                label={ACTION_LABELS[acao]}
              />
            );
          })}

          {/* Gestão — de quem delegou. Separadas por um filete, porque são
              conjuntos de natureza diferente e misturá-las foi o que fez alguém
              concluir a tarefa de outra pessoa sem perceber. */}
          {execucao.length > 0 && gestao.length > 0 ? (
            <span aria-hidden className="mx-0.5 h-5 w-px bg-slate-200" />
          ) : null}

          {gestao.includes("edit") ? (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setEditando(true)}
            >
              {ACTION_LABELS.edit}
            </Button>
          ) : null}

          {gestao.includes("reassign") && destinos.length > 0 ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setRedistribuindo((aberto) => !aberto)}
            >
              {ACTION_LABELS.reassign}
            </Button>
          ) : null}

          {gestao.includes("reopen") ? (
            <StatusButton
              taskId={task.id}
              status="todo"
              label={ACTION_LABELS.reopen}
              variant="ghost"
            />
          ) : null}

          {gestao.includes("cancel") ? (
            <StatusButton
              taskId={task.id}
              status="cancelled"
              label={ACTION_LABELS.cancel}
              variant="ghost"
            />
          ) : null}

          {gestao.includes("delete") ? (
            <DeleteTaskButton taskId={task.id} title={task.title} compact />
          ) : null}
        </div>
      </div>

      {travando ? (
        <form
          action={updateTaskStatus}
          className="mt-3 flex flex-wrap items-end gap-2 rounded-lg bg-amber-50 px-3 py-2.5"
        >
          <input type="hidden" name="taskId" value={task.id} />
          <input type="hidden" name="status" value="blocked" />
          <div className="min-w-52 flex-1">
            <label
              htmlFor={`motivo-${task.id}`}
              className="mb-1 block text-xs font-medium text-amber-900"
            >
              O que está travando?
            </label>
            <Input
              id={`motivo-${task.id}`}
              name="blockedReason"
              required
              maxLength={200}
              placeholder="Ex.: esperando aprovação do criativo"
            />
          </div>
          <SubmitButton size="sm" pendingLabel="Salvando…">
            Marcar como travada
          </SubmitButton>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setTravando(false)}
          >
            Cancelar
          </Button>
        </form>
      ) : null}

      {redistribuindo ? (
        <form
          action={reassignTask}
          className="mt-3 flex flex-wrap items-end gap-2 rounded-lg bg-slate-50 px-3 py-2.5"
        >
          <input type="hidden" name="taskId" value={task.id} />
          <div className="min-w-56 flex-1">
            <label
              htmlFor={`destino-${task.id}`}
              className="mb-1 block text-xs font-medium text-slate-700"
            >
              Passar para
            </label>
            <Select
              id={`destino-${task.id}`}
              name="destino"
              size="sm"
              placeholder="Escolha quem assume…"
              options={destinos}
            />
          </div>
          <SubmitButton size="sm" pendingLabel="Salvando…">
            Salvar
          </SubmitButton>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setRedistribuindo(false)}
          >
            Cancelar
          </Button>
        </form>
      ) : null}

      <EditTaskDrawer
        task={editando ? task : null}
        destinos={destinos}
        onClose={() => setEditando(false)}
      />
    </li>
  );
}

function StatusButton({
  taskId,
  status,
  label,
  // Ação de linha não é `primary`: numa fila de vinte tarefas seriam vinte
  // botões vermelhos, e o destaque deixaria de destacar. Quem separa execução
  // de gestão aqui é o agrupamento, não a cor.
  variant = "secondary",
}: {
  taskId: string;
  status: TaskStatus;
  label: string;
  variant?: "primary" | "secondary" | "ghost";
}) {
  return (
    <form action={updateTaskStatus}>
      <input type="hidden" name="taskId" value={taskId} />
      <input type="hidden" name="status" value={status} />
      <SubmitButton size="sm" variant={variant} pendingLabel="Salvando…">
        {label}
      </SubmitButton>
    </form>
  );
}
