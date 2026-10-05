"use server";

import { revalidatePath } from "next/cache";
import { eq, or, sql } from "drizzle-orm";
import { can, requirePermission, requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import {
  businessUnit,
  planningReviewComment,
  planningReviewItem,
  task,
  user,
  type PlanningReviewStatus,
} from "@/lib/db/schema";
import { writeAuditLog } from "@/lib/modules/audit/log";
import { createUserNotification } from "@/lib/modules/notifications/queries";
import { newId } from "@/lib/utils/id";

function revalidateAll(slug?: string) {
  revalidatePath("/planejamento/revisoes");
  revalidatePath("/planejamento");
  revalidatePath("/tarefas", "layout");
  revalidatePath("/painel");
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
  createTaskNotification?: boolean;
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
    .select({ slug: businessUnit.slug, label: businessUnit.label })
    .from(businessUnit)
    .where(eq(businessUnit.id, data.businessUnitId))
    .get();

  await writeAuditLog({
    actorUserId: currentUser.id,
    actorEmail: currentUser.email,
    action: "bu_review.create",
    entityType: "business_unit",
    entityId: data.businessUnitId,
    summary: `Criou item de revisão para BU ${bu?.label || data.businessUnitId}`,
  });

  // Localiza o usuário destinatário pelo e-mail ou nome (case-insensitive)
  const targetEmail = data.assigneeEmail?.trim().toLowerCase();
  const targetName = data.assigneeName.trim().toLowerCase();

  const allUsers = await db.select({ id: user.id, name: user.name, email: user.email }).from(user);
  const targetUser = allUsers.find(
    (u) =>
      (targetEmail && u.email.toLowerCase() === targetEmail) ||
      u.name.toLowerCase() === targetName ||
      u.name.toLowerCase().includes(targetName) ||
      targetName.includes(u.name.toLowerCase()),
  );

  if (targetUser) {
    // 1. Gera notificação no sistema para subir no contador de Tarefas da pessoa
    await createUserNotification({
      userId: targetUser.id,
      actorId: currentUser.id,
      actorName: currentUser.name || "Coordenação",
      type: "review_followup",
      title: `Novo follow-up atribuído em ${bu?.label || "Planejamento"}`,
      content: `Prazo: ${data.followUpDate} · ${data.details.slice(0, 120)}`,
      link: `/planejamento/revisoes?bu=${bu?.slug}&item=${id}`,
    });

    // 2. Notificação via Tarefas: se solicitado, gera uma tarefa na fila da pessoa
    if (data.createTaskNotification) {
      const taskId = newId("tsk");
      const buLabel = bu?.label || "Planejamento";
      await db.insert(task).values({
        id: taskId,
        title: `Follow-up ${buLabel}: ${data.details.slice(0, 80).replace(/\n/g, " ")}`,
        description: data.details,
        status: "todo",
        priority: data.priority === "alta" ? "high" : "normal",
        dueDate: followUpDateObj,
        assigneeId: targetUser.id,
        businessUnitId: data.businessUnitId,
        createdBy: currentUser.id,
        createdAt: now,
        updatedAt: now,
      });

      await writeAuditLog({
        actorUserId: currentUser.id,
        actorEmail: currentUser.email,
        action: "task.create",
        entityType: "task",
        entityId: taskId,
        summary: `Criou tarefa para ${targetUser.name} a partir do acompanhamento de ${buLabel}`,
      });
    }
  }

  revalidateAll(bu?.slug);
  return { success: true, id };
}

/**
 * Atualiza completamente um item de acompanhamento/revisão.
 * Permite edição para quem criou o item, coordenadores ou administradores.
 */
export async function updatePlanningReviewItemAction(data: {
  id: string;
  businessUnitId: string;
  coordinatorName?: string;
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
  const currentUser = await requireUser();
  const db = await getDb();

  const item = await db
    .select()
    .from(planningReviewItem)
    .where(eq(planningReviewItem.id, data.id))
    .get();

  if (!item) {
    throw new Error("Item de revisão não encontrado.");
  }

  // Regra de autorização: quem criou o item pode editá-lo; coordenadores e admins também
  const podeEditar =
    currentUser.isSuperAdmin ||
    can(currentUser, "strategy", "edit") ||
    item.createdBy === currentUser.id ||
    item.coordinatorName === currentUser.name;

  if (!podeEditar) {
    throw new Error(
      "Permissão negada: apenas quem criou o item ou a coordenação/administração pode editá-lo.",
    );
  }

  const meetingDateObj = new Date(`${data.meetingDate}T12:00:00Z`);
  const followUpDateObj = new Date(`${data.followUpDate}T12:00:00Z`);

  await db
    .update(planningReviewItem)
    .set({
      businessUnitId: data.businessUnitId,
      coordinatorName: data.coordinatorName?.trim() || item.coordinatorName,
      coordinatorEmail: data.coordinatorEmail?.trim() || item.coordinatorEmail,
      meetingDate: meetingDateObj,
      followUpDate: followUpDateObj,
      details: data.details.trim(),
      assigneeName: data.assigneeName.trim(),
      assigneeEmail: data.assigneeEmail?.trim() || null,
      status: data.status,
      priority: data.priority || "normal",
      tags: data.tags && data.tags.length > 0 ? JSON.stringify(data.tags) : null,
      updatedBy: currentUser.id,
      updatedAt: new Date(),
    })
    .where(eq(planningReviewItem.id, data.id));

  const bu = await db
    .select({ slug: businessUnit.slug, label: businessUnit.label })
    .from(businessUnit)
    .where(eq(businessUnit.id, data.businessUnitId))
    .get();

  await writeAuditLog({
    actorUserId: currentUser.id,
    actorEmail: currentUser.email,
    action: "bu_review.update",
    entityType: "business_unit",
    entityId: data.businessUnitId,
    summary: `Editou item de revisão da BU ${bu?.label || data.businessUnitId}`,
  });

  revalidateAll(bu?.slug);
  return { success: true };
}

export async function updatePlanningReviewItemStatusAction(
  id: string,
  status: PlanningReviewStatus,
) {
  const currentUser = await requireUser();
  const db = await getDb();

  const item = await db
    .select()
    .from(planningReviewItem)
    .where(eq(planningReviewItem.id, id))
    .get();

  if (!item) {
    throw new Error("Item de revisão não encontrado.");
  }

  // Qualquer pessoa atribuída, o criador ou quem tem permissão pode mudar o status
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
  const currentUser = await requireUser();
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
  const currentUser = await requireUser();
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
  mentionedUserIds?: string[],
) {
  const currentUser = await requireUser();
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
    .select({ slug: businessUnit.slug, label: businessUnit.label })
    .from(businessUnit)
    .where(eq(businessUnit.id, item.businessUnitId))
    .get();

  await writeAuditLog({
    actorUserId: currentUser.id,
    actorEmail: currentUser.email,
    action: "bu_review.update",
    entityType: "business_unit",
    entityId: item.businessUnitId,
    summary: `Comentou no item de revisão de ${bu?.label ?? ""}`,
  });

  // MENTIONS & NOTIFICAÇÕES:
  // Notifica todas as pessoas mencionadas na thread para que suba a notificação no menu Tarefas
  const allUsers = await db.select({ id: user.id, name: user.name, email: user.email }).from(user);

  // 1. Pelos IDs passados explicitamente (pelo seletor de menções)
  const usersToNotify = new Set<string>();
  if (mentionedUserIds && mentionedUserIds.length > 0) {
    for (const uid of mentionedUserIds) {
      if (uid !== currentUser.id) {
        usersToNotify.add(uid);
      }
    }
  }

  // 2. Extrai também ocorrências de @Nome no texto digitado
  const mentionMatches = content.match(/@([A-Za-zÀ-ÖØ-öø-ÿ0-9_.\s]+?)(?=[.,!?;:]?(\s|$))/g);
  if (mentionMatches) {
    for (const rawMatch of mentionMatches) {
      const queryName = rawMatch.replace(/^@/, "").trim().toLowerCase();
      if (queryName.length >= 2) {
        const found = allUsers.find(
          (u) =>
            u.id !== currentUser.id &&
            (u.name.toLowerCase() === queryName ||
              u.name.toLowerCase().startsWith(queryName) ||
              queryName.startsWith(u.name.toLowerCase())),
        );
        if (found) {
          usersToNotify.add(found.id);
        }
      }
    }
  }

  // Dispara a notificação para cada pessoa mencionada
  for (const targetUserId of usersToNotify) {
    await createUserNotification({
      userId: targetUserId,
      actorId: currentUser.id,
      actorName: currentUser.name || "Colaborador",
      type: "mention",
      title: `${currentUser.name || "Alguém"} mencionou você em uma thread de ${bu?.label || "Planejamento"}`,
      content: content.trim().slice(0, 160),
      link: `/planejamento/revisoes?bu=${bu?.slug}&item=${reviewItemId}`,
    });
  }

  revalidateAll(bu?.slug);
  return { success: true, id: commentId, notifiedCount: usersToNotify.size };
}

export async function deletePlanningReviewItemAction(id: string) {
  const currentUser = await requireUser();
  const db = await getDb();

  const item = await db
    .select()
    .from(planningReviewItem)
    .where(eq(planningReviewItem.id, id))
    .get();

  if (!item) return { success: true };

  const podeExcluir =
    currentUser.isSuperAdmin ||
    can(currentUser, "strategy", "edit") ||
    item.createdBy === currentUser.id;

  if (!podeExcluir) {
    throw new Error("Apenas quem criou o item ou a coordenação pode excluí-lo.");
  }

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
