"use client";

import { useActionState, useEffect, useState } from "react";

import { createTask } from "./actions";
import { INITIAL_TASK_STATE, type TaskFormState } from "./form-state";
import { RichTextEditor } from "@/components/rich-text/editor";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Field, Input } from "@/components/ui/field";
import { Select, type SelectGroup } from "@/components/ui/select";
import { TASK_PRIORITIES, TASK_PRIORITY_LABELS } from "@/lib/db/schema";
import { cn } from "@/lib/utils/cn";

export type AssignablePerson = {
  id: string;
  name: string;
  /** Cargo e unidade resumidos numa linha, já montados no servidor. */
  label: string | null;
};

export type AssignableTeam = {
  id: string;
  name: string;
  /** Nível na árvore — é o que a indentação do rótulo comunica. */
  depth: number;
  /** "Marketing › Conteúdo › Design". */
  path: string;
  /** Quantas pessoas receberiam a tarefa, contando as unidades abaixo. */
  totalMemberCount: number;
};

/**
 * Criar tarefa como AÇÃO, não como formulário permanente.
 *
 * O formulário ficava exposto no topo de todas as abas: ocupava a primeira tela
 * inteira com uma ação ocasional, e aparecia três vezes na mesma página. Num
 * painel, ele some quando não está em uso e continua a um clique.
 */
export function NewTaskDrawer({
  open,
  onClose,
  people,
  teams,
  businessUnits,
  podeDelegar,
  currentUserId,
}: {
  open: boolean;
  onClose: () => void;
  people: AssignablePerson[];
  teams: AssignableTeam[];
  businessUnits: { id: string; label: string }[];
  podeDelegar: boolean;
  currentUserId: string;
}) {
  const [state, formAction, isPending] = useActionState<
    TaskFormState,
    FormData
  >(createTask, INITIAL_TASK_STATE);

  const [destino, setDestino] = useState(`user:${currentUserId}`);
  const [key, setKey] = useState(0);

  // Criou: limpa os campos e fecha. O painel continuar aberto com o texto da
  // tarefa anterior é o que fazia alguém criar a mesma tarefa duas vezes.
  useEffect(() => {
    if (state.status === "success") {
      setKey((valor) => valor + 1);
      onClose();
    }
  }, [state.status, onClose]);

  const [tipo, id] = destino.split(":");

  const grupos: SelectGroup[] = [
    {
      label: "Unidades",
      options: teams.map((team) => ({
        value: `team:${team.id}`,
        // A indentação é o que distingue o subsetor do time dentro dele.
        // Numa lista plana, endereçar a "Conteúdo" parecia igual a endereçar
        // ao Design — e alcança cinco times em vez de um.
        label: `${"— ".repeat(team.depth)}${team.name}`,
        triggerLabel: team.name,
        hint:
          team.totalMemberCount > 0
            ? `${team.path} · chega a ${team.totalMemberCount} ${team.totalMemberCount === 1 ? "pessoa" : "pessoas"}`
            : `${team.path} · ninguém nesta unidade ainda`,
      })),
    },
    {
      label: "Pessoas",
      options: people.map((person) => ({
        value: `user:${person.id}`,
        label: person.name,
        hint: person.label ?? undefined,
      })),
    },
  ];

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Nova tarefa"
      description={
        podeDelegar
          ? "Aparece na hora na fila de quem receber."
          : "Você pode criar tarefas para a sua própria fila."
      }
      width="lg"
    >
      <form action={formAction} key={key} className="space-y-5">
        {state.status === "error" && state.message ? (
          <p
            role="alert"
            className={cn(
              "rounded-lg border px-3 py-2 text-sm",
              "border-danger-200 bg-danger-50 text-danger-800",
            )}
          >
            {state.message}
          </p>
        ) : null}

        <input
          type="hidden"
          name="assigneeId"
          value={tipo === "user" ? id : ""}
        />
        <input
          type="hidden"
          name="assignedTeamId"
          value={tipo === "team" ? id : ""}
        />

        <Field label="O que precisa ser feito" htmlFor="task-title" required>
          <Input
            id="task-title"
            name="title"
            maxLength={160}
            required
            autoFocus
            placeholder="Ex.: revisar os criativos da campanha de julho"
          />
        </Field>

        {podeDelegar ? (
          <Field
            label="Para quem"
            htmlFor="task-destino"
            required
            hint="Pessoas e unidades na mesma lista."
          >
            <Select
              id="task-destino"
              value={destino}
              onValueChange={setDestino}
              groups={grupos}
            />
          </Field>
        ) : null}

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Prioridade" htmlFor="task-priority">
            <Select
              id="task-priority"
              name="priority"
              defaultValue="normal"
              options={TASK_PRIORITIES.map((priority) => ({
                value: priority,
                label: TASK_PRIORITY_LABELS[priority],
              }))}
            />
          </Field>

          <Field label="Prazo" htmlFor="task-due" hint="Opcional.">
            <Input id="task-due" name="dueDate" type="date" />
          </Field>
        </div>

        {businessUnits.length > 0 ? (
          <Field
            label="Business Unit"
            htmlFor="task-bu"
            hint="Opcional. Liga a tarefa ao planejamento de uma BU."
          >
            <Select
              id="task-bu"
              name="businessUnitId"
              defaultValue=""
              options={[
                { value: "", label: "Nenhuma / geral" },
                ...businessUnits.map((unit) => ({
                  value: unit.id,
                  label: unit.label,
                })),
              ]}
            />
          </Field>
        ) : null}

        <Field
          label="Detalhes"
          hint="Opcional. Contexto, links, o que esperar."
        >
          <RichTextEditor
            name="description"
            initialDoc=""
            placeholder="Contexto da tarefa…"
          />
        </Field>

        <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-4">
          <Button type="submit" variant="primary" disabled={isPending}>
            {isPending ? "Criando…" : "Criar tarefa"}
          </Button>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </form>
    </Drawer>
  );
}
