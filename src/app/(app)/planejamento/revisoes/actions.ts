"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { requirePermission } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import {
  businessUnit,
  planningReviewComment,
  planningReviewItem,
  type PlanningReviewStatus,
} from "@/lib/db/schema";
import { writeAuditLog } from "@/lib/modules/audit/log";
import { newId } from "@/lib/utils/id";

function revalidateAll(slug?: string) {
  revalidatePath("/planejamento/revisoes");
  revalidatePath("/planejamento");
  if (slug) {
    revalidatePath(`/planejamento/${slug}/acompanhamento`);
  }
}

export async function createPlanningReviewItemAction(data: {
  businessUnitId: string;
  coordinatorName: string;
  coordinatorEmail?: string;
  meetingDate: string; // YYYY-MM-DD
  followUpDate: string; // YYYY-MM-DD
  details: string;
  assigneeName: string;
  assigneeEmail?: string;
  status: PlanningReviewStatus;
  priority?: string;
  tags?: string[];
}) {
  const currentUser = await requirePermission("strategy", "edit");
  const db = await getDb();

  const id = newId("rev_item");
  const now = new Date();

  const meetingDateObj = new Date(`${data.meetingDate}T12:00:00Z`);
  const followUpDateObj = new Date(`${data.followUpDate}T12:00:00Z`);

  await db.insert(planningReviewItem).values({
    id,
    businessUnitId: data.businessUnitId,
    coordinatorName: data.coordinatorName.trim() || currentUser.name || "Ingrid Silva",
    coordinatorEmail: data.coordinatorEmail?.trim() || currentUser.email,
    meetingDate: meetingDateObj,
    followUpDate: followUpDateObj,
    details: data.details.trim(),
    assigneeName: data.assigneeName.trim(),
    assigneeEmail: data.assigneeEmail?.trim() || null,
    status: data.status || "novo",
    priority: data.priority || "normal",
    tags: data.tags && data.tags.length > 0 ? JSON.stringify(data.tags) : null,
    createdBy: currentUser.id,
    updatedBy: currentUser.id,
    createdAt: now,
    updatedAt: now,
  });

  const bu = await db
    .select({ slug: businessUnit.slug })
    .from(businessUnit)
    .where(eq(businessUnit.id, data.businessUnitId))
    .get();

  await writeAuditLog({
    actorUserId: currentUser.id,
    actorEmail: currentUser.email,
    action: "bu_review.create",
    entityType: "business_unit",
    entityId: data.businessUnitId,
    summary: `Criou item de revisão para BU ${data.businessUnitId}`,
  });


  revalidateAll(bu?.slug);
  return { success: true, id };
}

export async function updatePlanningReviewItemStatusAction(
  id: string,
  status: PlanningReviewStatus,
) {
  const currentUser = await requirePermission("strategy", "edit");
  const db = await getDb();

  const item = await db
    .select()
    .from(planningReviewItem)
    .where(eq(planningReviewItem.id, id))
    .get();

  if (!item) {
    throw new Error("Item de revisão não encontrado.");
  }

  await db
    .update(planningReviewItem)
    .set({
      status,
      updatedBy: currentUser.id,
      updatedAt: new Date(),
    })
    .where(eq(planningReviewItem.id, id));

  const bu = await db
    .select({ slug: businessUnit.slug })
    .from(businessUnit)
    .where(eq(businessUnit.id, item.businessUnitId))
    .get();

  await writeAuditLog({
    actorUserId: currentUser.id,
    actorEmail: currentUser.email,
    action: "bu_review.update",
    entityType: "business_unit",
    entityId: item.businessUnitId,
    summary: `Alterou status do item de revisão para ${status}`,
  });


  revalidateAll(bu?.slug);
  return { success: true };
}

