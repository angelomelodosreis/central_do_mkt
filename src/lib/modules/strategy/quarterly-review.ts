import { and, desc, eq } from "drizzle-orm";

import { getDb } from "@/lib/db/client";
import {
  strategyQuarterlyReview,
  type StrategyQuarterlyReview,
} from "@/lib/db/schema/diagnosis.schema";
import { strategyCycle } from "@/lib/db/schema/strategy.schema";
import { newId } from "@/lib/utils/id";

export type QuarterlyReview = StrategyQuarterlyReview;

export type SaveQuarterlyReviewInput = {
  id?: string;
  businessUnitId: string;
  cycleId?: string | null;
  roundId?: string | null;
  quarter: string;
  reviewDate: Date;
  diagnosticValid?: string | null;
  marketChanges?: string | null;
  newProblems?: string | null;
  missedOpportunities?: string | null;
  objectiveAssumptions?: string | null;
  needsGoalRevision?: string | null;
  nextQuarterFocus?: string | null;
  status?: string;
  userId: string;
};

export async function listQuarterlyReviews(
  businessUnitId: string,
  cycleId?: string,
): Promise<QuarterlyReview[]> {
  const db = await getDb();

  const conditions = [
    eq(strategyQuarterlyReview.businessUnitId, businessUnitId),
  ];
  if (cycleId) {
    conditions.push(eq(strategyQuarterlyReview.cycleId, cycleId));
  }

  return db
    .select()
    .from(strategyQuarterlyReview)
    .where(and(...conditions))
    .orderBy(
      desc(strategyQuarterlyReview.reviewDate),
      desc(strategyQuarterlyReview.createdAt),
    );
}

export async function getQuarterlyReview(
  id: string,
): Promise<QuarterlyReview | null> {
  const db = await getDb();
  const row = await db
    .select()
    .from(strategyQuarterlyReview)
    .where(eq(strategyQuarterlyReview.id, id))
    .get();

  return row ?? null;
}

export async function saveQuarterlyReview(
  input: SaveQuarterlyReviewInput,
): Promise<string> {
  const db = await getDb();
  const now = new Date();

  if (input.id) {
    const existing = await getQuarterlyReview(input.id);
    if (!existing) {
      throw new Error("Revisão trimestral não encontrada para atualização.");
    }
    if (existing.businessUnitId !== input.businessUnitId) {
      throw new Error("Permissão negada: esta revisão trimestral pertence a outra Business Unit.");
    }

    await db
      .update(strategyQuarterlyReview)
      .set({
        cycleId: input.cycleId ?? null,
        roundId: input.roundId ?? null,
        quarter: input.quarter,
        reviewDate: input.reviewDate,
        diagnosticValid: input.diagnosticValid ?? null,
        marketChanges: input.marketChanges ?? null,
        newProblems: input.newProblems ?? null,
        missedOpportunities: input.missedOpportunities ?? null,
        objectiveAssumptions: input.objectiveAssumptions ?? null,
        needsGoalRevision: input.needsGoalRevision ?? null,
        nextQuarterFocus: input.nextQuarterFocus ?? null,
        status: input.status ?? "completed",
        updatedBy: input.userId,
        updatedAt: now,
      })
      .where(eq(strategyQuarterlyReview.id, input.id));

    return input.id;
  }

  const id = newId("qrev");
  await db.insert(strategyQuarterlyReview).values({
    id,
    businessUnitId: input.businessUnitId,
    cycleId: input.cycleId ?? null,
    roundId: input.roundId ?? null,
    quarter: input.quarter,
    reviewDate: input.reviewDate,
    diagnosticValid: input.diagnosticValid ?? null,
    marketChanges: input.marketChanges ?? null,
    newProblems: input.newProblems ?? null,
    missedOpportunities: input.missedOpportunities ?? null,
    objectiveAssumptions: input.objectiveAssumptions ?? null,
    needsGoalRevision: input.needsGoalRevision ?? null,
    nextQuarterFocus: input.nextQuarterFocus ?? null,
    status: input.status ?? "completed",
    createdBy: input.userId,
    updatedBy: input.userId,
    createdAt: now,
    updatedAt: now,
  });

  return id;
}

export async function deleteQuarterlyReview(id: string): Promise<void> {
  const db = await getDb();
  await db
    .delete(strategyQuarterlyReview)
    .where(eq(strategyQuarterlyReview.id, id));
}
