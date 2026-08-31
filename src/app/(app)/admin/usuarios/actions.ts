"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

import { requireAdmin } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { session, USER_ROLES, user, type UserRole } from "@/lib/db/schema";
import { writeAuditLog } from "@/lib/modules/audit/log";

/**
 * Snapshot dos campos de acesso de um usuário. É o que gravamos em `beforeData`
 * na auditoria, e é exatamente o que o "desfazer" restaura.
 */
async function snapshotAccess(userId: string) {
  const db = await getDb();
  return db
    .select({
      status: user.status,
      role: user.role,
      approvedBy: user.approvedBy,
      approvedAt: user.approvedAt,
    })
    .from(user)
    .where(eq(user.id, userId))
    .get();
}

/** Derruba todas as sessões ativas de um usuário. */
async function revokeAllSessions(userId: string) {
  const db = await getDb();
  await db.delete(session).where(eq(session.userId, userId));
}

/** Aprova um cadastro pendente, liberando o acesso. */
export async function approveUser(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const targetId = String(formData.get("userId") ?? "");
  if (!targetId) return;

  const db = await getDb();
  const before = await snapshotAccess(targetId);
  if (!before) return;

  const target = await db
    .select({ email: user.email })
    .from(user)
    .where(eq(user.id, targetId))
    .get();

  await db
    .update(user)
    .set({
      status: "active",
      approvedBy: admin.id,
      approvedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(user.id, targetId));

  await writeAuditLog({
    actorUserId: admin.id,
    actorEmail: admin.email,
    action: "user.approve",
    entityType: "user",
    entityId: targetId,
    summary: `Aprovou o acesso de ${target?.email ?? targetId}`,
    beforeData: before,
    afterData: { ...before, status: "active", approvedBy: admin.id },
  });

  revalidatePath("/admin/usuarios", "layout");
  revalidatePath("/painel");
}

/**
 * Suspende o acesso de um usuário e derruba as sessões dele na hora.
 * Ação reversível pela tela de auditoria.
 */
export async function suspendUser(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const targetId = String(formData.get("userId") ?? "");
  if (!targetId) return;

  // Trava de segurança: um admin não suspende a própria conta — evita a
  // plataforma ficar sem ninguém com acesso administrativo.
  if (targetId === admin.id) return;

  const db = await getDb();
  const before = await snapshotAccess(targetId);
  if (!before) return;

  const target = await db
    .select({ email: user.email })
    .from(user)
    .where(eq(user.id, targetId))
    .get();

  await db
    .update(user)
    .set({ status: "suspended", updatedAt: new Date() })
    .where(eq(user.id, targetId));

  // É isso que faz a suspensão valer imediatamente, em vez de esperar a
  // sessão do usuário expirar.
  await revokeAllSessions(targetId);

  await writeAuditLog({
    actorUserId: admin.id,
    actorEmail: admin.email,
    action: "user.suspend",
    entityType: "user",
    entityId: targetId,
    summary: `Suspendeu o acesso de ${target?.email ?? targetId}`,
    beforeData: before,
    afterData: { ...before, status: "suspended" },
  });

  revalidatePath("/admin/usuarios", "layout");
}

/** Reativa um usuário suspenso. */
export async function reactivateUser(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const targetId = String(formData.get("userId") ?? "");
  if (!targetId) return;

  const db = await getDb();
  const before = await snapshotAccess(targetId);
  if (!before) return;

  const target = await db
    .select({ email: user.email })
    .from(user)
    .where(eq(user.id, targetId))
    .get();

  await db
    .update(user)
    .set({ status: "active", updatedAt: new Date() })
    .where(eq(user.id, targetId));

  await writeAuditLog({
    actorUserId: admin.id,
    actorEmail: admin.email,
    action: "user.reactivate",
    entityType: "user",
    entityId: targetId,
    summary: `Reativou o acesso de ${target?.email ?? targetId}`,
    beforeData: before,
    afterData: { ...before, status: "active" },
  });

  revalidatePath("/admin/usuarios", "layout");
}

/** Altera o papel (admin/líder/membro) de um usuário. Ação reversível. */
export async function changeUserRole(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const targetId = String(formData.get("userId") ?? "");
  const newRole = String(formData.get("role") ?? "");

  if (!targetId || !USER_ROLES.includes(newRole as UserRole)) return;

  // Um admin não rebaixa a si mesmo, pelo mesmo motivo da suspensão.
  if (targetId === admin.id) return;

  const db = await getDb();
  const before = await snapshotAccess(targetId);
  if (!before || before.role === newRole) return;

  const target = await db
    .select({ email: user.email })
    .from(user)
    .where(eq(user.id, targetId))
    .get();

  await db
    .update(user)
    .set({ role: newRole as UserRole, updatedAt: new Date() })
    .where(eq(user.id, targetId));

  await writeAuditLog({
    actorUserId: admin.id,
    actorEmail: admin.email,
    action: "user.role_change",
    entityType: "user",
    entityId: targetId,
    summary: `Alterou o papel de ${target?.email ?? targetId} de "${before.role}" para "${newRole}"`,
    beforeData: before,
    afterData: { ...before, role: newRole },
  });

  revalidatePath("/admin/usuarios", "layout");
}
