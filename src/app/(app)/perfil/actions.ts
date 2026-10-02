"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { user } from "@/lib/db/schema";
import { writeAuditLog } from "@/lib/modules/audit/log";

export async function updateProfileNameAction(
  name: string,
): Promise<{ success: boolean; message: string }> {
  const currentUser = await requireUser();
  const trimmed = name.trim();

  if (!trimmed || trimmed.length < 2) {
    return {
      success: false,
      message: "O nome deve conter ao menos 2 caracteres.",
    };
  }

  const db = await getDb();
  const before = await db
    .select({ name: user.name })
    .from(user)
    .where(eq(user.id, currentUser.id))
    .get();

  await db
    .update(user)
    .set({
      name: trimmed,
      updatedAt: new Date(),
    })
    .where(eq(user.id, currentUser.id));

  await writeAuditLog({
    actorUserId: currentUser.id,
    actorEmail: currentUser.email,
    action: "user.org_change",
    entityType: "user",
    entityId: currentUser.id,
    summary: `Atualizou o nome do perfil de "${before?.name}" para "${trimmed}"`,
    beforeData: before,
    afterData: { name: trimmed },
  });

  revalidatePath("/perfil");
  revalidatePath("/organograma", "layout");
  revalidatePath("/admin/usuarios", "layout");
  revalidatePath("/planejamento", "layout");

  return {
    success: true,
    message: "Nome atualizado com sucesso!",
  };
}
