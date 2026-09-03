import type { Metadata } from "next";

import { GoalSection } from "./goal-section";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardBody, EmptyState, PageHeader } from "@/components/ui/card";
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
import {
  listFindingsOfCycle,
  listGoalRevisions,
} from "@/lib/modules/strategy/diagnosis";
import {
  getCycleBySlug,
  listCycles,
  pickDefaultCycle,
} from "@/lib/modules/strategy/queries";

export const metadata: Metadata = { title: "Metas" };
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
      <>
        <PageHeader
          title="Metas"
          description="O compromisso da BU para o ciclo e para cada semestre."
        />
        <EmptyState
          title="Nenhum ciclo criado ainda"
          description="A meta é sempre de um ciclo. Comece criando o ciclo no calendário."
          action={
            <ButtonLink href={`/planejamento/${unit.slug}/calendario`}>
              Ir para o calendário
            </ButtonLink>
          }
        />
      </>
    );
  }

  const goals = await loadCycleGoals(cycle.id);
  const achados = await listFindingsOfCycle(cycle.id);

  // As revisões de cada meta existente, para o histórico na leitura.
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

  // Metas que não apontam nenhum achado: o outro lado do relatório de órfãos.
  const comAchado = new Set(achados.flatMap((a) => a.goalIds));
  const metasSemAchado = GOAL_SCOPES.map((scope) => goals[scope])
    .filter((meta): meta is NonNullable<typeof meta> => meta !== null)
    .filter((meta) => !comAchado.has(meta.id));

  return (
    <>
      <PageHeader
        title="Metas"
        // O nome do ciclo já costuma trazer o da BU ("Clínica Médica · 2026"),
        // então repetir a BU aqui soaria como erro de texto.
        description={`O compromisso de ${cycle.name}. Quanto dele já foi feito aparece na visão geral; a conversa sobre ele, no Acompanhamento.`}
      />

      {divergencias.length > 0 ? (
        <Card className="mb-6 border-amber-300 bg-amber-50/50">
          <CardBody>
            <p className="text-sm font-medium text-amber-900">
              Os semestres não fecham a meta do ciclo
            </p>
            <ul className="mt-2 space-y-1 text-sm text-amber-800">
              {divergencias.map((d) => (
                <li key={d.metric} className="tabular-nums">
                  <span className="font-medium">{metricLabel(d.metric)}</span>
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
            <p className="mt-2 text-xs text-amber-700">
              É só um aviso — pode ser erro de digitação ou margem proposital.
              Nada impede de salvar assim.
            </p>
          </CardBody>
        </Card>
      ) : null}

      {metasSemAchado.length > 0 && achados.length > 0 ? (
        <Card className="mb-6 border-amber-300 bg-amber-50/50">
          <CardBody>
            <p className="text-sm font-medium text-amber-900">
              {metasSemAchado.length === 1
                ? "Uma meta não aponta nenhum achado do diagnóstico"
                : `${metasSemAchado.length} metas não apontam nenhum achado do diagnóstico`}
            </p>
            <p className="mt-1 text-sm text-amber-800">
              {metasSemAchado
                .map((meta) => GOAL_SCOPE_LABELS[meta.scope])
                .join(", ")}
            </p>
            <p className="mt-2 text-xs text-amber-700">
              Meta sem achado é meta que ninguém sustentou. Edite a meta e
              marque o que ela responde.
            </p>
          </CardBody>
        </Card>
      ) : null}

      <Card>
        <CardBody className="px-0 py-0">
          {GOAL_SCOPES.map((scope) => {
            const { startsAt, endsAt, partial } = scopeRange(cycle, scope);
            return (
              <GoalSection
                key={scope}
                cycleId={cycle.id}
                scope={scope}
                goal={goals[scope]}
                periodLabel={formatRange(startsAt, endsAt)}
                partial={partial}
                isCurrent={semestreAtual === scope}
                isPast={scope !== "cycle" && scopeIsPast(cycle, scope)}
                canEdit={canEdit}
                findings={achados}
                revisions={
                  goals[scope]
                    ? (revisoesPorMeta.get(goals[scope]!.id) ?? [])
                    : []
                }
              />
            );
          })}
        </CardBody>
      </Card>

      {cycles.length > 1 ? (
        <nav className="mt-6 flex flex-wrap items-center gap-2 border-t border-slate-200 pt-4">
          <span className="text-xs text-slate-500">Outros ciclos:</span>
          {cycles
            .filter((c) => c.id !== cycle.id)
            .map((c) => (
              <ButtonLink
                key={c.id}
                href={`/planejamento/${unit.slug}/metas?ciclo=${c.slug}`}
                variant="ghost"
                size="sm"
              >
                {c.name}
              </ButtonLink>
            ))}
        </nav>
      ) : null}

      <p className="mt-6 text-xs text-slate-500">
        Os semestres são civis — {GOAL_SCOPE_SHORT.h1} vai de janeiro a junho e{" "}
        {GOAL_SCOPE_SHORT.h2} de julho a dezembro — mesmo quando o ciclo não
        começa em janeiro. Quando o ciclo é mais curto, o período mostrado já
        vem recortado.
      </p>
    </>
  );
}
