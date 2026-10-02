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
};

/** BUs ativas, para o seletor do topo do módulo. */
export async function listStrategyBusinessUnits(): Promise<
  BusinessUnitOption[]
> {
  const db = await getDb();
  return db
    .select({
      id: businessUnit.id,
      slug: businessUnit.slug,
      label: businessUnit.label,
    })
    .from(businessUnit)
    .where(eq(businessUnit.isActive, true))
    .orderBy(asc(businessUnit.sortOrder), asc(businessUnit.label));
}

/** Ciclos de uma BU, do mais recente para o mais antigo. Auto-inicializa se a BU estiver vazia. */
export async function listCycles(
  businessUnitId: string,
): Promise<StrategyCycle[]> {
  const db = await getDb();
  let cycles = await db
    .select()
    .from(strategyCycle)
    .where(eq(strategyCycle.businessUnitId, businessUnitId))
    .orderBy(desc(strategyCycle.startsAt));

  if (cycles.length === 0) {
    const autoCycle = await ensureDefaultCycle(businessUnitId);
    return [autoCycle];
  }

  return cycles;
}

/** Garante que a BU possua pelo menos um ciclo ativo (Ciclo 2026/2027). */
export async function ensureDefaultCycle(
  businessUnitId: string,
): Promise<StrategyCycle> {
  const db = await getDb();
  const existing = await db
    .select()
    .from(strategyCycle)
    .where(eq(strategyCycle.businessUnitId, businessUnitId))
    .orderBy(desc(strategyCycle.startsAt))
    .limit(1);

  if (existing.length > 0) return existing[0];

  const now = new Date();
  const currentYear = now.getFullYear();
  const id = `cycle_${businessUnitId}_${currentYear}`;
  const startsAt = new Date(currentYear, 0, 1, 0, 0, 0);
  const endsAt = new Date(currentYear + 1, 11, 31, 23, 59, 59);

  const cycleData = {
    id,
    businessUnitId,
    name: `Ciclo ${currentYear} / ${currentYear + 1}`,
    slug: `${currentYear}-${currentYear + 1}`,
    startsAt,
    endsAt,
    isCurrent: true,
    sortOrder: 10,
    createdAt: now,
    updatedAt: now,
  };

  try {
    await db.insert(strategyCycle).values(cycleData).onConflictDoNothing();
  } catch {
    // Tratamento para eventual concorrência
  }

  const created = await db
    .select()
    .from(strategyCycle)
    .where(eq(strategyCycle.businessUnitId, businessUnitId))
    .orderBy(desc(strategyCycle.startsAt))
    .limit(1);

  return created[0] ?? cycleData;
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
export async function getItemBusinessUnit(
  itemId: string,
): Promise<{ id: string; slug: string } | undefined> {
  const db = await getDb();
  return db
    .select({
      id: businessUnit.id,
      slug: businessUnit.slug,
    })
    .from(timelineItem)
    .innerJoin(strategyCycle, eq(timelineItem.cycleId, strategyCycle.id))
    .innerJoin(businessUnit, eq(strategyCycle.businessUnitId, businessUnit.id))
    .where(eq(timelineItem.id, itemId))
    .get();
}
