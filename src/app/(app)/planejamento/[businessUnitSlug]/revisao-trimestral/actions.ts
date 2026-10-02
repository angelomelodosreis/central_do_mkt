"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

import type { StrategyFormState } from "../../form-state";
import { requirePermission } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { businessUnit } from "@/lib/db/schema";
import { writeAuditLog } from "@/lib/modules/audit/log";
import { canSeeBusinessUnit } from "@/lib/modules/access/scope";
import { fromDateInput, startOfDay } from "@/lib/modules/strategy/dates";
import {
  saveQuarterlyReview,
  deleteQuarterlyReview,
  getQuarterlyReview,
} from "@/lib/modules/strategy/quarterly-review";

function field(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

async function requireEditor(businessUnitId: string) {
  const currentUser = await requirePermission("strategy", "edit");

  const db = await getDb();
  const unit = await db
    .select({
      id: businessUnit.id,
      slug: businessUnit.slug,
      label: businessUnit.label,
    })
    .from(businessUnit)
    .where(eq(businessUnit.id, businessUnitId))
    .get();

  if (!unit) return { erro: "Essa Business Unit não existe mais." } as const;

  const noEscopo = canSeeBusinessUnit(currentUser.scope, unit.id);
  if (!noEscopo) {
    return {
      erro: `A revisão trimestral de ${unit.label} só pode ser editada por quem trabalha na BU.`,
    } as const;
  }

  return { currentUser, unit } as const;
}

export async function saveQuarterlyReviewAction(
  _previousState: StrategyFormState,
  formData: FormData,
): Promise<StrategyFormState> {
  const businessUnitId = field(formData, "businessUnitId");
  const reviewId = field(formData, "reviewId") || undefined;
  const cycleId = field(formData, "cycleId") || null;
  const roundId = field(formData, "roundId") || null;
  const quarter = field(formData, "quarter");
  const reviewDateRaw = field(formData, "reviewDate");

  if (!quarter) {
    return {
      status: "error",
      message: "Informe qual é o trimestre da revisão (ex.: Q1, Q2, Q3, Q4).",
    };
  }

  const reviewDate = fromDateInput(reviewDateRaw) ?? startOfDay(new Date());

  const gate = await requireEditor(businessUnitId);
  if ("erro" in gate) return { status: "error", message: gate.erro };

  const diagnosticValid = field(formData, "diagnosticValid") || null;
  const marketChanges = field(formData, "marketChanges") || null;
  const newProblems = field(formData, "newProblems") || null;
  const missedOpportunities = field(formData, "missedOpportunities") || null;
  const objectiveAssumptions = field(formData, "objectiveAssumptions") || null;
  const needsGoalRevision = field(formData, "needsGoalRevision") || null;
  const nextQuarterFocus = field(formData, "nextQuarterFocus") || null;

  try {
    const id = await saveQuarterlyReview({
      id: reviewId,
      businessUnitId,
      cycleId,
      roundId,
      quarter,
      reviewDate,
      diagnosticValid,
      marketChanges,
      newProblems,
      missedOpportunities,
      objectiveAssumptions,
      needsGoalRevision,
      nextQuarterFocus,
      userId: gate.currentUser.id,
    });

    await writeAuditLog({
      actorUserId: gate.currentUser.id,
      actorEmail: gate.currentUser.email,
      action: reviewId
        ? "strategy_quarterly_review.update"
        : "strategy_quarterly_review.create",
      entityType: "strategy_quarterly_review",
      entityId: id,
      summary: `${reviewId ? "Atualizou" : "Registrou"} a Revisão Trimestral (${quarter}) de ${gate.unit.label}`,
      afterData: {
        quarter,
        reviewDate: reviewDate.toISOString(),
        diagnosticValid,
        needsGoalRevision,
      },
    });

    revalidatePath(`/planejamento/${gate.unit.slug}`, "layout");
    return {
      status: "success",
      message: `Revisão Trimestral (${quarter}) salva com sucesso.`,
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error ? error.message : "Erro ao salvar revisão.",
    };
  }
}

export async function deleteQuarterlyReviewAction(
  formData: FormData,
): Promise<void> {
  const reviewId = field(formData, "reviewId");
  const businessUnitId = field(formData, "businessUnitId");

  if (!reviewId || !businessUnitId) return;

  const gate = await requireEditor(businessUnitId);
  if ("erro" in gate) return;

  const review = await getQuarterlyReview(reviewId);
  if (!review) return;

  await deleteQuarterlyReview(reviewId);

  await writeAuditLog({
    actorUserId: gate.currentUser.id,
    actorEmail: gate.currentUser.email,
    action: "strategy_quarterly_review.delete",
    entityType: "strategy_quarterly_review",
    entityId: reviewId,
    summary: `Removeu a Revisão Trimestral (${review.quarter}) de ${gate.unit.label}`,
  });

  revalidatePath(`/planejamento/${gate.unit.slug}`, "layout");
}
