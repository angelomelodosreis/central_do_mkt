import { eq } from "drizzle-orm";

import { getDb } from "@/lib/db/client";
import {
  MODULE_KEYS,
  rolePermission,
  type ModuleKey,
  type UserRole,
} from "@/lib/db/schema";

export type PermissionAction = "view" | "edit";

export type ModulePermission = { canView: boolean; canEdit: boolean };

/** Mapa completo de permissões de um papel, por módulo. */
export type PermissionMap = Record<ModuleKey, ModulePermission>;

const DENY_ALL: ModulePermission = { canView: false, canEdit: false };

function emptyPermissionMap(): PermissionMap {
  return Object.fromEntries(
    MODULE_KEYS.map((key) => [key, { ...DENY_ALL }]),
  ) as PermissionMap;
}

/**
 * Carrega as permissões do papel a partir do banco.
 *
 * As permissões vivem em `role_permission` (editável pelo admin na interface),
 * e não no código — mudar quem vê ou edita cada módulo não exige deploy.
 *
 * Falha fechada: módulo sem linha na tabela é tratado como sem acesso.
 */
export async function getPermissionsForRole(
  role: UserRole,
): Promise<PermissionMap> {
  const db = await getDb();
  const rows = await db
    .select({
      moduleKey: rolePermission.moduleKey,
      canView: rolePermission.canView,
      canEdit: rolePermission.canEdit,
    })
    .from(rolePermission)
    .where(eq(rolePermission.role, role));

  const map = emptyPermissionMap();
  for (const row of rows) {
    if (MODULE_KEYS.includes(row.moduleKey)) {
      map[row.moduleKey] = { canView: row.canView, canEdit: row.canEdit };
    }
  }
  return map;
}

export function hasPermission(
  permissions: PermissionMap,
  moduleKey: ModuleKey,
  action: PermissionAction,
): boolean {
  const modulePermission = permissions[moduleKey] ?? DENY_ALL;
  // Quem pode editar necessariamente pode ver — evita configurações
  // contraditórias na matriz de permissões.
  return action === "view"
    ? modulePermission.canView || modulePermission.canEdit
    : modulePermission.canEdit;
}
