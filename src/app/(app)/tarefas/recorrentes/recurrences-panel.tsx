"use client";

import { useState } from "react";

import { deleteRecurrence, saveRecurrence, toggleRecurrence } from "./actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, EmptyState } from "@/components/ui/card";
import { Drawer } from "@/components/ui/drawer";
import { Field, Input } from "@/components/ui/field";
import { Select, type SelectGroup } from "@/components/ui/select";
import {
  RECURRENCE_FREQUENCIES,
  RECURRENCE_FREQUENCY_LABELS,
  TASK_PRIORITIES,
  TASK_PRIORITY_LABELS,
  WEEKDAY_LABELS,
  type RecurrenceFrequency,
  type TaskPriority,
} from "@/lib/db/schema";
import { cn } from "@/lib/utils/cn";
import { formatDate } from "@/lib/utils/format";

export type RegraNaTela = {
  id: string;
  title: string;
  description: string | null;
  priority: TaskPriority;
  assigneeId: string | null;
  assigneeName: string | null;
  assignedTeamId: string | null;
  assignedTeamName: string | null;
  businessUnitId: string | null;
  frequency: RecurrenceFrequency;
  weekday: number;
  dayOfMonth: number;
  dueInDays: number;
  isActive: boolean;
  descricao: string;
  proxima: string;
  /** Quantas ocorrências já viraram tarefa. */
  geradas: number;
  /** Quantas dessas continuam abertas. */
  abertas: number;
};

export type Destinatario = {
  value: string;
  label: string;
  hint?: string;
  tipo: "pessoa" | "time";
};

/**
 * Os moldes de tarefa que se repetem.
 *
 * Ficam numa tela à parte, e não misturados à fila: um molde não é trabalho a
 * fazer — é a regra que produz trabalho. Vê-lo no board junto das tarefas
 * reais faria a fila mentir sobre o tamanho dela.
 */
