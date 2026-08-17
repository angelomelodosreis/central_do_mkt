import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";

import { getAuth } from "./auth";
import {
  getPermissionsForRole,
  hasPermission,
  type ModulePermission,
  type PermissionAction,
  type PermissionMap,
} from "./permissions";
import { getDb } from "@/lib/db/client";
import {
  allowedDomain,
  user,
  type ModuleKey,
  type UserRole,
  type UserStatus,
} from "@/lib/db/schema";

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  emailDomain: string;
  status: UserStatus;
  role: UserRole;
  permissions: PermissionMap;
};

/**
 * Lê a sessão e revalida o usuário no banco a cada request.
 *
 * A revalidação é intencional e não é redundante: o hook de cadastro do
 * better-auth só roda no primeiro login, então é aqui que suspender um usuário
 * ou desativar um domínio passa a ter efeito imediato, sem esperar a sessão
 * expirar.
 *
 * Retorna `null` quando não há sessão válida.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const auth = await getAuth();
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) return null;

  const db = await getDb();
  const row = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      emailDomain: user.emailDomain,
      status: user.status,
      role: user.role,
    })
    .from(user)
    .where(eq(user.id, session.user.id))
    .get();

  // Usuário removido do banco mas com cookie de sessão ainda no navegador.
  if (!row) return null;

  // O domínio precisa continuar autorizado — desativar um domínio revoga o
  // acesso de todo mundo que o usa, sem precisar suspender um por um.
  const domainStillAllowed = await db
    .select({ id: allowedDomain.id })
    .from(allowedDomain)
    .where(
      and(
        eq(allowedDomain.domain, row.emailDomain),
        eq(allowedDomain.isActive, true),
      ),
    )
    .get();

  const status: UserStatus = domainStillAllowed ? row.status : "suspended";

  return {
    ...row,
    status,
    permissions: await getPermissionsForRole(row.role),
  };
}

/**
 * Exige um usuário aprovado e ativo. Redireciona quando não é o caso.
 * Use no layout do grupo de rotas autenticadas e em toda server action.
 */
export async function requireUser(): Promise<CurrentUser> {
  const currentUser = await getCurrentUser();

  if (!currentUser) redirect("/login");
  if (currentUser.status === "pending") redirect("/aguardando-aprovacao");
  if (currentUser.status === "suspended") redirect("/acesso-suspenso");

  return currentUser;
}

/**
 * Exige permissão de ver/editar um módulo. Redireciona para o painel com um
 * aviso quando o usuário não tem acesso.
 */
export async function requirePermission(
  moduleKey: ModuleKey,
  action: PermissionAction = "view",
): Promise<CurrentUser> {
  const currentUser = await requireUser();

  if (!hasPermission(currentUser.permissions, moduleKey, action)) {
    redirect(`/painel?erro=sem-permissao&modulo=${moduleKey}`);
  }

  return currentUser;
}

/** Exige que o usuário seja administrador. */
export async function requireAdmin(): Promise<CurrentUser> {
  const currentUser = await requireUser();

  if (currentUser.role !== "admin") {
    redirect("/painel?erro=sem-permissao&modulo=admin");
  }

  return currentUser;
}

/** Versão sem redirect, para checagens condicionais dentro de uma página. */
export function can(
  currentUser: CurrentUser,
  moduleKey: ModuleKey,
  action: PermissionAction = "view",
): boolean {
  return hasPermission(currentUser.permissions, moduleKey, action);
}

export type { ModulePermission, PermissionMap, PermissionAction };
