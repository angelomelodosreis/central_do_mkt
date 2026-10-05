import type { Metadata } from "next";

import { GoalSection } from "./goal-section";
import { KpiGoalsTable } from "./kpi-goals-table";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardBody, EmptyState } from "@/components/ui/card";
import {
  GOAL_SCOPES,
  GOAL_SCOPE_LABELS,
  GOAL_SCOPE_SHORT,
} from "@/lib/db/schema";
import { requireStrategyBusinessUnit } from "@/lib/modules/strategy/access";
import { formatRange } from "@/lib/modules/strategy/dates";
import {
  checkSums,
  currentSemester,
  formatMetricValue,
  loadCycleGoals,
  metricLabel,
  scopeIsPast,
  scopeRange,
} from "@/lib/modules/strategy/goals";
import { listKpiGoals } from "@/lib/modules/strategy/kpi-goals";
import {
  listFindingsOfCycle,
  listGoalRevisions,
  listRounds,
  pickDefaultRound,
} from "@/lib/modules/strategy/diagnosis";
import {
  getCycleBySlug,
  listCycles,
  pickDefaultCycle,
} from "@/lib/modules/strategy/queries";

export const metadata: Metadata = { title: "Objetivo e Metas do Ciclo" };
export const dynamic = "force-dynamic";

