"use client";

import { useActionState, useEffect } from "react";

import { updateTask } from "./actions";
import { INITIAL_TASK_STATE, type TaskFormState } from "./form-state";
import type { Destino, TaskRowData } from "./task-row";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Field, Input } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { TASK_PRIORITIES, TASK_PRIORITY_LABELS } from "@/lib/db/schema";
import { toDateInput } from "@/lib/modules/strategy/dates";

/**
 * Editar a tarefa — ação de quem delegou.
 *
 * Fica num painel, e não numa página à parte, porque editar é uma correção
 * feita no meio do acompanhamento: mudar o prazo depois de ver que atrasou,
 * ajustar o título depois de conversar. Sair da lista e voltar faz perder o
 * lugar nela.
 *
 * Sem `description` aqui de propósito: o editor de texto rico pertence à tela
 * de detalhe, onde há espaço para ele. Este painel cuida do que se corrige
 * rápido.
 */
export function EditTaskDrawer({
  task,
  destinos,
  onClose,
}: {
  task: TaskRowData | null;
  destinos: Destino[];
  onClose: () => void;
}) {
  const [state, formAction, isPending] = useActionState<
    TaskFormState,
    FormData
  >(updateTask, INITIAL_TASK_STATE);

  useEffect(() => {
    if (state.status === "success") onClose();
  }, [state.status, onClose]);

  return (
    <Drawer
      open={task !== null}
      onClose={onClose}
      title="Editar tarefa"
      description="Você ajusta o que a tarefa é. O andamento continua com quem executa."
    >
      {task ? (
        <form action={formAction} className="space-y-5" key={task.id}>
          <input type="hidden" name="taskId" value={task.id} />

          {state.status === "error" && state.message ? (
            <p
              role="alert"
              className="rounded-lg border border-danger-200 bg-danger-50 px-3 py-2 text-sm text-danger-800"
            >
              {state.message}
            </p>
          ) : null}

          <Field label="O que precisa ser feito" htmlFor="edit-title" required>
            <Input
              id="edit-title"
              name="title"
              maxLength={160}
              required
              defaultValue={task.title}
            />
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Prioridade" htmlFor="edit-priority">
              <Select
                id="edit-priority"
                name="priority"
                defaultValue={task.priority}
                options={TASK_PRIORITIES.map((priority) => ({
                  value: priority,
                  label: TASK_PRIORITY_LABELS[priority],
                }))}
              />
            </Field>

            <Field label="Prazo" htmlFor="edit-due">
              <Input
                id="edit-due"
                name="dueDate"
                type="date"
                defaultValue={
                  task.dueDate ? toDateInput(new Date(task.dueDate)) : ""
                }
              />
            </Field>
          </div>

          <p className="text-xs text-slate-500">
            Para trocar o responsável, use “Alterar responsável” na própria
            linha — são {destinos.length} destinos possíveis, e o seletor cabe
            melhor lá.
          </p>

          <div className="flex gap-2">
            <Button type="submit" variant="primary" disabled={isPending}>
              {isPending ? "Salvando…" : "Salvar"}
            </Button>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
          </div>
        </form>
      ) : null}
    </Drawer>
  );
}
