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

/** A síntese do diagnóstico (desafio e oportunidade) e objetivo do ciclo. */
export function RoundSummaryForm({
  roundId,
  summary,
  mainChallenge,
  mainOpportunity,
  cycleObjective,
  cyclePeriod,
}: {
  roundId: string;
  summary: string | null;
  mainChallenge?: string | null;
  mainOpportunity?: string | null;
  cycleObjective?: string | null;
  cyclePeriod?: string | null;
}) {
  const [state, formAction, isPending] = useActionState<
    StrategyFormState,
    FormData
  >(saveRoundSummary, INITIAL_STRATEGY_STATE);

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="roundId" value={roundId} />
      <Aviso state={state} />

      {/* Parte 2: Síntese do Diagnóstico */}
      <div className="rounded-xl border border-brand-200 bg-brand-50/20 p-4 space-y-4">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-brand-900">
            Parte 2 · Síntese do Diagnóstico
          </h4>
          <p className="mt-0.5 text-xs text-slate-500">
            A conclusão estratégica extraída da análise dos 5 pilares.
          </p>
        </div>

        <Field
          label="Qual é o principal desafio da BU hoje?"
          hint="O principal gargalo, risco ou problema crítico identificado no diagnóstico."
          htmlFor="mainChallenge"
        >
          <Textarea
            id="mainChallenge"
            name="mainChallenge"
            rows={2}
            className="font-sans text-sm"
            defaultValue={mainChallenge ?? ""}
            placeholder="Ex.: Perda de relevância e conversão no produto Extensivo frente a novos concorrentes regionais..."
          />
        </Field>

        <Field
          label="Qual é a principal oportunidade de crescimento?"
          hint="A alavanca mais promissora para destravar resultado nos próximos 6 meses."
          htmlFor="mainOpportunity"
        >
          <Textarea
            id="mainOpportunity"
            name="mainOpportunity"
            rows={2}
            className="font-sans text-sm"
            defaultValue={mainOpportunity ?? ""}
            placeholder="Ex.: Reposicionamento com foco no Internato e expansão da base de leads qualificados via eventos ao vivo..."
          />
        </Field>
      </div>

      {/* Parte 3: Objetivo do Ciclo */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-4">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            Parte 3 · Objetivo do Ciclo
          </h4>
          <p className="mt-0.5 text-xs text-slate-500">
            O objetivo estratégico que guiará todas as ações e metas do período.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-[1fr_12rem]">
          <Field
            label="Objetivo Macro do Ciclo"
            hint="Aonde a BU precisa chegar ao final destes 6 meses."
            htmlFor="cycleObjective"
          >
            <Input
              id="cycleObjective"
              name="cycleObjective"
              defaultValue={cycleObjective ?? ""}
              placeholder="Ex.: Consolidar liderança e atingir 3.000 matrículas no Extensivo"
            />
          </Field>

          <Field
            label="Período do Ciclo"
            hint="Ex.: Jan a Jun/2026"
            htmlFor="cyclePeriod"
          >
            <Input
              id="cyclePeriod"
              name="cyclePeriod"
              defaultValue={cyclePeriod ?? ""}
              placeholder="Jan a Jun/2026"
            />
          </Field>
        </div>

        <Field
          label="Leitura geral e observações da rodada"
          hint="Em duas ou três frases: o que esta rodada mostrou que a anterior não mostrava."
          htmlFor="summary"
        >
          <Textarea
            id="summary"
            name="summary"
            rows={2}
            className="font-sans text-sm"
            defaultValue={summary ?? ""}
            placeholder="Síntese adicional da leitura do comitê..."
          />
        </Field>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="primary" size="sm" disabled={isPending}>
          {isPending ? "Salvando…" : "Salvar Síntese e Objetivo"}
        </Button>
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
                <p className="text-xs text-slate-500">
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
