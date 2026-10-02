"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";

import { requireAdmin, requireUserManagementAccess } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import {
  accessGrant,
  user,
  type ScopeType,
  type UserRole,
} from "@/lib/db/schema";
import { writeAuditLog } from "@/lib/modules/audit/log";
import { newId } from "@/lib/utils/id";

export type GovernanceActionResult = {
  ok: boolean;
  message?: string;
};

/**
 * Concede ou revoga um escopo direto para o usuário em 1 clique na matriz.
 */
export async function toggleDirectScopeAction(
  userId: string,
  scopeType: ScopeType,
  scopeId: string | null,
): Promise<GovernanceActionResult> {
  const admin = await requireUserManagementAccess();
  const db = await getDb();

  // Verifica usuário alvo
  const targetUser = await db
    .select({ id: user.id, name: user.name, email: user.email })
    .from(user)
    .where(eq(user.id, userId))
    .get();

  if (!targetUser) {
    return { ok: false, message: "Usuário não encontrado." };
  }

  // Verifica se a concessão já existe
  const existingGrant = await db
    .select()
    .from(accessGrant)
    .where(
      and(
        eq(accessGrant.userId, userId),
        eq(accessGrant.scopeType, scopeType),
        scopeId ? eq(accessGrant.scopeId, scopeId) : undefined,
      ),
    )
    .get();

  if (existingGrant) {
    // REVOGAÇÃO
    await db.delete(accessGrant).where(eq(accessGrant.id, existingGrant.id));

    await writeAuditLog({
      actorUserId: admin.id,
      actorEmail: admin.email,
      action: "access_grant.delete",
      entityType: "role_permission",
      entityId: existingGrant.id,
      summary: `Revogou escopo direto (${scopeType}) de ${targetUser.name}.`,
      beforeData: existingGrant,
      afterData: null,
    });

    revalidatePath("/admin/usuarios");
    return { ok: true, message: "Escopo revogado com sucesso." };
  } else {
    // CONCESSÃO
    const newGrant = {
      id: newId("grant"),
      userId,
      scopeType,
      scopeId: scopeId ?? null,
      note: `Concedido via Matriz de Governança por ${admin.name}`,
      grantedBy: admin.id,
      createdAt: new Date(),
    };

    await db.insert(accessGrant).values(newGrant);

    await writeAuditLog({
      actorUserId: admin.id,
      actorEmail: admin.email,
      action: "access_grant.create",
      entityType: "role_permission",
      entityId: newGrant.id,
      summary: `Concedeu escopo direto (${scopeType}) para ${targetUser.name}.`,
      beforeData: null,
      afterData: newGrant,
    });

    revalidatePath("/admin/usuarios");
    return { ok: true, message: "Escopo concedido com sucesso." };
  }
}

/**
 * Altera o papel de um usuário na matriz com 1 clique.
 */
export async function updateUserRoleAction(
  userId: string,
  newRole: UserRole,
): Promise<GovernanceActionResult> {
  const admin = await requireUserManagementAccess();
  const db = await getDb();

  if (admin.id === userId && newRole !== "admin") {
    return {
      ok: false,
      message: "Você não pode rebaixar o próprio papel de Administrador.",
    };
  }

  const targetUser = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    })
    .from(user)
    .where(eq(user.id, userId))
    .get();

  if (!targetUser) {
    return { ok: false, message: "Usuário não encontrado." };
  }

  const previousRole = targetUser.role;
  await db.update(user).set({ role: newRole }).where(eq(user.id, userId));

  await writeAuditLog({
    actorUserId: admin.id,
    actorEmail: admin.email,
    action: "user.role_change",
    entityType: "user",
    entityId: userId,
    summary: `Alterou papel de ${targetUser.name} de ${previousRole} para ${newRole}.`,
    beforeData: { role: previousRole },
    afterData: { role: newRole },
  });

  revalidatePath("/admin/usuarios");
  return { ok: true, message: `Papel atualizado para ${newRole}.` };
}

/**
 * Alterna Super Admin para um usuário.
 */
export async function toggleSuperAdminAction(
  userId: string,
): Promise<GovernanceActionResult> {
  const admin = await requireAdmin();
  const db = await getDb();

  const targetUser = await db
    .select({ id: user.id, name: user.name, isSuperAdmin: user.isSuperAdmin })
    .from(user)
    .where(eq(user.id, userId))
    .get();

  if (!targetUser) {
    return { ok: false, message: "Usuário não encontrado." };
  }

  if (admin.id === userId && targetUser.isSuperAdmin) {
    return {
      ok: false,
      message: "Você não pode remover seu próprio privilégio de Super Admin.",
    };
  }

  const newValue = !targetUser.isSuperAdmin;
  await db
    .update(user)
    .set({ isSuperAdmin: newValue })
    .where(eq(user.id, userId));

  await writeAuditLog({
    actorUserId: admin.id,
    actorEmail: admin.email,
    action: "user.role_change",
    entityType: "user",
    entityId: userId,
    summary: `${newValue ? "Concedeu" : "Removeu"} Super Admin para ${targetUser.name}.`,
    beforeData: { isSuperAdmin: targetUser.isSuperAdmin },
    afterData: { isSuperAdmin: newValue },
  });

  revalidatePath("/admin/usuarios");
  return {
    ok: true,
    message: `Super Admin ${newValue ? "ativado" : "desativado"}.`,
  };
}
