"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { userNotification } from "@/lib/db/schema";

export async function markNotificationAsReadAction(notificationId: string) {
  const currentUser = await requireUser();
  const db = await getDb();

  await db
    .update(userNotification)
    .set({ isRead: 1 })
    .where(
      and(
        eq(userNotification.id, notificationId),
        eq(userNotification.userId, currentUser.id),
      ),
    );

  revalidatePath("/tarefas", "layout");
  revalidatePath("/painel");
  return { success: true };
}

export async function markAllNotificationsAsReadAction() {
  const currentUser = await requireUser();
  const db = await getDb();

  await db
    .update(userNotification)
    .set({ isRead: 1 })
    .where(eq(userNotification.userId, currentUser.id));

  revalidatePath("/tarefas", "layout");
  revalidatePath("/painel");
  return { success: true };
}
