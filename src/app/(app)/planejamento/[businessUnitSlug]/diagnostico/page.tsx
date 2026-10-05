import type { Metadata } from "next";

import { toggleRound } from "./actions";
import { DiagnosisTableView } from "./diagnosis-table-view";
import { OpenRoundForm } from "./round-forms";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/ui/card";
import { requireStrategyBusinessUnit } from "@/lib/modules/strategy/access";
import {
  listRounds,
  pickDefaultRound,
  roundLabel,
} from "@/lib/modules/strategy/diagnosis";
import {
  getCycleBySlug,
  listCycles,
  pickDefaultCycle,
} from "@/lib/modules/strategy/queries";
import { formatDate } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Diagnóstico da BU" };
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
          title="Diagnóstico da BU"
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

  const rounds = await listRounds(cycle.id);

  const round = rodada
    ? (rounds.find((r) => r.id === rodada) ?? pickDefaultRound(rounds))
    : pickDefaultRound(rounds);

  if (!round) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Diagnóstico da BU"
          description={`Ciclo ${cycle.name}. Abra a primeira rodada para iniciar o diagnóstico.`}
        />
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs">
          <OpenRoundForm cycleId={cycle.id} isFirst />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Barra Superior com Status da Rodada & Ciclo ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="font-semibold text-slate-900 text-xs">
            {roundLabel(round)}
          </span>
          <span className="text-slate-300">·</span>
          <span className="text-xs text-slate-500">
            Ref: {formatDate(round.referenceDate)}
          </span>
          {round.isOpen ? (
            <Badge tone="brand">Aberta para edição</Badge>
          ) : (
            <Badge>Fechada</Badge>
          )}

          {rounds.length > 1 && (
            <div className="flex items-center gap-1.5 ml-2 border-l border-slate-200 pl-3">
              <span className="text-[11px] text-slate-400">Outras rodadas:</span>
              {rounds
                .filter((r) => r.id !== round.id)
                .map((r) => (
                  <ButtonLink
                    key={r.id}
                    href={`${base}/diagnostico?rodada=${r.id}`}
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[11px] px-2"
                  >
                    {roundLabel(r)}
                  </ButtonLink>
                ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {canEdit && (
            <form action={toggleRound}>
              <input type="hidden" name="roundId" value={round.id} />
              <Button type="submit" variant="ghost" size="sm" className="h-7 text-xs">
                {round.isOpen ? "Fechar rodada" : "Reabrir rodada"}
              </Button>
            </form>
          )}

          {cycles.length > 1 && (
            <div className="flex items-center gap-1 border-l border-slate-200 pl-2">
              <span className="text-[11px] text-slate-400">Ciclos:</span>
              {cycles.map((c) => (
                <ButtonLink
                  key={c.id}
                  href={`${base}/diagnostico?ciclo=${c.slug}`}
                  variant={c.id === cycle.id ? "primary" : "ghost"}
                  size="sm"
                  className="h-6 text-[11px] px-2"
                >
                  {c.name}
                </ButtonLink>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Visão Oficial Executiva: PARTE 1 & PARTE 2 ── */}
      <DiagnosisTableView
        businessUnitId={unit.id}
        businessUnitSlug={unit.slug}
        cycleSlug={cycle.slug}
        roundId={round.id}
        canEdit={canEdit}
        isOpen={round.isOpen}
        initialData={{
          businessMarketDiagnosis: round.businessMarketDiagnosis,
          clientBrandDiagnosis: round.clientBrandDiagnosis,
          portfolioOfferDiagnosis: round.portfolioOfferDiagnosis,
          funnelConversionDiagnosis: round.funnelConversionDiagnosis,
          contextCapacityDiagnosis: round.contextCapacityDiagnosis,
          mainChallenge: round.mainChallenge,
          mainOpportunity: round.mainOpportunity,
        }}
      />
    </div>
  );
}
