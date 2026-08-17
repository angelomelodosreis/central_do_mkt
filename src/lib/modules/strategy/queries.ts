import { and, asc, desc, eq, gte, lte } from "drizzle-orm";

import { getDb } from "@/lib/db/client";
import {
  businessUnit,
  strategyCycle,
  strategyProduct,
  timelineItem,
  type StrategyCycle,
  type StrategyProduct,
  type TimelineItem,
} from "@/lib/db/schema";

export type BusinessUnitOption = {
  id: string;
  slug: string;
  label: string;
  strategyOwnerId: string | null;
};

/** BUs ativas, para o seletor do topo do módulo. */
export async function listStrategyBusinessUnits(): Promise<BusinessUnitOption[]> {
  const db = await getDb();
  return db
    .select({
      id: businessUnit.id,
      slug: businessUnit.slug,
      label: businessUnit.label,
      strategyOwnerId: businessUnit.strategyOwnerId,
    })
    .from(businessUnit)
    .where(eq(businessUnit.isActive, true))
    .orderBy(asc(businessUnit.sortOrder), asc(businessUnit.label));
}

/** Ciclos de uma BU, do mais recente para o mais antigo. */
export async function listCycles(
  businessUnitId: string,
): Promise<StrategyCycle[]> {
  const db = await getDb();
  return db
    .select()
    .from(strategyCycle)
    .where(eq(strategyCycle.businessUnitId, businessUnitId))
    .orderBy(desc(strategyCycle.startsAt));
}

/**
 * O ciclo que deve abrir por padrão: o marcado como atual, senão o que contém
 * hoje, senão o mais recente.
 */
export function pickDefaultCycle(
  cycles: StrategyCycle[],
): StrategyCycle | undefined {
  if (cycles.length === 0) return undefined;

  const marked = cycles.find((cycle) => cycle.isCurrent);
  if (marked) return marked;

  const now = Date.now();
  const containsToday = cycles.find(
    (cycle) => cycle.startsAt.getTime() <= now && cycle.endsAt.getTime() >= now,
  );

  return containsToday ?? cycles[0];
}

export async function getCycleBySlug(
  businessUnitId: string,
  slug: string,
): Promise<StrategyCycle | undefined> {
  const db = await getDb();
  return db
    .select()
    .from(strategyCycle)
    .where(
      and(
        eq(strategyCycle.businessUnitId, businessUnitId),
        eq(strategyCycle.slug, slug),
      ),
    )
    .get();
}

export async function listProducts(
  businessUnitId: string,
): Promise<StrategyProduct[]> {
  const db = await getDb();
  return db
    .select()
    .from(strategyProduct)
    .where(eq(strategyProduct.businessUnitId, businessUnitId))
    .orderBy(asc(strategyProduct.sortOrder), asc(strategyProduct.name));
}

/**
 * Itens do ciclo que tocam a janela pedida.
 *
 * O filtro é por interseção, e não por data de início: uma turma que começou em
 * janeiro e vai até dezembro precisa aparecer quando se olha para junho.
 */
export async function listTimelineItems(
  cycleId: string,
  window?: { from: Date; to: Date },
): Promise<TimelineItem[]> {
  const db = await getDb();

  const filters = [eq(timelineItem.cycleId, cycleId)];
  if (window) {
    filters.push(lte(timelineItem.startsAt, window.to));
    filters.push(gte(timelineItem.endsAt, window.from));
  }

  return db
    .select()
    .from(timelineItem)
    .where(and(...filters))
    .orderBy(asc(timelineItem.startsAt), asc(timelineItem.title));
}

export async function getTimelineItem(
  id: string,
): Promise<TimelineItem | undefined> {
  const db = await getDb();
  return db.select().from(timelineItem).where(eq(timelineItem.id, id)).get();
}

/** A BU dona de um item, para checar permissão antes de gravar. */
export async function getItemBusinessUnit(itemId: string): Promise<
  { id: string; slug: string; strategyOwnerId: string | null } | undefined
> {
  const db = await getDb();
  return db
    .select({
      id: businessUnit.id,
      slug: businessUnit.slug,
      strategyOwnerId: businessUnit.strategyOwnerId,
    })
    .from(timelineItem)
    .innerJoin(strategyCycle, eq(timelineItem.cycleId, strategyCycle.id))
    .innerJoin(businessUnit, eq(strategyCycle.businessUnitId, businessUnit.id))
    .where(eq(timelineItem.id, itemId))
    .get();
}
