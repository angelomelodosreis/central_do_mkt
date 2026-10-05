import type { Metadata } from "next";

import { ReviewCycleView } from "./review-cycle-view";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/card";
import { requireStrategyBusinessUnit } from "@/lib/modules/strategy/access";
import {
  listRounds,
  pickDefaultRound,
} from "@/lib/modules/strategy/diagnosis";
import { listQuarterlyReviews } from "@/lib/modules/strategy/quarterly-review";
import {
  getCycleBySlug,
  listCycles,
  pickDefaultCycle,
} from "@/lib/modules/strategy/queries";

export const metadata: Metadata = { title: "Revisões do ciclo" };
export const dynamic = "force-dynamic";

export default async function QuarterlyReviewPage({
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
      <EmptyState
        title="Nenhum ciclo criado ainda"
        description="As revisões são sempre de um ciclo. Comece criando o ciclo nos Ciclos da BU."
        action={
          <ButtonLink href={`/planejamento/${unit.slug}/ciclos`}>
            Ir para Ciclos da BU
          </ButtonLink>
        }
      />
    );
  }

  const [reviews, rounds] = await Promise.all([
    listQuarterlyReviews(unit.id, cycle.id),
    listRounds(cycle.id),
  ]);

  const activeRound = pickDefaultRound(rounds);
  const initialReview = reviews[0] ?? null;

  return (
    <div className="space-y-6">
      {cycles.length > 1 && (
        <div className="flex items-center justify-end gap-1.5 border-b border-slate-200 pb-2">
          <span className="text-xs text-slate-400">Ciclos:</span>
          {cycles.map((c) => (
            <ButtonLink
              key={c.id}
              href={`/planejamento/${unit.slug}/revisao-trimestral?ciclo=${c.slug}`}
              variant={c.id === cycle.id ? "primary" : "ghost"}
              size="sm"
              className="h-6 text-[11px] px-2"
            >
              {c.name}
            </ButtonLink>
          ))}
        </div>
      )}

      <ReviewCycleView
        businessUnitId={unit.id}
        businessUnitSlug={unit.slug}
        businessUnitName={unit.label}
        cycleId={cycle.id}
        cycleName={cycle.name}
        cyclePeriod={activeRound?.cyclePeriod || "Jan - Jun/2027"}
        cycleObjective={
          activeRound?.cycleObjective ||
          `Ser a principal referência nacional em educação médica para ${unit.label}.`
        }
        canEdit={canEdit}
        initialReview={initialReview}
        allReviews={reviews}
      />
    </div>
  );
}
