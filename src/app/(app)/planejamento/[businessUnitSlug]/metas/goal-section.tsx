"use client";

import { useActionState, useEffect, useState } from "react";

import { saveGoal } from "../../actions";
import {
  INITIAL_STRATEGY_STATE,
  type StrategyFormState,
} from "../../form-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, Section } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/field";
import {
  FINDING_KIND_LABELS,
  GOAL_METRIC_CATALOG,
  GOAL_METRIC_GROUPS,
  GOAL_SCOPE_LABELS,
  type GoalMetric,
  type GoalScope,
} from "@/lib/db/schema";
import type { Finding } from "@/lib/modules/strategy/diagnosis";
import { formatMetricValue, type Goal } from "@/lib/modules/strategy/goals";
import { cn } from "@/lib/utils/cn";

/** Quantas linhas de frente o formulário oferece. */
const LINHAS_DE_FRENTE = 4;

/**
 * O `Textarea` do projeto é monoespaçado — ele existe para editar markdown na
 * documentação. Os campos do template são prosa, e prosa em monoespaçada
 * desencoraja escrever: volta para a fonte de texto.
 */
const PROSA = "font-sans text-sm";

/**
 * O texto de apoio de cada campo do template.
 *
 * Fica junto do campo, e não num manual: template só é seguido quando a
 * instrução está no lugar em que a pessoa está digitando. As perguntas são
 * escritas na segunda pessoa de propósito — quem preenche é o analista, e o
 * campo é uma pergunta feita a ele.
 */
const AJUDA = {
  objective:
    "Uma frase afirmativa, no infinitivo, com o resultado dentro. Ex.: “Consolidar a BU como a referência em Clínica Médica para R1, dobrando a base qualificada.”",
  rationale:
    "O que no cenário — concorrência, calendário de provas, resultado do ciclo passado — faz disto a prioridade agora.",
  fronts:
    "De 2 a 4 apostas de COMO chegar lá. É estratégia, não lista de tarefas: “Reposicionar o Extensivo” é frente; “gravar 12 aulas” é execução.",
  nonGoals:
    "O que decidimos NÃO fazer neste período, mesmo que apareça oportunidade. É o campo que protege o foco em julho.",
  successSignal:
    "O sinal de que deu certo que o número não mostra. Ex.: “o time comercial passa a receber lead que já sabe o que é o Extensivo”.",
  risks:
    "O que pode derrubar a meta e de quem ela depende — outra área, um fornecedor, uma contratação.",
} as const;

export function GoalSection({
  cycleId,
  scope,
  goal,
  periodLabel,
  partial,
  isCurrent,
  isPast,
  canEdit,
  findings,
  revisions,
}: {
  cycleId: string;
  scope: GoalScope;
  goal: Goal | null;
  periodLabel: string;
  partial: boolean;
  isCurrent: boolean;
  isPast: boolean;
  canEdit: boolean;
  /** Achados do ciclo, para o vínculo com o diagnóstico. */
  findings: (Finding & { roundSequence: number })[];
  /** Revisões desta meta, mais recente primeiro. */
  revisions: { changedAt: Date; reason: string | null }[];
}) {
  const [editing, setEditing] = useState(false);

  return (
    // Ciclo e semestres são três recortes do mesmo compromisso, e a comparação
    // entre eles é o que se lê aqui. Em três cartões separados, cada um pedia
    // uma moldura própria para dizer "1º semestre".
    <Section
      className={cn(isCurrent && "bg-brand-50/30")}
      title={
        <span className="flex flex-wrap items-center gap-2">
          {GOAL_SCOPE_LABELS[scope]}
          {isCurrent ? <Badge tone="brand">Em curso</Badge> : null}
          {isPast ? <Badge>Encerrado</Badge> : null}
        </span>
      }
      description={
        partial
          ? `${periodLabel} — recortado pelo início do ciclo`
          : periodLabel
      }
      action={
        canEdit && !editing ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setEditing(true)}
          >
            {goal ? "Editar" : "Definir meta"}
          </Button>
        ) : null
      }
      divider
    >
      <div className="px-5 pb-4 pt-2">
        {editing ? (
          <GoalForm
            cycleId={cycleId}
            scope={scope}
            goal={goal}
            findings={findings}
            onDone={() => setEditing(false)}
          />
        ) : goal ? (
          <GoalReadView goal={goal} findings={findings} revisions={revisions} />
        ) : (
          <p className="text-sm text-slate-500">
            Nenhuma meta definida para este escopo.
            {canEdit ? " Use “Definir meta” para escrever a primeira." : ""}
          </p>
        )}
      </div>
    </Section>
  );
}