export async function updatePlanningReviewItemDatesAction(
  id: string,
  meetingDateStr: string,
  followUpDateStr: string,
) {
  const currentUser = await requirePermission("strategy", "edit");
  const db = await getDb();

  const item = await db
    .select()
    .from(planningReviewItem)
    .where(eq(planningReviewItem.id, id))
    .get();

  if (!item) {
    throw new Error("Item de revisão não encontrado.");
  }

  const meetingDate = new Date(`${meetingDateStr}T12:00:00Z`);
  const followUpDate = new Date(`${followUpDateStr}T12:00:00Z`);

  await db
    .update(planningReviewItem)
    .set({
      meetingDate,
      followUpDate,
      updatedBy: currentUser.id,
      updatedAt: new Date(),
    })
    .where(eq(planningReviewItem.id, id));

  const bu = await db
    .select({ slug: businessUnit.slug })
    .from(businessUnit)
    .where(eq(businessUnit.id, item.businessUnitId))
    .get();

  revalidateAll(bu?.slug);
  return { success: true };
}

export async function updatePlanningReviewItemDetailsAction(
  id: string,
  details: string,
) {
  const currentUser = await requirePermission("strategy", "edit");
  const db = await getDb();

  const item = await db
    .select()
    .from(planningReviewItem)
    .where(eq(planningReviewItem.id, id))
    .get();

  if (!item) {
    throw new Error("Item de revisão não encontrado.");
  }

  await db
    .update(planningReviewItem)
    .set({
      details: details.trim(),
      updatedBy: currentUser.id,
      updatedAt: new Date(),
    })
    .where(eq(planningReviewItem.id, id));

  const bu = await db
    .select({ slug: businessUnit.slug })
    .from(businessUnit)
    .where(eq(businessUnit.id, item.businessUnitId))
    .get();

  revalidateAll(bu?.slug);
  return { success: true };
}

export async function addPlanningReviewCommentAction(
  reviewItemId: string,
  content: string,
) {
  const currentUser = await requirePermission("strategy", "edit");
  const db = await getDb();

  const item = await db
    .select()
    .from(planningReviewItem)
    .where(eq(planningReviewItem.id, reviewItemId))
    .get();

  if (!item) {
    throw new Error("Item de revisão não encontrado.");
  }

  const commentId = newId("rev_com");
  const now = new Date();

  await db.insert(planningReviewComment).values({
    id: commentId,
    reviewItemId,
    authorName: currentUser.name || "Colaborador",
    authorEmail: currentUser.email || null,
    authorAvatar: currentUser.image || null,
    authorRole: currentUser.jobTitleName || "Marketing MedCof",
    content: content.trim(),
    createdAt: now,
  });

  const bu = await db
    .select({ slug: businessUnit.slug })
    .from(businessUnit)
    .where(eq(businessUnit.id, item.businessUnitId))
    .get();

  await writeAuditLog({
    actorUserId: currentUser.id,
    actorEmail: currentUser.email,
    action: "bu_review.update",
    entityType: "business_unit",
    entityId: item.businessUnitId,
    summary: `Comentou no item de revisão de ${bu?.slug ?? ""}`,
  });

  revalidateAll(bu?.slug);
  return { success: true, id: commentId };
}

export async function deletePlanningReviewItemAction(id: string) {
  const currentUser = await requirePermission("strategy", "edit");
  const db = await getDb();

  const item = await db
    .select()
    .from(planningReviewItem)
    .where(eq(planningReviewItem.id, id))
    .get();

  if (!item) return { success: true };

  await db
    .delete(planningReviewItem)
    .where(eq(planningReviewItem.id, id));

  const bu = await db
    .select({ slug: businessUnit.slug })
    .from(businessUnit)
    .where(eq(businessUnit.id, item.businessUnitId))
    .get();

  await writeAuditLog({
    actorUserId: currentUser.id,
    actorEmail: currentUser.email,
    action: "bu_review.update",
    entityType: "business_unit",
    entityId: item.businessUnitId,
    summary: `Excluiu item de revisão da BU ${item.businessUnitId}`,
  });


  revalidateAll(bu?.slug);
  return { success: true };
}