export default async function GoalsPage({
  params,
  searchParams,
}: {
  params: Promise<{ businessUnitSlug: string }>;
  searchParams: Promise<{ ciclo?: string }>;
}) {
  const { businessUnitSlug } = await params;
  const { ciclo } = await searchParams;
  const { unit, canEdit } = await requireStrategyBusinessUnit(businessUnitSlug);

  const cycles = await listCycles(unit.id);
  const cycle = ciclo
    ? await getCycleBySlug(unit.id, ciclo)
    : pickDefaultCycle(cycles);

  if (!cycle) {
    return (
      <div className="space-y-6">
        <EmptyState
          title="Nenhum ciclo criado ainda"
          description="A meta é sempre de um ciclo. Comece criando o ciclo no calendário."
          action={
            <ButtonLink href={`/planejamento/${unit.slug}/calendario`}>
              Ir para o calendário
            </ButtonLink>
          }
        />
      </div>
    );
  }

  const [goals, kpiGoals, achados, rounds] = await Promise.all([
    loadCycleGoals(cycle.id),
    listKpiGoals(unit.id, cycle.id),
    listFindingsOfCycle(cycle.id),
    listRounds(cycle.id),
  ]);

  const activeRound = pickDefaultRound(rounds);

  // Extrai insights do diagnóstico atual para sugerir no embasamento
  const diagnosisInsights: string[] = [];
  if (activeRound) {
    if (activeRound.mainChallenge) {
      diagnosisInsights.push(
        activeRound.mainChallenge.length > 40
          ? `${activeRound.mainChallenge.slice(0, 37)}...`
          : activeRound.mainChallenge,
      );
    }
    if (activeRound.mainOpportunity) {
      diagnosisInsights.push(
        activeRound.mainOpportunity.length > 40
          ? `${activeRound.mainOpportunity.slice(0, 37)}...`
          : activeRound.mainOpportunity,
      );
    }
    if (activeRound.businessMarketDiagnosis) {
      diagnosisInsights.push("Negócio e mercado: leitura da rodada");
    }
    if (activeRound.clientBrandDiagnosis) {
      diagnosisInsights.push("Cliente e marca: consideração");
    }
    if (activeRound.portfolioOfferDiagnosis) {
      diagnosisInsights.push("Portfólio: competitividade da oferta");
    }
    if (activeRound.funnelConversionDiagnosis) {
      diagnosisInsights.push("Funil: taxa de conversão");
    }
  }
  for (const achado of achados.slice(0, 5)) {
    if (!diagnosisInsights.includes(achado.statement)) {
      diagnosisInsights.push(achado.statement);
    }
  }

  const initialCycleObjective =
    activeRound?.cycleObjective ?? goals.cycle?.objective ?? "";
  const initialCyclePeriod = activeRound?.cyclePeriod ?? "Jan – Jun/2027";

  // Revisões de cada meta existente para o histórico semestral
  const revisoesPorMeta = new Map<
    string,
    { changedAt: Date; reason: string | null }[]
  >();
  await Promise.all(
    GOAL_SCOPES.map(async (scope) => {
      const meta = goals[scope];
      if (!meta) return;
      const lista = await listGoalRevisions(meta.id);
      revisoesPorMeta.set(
        meta.id,
        lista.map((r) => ({ changedAt: r.changedAt, reason: r.reason })),
      );
    }),
  );

  const divergencias = checkSums(goals);
  const semestreAtual = currentSemester(cycle);
  const comAchado = new Set(achados.flatMap((a) => a.goalIds));
  const metasSemAchado = GOAL_SCOPES.map((scope) => goals[scope])
    .filter((meta): meta is NonNullable<typeof meta> => meta !== null)
    .filter((meta) => !comAchado.has(meta.id));

  return (
    <div className="space-y-8">
      {/* ── Seletor de Ciclos (quando há múltiplos ciclos) ── */}
      {cycles.length > 1 && (
        <div className="flex items-center justify-end gap-1.5 border-b border-slate-200 pb-2">
          <span className="text-xs text-slate-400">Ciclos:</span>
          {cycles.map((c) => (
            <ButtonLink
              key={c.id}
              href={`/planejamento/${unit.slug}/metas?ciclo=${c.slug}`}
              variant={c.id === cycle.id ? "primary" : "ghost"}
              size="sm"
              className="h-6 text-[11px] px-2"
            >
              {c.name}
            </ButtonLink>
          ))}
        </div>
      )}

      {/* ── PARTE 3: Objetivo e Metas do Ciclo (Oficial) ── */}
      <section>
        <KpiGoalsTable
          businessUnitId={unit.id}
          businessUnitSlug={unit.slug}
          businessUnitName={unit.label}
          cycleId={cycle.id}
          cycleSlug={cycle.slug}
          canEdit={canEdit}
          initialCycleObjective={initialCycleObjective}
          initialCyclePeriod={initialCyclePeriod}
          initialGoals={kpiGoals}
          diagnosisInsights={diagnosisInsights}
        />
      </section>

      {/* ── Seção Opcional: Detalhamento por Semestre (H1 / H2) ── */}
      <details className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
        <summary className="flex cursor-pointer items-center justify-between font-display text-sm font-semibold text-slate-800 list-none">
          <div>
            <span>Detalhamento e Alocação por Semestre (H1 / H2)</span>
            <p className="text-xs font-normal text-slate-500 mt-0.5">
              Distribuição semestral das metas numéricas e de escopo para acompanhamento de ritmo.
            </p>
          </div>
          <span className="text-xs font-semibold text-pink-600 group-open:rotate-180 transition-transform">
            ▼
          </span>
        </summary>

        <div className="mt-6 pt-4 border-t border-slate-100 space-y-6">
          {divergencias.length > 0 && (
            <Card className="border-amber-300 bg-amber-50/50">
              <CardBody>
                <p className="text-sm font-medium text-amber-900">
                  Os semestres não fecham a meta do ciclo
                </p>
                <ul className="mt-2 space-y-1 text-sm text-amber-800">
                  {divergencias.map((d) => (
                    <li key={d.metric} className="tabular-nums">
                      <span className="font-medium">
                        {metricLabel(d.metric)}
                      </span>
                      {": ciclo pede "}
                      {formatMetricValue(d.metric, d.cycleTarget)}
                      {", semestres somam "}
                      {formatMetricValue(d.metric, d.semestersSum)}
                      <span className="text-amber-700">
                        {" ("}
                        {d.diff > 0 ? "+" : ""}
                        {(d.diff * 100).toLocaleString("pt-BR", {
                          maximumFractionDigits: 1,
                        })}
                        {"%)"}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          )}

          <div className="grid gap-6">
            {(["h1", "h2"] as const).map((scope) => {
              const meta = goals[scope];
              const range = scopeRange(cycle, scope);
              const past = scopeIsPast(cycle, scope);
              const isCurrent = scope === semestreAtual;

              return (
                <GoalSection
                  key={scope}
                  cycleId={cycle.id}
                  scope={scope}
                  goal={meta}
                  periodLabel={formatRange(range.startsAt, range.endsAt)}
                  partial={range.partial}
                  isCurrent={isCurrent}
                  isPast={past}
                  canEdit={canEdit}
                  findings={achados}
                  revisions={meta ? (revisoesPorMeta.get(meta.id) ?? []) : []}
                />
              );
            })}
          </div>
        </div>
      </details>
    </div>
  );
}
