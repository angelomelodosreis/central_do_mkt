import type { Metadata } from "next";

import { ReviewListClient } from "./review-list-client";
import { ButtonLink } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/card";
import { requireStrategyBusinessUnit } from "@/lib/modules/strategy/access";
import { listQuarterlyReviews } from "@/lib/modules/strategy/quarterly-review";
import {
  getCycleBySlug,
  listCycles,
  pickDefaultCycle,
} from "@/lib/modules/strategy/queries";

export const metadata: Metadata = { title: "Revisão Trimestral" };
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

  const reviews = await listQuarterlyReviews(unit.id, cycle?.id);

  return (
    <>
      <PageHeader
        title="Revisão Trimestral"
        description={`Cadência de 3 meses: checar se ainda estamos pensando certo${cycle ? ` · ${cycle.name}` : ""}. O comitê responde às 7 perguntas estratégicas para validar o diagnóstico e decidir revisões de metas.`}
      />

      <ReviewListClient
        businessUnitId={unit.id}
        cycleId={cycle?.id ?? null}
        reviews={reviews}
        canEdit={canEdit}
      />

      {cycles.length > 1 ? (
        <nav className="mt-6 flex flex-wrap items-center gap-2 border-t border-slate-200 pt-4">
          <span className="text-xs text-slate-500">Outros ciclos:</span>
          {cycles
            .filter((c) => c.id !== cycle?.id)
            .map((c) => (
              <ButtonLink
                key={c.id}
                href={`/planejamento/${unit.slug}/revisao-trimestral?ciclo=${c.slug}`}
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
