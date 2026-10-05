import { and, desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import {
  planningReviewItem,
  task,
  userNotification,
  type NotificationType,
  type UserNotification,
} from "@/lib/db/schema";
import type { CurrentUser } from "@/lib/auth/session";
import { countMyOpenTasks } from "@/lib/modules/tasks/queries";
import { newId } from "@/lib/utils/id";

export async function countUnreadNotifications(userId: string): Promise<number> {
  const db = await getDb();
  const res = await db
    .select({ count: sql<number>`count(*)` })
    .from(userNotification)
    .where(
      and(
        eq(userNotification.userId, userId),
        eq(userNotification.isRead, 0),
      ),
    )
    .get();

  return Number(res?.count ?? 0);
}

export async function listUserNotifications(
  userId: string,
  limit: number = 30,
): Promise<UserNotification[]> {
  const db = await getDb();
  return db
    .select()
    .from(userNotification)
    .where(eq(userNotification.userId, userId))
    .orderBy(desc(userNotification.createdAt))
    .limit(limit);
}

export async function createUserNotification(data: {
  userId: string;
  actorId?: string | null;
  actorName: string;
  type: NotificationType;
  title: string;
  content: string;
  link?: string | null;
}): Promise<string> {
  const db = await getDb();
  const id = newId("notif");
  await db.insert(userNotification).values({
    id,
    userId: data.userId,
    actorId: data.actorId ?? null,
    actorName: data.actorName,
    type: data.type,
    title: data.title,
    content: data.content,
    link: data.link ?? null,
    isRead: 0,
    createdAt: new Date(),
  });
  return id;
}

/**
 * Conta o total consolidado de pendências para a pessoa:
 * - Tarefas abertas da fila de tarefas
 * - Menções e notificações não lidas
 * - Acompanhamentos/Follow-ups de planejamento pendentes atribuídos a ela
 */
export async function countAllPendingForUser(
  currentUser: CurrentUser,
): Promise<{
  total: number;
  tarefasAbertas: number;
  notificacoesNaoLidas: number;
  followUpsPendentes: number;
}> {
  const db = await getDb();

  const [{ total: tarefasAbertas }, notificacoesNaoLidas] = await Promise.all([
    countMyOpenTasks(currentUser),
    countUnreadNotifications(currentUser.id),
  ]);

  // Buscar itens de acompanhamento atribuídos a este usuário que ainda não estão concluídos
  const userEmail = currentUser.email?.trim().toLowerCase();
  const userName = currentUser.name?.trim().toLowerCase();

  const allOpenFollowUps = await db
    .select({
      id: planningReviewItem.id,
      assigneeEmail: planningReviewItem.assigneeEmail,
      assigneeName: planningReviewItem.assigneeName,
      status: planningReviewItem.status,
    })
    .from(planningReviewItem)
    .where(sql`${planningReviewItem.status} != 'concluido'`);

  const meusFollowUps = allOpenFollowUps.filter((item) => {
    if (userEmail && item.assigneeEmail && item.assigneeEmail.trim().toLowerCase() === userEmail) {
      return true;
    }
    if (userName && item.assigneeName && item.assigneeName.trim().toLowerCase() === userName) {
      return true;
    }
    return false;
  });

  const followUpsPendentes = meusFollowUps.length;

  // Para não duplicar se já foi gerada uma task correspondente na fila de tarefas:
  // Se followUps já gerou tarefa, tarefasAbertas já a contempla.
  // Somamos as notificações não lidas + tarefas abertas + quaisquer follow-ups sem tarefa.
  const total = Math.max(tarefasAbertas, followUpsPendentes) + notificacoesNaoLidas;

  return {
    total,
    tarefasAbertas,
    notificacoesNaoLidas,
    followUpsPendentes,
  };
}
