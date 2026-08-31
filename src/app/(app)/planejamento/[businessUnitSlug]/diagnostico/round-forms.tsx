"use client";

import { useActionState } from "react";

import { openRound, saveMeasurements, saveRoundSummary } from "./actions";
import {
  INITIAL_STRATEGY_STATE,
  type StrategyFormState,
} from "../../form-state";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { GOAL_METRIC_CATALOG, type GoalMetric } from "@/lib/db/schema";
import { toDateInput } from "@/lib/modules/strategy/dates";
import type { Measurement } from "@/lib/modules/strategy/diagnosis";
import type { GoalTarget } from "@/lib/modules/strategy/goals";

function Aviso({ state }: { state: StrategyFormState }) {
  if (!state.message) return null;
  return (
    <p
      className={
        state.status === "error"
          ? "rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800"
          : "text-sm text-emerald-700"
      }
    >
      {state.message}
    </p>
  );
}

/** Abre uma rodada. A data de referência é a da leitura, não a da digitação. */
export function OpenRoundForm({
  cycleId,
  isFirst,
}: {
  cycleId: string;
  isFirst: boolean;
}) {
  const [state, formAction, isPending] = useActionState<
    StrategyFormState,
    FormData
  >(openRound, INITIAL_STRATEGY_STATE);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="cycleId" value={cycleId} />
      <Aviso state={state} />

      <div className="flex flex-wrap items-end gap-3">
        <Field
          label="Data de referência"
          hint="A data a que a leitura se refere."
          htmlFor="referenceDate"
        >
          <Input
            id="referenceDate"
            type="date"
            name="referenceDate"
            defaultValue={toDateInput(new Date())}
            className="w-44"
          />
        </Field>
        {/*
          Abrir nova rodada fecha a atual, então não deve ser o botão mais
          chamativo da tela — só a primeira rodada, que não fecha nada, é ação
          primária.
        */}
        <Button
          type="submit"
          variant={isFirst ? "primary" : "secondary"}
          disabled={isPending}
        >
          {isPending
            ? "Abrindo…"
            : isFirst
              ? "Abrir a primeira rodada"
              : "Abrir nova rodada"}
        </Button>
      </div>
      {!isFirst ? (
        <p className="text-xs text-slate-500">
          A rodada anterior é fechada automaticamente — só uma fica aberta por
          ciclo.
        </p>
      ) : null}
    </form>
  );
}

/** A leitura geral da rodada, escrita depois dos achados. */
export function RoundSummaryForm({
  roundId,
  summary,
}: {
  roundId: string;
  summary: string | null;
}) {
  const [state, formAction, isPending] = useActionState<
    StrategyFormState,
    FormData
  >(saveRoundSummary, INITIAL_STRATEGY_STATE);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="roundId" value={roundId} />
      <Textarea
        name="summary"
        rows={3}
        className="font-sans text-sm"
        defaultValue={summary ?? ""}
        placeholder="Em duas ou três frases: o que esta rodada mostrou que a anterior não mostrava."
      />
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="submit"
          variant="secondary"
          size="sm"
          disabled={isPending}
        >
          {isPending ? "Salvando…" : "Salvar leitura"}
        </Button>
        <Aviso state={state} />
      </div>
    </form>
  );
}

/**
 * O realizado dos indicadores que a meta do ciclo definiu.
 *
 * Só aparecem os indicadores que a meta escolheu: realizado sem alvo não tem
 * denominador, e pedir número de indicador que ninguém metou seria trabalho sem
 * consumidor.
 */
export function MeasurementsForm({
  roundId,
  targets,
  measurements,
}: {
  roundId: string;
  targets: GoalTarget[];
  measurements: Measurement[];
}) {
  const [state, formAction, isPending] = useActionState<
    StrategyFormState,
    FormData
  >(saveMeasurements, INITIAL_STRATEGY_STATE);

  const salvo = (metric: GoalMetric) =>
    measurements.find((m) => m.metric === metric);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="roundId" value={roundId} />
      <Aviso state={state} />

      <div className="space-y-2">
        {targets.map((alvo) => {
          const atual = salvo(alvo.metric);
          const spec = GOAL_METRIC_CATALOG[alvo.metric];

          return (
            <div
              key={alvo.metric}
              className="grid items-end gap-2 rounded-lg border border-slate-200 px-3 py-2.5 sm:grid-cols-[1fr_8rem_1fr]"
            >
              <div>
                <p className="text-sm text-slate-800">{spec.label}</p>
                <p className="text-xs text-slate-400">
                  alvo do ciclo:{" "}
                  <span className="tabular-nums">
                    {alvo.target.toLocaleString("pt-BR")}
                  </span>
                </p>
              </div>
              <Input
                name={`realizado_${alvo.metric}`}
                inputMode="decimal"
                defaultValue={
                  atual ? String(atual.actual).replace(".", ",") : ""
                }
                placeholder="Realizado"
                aria-label={`Realizado de ${spec.label}`}
              />
              <Input
                name={`nota_realizado_${alvo.metric}`}
                defaultValue={atual?.note ?? ""}
                placeholder="Observação (opcional)"
                aria-label={`Observação de ${spec.label}`}
              />
            </div>
          );
        })}
      </div>

      <Button type="submit" variant="secondary" size="sm" disabled={isPending}>
        {isPending ? "Salvando…" : "Salvar realizado"}
      </Button>
    </form>
  );
}
