"use client";

import { useActionState, useEffect, useState } from "react";

import { saveQuarterlyReviewAction } from "./actions";
import {
  INITIAL_STRATEGY_STATE,
  type StrategyFormState,
} from "../../form-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/field";
import { toDateInput } from "@/lib/modules/strategy/dates";
import type { QuarterlyReview } from "@/lib/modules/strategy/quarterly-review";
import { cn } from "@/lib/utils/cn";

function Aviso({ state }: { state: StrategyFormState }) {
  if (!state.message) return null;
  return (
    <p
      className={
        state.status === "error"
          ? "rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800"
          : "rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
      }
    >
      {state.message}
    </p>
  );
}

export function QuarterlyReviewForm({
  businessUnitId,
  cycleId,
  initialData,
  onDone,
}: {
  businessUnitId: string;
  cycleId?: string | null;
  initialData?: QuarterlyReview | null;
  onDone?: () => void;
}) {
  const [state, formAction, isPending] = useActionState<
    StrategyFormState,
    FormData
  >(saveQuarterlyReviewAction, INITIAL_STRATEGY_STATE);

  useEffect(() => {
    if (state.status === "success" && onDone) {
      onDone();
    }
  }, [state, onDone]);

  const [diagnosticValid, setDiagnosticValid] = useState<string>(
    initialData?.diagnosticValid ?? "sim",
  );
  const [needsGoalRevision, setNeedsGoalRevision] = useState<string>(
    initialData?.needsGoalRevision ?? "nao",
  );

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="businessUnitId" value={businessUnitId} />
      {initialData?.id && (
        <input type="hidden" name="reviewId" value={initialData.id} />
      )}
      {cycleId && <input type="hidden" name="cycleId" value={cycleId} />}
      <input type="hidden" name="diagnosticValid" value={diagnosticValid} />
      <input type="hidden" name="needsGoalRevision" value={needsGoalRevision} />

      <Aviso state={state} />

      {/* Identificação do Rito */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Trimestre de Referência"
          hint="Identificador do trimestre (ex: Q1, Q2, Q3, Q4)"
          required
          htmlFor="quarter"
        >
          <Input
            id="quarter"
            name="quarter"
            defaultValue={initialData?.quarter ?? "Q1"}
            required
          />
        </Field>

        <Field
          label="Data da Revisão"
          hint="Data da realização do comitê de checagem trimestral"
          required
          htmlFor="reviewDate"
        >
          <Input
            id="reviewDate"
            type="date"
            name="reviewDate"
            defaultValue={
              initialData?.reviewDate
                ? toDateInput(new Date(initialData.reviewDate))
                : toDateInput(new Date())
            }
            required
          />
        </Field>
      </div>

      {/* As 7 Perguntas Oficiais */}
      <div className="space-y-5 rounded-xl border border-slate-200 bg-slate-50/50 p-5">
        <div className="border-b border-slate-200 pb-3">
          <h3 className="font-display text-base font-semibold text-slate-900">
            As 7 Perguntas Estratégicas do Trimestre
          </h3>
          <p className="text-xs text-slate-500">
            Cadência de 3 meses: checar se ainda estamos pensando certo e se o
            diagnóstico inicial se sustenta.
          </p>
        </div>

        {/* Pergunta 1 */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-slate-800">
            1. O diagnóstico feito há 3 meses ainda é válido?
          </label>
          <p className="text-xs text-slate-500">
            Avalie se as conclusões de Negócio, Clientes, Portfólio, Funil e
            Capacidade continuam refletindo a realidade da BU.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            {[
              { id: "sim", label: "Sim, continua válido", tone: "brand" },
              {
                id: "parcialmente",
                label: "Parcialmente (com ressalvas)",
                tone: "neutral",
              },
              {
                id: "nao",
                label: "Não, cenário mudou significativamente",
                tone: "danger",
              },
            ].map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setDiagnosticValid(option.id)}
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                  diagnosticValid === option.id
                    ? "border-brand-600 bg-brand-50 text-brand-900 ring-2 ring-brand-500/20"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Pergunta 2 */}
        <Field
          label="2. O que mudou no mercado, no cliente ou na concorrência?"
          hint="Novos concorrentes, oscilações no comportamento dos médicos/estudantes ou mudanças nas provas/editais."
          htmlFor="marketChanges"
        >
          <Textarea
            id="marketChanges"
            name="marketChanges"
            rows={2}
            className="font-sans text-sm"
            defaultValue={initialData?.marketChanges ?? ""}
          />
        </Field>

        {/* Pergunta 3 */}
        <Field
          label="3. Surgiram novos problemas que não estavam no diagnóstico inicial?"
          hint="Gargalos operacionais, falhas em plataformas, custos imprevistos ou problemas de entrega."
          htmlFor="newProblems"
        >
          <Textarea
            id="newProblems"
            name="newProblems"
            rows={2}
            className="font-sans text-sm"
            defaultValue={initialData?.newProblems ?? ""}
          />
        </Field>

        {/* Pergunta 4 */}
        <Field
          label="4. Deixamos de aproveitar alguma oportunidade importante?"
          hint="Campanhas não realizadas, parcerias perdidas ou timing inadequado em lançamentos."
          htmlFor="missedOpportunities"
        >
          <Textarea
            id="missedOpportunities"
            name="missedOpportunities"
            rows={2}
            className="font-sans text-sm"
            defaultValue={initialData?.missedOpportunities ?? ""}
          />
        </Field>

        {/* Pergunta 5 */}
        <Field
          label="5. As premissas que sustentavam o objetivo ainda se mantêm?"
          hint="As hipóteses de taxa de conversão, ticket médio, interesse do público e margem continuam reais?"
          htmlFor="objectiveAssumptions"
        >
          <Textarea
            id="objectiveAssumptions"
            name="objectiveAssumptions"
            rows={2}
            className="font-sans text-sm"
            defaultValue={initialData?.objectiveAssumptions ?? ""}
          />
        </Field>

        {/* Pergunta 6 */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-slate-800">
            6. Precisamos revisar alguma meta para o próximo trimestre?
          </label>
          <p className="text-xs text-slate-500">
            Ajustar o número da meta ou frentes estratégicas caso o cenário
            tenha mudado substancialmente.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            {[
              { id: "nao", label: "Não, manter metas atuais" },
              { id: "sim", label: "Sim, revisar metas na aba Metas" },
            ].map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setNeedsGoalRevision(option.id)}
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                  needsGoalRevision === option.id
                    ? "border-brand-600 bg-brand-50 text-brand-900 ring-2 ring-brand-500/20"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Pergunta 7 */}
        <Field
          label="7. Qual é o foco principal dos próximos 3 meses?"
          hint="A prioridade inegociável da BU que deve guiar as campanhas, lançamentos e esteira de marketing."
          htmlFor="nextQuarterFocus"
        >
          <Textarea
            id="nextQuarterFocus"
            name="nextQuarterFocus"
            rows={3}
            className="font-sans text-sm"
            defaultValue={initialData?.nextQuarterFocus ?? ""}
          />
        </Field>
      </div>

      <div className="flex items-center justify-end gap-3">
        {onDone && (
          <Button type="button" variant="ghost" onClick={onDone}>
            Cancelar
          </Button>
        )}
        <Button type="submit" variant="primary" disabled={isPending}>
          {isPending ? "Gravando revisão…" : "Salvar Revisão Trimestral"}
        </Button>
      </div>
    </form>
  );
}