/* ────────────────────────────── leitura ────────────────────────────── */

function Bloco({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {titulo}
      </h4>
      <div className="mt-1 text-sm text-slate-700">{children}</div>
    </div>
  );
}

function GoalReadView({
  goal,
  findings,
  revisions,
}: {
  goal: Goal;
  findings: (Finding & { roundSequence: number })[];
  revisions: { changedAt: Date; reason: string | null }[];
}) {
  const vinculados = findings.filter((f) => f.goalIds.includes(goal.id));

  return (
    <div className="space-y-4">
      <p className="font-display text-lg leading-snug text-slate-900">
        {goal.objective}
      </p>

      {goal.targets.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {goal.targets.map((alvo) => (
            <div
              key={alvo.metric}
              className="rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2"
            >
              <p className="text-xs text-slate-500">
                {GOAL_METRIC_CATALOG[alvo.metric].label}
              </p>
              <p className="font-display text-xl font-semibold tabular-nums text-slate-900">
                {formatMetricValue(alvo.metric, alvo.target)}
              </p>
              {alvo.note ? (
                <p className="mt-0.5 text-xs text-slate-500">{alvo.note}</p>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      {goal.rationale ? (
        <Bloco titulo="Por que este é o foco agora">
          <p className="whitespace-pre-line">{goal.rationale}</p>
        </Bloco>
      ) : null}

      {goal.fronts.length > 0 ? (
        <Bloco titulo={`Frentes (${goal.fronts.length})`}>
          <ol className="space-y-2">
            {goal.fronts.map((frente, index) => (
              <li key={index} className="flex gap-2.5">
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700">
                  {index + 1}
                </span>
                <span>
                  <span className="font-medium text-slate-900">
                    {frente.title}
                  </span>
                  {frente.detail ? (
                    <span className="block text-slate-600">
                      {frente.detail}
                    </span>
                  ) : null}
                </span>
              </li>
            ))}
          </ol>
        </Bloco>
      ) : null}

      {goal.nonGoals ? (
        <Bloco titulo="O que não vamos fazer">
          <p className="whitespace-pre-line text-slate-600">{goal.nonGoals}</p>
        </Bloco>
      ) : null}

      {goal.successSignal ? (
        <Bloco titulo="Como saberemos que deu certo, além do número">
          <p className="whitespace-pre-line">{goal.successSignal}</p>
        </Bloco>
      ) : null}

      {goal.risks ? (
        <Bloco titulo="Riscos e dependências">
          <p className="whitespace-pre-line text-slate-600">{goal.risks}</p>
        </Bloco>
      ) : null}

      {/* O que sustenta esta meta. Meta sem achado é meta que ninguém embasou. */}
      <Bloco titulo="Achados do diagnóstico que esta meta responde">
        {vinculados.length === 0 ? (
          <p className="text-sm text-amber-700">
            Nenhum achado vinculado — esta meta não está apoiada no diagnóstico.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {vinculados.map((achado) => (
              <li
                key={achado.id}
                className="flex flex-wrap items-baseline gap-2"
              >
                <Badge>{FINDING_KIND_LABELS[achado.kind]}</Badge>
                <span className="text-sm text-slate-700">
                  {achado.statement}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Bloco>

      {revisions.length > 0 ? (
        <Bloco titulo={`Revisões (${revisions.length})`}>
          <ul className="space-y-1">
            {revisions.map((rev, index) => (
              <li key={index} className="text-xs text-slate-500">
                {rev.changedAt.toLocaleDateString("pt-BR")}
                {rev.reason ? ` — ${rev.reason}` : " — sem motivo registrado"}
              </li>
            ))}
          </ul>
        </Bloco>
      ) : null}
    </div>
  );
}

/* ────────────────────────────── formulário ────────────────────────────── */

function GoalForm({
  cycleId,
  scope,
  goal,
  findings,
  onDone,
}: {
  cycleId: string;
  scope: GoalScope;
  goal: Goal | null;
  findings: (Finding & { roundSequence: number })[];
  onDone: () => void;
}) {
  const [state, formAction, isPending] = useActionState<
    StrategyFormState,
    FormData
  >(saveGoal, INITIAL_STRATEGY_STATE);

  // Fecha o formulário quando a gravação dá certo. A confirmação é a própria
  // visualização já atualizada — manter o formulário aberto depois de salvar
  // deixa a dúvida de se o que está na tela é o salvo ou o rascunho.
  useEffect(() => {
    if (state.status === "success") onDone();
  }, [state, onDone]);

  // Indicadores marcados. Começa no que já está salvo, para que editar uma meta
  // não exija remarcar tudo.
  const [selecionados, setSelecionados] = useState<Set<GoalMetric>>(
    () => new Set(goal?.targets.map((t) => t.metric) ?? []),
  );

  const valorSalvo = (metric: GoalMetric) =>
    goal?.targets.find((t) => t.metric === metric);

  function alternar(metric: GoalMetric) {
    setSelecionados((antes) => {
      const proximo = new Set(antes);
      if (proximo.has(metric)) proximo.delete(metric);
      else proximo.add(metric);
      return proximo;
    });
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="cycleId" value={cycleId} />
      <input type="hidden" name="scope" value={scope} />

      {state.status === "error" && state.message ? (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {state.message}
        </p>
      ) : null}

      <Field
        label="Objetivo"
        hint={AJUDA.objective}
        required
        htmlFor={`obj-${scope}`}
      >
        <Textarea
          id={`obj-${scope}`}
          name="objective"
          rows={2}
          required
          className={PROSA}
          defaultValue={goal?.objective ?? ""}
          placeholder="Onde queremos chegar neste período"
        />
      </Field>

      <Field label="Por que este é o foco agora" hint={AJUDA.rationale}>
        <Textarea
          name="rationale"
          rows={3}
          className={PROSA}
          defaultValue={goal?.rationale ?? ""}
        />
      </Field>

      <div>
        <p className="mb-1.5 block text-sm font-medium text-slate-800">
          Frentes
        </p>
        <p className="mb-2.5 text-xs text-slate-500">{AJUDA.fronts}</p>
        <div className="space-y-2.5">
          {Array.from({ length: LINHAS_DE_FRENTE }, (_, index) => {
            const atual = goal?.fronts[index];
            return (
              <div
                key={index}
                className="rounded-lg border border-slate-200 p-2.5"
              >
                <Input
                  name={`frente_titulo_${index}`}
                  defaultValue={atual?.title ?? ""}
                  placeholder={`Frente ${index + 1} — título`}
                />
                <Input
                  name={`frente_detalhe_${index}`}
                  defaultValue={atual?.detail ?? ""}
                  placeholder="O que ela significa na prática (opcional)"
                  className="mt-1.5"
                />
              </div>
            );
          })}
        </div>
      </div>

      <Field label="O que não vamos fazer" hint={AJUDA.nonGoals}>
        <Textarea
          name="nonGoals"
          rows={3}
          className={PROSA}
          defaultValue={goal?.nonGoals ?? ""}
        />
      </Field>

      <Field
        label="Como saberemos que deu certo, além do número"
        hint={AJUDA.successSignal}
      >
        <Textarea
          name="successSignal"
          rows={2}
          className={PROSA}
          defaultValue={goal?.successSignal ?? ""}
        />
      </Field>

      <Field label="Riscos e dependências" hint={AJUDA.risks}>
        <Textarea
          name="risks"
          rows={2}
          className={PROSA}
          defaultValue={goal?.risks ?? ""}
        />
      </Field>

      {/* ── Indicadores ── */}
      <div>
        <p className="mb-1.5 block text-sm font-medium text-slate-800">
          Indicadores
        </p>
        <p className="mb-3 text-xs text-slate-500">
          Marque só o que faz sentido para esta BU e escreva o número-alvo. Não
          existe campo de realizado: o acompanhamento fica no dashboard.
        </p>

        <div className="space-y-4">
          {GOAL_METRIC_GROUPS.map((grupo) => {
            const doGrupo = (
              Object.entries(GOAL_METRIC_CATALOG) as [
                GoalMetric,
                (typeof GOAL_METRIC_CATALOG)[GoalMetric],
              ][]
            ).filter(([, spec]) => spec.group === grupo.key);

            return (
              <fieldset key={grupo.key}>
                <legend className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {grupo.label}
                </legend>
                <div className="mt-2 space-y-1.5">
                  {doGrupo.map(([metric, spec]) => {
                    const marcado = selecionados.has(metric);
                    const salvo = valorSalvo(metric);

                    return (
                      <div
                        key={metric}
                        className={cn(
                          "rounded-lg border px-3 py-2 transition-colors",
                          marcado
                            ? "border-brand-200 bg-brand-50/40"
                            : "border-slate-200",
                        )}
                      >
                        <label className="flex cursor-pointer items-center gap-2.5">
                          <input
                            type="checkbox"
                            name="indicador"
                            value={metric}
                            checked={marcado}
                            onChange={() => alternar(metric)}
                            className="size-4 rounded border-slate-300 text-brand-600 focus:ring-brand-200"
                          />
                          <span className="text-sm text-slate-800">
                            {spec.label}
                          </span>
                          <span className="text-xs text-slate-500">
                            {UNIDADE_LABEL[spec.unit]}
                          </span>
                        </label>

                        {marcado ? (
                          <div className="mt-2 grid gap-2 pl-6 sm:grid-cols-[9rem_1fr]">
                            <Input
                              name={`valor_${metric}`}
                              inputMode="decimal"
                              required
                              defaultValue={
                                salvo
                                  ? String(salvo.target).replace(".", ",")
                                  : ""
                              }
                              placeholder="Alvo"
                              aria-label={`Alvo de ${spec.label}`}
                            />
                            <Input
                              name={`nota_${metric}`}
                              defaultValue={salvo?.note ?? ""}
                              placeholder="De onde vem esse número (opcional)"
                              aria-label={`Contexto de ${spec.label}`}
                            />
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </fieldset>
            );
          })}
        </div>
      </div>

      {/* ── Achados do diagnóstico ── */}
      <div>
        <p className="mb-1.5 block text-sm font-medium text-slate-800">
          Achados que esta meta responde
        </p>
        {findings.length === 0 ? (
          <p className="text-xs text-slate-500">
            Nenhum achado registrado neste ciclo ainda. Abra uma rodada na aba
            Diagnóstico — é ela que dá base a esta meta.
          </p>
        ) : (
          <>
            <p className="mb-2.5 text-xs text-slate-500">
              Marque o que esta meta endereça. Não é obrigatório, mas achado sem
              meta e meta sem achado aparecem como aviso nas duas telas.
            </p>
            <div className="space-y-1.5">
              {findings.map((achado) => (
                <label
                  key={achado.id}
                  className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-slate-200 px-3 py-2"
                >
                  <input
                    type="checkbox"
                    name="achado"
                    value={achado.id}
                    defaultChecked={
                      goal ? achado.goalIds.includes(goal.id) : false
                    }
                    className="mt-0.5 size-4 rounded border-slate-300 text-brand-600 focus:ring-brand-200"
                  />
                  <span className="min-w-0">
                    <span className="text-sm text-slate-800">
                      {achado.statement}
                    </span>
                    <span className="mt-0.5 block text-xs text-slate-500">
                      {FINDING_KIND_LABELS[achado.kind]}
                      {" · "}
                      {achado.roundSequence}ª rodada
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Motivo só existe ao revisar: numa meta nova não há o que justificar. */}
      {goal ? (
        <Field
          label="Motivo desta revisão"
          hint="Fica no histórico da meta. Em branco quando foi só ajuste de redação."
        >
          <Input
            name="revisionReason"
            placeholder="Ex.: a 2ª rodada mostrou que o CPL dobrou"
          />
        </Field>
      ) : null}

      <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
        <Button type="submit" variant="primary" disabled={isPending}>
          {isPending ? "Salvando…" : "Salvar meta"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={onDone}
          disabled={isPending}
        >
          Cancelar
        </Button>
        {state.status === "success" && state.message ? (
          <span className="text-sm text-emerald-700">{state.message}</span>
        ) : null}
      </div>
    </form>
  );
}

const UNIDADE_LABEL: Record<string, string> = {
  count: "número",
  currency: "R$",
  percent: "%",
  ratio: "×",
  score: "0–100",
};
