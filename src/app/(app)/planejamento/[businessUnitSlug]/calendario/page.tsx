import type { Metadata } from "next";

import { CalendarWorkspace } from "./calendar-workspace";
import { CycleSetup } from "./cycle-setup";
import { requireStrategyBusinessUnit } from "@/lib/modules/strategy/access";
import {
  endOfMonth,
  endOfQuarter,
  endOfWeek,
  startOfMonth,
  startOfQuarter,
  startOfWeek,
} from "@/lib/modules/strategy/dates";
import {
  getCycleBySlug,
  listCycles,
  listProducts,
  listTimelineItems,
  pickDefaultCycle,
} from "@/lib/modules/strategy/queries";
import { fromDateInput } from "@/lib/modules/strategy/dates";

export const dynamic = "force-dynamic";

type Params = Promise<{ businessUnitSlug: string }>;
type Search = Promise<{ ciclo?: string; zoom?: string; em?: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { businessUnitSlug } = await params;
  const { unit } = await requireStrategyBusinessUnit(businessUnitSlug);
  return { title: `${unit.label} · Planejamento` };
}

/** Os quatro níveis de aproximação do calendário. */
export const ZOOMS = ["semana", "mes", "trimestre", "ano"] as const;
export type Zoom = (typeof ZOOMS)[number];

function parseZoom(value: string | undefined): Zoom {
  return (ZOOMS as readonly string[]).includes(value ?? "")
    ? (value as Zoom)
    : "mes";
}

/**
 * Janela que cada zoom carrega.
 *
 * A consulta pede exatamente o período visível — carregar o ciclo inteiro para
 * desenhar uma semana seria desperdício, e a visão anual precisa mesmo de tudo.
 */
function windowFor(zoom: Zoom, anchor: Date) {
  switch (zoom) {
    case "semana":
      return { from: startOfWeek(anchor), to: endOfWeek(anchor) };
    case "trimestre":
      return { from: startOfQuarter(anchor), to: endOfQuarter(anchor) };
    case "ano":
      return {
        from: new Date(anchor.getFullYear(), 0, 1),
        to: new Date(anchor.getFullYear(), 11, 31, 23, 59, 59, 999),
      };
    case "mes":
    default:
      // A grade mensal mostra pontas do mês anterior e do seguinte.
      return {
        from: startOfWeek(startOfMonth(anchor)),
        to: endOfWeek(endOfMonth(anchor)),
      };
  }
}

export default async function StrategyCalendarPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Search;
}) {
  const { businessUnitSlug } = await params;
  const { ciclo, zoom: zoomParam, em } = await searchParams;

  const { unit, canEdit } = await requireStrategyBusinessUnit(businessUnitSlug);

  const cycles = await listCycles(unit.id);
  const cycle = ciclo
    ? await getCycleBySlug(unit.id, ciclo)
    : pickDefaultCycle(cycles);

  if (!cycle) {
    return (
      <>
        <CycleSetup
          businessUnitId={unit.id}
          businessUnitLabel={unit.label}
          canEdit={canEdit}
        />
      </>
    );
  }

  const zoom = parseZoom(zoomParam);
  // A âncora é o dia que o calendário está mostrando. Sem ela na URL, abre no
  // hoje — ou no começo do ciclo, se o ciclo ainda não começou.
  const now = new Date();
  const anchor =
    (em ? fromDateInput(em) : null) ??
    (cycle.startsAt.getTime() > now.getTime() ? cycle.startsAt : now);

  const janela = windowFor(zoom, anchor);
  const [items, products] = await Promise.all([
    listTimelineItems(cycle.id, janela),
    listProducts(unit.id),
  ]);

  return (
    <CalendarWorkspace
      unit={{ slug: unit.slug }}
      cycles={cycles.map((c) => ({ slug: c.slug, name: c.name }))}
      cycle={{
        id: cycle.id,
        slug: cycle.slug,
        name: cycle.name,
        startsAt: cycle.startsAt.toISOString(),
        endsAt: cycle.endsAt.toISOString(),
      }}
      zoom={zoom}
      anchorIso={anchor.toISOString()}
      canEdit={canEdit}
      products={products.map((product) => ({
        id: product.id,
        name: product.name,
        cadence: product.cadence,
      }))}
      items={items.map((item) => ({
        id: item.id,
        kind: item.kind,
        title: item.title,
        summary: item.summary,
        startsAt: item.startsAt.toISOString(),
        endsAt: item.endsAt.toISOString(),
        productId: item.productId,
        owner: item.owner,
        status: item.status,
        details: item.details ?? {},
      }))}
    />
  );
}
