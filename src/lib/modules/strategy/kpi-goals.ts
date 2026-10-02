import { asc, eq, and } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { strategyKpiGoal, type StrategyKpiGoal } from "@/lib/db/schema";
import { newId } from "@/lib/utils/id";

export async function listKpiGoals(
  businessUnitId: string,
  cycleId: string,
): Promise<StrategyKpiGoal[]> {
  const db = await getDb();
  return db
    .select()
    .from(strategyKpiGoal)
    .where(
      and(
        eq(strategyKpiGoal.businessUnitId, businessUnitId),
        eq(strategyKpiGoal.cycleId, cycleId),
      ),
    )
    .orderBy(asc(strategyKpiGoal.sortOrder), asc(strategyKpiGoal.createdAt));
}

export async function saveKpiGoal(data: {
  id?: string;
  businessUnitId: string;
  cycleId: string;
  title: string;
  diagnosisBaseline?: string | null;
  primaryKpiName?: string | null;
  primaryKpiTarget?: string | null;
  secondaryKpiName?: string | null;
  secondaryKpiTarget?: string | null;
  sortOrder?: number;
  userId?: string;
}): Promise<StrategyKpiGoal> {
  const db = await getDb();
  const now = new Date();

  if (data.id) {
    await db
      .update(strategyKpiGoal)
      .set({
        title: data.title,
        diagnosisBaseline: data.diagnosisBaseline ?? null,
        primaryKpiName: data.primaryKpiName ?? null,
        primaryKpiTarget: data.primaryKpiTarget ?? null,
        secondaryKpiName: data.secondaryKpiName ?? null,
        secondaryKpiTarget: data.secondaryKpiTarget ?? null,
        sortOrder: data.sortOrder ?? 0,
        updatedBy: data.userId ?? null,
        updatedAt: now,
      })
      .where(eq(strategyKpiGoal.id, data.id));

    const updated = await db
      .select()
      .from(strategyKpiGoal)
      .where(eq(strategyKpiGoal.id, data.id))
      .get();
    return updated!;
  }

  const id = newId("kpi_goal");
  await db.insert(strategyKpiGoal).values({
    id,
    businessUnitId: data.businessUnitId,
    cycleId: data.cycleId,
    title: data.title,
    diagnosisBaseline: data.diagnosisBaseline ?? null,
    primaryKpiName: data.primaryKpiName ?? null,
    primaryKpiTarget: data.primaryKpiTarget ?? null,
    secondaryKpiName: data.secondaryKpiName ?? null,
    secondaryKpiTarget: data.secondaryKpiTarget ?? null,
    sortOrder: data.sortOrder ?? 0,
    createdBy: data.userId ?? null,
    updatedBy: data.userId ?? null,
    createdAt: now,
    updatedAt: now,
  });

  const created = await db
    .select()
    .from(strategyKpiGoal)
    .where(eq(strategyKpiGoal.id, id))
    .get();
  return created!;
}

export async function deleteKpiGoal(goalId: string): Promise<void> {
  const db = await getDb();
  await db.delete(strategyKpiGoal).where(eq(strategyKpiGoal.id, goalId));
}

/**
 * Seed das 3 metas oficiais de referência da Metodologia MedCof (Planilha Metas 2.0).
 */
export async function seedDefaultKpiGoalsIfEmpty(
  businessUnitId: string,
  cycleId: string,
  userId?: string,
): Promise<StrategyKpiGoal[]> {
  const existing = await listKpiGoals(businessUnitId, cycleId);
  if (existing.length > 0) return existing;

  const defaults = [
    {
      title: "Aumentar o volume de matrículas",
      diagnosisBaseline: "🔗 Demanda não capturada 🔗 Mercado em crescimento",
      primaryKpiName: "Matrículas",
      primaryKpiTarget: "1.570",
      secondaryKpiName: "Conversão",
      secondaryKpiTarget: "≥ 2,4%",
      sortOrder: 10,
    },
    {
      title: "Aumentar o faturamento",
      diagnosisBaseline: "🔗 Potencial de crescimento do produto 🔗 Crescimento da base",
      primaryKpiName: "Faturamento",
      primaryKpiTarget: "R$ 5,6 mi",
      secondaryKpiName: "Ticket médio",
      secondaryKpiTarget: "≥ R$ 3.592",
      sortOrder: 20,
    },
    {
      title: "Manter eficiência de aquisição",
      diagnosisBaseline: "🔗 Oportunidade de ganho de eficiência 🔗 Conversão abaixo do histórico",
      primaryKpiName: "CAC",
      primaryKpiTarget: "≤ R$ 1.331",
      secondaryKpiName: "ROAS",
      secondaryKpiTarget: "≥ 2,7x",
      sortOrder: 30,
    },
  ];

  for (const item of defaults) {
    await saveKpiGoal({
      businessUnitId,
      cycleId,
      userId,
      ...item,
    });
  }

  return listKpiGoals(businessUnitId, cycleId);
}