export function RecurrencesPanel({
  regras,
  destinatarios,
  businessUnits,
  podeEditar,
}: {
  regras: RegraNaTela[];
  destinatarios: Destinatario[];
  businessUnits: Array<{ id: string; label: string }>;
  podeEditar: boolean;
}) {
  const [editando, setEditando] = useState<RegraNaTela | null>(null);
  const [criando, setCriando] = useState(false);
  const [excluindo, setExcluindo] = useState<string | null>(null);

  const ativas = regras.filter((regra) => regra.isActive).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          {ativas} de {regras.length} ativas. A ocorrência nasce no board de
          quem responde por ela, na data marcada.
        </p>
        {podeEditar ? (
          <Button variant="primary" onClick={() => setCriando(true)}>
            + Nova recorrente
          </Button>
        ) : null}
      </div>

      <Card>
        <CardBody className="px-0 py-0">
          {regras.length === 0 ? (
            <EmptyState
              variant="inline"
              title="Nenhuma tarefa recorrente ainda."
              description="Serve para o que se repete em data fixa: fechar os números da semana, revisar o calendário, conferir a fila."
            />
          ) : (
            <ul className="divide-y divide-slate-100">
              {regras.map((regra) => (
                <li
                  key={regra.id}
                  className={cn(
                    "px-5 py-3",
                    !regra.isActive && "bg-slate-50/60",
                  )}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-slate-900">
                          {regra.title}
                        </span>
                        {regra.isActive ? null : <Badge>Pausada</Badge>}
                        {regra.abertas > 0 ? (
                          <Badge tone="warning">
                            {regra.abertas} em aberto
                          </Badge>
                        ) : null}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {regra.descricao} ·{" "}
                        {regra.assigneeName ??
                          regra.assignedTeamName ??
                          "sem destino"}
                        {regra.isActive
                          ? ` · próxima em ${formatDate(new Date(regra.proxima))}`
                          : ""}
                      </p>
                    </div>

                    {podeEditar ? (
                      <div className="flex shrink-0 flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditando(regra)}
                        >
                          Editar
                        </Button>
                        <form action={toggleRecurrence}>
                          <input
                            type="hidden"
                            name="recurrenceId"
                            value={regra.id}
                          />
                          <Button type="submit" size="sm" variant="ghost">
                            {regra.isActive ? "Pausar" : "Retomar"}
                          </Button>
                        </form>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setExcluindo(regra.id)}
                        >
                          Excluir
                        </Button>
                      </div>
                    ) : null}
                  </div>

                  {excluindo === regra.id ? (
                    <div className="mt-2 flex flex-wrap items-center gap-3 rounded-lg border border-danger-200 bg-danger-50 px-3 py-2">
                      <p className="min-w-0 flex-1 text-sm text-danger-900">
                        Excluir <strong>{regra.title}</strong>? As{" "}
                        {regra.geradas} tarefas que ela já gerou continuam onde
                        estão — só param de nascer novas. Pausar tem o mesmo
                        efeito e dá para desfazer.
                      </p>
                      <form action={deleteRecurrence}>
                        <input
                          type="hidden"
                          name="recurrenceId"
                          value={regra.id}
                        />
                        <Button type="submit" size="sm" variant="danger">
                          Excluir
                        </Button>
                      </form>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setExcluindo(null)}
                      >
                        Cancelar
                      </Button>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <RecurrenceDrawer
        aberto={criando || editando !== null}
        regra={editando}
        destinatarios={destinatarios}
        businessUnits={businessUnits}
        onClose={() => {
          setCriando(false);
          setEditando(null);
        }}
      />
    </div>
  );
}

function RecurrenceDrawer({
  aberto,
  regra,
  destinatarios,
  businessUnits,
  onClose,
}: {
  aberto: boolean;
  regra: RegraNaTela | null;
  destinatarios: Destinatario[];
  businessUnits: Array<{ id: string; label: string }>;
  onClose: () => void;
}) {
  const [frequencia, setFrequencia] = useState<RecurrenceFrequency>(
    regra?.frequency ?? "weekly",
  );

  const grupos: SelectGroup[] = [
    {
      label: "Pessoas",
      options: destinatarios
        .filter((item) => item.tipo === "pessoa")
        .map(({ value, label, hint }) => ({
          value: `pessoa:${value}`,
          label,
          hint,
        })),
    },
    {
      label: "Times",
      options: destinatarios
        .filter((item) => item.tipo === "time")
        .map(({ value, label, hint }) => ({
          value: `time:${value}`,
          label,
          hint,
        })),
    },
  ].filter((grupo) => grupo.options.length > 0);

  const destinoAtual = regra?.assigneeId
    ? `pessoa:${regra.assigneeId}`
    : regra?.assignedTeamId
      ? `time:${regra.assignedTeamId}`
      : "";

  const [destino, setDestino] = useState(destinoAtual);

  // Remonta o conteúdo a cada abertura: sem isto, abrir "editar" numa regra e
  // depois em outra mostraria os campos da primeira.
  const chave = regra?.id ?? "nova";

  return (
    <Drawer
      key={chave}
      open={aberto}
      onClose={onClose}
      title={regra ? "Editar recorrente" : "Nova tarefa recorrente"}
      description="A tarefa nasce sozinha na data marcada, no board de quem responde por ela."
    >
      <form action={saveRecurrence} className="space-y-4" onSubmit={onClose}>
        {regra ? (
          <input type="hidden" name="recurrenceId" value={regra.id} />
        ) : null}
        <input
          type="hidden"
          name="assigneeId"
          value={destino.startsWith("pessoa:") ? destino.slice(7) : ""}
        />
        <input
          type="hidden"
          name="assignedTeamId"
          value={destino.startsWith("time:") ? destino.slice(5) : ""}
        />

        <Field label="O que precisa ser feito" htmlFor="rec-title" required>
          <Input
            id="rec-title"
            name="title"
            defaultValue={regra?.title ?? ""}
            placeholder="Ex.: Lançar os números da semana"
            maxLength={140}
            required
          />
        </Field>

        <Field label="Para quem" htmlFor="rec-destino">
          <Select
            id="rec-destino"
            value={destino}
            onValueChange={setDestino}
            placeholder="Você mesmo"
            ariaLabel="Para quem"
            groups={grupos}
          />
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Com que frequência" htmlFor="rec-freq" required>
            <Select
              id="rec-freq"
              name="frequency"
              value={frequencia}
              onValueChange={(valor) =>
                setFrequencia(valor as RecurrenceFrequency)
              }
              options={RECURRENCE_FREQUENCIES.map((valor) => ({
                value: valor,
                label: RECURRENCE_FREQUENCY_LABELS[valor],
              }))}
            />
          </Field>

          {frequencia === "monthly" ? (
            <Field
              label="Dia do mês"
              htmlFor="rec-dia"
              hint="29, 30 e 31 caem no último dia dos meses curtos."
            >
              <Input
                id="rec-dia"
                name="dayOfMonth"
                type="number"
                min={1}
                max={31}
                defaultValue={regra?.dayOfMonth ?? 1}
              />
            </Field>
          ) : (
            <Field label="Em que dia" htmlFor="rec-weekday">
              <Select
                id="rec-weekday"
                name="weekday"
                defaultValue={String(regra?.weekday ?? 5)}
                options={WEEKDAY_LABELS.map((label, indice) => ({
                  value: String(indice),
                  label: label.charAt(0).toUpperCase() + label.slice(1),
                }))}
              />
            </Field>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            label="Prazo"
            htmlFor="rec-prazo"
            hint="Dias a partir do nascimento. Zero = para o mesmo dia."
          >
            <Input
              id="rec-prazo"
              name="dueInDays"
              type="number"
              min={0}
              max={30}
              defaultValue={regra?.dueInDays ?? 0}
            />
          </Field>

          <Field label="Prioridade" htmlFor="rec-prioridade">
            <Select
              id="rec-prioridade"
              name="priority"
              defaultValue={regra?.priority ?? "normal"}
              options={TASK_PRIORITIES.map((valor) => ({
                value: valor,
                label: TASK_PRIORITY_LABELS[valor],
              }))}
            />
          </Field>
        </div>

        {businessUnits.length > 0 ? (
          <Field label="Business Unit" htmlFor="rec-bu">
            <Select
              id="rec-bu"
              name="businessUnitId"
              defaultValue={regra?.businessUnitId ?? ""}
              placeholder="Nenhuma"
              options={[
                { value: "", label: "Nenhuma" },
                ...businessUnits.map((unidade) => ({
                  value: unidade.id,
                  label: unidade.label,
                })),
              ]}
            />
          </Field>
        ) : null}

        <Field label="Detalhes" htmlFor="rec-descricao">
          <Input
            id="rec-descricao"
            name="description"
            defaultValue={regra?.description ?? ""}
            maxLength={280}
            placeholder="O que a pessoa precisa saber para fazer sem perguntar."
          />
        </Field>

        <div className="flex gap-2">
          <Button type="submit" variant="primary">
            {regra ? "Salvar" : "Criar"}
          </Button>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </form>
    </Drawer>
  );
}
