"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";

import type { PermissionFormState } from "./form-state";
import { requireAdmin } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import {
  MODULE_KEYS,
  MODULE_LABELS,
  rolePermission,
  USER_ROLES,
  USER_ROLE_LABELS as ROLE_LABELS,
  type ModuleKey,
  type UserRole,
} from "@/lib/db/schema";
import { writeAuditLog } from "@/lib/modules/audit/log";
import { newId } from "@/lib/utils/id";

/**
 * Salva a matriz de permissões inteira de uma vez.
 *
 * O formulário envia um checkbox por combinação papel × módulo × ação. Ler tudo
 * junto evita estados intermediários inconsistentes.
 */
export async function updateRolePermissions(
  _previousState: PermissionFormState,
  formData: FormData,
): Promise<PermissionFormState> {
  const admin = await requireAdmin();
  const db = await getDb();

  const existing = await db.select().from(rolePermission);
  const existingByKey = new Map(
    existing.map((row) => [`${row.role}:${row.moduleKey}`, row]),
  );

  const changes: string[] = [];
  const before: Record<string, { canView: boolean; canEdit: boolean }> = {};
  const after: Record<string, { canView: boolean; canEdit: boolean }> = {};
  const now = new Date();

  for (const role of USER_ROLES) {
    for (const moduleKey of MODULE_KEYS) {
      const key = `${role}:${moduleKey}`;

      // O acesso administrativo do papel `admin` é a última linha de defesa
      // contra um bloqueio total: não permitimos desmarcá-lo.
      const isAdminLock = role === "admin" && moduleKey === "admin";

      const canView = isAdminLock || formData.get(`${key}:view`) === "on";
      const canEdit = isAdminLock || formData.get(`${key}:edit`) === "on";

      const current = existingByKey.get(key);

      if (
        current &&
        current.canView === canView &&
        current.canEdit === canEdit
      ) {
        continue;
      }

      before[key] = current
        ? { canView: current.canView, canEdit: current.canEdit }
        : { canView: false, canEdit: false };
      after[key] = { canView, canEdit };
      changes.push(`${ROLE_LABELS[role]} · ${MODULE_LABELS[moduleKey]}`);

      if (current) {
        await db
          .update(rolePermission)
          .set({ canView, canEdit, updatedAt: now })
          .where(
            and(
              eq(rolePermission.role, role),
              eq(rolePermission.moduleKey, moduleKey as ModuleKey),
            ),
          );
      } else {
        await db.insert(rolePermission).values({
          id: newId("perm"),
          role,
          moduleKey: moduleKey as ModuleKey,
          canView,
          canEdit,
          updatedAt: now,
        });
      }
    }
  }

  if (changes.length === 0) {
    return { status: "idle", message: "Nada foi alterado." };
  }

  await writeAuditLog({
    actorUserId: admin.id,
    actorEmail: admin.email,
    action: "role_permission.update",
    entityType: "role_permission",
    entityId: "matriz",
    summary: `Alterou permissões de: ${changes.join(", ")}`,
    beforeData: before,
    afterData: after,
  });

  revalidatePath("/admin/permissoes");
  // As permissões definem o menu lateral e o acesso às páginas.
  revalidatePath("/", "layout");

  return {
    status: "success",
    message: `Permissões atualizadas (${changes.length} ${changes.length === 1 ? "alteração" : "alterações"}).`,
  };
}
