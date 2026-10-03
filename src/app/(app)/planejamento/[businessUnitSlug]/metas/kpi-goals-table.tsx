"use client";

import { useActionState, useEffect, useState } from "react";
import {
  saveKpiGoalAction,
  deleteKpiGoalAction,
  seedDefaultKpiGoalsAction,
} from "../../actions";
import {
  INITIAL_STRATEGY_STATE,
  type StrategyFormState,
} from "../../form-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/field";
import type { StrategyKpiGoal } from "@/lib/db/schema";
import { cn } from "@/lib/utils/cn";
import {
  Plus,
  Trash2,
  Edit2,
  Link as LinkIcon,
  Target,
  BarChart3,
  TrendingUp,
} from "lucide-react";

const SUGGESTED_DIAGNOSIS_TAGS = [
  "🔗 Demanda não capturada",
  "🔗 Mercado em crescimento",
  "🔗 Potencial de crescimento do produto",
  "🔗 Crescimento da base",
  "🔗 Oportunidade de ganho de eficiência",
  "🔗 Conversão abaixo do histórico",
];

export function KpiGoalsTable({
  businessUnitId,
  cycleId,
  goals,
  canEdit,
}: {
  businessUnitId: string;
  cycleId: string;
  goals: StrategyKpiGoal[];
  canEdit: boolean;
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingGoal, setEditingGoal] = useState<StrategyKpiGoal | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-display text-base font-semibold text-slate-900">
              Metas 2.0 · Desdobramento Estratégico do Ciclo
            </h3>
            <Badge tone="brand">Metodologia MedCof</Badge>
          </div>
          <p className="text-xs text-slate-500">
            Toda meta deve ser ancorada em uma constatação do diagnóstico e possuir indicadores de sucesso claros.
          </p>
        </div>

        {canEdit && !isAdding && !editingGoal && (
          <div className="flex flex-wrap items-center gap-2">
            {goals.length === 0 && (
              <form action={seedDefaultKpiGoalsAction}>
                <input type="hidden" name="businessUnitId" value={businessUnitId} />
                <input type="hidden" name="cycleId" value={cycleId} />
                <Button type="submit" variant="secondary" size="sm">
                  <Target className="size-3.5 text-brand-600 mr-1.5" />
                  Carregar Metas Recomendadas
                </Button>
              </form>
            )}
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => setIsAdding(true)}
            >
              <Plus className="size-3.5 mr-1" />
              Nova Meta
            </Button>
          </div>
        )}
      </div>

      {/* Formulário de Criação / Edição */}
      {(isAdding || editingGoal) && (
        <KpiGoalForm
          key={editingGoal?.id ?? "new"}
          businessUnitId={businessUnitId}
          cycleId={cycleId}
          initialData={editingGoal}
          onDone={() => {
            setIsAdding(false);
            setEditingGoal(null);
          }}
        />
      )}

      {/* Tabela de Metas 2.0 */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th scope="col" className="px-4 py-3 min-w-[200px]">
                  Meta
                </th>
                <th scope="col" className="px-4 py-3 min-w-[240px]">
                  Embasamento no Diagnóstico
                </th>
                <th scope="col" className="px-4 py-3 min-w-[170px]">
                  KPI Principal
                </th>
                <th scope="col" className="px-4 py-3 min-w-[170px]">
                  KPI Secundário
                </th>
                {canEdit && (
                  <th scope="col" className="px-3 py-3 text-right w-20">
                    Ações
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {goals.length === 0 ? (
                <tr>
                  <td
                    colSpan={canEdit ? 5 : 4}
                    className="px-4 py-8 text-center text-sm text-slate-500"
                  >
                    Nenhuma meta 2.0 cadastrada para este ciclo ainda.
                    {canEdit && (
                      <p className="mt-1 text-xs text-slate-400">
                        Clique em "+ Nova Meta" ou "Carregar Metas Recomendadas" para começar.
                      </p>
                    )}
                  </td>
                </tr>
              ) : (
                goals.map((g) => (
                  <tr key={g.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3.5">
                      <p className="font-semibold text-slate-900 text-sm">{g.title}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      {g.diagnosisBaseline ? (
                        <div className="flex flex-wrap gap-1.5">
                          {g.diagnosisBaseline
                            .split(/(?=🔗)/)
                            .map((tag) => tag.trim())
                            .filter((tag) => tag.length > 0)
                            .map((tag, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700 border border-blue-200/60"
                              >
                                {tag}
                              </span>
                            ))}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Sem embasamento vinculado</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      {g.primaryKpiName ? (
                        <div className="rounded-lg bg-brand-50/60 border border-brand-100 p-2 text-xs">
                          <p className="font-bold text-brand-900">{g.primaryKpiName}</p>
                          {g.primaryKpiTarget && (
                            <p className="mt-0.5 text-brand-700 font-semibold">
                              Alvo: <span className="tabular-nums">{g.primaryKpiTarget}</span>
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      {g.secondaryKpiName ? (
                        <div className="rounded-lg bg-slate-100/70 border border-slate-200 p-2 text-xs">
                          <p className="font-bold text-slate-800">{g.secondaryKpiName}</p>
                          {g.secondaryKpiTarget && (
                            <p className="mt-0.5 text-slate-600 font-medium">
                              Alvo: <span className="tabular-nums">{g.secondaryKpiTarget}</span>
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    {canEdit && (
                      <td className="px-3 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingGoal(g);
                              setIsAdding(false);
                            }}
                            className="rounded p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                            title="Editar Meta"
                          >
                            <Edit2 className="size-3.5" />
                          </button>
                          <form
                            action={deleteKpiGoalAction}
                            onSubmit={(e) => {
                              if (!window.confirm("Deseja realmente excluir esta meta 2.0?")) {
                                e.preventDefault();
                              }
                            }}
                          >
                            <input type="hidden" name="goalId" value={g.id} />
                            <input type="hidden" name="businessUnitId" value={businessUnitId} />
                            <button
                              type="submit"
                              className="rounded p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                              title="Excluir Meta"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </form>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function KpiGoalForm({
  businessUnitId,
  cycleId,
  initialData,
  onDone,
}: {
  businessUnitId: string;
  cycleId: string;
  initialData?: StrategyKpiGoal | null;
  onDone: () => void;
}) {
  const [state, formAction, isPending] = useActionState<
    StrategyFormState,
    FormData
  >(saveKpiGoalAction, INITIAL_STRATEGY_STATE);

  const [baseline, setBaseline] = useState(initialData?.diagnosisBaseline ?? "");

  useEffect(() => {
    if (state.status === "success") {
      onDone();
    }
  }, [state, onDone]);

  const addTag = (tag: string) => {
    setBaseline((prev) => (prev ? `${prev} ${tag}` : tag));
  };

  return (
    <Card className="border-brand-200 ring-2 ring-brand-500/10">
      <CardHeader
        title={initialData ? "Editar Meta 2.0" : "Nova Meta 2.0 (Metodologia MedCof)"}
        description="Defina a meta, seu embasamento no diagnóstico e os KPIs de acompanhamento."
      />
      <CardBody>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="businessUnitId" value={businessUnitId} />
          <input type="hidden" name="cycleId" value={cycleId} />
          {initialData?.id && <input type="hidden" name="goalId" value={initialData.id} />}

          {state.status === "error" && state.message && (
            <div className="rounded-lg bg-rose-50 p-2.5 text-xs text-rose-800">
              {state.message}
            </div>
          )}

          <Field
            label="Meta"
            hint="Aonde a BU precisa chegar (frase clara e acionável)."
            required
            htmlFor="goalTitle"
          >
            <Input
              id="goalTitle"
              name="title"
              defaultValue={initialData?.title ?? ""}
              placeholder="Ex.: Aumentar o volume de matrículas"
              required
            />
          </Field>

          <div>
            <Field
              label="Embasamento no Diagnóstico"
              hint="Qual achado, dor ou oportunidade do diagnóstico justifica essa meta?"
              htmlFor="diagnosisBaseline"
            >
              <Textarea
                id="diagnosisBaseline"
                name="diagnosisBaseline"
                rows={2}
                value={baseline}
                onChange={(e) => setBaseline(e.target.value)}
                placeholder="Ex.: 🔗 Demanda não capturada 🔗 Mercado em crescimento"
                className="font-sans text-sm"
              />
            </Field>

            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-semibold text-slate-500">
                Inserir tag rápida:
              </span>
              {SUGGESTED_DIAGNOSIS_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => addTag(tag)}
                  className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-700 hover:bg-brand-50 hover:border-brand-200 hover:text-brand-900 transition"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-brand-200/80 bg-brand-50/20 p-3.5 space-y-2">
              <div className="flex items-center gap-1.5">
                <Target className="size-3.5 text-brand-600" />
                <span className="text-xs font-bold uppercase tracking-wider text-brand-900">
                  KPI Principal
                </span>
              </div>
              <Input
                name="primaryKpiName"
                placeholder="Nome do KPI (ex: Matrículas)"
                defaultValue={initialData?.primaryKpiName ?? ""}
              />
              <Input
                name="primaryKpiTarget"
                placeholder="Valor-alvo (ex: 1.570)"
                defaultValue={initialData?.primaryKpiTarget ?? ""}
              />
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 space-y-2">
              <div className="flex items-center gap-1.5">
                <BarChart3 className="size-3.5 text-slate-600" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  KPI Secundário
                </span>
              </div>
              <Input
                name="secondaryKpiName"
                placeholder="Nome do KPI (ex: Conversão)"
                defaultValue={initialData?.secondaryKpiName ?? ""}
              />
              <Input
                name="secondaryKpiTarget"
                placeholder="Valor-alvo (ex: ≥ 2,4%)"
                defaultValue={initialData?.secondaryKpiTarget ?? ""}
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={onDone} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" size="sm" loading={isPending}>
              {isPending ? "Salvando…" : initialData ? "Salvar Alterações" : "Adicionar Meta"}
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
