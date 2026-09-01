import type { Metadata } from "next";

import { toggleRound } from "./actions";
import { LensBlock } from "./lens-block";
import {
  MeasurementsForm,
  OpenRoundForm,
  RoundSummaryForm,
} from "./round-forms";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import {
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  PageHeader,
} from "@/components/ui/card";
import { DIAGNOSIS_LENSES } from "@/lib/db/schema";
import { requireStrategyBusinessUnit } from "@/lib/modules/strategy/access";
import {
  buildEvidence,
  computeAttainment,
  groupByLens,
  listFindings,
  listMeasurements,
  listRounds,
  pickDefaultRound,
  roundLabel,
} from "@/lib/modules/strategy/diagnosis";
import {
  formatMetricValue,
  loadCycleGoals,
  metricLabel,
} from "@/lib/modules/strategy/goals";
import {
  getCycleBySlug,
  listCycles,
  pickDefaultCycle,
} from "@/lib/modules/strategy/queries";
import { formatDate } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Diagnóstico" };
export const dynamic = "force-dynamic";

export default async function DiagnosisPage({
  params,
  searchParams,
}: {
  params: Promise<{ businessUnitSlug: string }>;
  searchParams: Promise<{ ciclo?: string; rodada?: string }>;
}) {
  const { businessUnitSlug } = await params;
  const { ciclo, rodada } = await searchParams;
  const { unit, canEdit } = await requireStrategyBusinessUnit(businessUnitSlug);

  const cycles = await listCycles(unit.id);
  const cycle = ciclo
    ? await getCycleBySlug(unit.id, ciclo)
    : pickDefaultCycle(cycles);

  const base = `/planejamento/${unit.slug}`;

  if (!cycle) {
    return (
      <>
        <PageHeader
          title="Diagnóstico"
          description="A leitura que embasa as metas da BU."
        />
        <EmptyState
          title="Nenhum ciclo criado ainda"
          description="O diagnóstico é sempre de um ciclo. Comece criando o ciclo no calendário."
          action={
            <ButtonLink href={`${base}/calendario`}>
              Ir para o calendário
            </ButtonLink>
          }
        />
      </>
    );
  }

  const [rounds, goals] = await Promise.all([
    listRounds(cycle.id),
    loadCycleGoals(cycle.id),
  ]);

  const round = rodada
    ? (rounds.find((r) => r.id === rodada) ?? pickDefaultRound(rounds))
    : pickDefaultRound(rounds);

  const [evidence, findings, measurements] = await Promise.all([
    buildEvidence(cycle, goals),
    round ? listFindings(round.id) : Promise.resolve([]),
    round ? listMeasurements(round.id) : Promise.resolve([]),
  ]);

  const porLente = groupByLens(findings);
  const atingimento = computeAttainment(goals, measurements);
  const orfaos = findings.filter((f) => f.goalIds.length === 0);

  return (
    <>
      <PageHeader
        title="Diagnóstico"
        description={`A leitura que embasa as metas de ${cycle.name}. Roda a cada 3 a 6 meses; a meta é revisada na mesma rodada.`}
      />

      {/* ── Rodada ── */}
      <Card className="mb-6">
        <CardHeader
          title={round ? roundLabel(round) : "Nenhuma rodada ainda"}
          description={
            round
              ? `Leitura de ${formatDate(round.referenceDate)} · atualizada em ${formatDate(round.updatedAt)}`
              : "O diagnóstico acontece em rodadas. Abra a primeira para começar."
          }
          action={
            round && canEdit ? (
              <form action={toggleRound}>
                <input type="hidden" name="roundId" value={round.id} />
                <Button type="submit" variant="ghost" size="sm">
                  {round.isOpen ? "Fechar rodada" : "Reabrir"}
                </Button>
              </form>
            ) : null
          }
        />
        <CardBody className="space-y-4">
          {round ? (
            <>
              <p className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
                {round.isOpen ? (
                  <Badge tone="brand">Aberta</Badge>
                ) : (
                  <Badge>Fechada</Badge>
                )}
                <span>
                  {findings.length}{" "}
                  {findings.length === 1 ? "achado" : "achados"} nesta rodada
                </span>
              </p>

              {canEdit && round.isOpen ? (
                <RoundSummaryForm roundId={round.id} summary={round.summary} />
              ) : round.summary ? (
                <p className="whitespace-pre-line text-sm text-slate-700">
                  {round.summary}
                </p>
              ) : null}
            </>
          ) : canEdit ? (
            <OpenRoundForm cycleId={cycle.id} isFirst />
          ) : (
            <p className="text-sm text-slate-500">
              Ninguém abriu uma rodada de diagnóstico para este ciclo ainda.
            </p>
          )}

          {round && canEdit ? (
            <div className="border-t border-slate-100 pt-4">
              <OpenRoundForm cycleId={cycle.id} isFirst={false} />
            </div>
          ) : null}

          {rounds.length > 1 ? (
            <nav className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
              <span className="text-xs text-slate-500">
                Rodadas anteriores:
              </span>
              {rounds
                .filter((r) => r.id !== round?.id)
                .map((r) => (
                  <ButtonLink
                    key={r.id}
                    href={`${base}/diagnostico?rodada=${r.id}`}
                    variant="ghost"
                    size="sm"
                  >
                    {roundLabel(r)}
                  </ButtonLink>
                ))}
            </nav>
          ) : null}
        </CardBody>
      </Card>

      {/* ── Alvo × realizado ── */}
      {round ? (
        <Card className="mb-6">
          <CardHeader
            title="Onde estamos"
            description={
              goals.cycle && goals.cycle.targets.length > 0
                ? "O realizado desta rodada contra o alvo da meta do ciclo."
                : "A meta do ciclo ainda não definiu indicadores — sem alvo não há o que comparar."
            }
            action={
              <ButtonLink href={`${base}/metas`} variant="ghost" size="sm">
                Metas
              </ButtonLink>
            }
          />
          <CardBody className="space-y-4">
            {atingimento.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {atingimento.map((a) => {
                  const bom = a.percent >= 95;
                  const atencao = a.percent >= 75 && a.percent < 95;
                  return (
                    <div
                      key={a.metric}
                      className="rounded-lg border border-slate-200 px-3 py-2"
                    >
                      <p className="text-xs text-slate-500">
                        {metricLabel(a.metric)}
                        {a.inverted ? " (menor é melhor)" : ""}
                      </p>
                      <p className="font-display text-xl font-semibold tabular-nums text-slate-900">
                        {formatMetricValue(a.metric, a.actual)}
                        <span className="text-sm font-normal text-slate-500">
                          {" / "}
                          {formatMetricValue(a.metric, a.target)}
                        </span>
                      </p>
                      <p
                        className={
                          bom
                            ? "text-xs font-medium text-emerald-700"
                            : atencao
                              ? "text-xs font-medium text-amber-700"
                              : "text-xs font-medium text-danger-700"
                        }
                      >
                        {a.percent.toLocaleString("pt-BR", {
                          maximumFractionDigits: 0,
                        })}
                        % do alvo
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : null}

            {canEdit &&
            round.isOpen &&
            goals.cycle &&
            goals.cycle.targets.length > 0 ? (
              <div
                className={
                  atingimento.length > 0 ? "border-t border-slate-100 pt-4" : ""
                }
              >
                <MeasurementsForm
                  roundId={round.id}
                  targets={goals.cycle.targets}
                  measurements={measurements}
                />
              </div>
            ) : null}

            {!goals.cycle || goals.cycle.targets.length === 0 ? (
              <p className="text-sm text-slate-500">
                Defina a meta geral do ciclo com pelo menos um indicador para
                poder registrar o realizado aqui.
              </p>
            ) : null}
          </CardBody>
        </Card>
      ) : null}

      {/* ── As cinco lentes ── */}
      <Card>
        <CardBody className="px-0 py-0">
          {DIAGNOSIS_LENSES.map((lens) => (
            <LensBlock
              key={lens}
              lens={lens}
              evidence={evidence[lens]}
              findings={porLente[lens]}
              roundId={round && round.isOpen ? round.id : null}
              canEdit={canEdit}
            />
          ))}
        </CardBody>
      </Card>

      {/* ── Órfãos ── */}
      {orfaos.length > 0 ? (
        <Card className="mt-6 border-amber-300 bg-amber-50/50">
          <CardHeader
            title={`${orfaos.length} ${orfaos.length === 1 ? "achado sem meta" : "achados sem meta"}`}
            description="Nenhuma meta responde a estes achados. Pode ser decisão consciente — mas é bom que seja consciente."
            action={
              <ButtonLink href={`${base}/metas`} variant="ghost" size="sm">
                Ir para Metas
              </ButtonLink>
            }
          />
          <CardBody className="px-0 py-0">
            <ul className="divide-y divide-amber-200/60">
              {orfaos.map((achado) => (
                <li
                  key={achado.id}
                  className="px-5 py-2.5 text-sm text-amber-900"
                >
                  {achado.statement}
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      ) : null}

      {cycles.length > 1 ? (
        <nav className="mt-6 flex flex-wrap items-center gap-2 border-t border-slate-200 pt-4">
          <span className="text-xs text-slate-500">Outros ciclos:</span>
          {cycles
            .filter((c) => c.id !== cycle.id)
            .map((c) => (
              <ButtonLink
                key={c.id}
                href={`${base}/diagnostico?ciclo=${c.slug}`}
                variant="ghost"
                size="sm"
              >
                {c.name}
              </ButtonLink>
            ))}
        </nav>
      ) : null}
    </>
  );
}
