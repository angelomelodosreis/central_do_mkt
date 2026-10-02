import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { and, eq } from "drizzle-orm";

import { getAuth } from "./auth";
import {
  lerEstadoDoSegundoFator,
  type EstadoDoSegundoFator,
} from "./two-factor";
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
  jobTitle,
  user,
  type ModuleKey,
  type UserRole,
  type UserStatus,
} from "@/lib/db/schema";
import {
  canSeeBusinessUnit,
  isFullAccessMaster,
  resolveScope,
  seesEverything,
  type EffectiveScope,
} from "@/lib/modules/access/scope";
import { loadPositions, type Position } from "@/lib/modules/org/people";

export type CurrentUser = {
  id: string;
  /**
   * A sessão em que a pessoa está agora.
   *
   * Necessário porque o segundo fator é confirmado POR SESSÃO — ver
   * `src/lib/auth/two-factor.ts`.
   */
  sessionId: string;
  name: string;
  email: string;
  image: string | null;
  emailDomain: string;
  status: UserStatus;
  /** Chave da matriz de permissões: o QUE a pessoa pode fazer. */
  role: UserRole;
  /**
   * Administra a plataforma. Separado do papel e dos escopos porque é
   * revogável em separado — ver `user.isSuperAdmin` no schema.
   */
  isSuperAdmin: boolean;
  /** Cargo — informação organizacional, nunca permissão. */
  jobTitleId: string | null;
  jobTitleName: string | null;
  /**
   * Unidades organizacionais da pessoa — plural.
   *
   * Ficam na sessão, e não numa consulta à parte, porque entram em toda
   * checagem de tarefa: uma tarefa endereçada a um time aparece na fila de quem
   * é daquele time, e essa pergunta é feita em cada carregamento do painel.
   */
  positions: Position[];
  /** Atalho para as checagens de tarefa, derivado de `positions`. */
  teamIds: string[];
  /** SOBRE O QUE a pessoa pode agir. A outra metade do modelo de acesso. */
  scope: EffectiveScope;
  permissions: PermissionMap;
  /** Cadastro do app autenticador e confirmação desta sessão. */
  segundoFator: EstadoDoSegundoFator;
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
export const getCurrentUser = cache(
  async function getCurrentUser(): Promise<CurrentUser | null> {
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
        isSuperAdmin: user.isSuperAdmin,
        jobTitleId: user.jobTitleId,
        jobTitleName: jobTitle.name,
      })
      .from(user)
      .leftJoin(jobTitle, eq(user.jobTitleId, jobTitle.id))
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

    const [positions, permissions, scope, segundoFator] = await Promise.all([
      loadPositions([row.id]),
      getPermissionsForRole(row.role),
      resolveScope({
        id: row.id,
        isSuperAdmin: row.isSuperAdmin,
        email: row.email,
        name: row.name,
      }),
      lerEstadoDoSegundoFator(row.id, session.session.id),
    ]);

    const minhasPosicoes = positions.get(row.id) ?? [];

    return {
      ...row,
      sessionId: session.session.id,
      status,
      positions: minhasPosicoes,
      teamIds: minhasPosicoes.map((position) => position.teamId),
      scope,
      permissions,
      segundoFator,
    };
  },
);

/**
 * Exige um usuário aprovado e ativo. Redireciona quando não é o caso.
 * Use no layout do grupo de rotas autenticadas e em toda server action.
 */
export async function requireUser(): Promise<CurrentUser> {
  const currentUser = await getCurrentUser();

  if (!currentUser) redirect("/login");
  if (currentUser.status === "pending") redirect("/aguardando-aprovacao");
  if (currentUser.status === "suspended") redirect("/acesso-suspenso");

  // O segundo fator vem depois da situação do cadastro de propósito: não faz
  // sentido pedir que alguém registre um app autenticador para uma conta que
  // ainda pode nunca ser aprovada.
  if (!currentUser.segundoFator.cadastrado) redirect("/verificacao/cadastrar");
  if (!currentUser.segundoFator.confirmado) redirect("/verificacao");

  return currentUser;
}

/**
 * Sessão válida e cadastro aprovado, SEM exigir o segundo fator.
 *
 * É o portão das próprias telas de verificação. Usar `requireUser()` nelas
 * criaria um redirecionamento em círculo: a tela que resolve a pendência não
 * pode ser a mesma que a pendência bloqueia.
 */
export async function requireUserForTwoFactor(): Promise<CurrentUser> {
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

/**
 * Administrador da plataforma: quem configura a ferramenta.
 *
 * Duas portas de entrada de propósito. `isSuperAdmin` é a chave de fenda, que
 * sobrevive a qualquer configuração da matriz — é o que impede alguém ficar
 * trancado para fora da própria administração ao editar permissões. A matriz é
 * o caminho normal, editável sem deploy.
 */
export function isPlatformAdmin(currentUser: CurrentUser): boolean {
  return (
    currentUser.scope.isMasterFullAccess ||
    currentUser.isSuperAdmin ||
    can(currentUser, "admin", "edit")
  );
}

/** Verifica se o usuário tem privilégio para gerenciar usuários e acessos (Admin ou Líder) */
export function canManageUsers(currentUser: CurrentUser): boolean {
  return (
    isPlatformAdmin(currentUser) ||
    currentUser.role === "admin" ||
    currentUser.role === "leader" ||
    can(currentUser, "admin")
  );
}

/** Exige privilégio de gestão de usuários (Admin ou Líder). */
export async function requireUserManagementAccess(): Promise<CurrentUser> {
  const currentUser = await requireUser();

  if (!canManageUsers(currentUser)) {
    redirect("/painel?erro=sem-permissao&modulo=admin");
  }

  return currentUser;
}

/** Exige que o usuário seja administrador da plataforma. */
export async function requireAdmin(): Promise<CurrentUser> {
  const currentUser = await requireUser();

  if (!isPlatformAdmin(currentUser)) {
    redirect("/painel?erro=sem-permissao&modulo=admin");
  }

  return currentUser;
}

/**
 * Exige alcance sobre uma Business Unit.
 *
 * Um portão só para as duas metades do modelo: `moduleKey` cobre o que a
 * pessoa pode fazer, o escopo cobre onde. Antes isso vinha escrito à mão em
 * cada action, e uma delas esquecia sempre uma das metades.
 */
export async function requireBusinessUnitAccess(
  businessUnitId: string,
  moduleKey: ModuleKey,
  action: PermissionAction = "view",
): Promise<CurrentUser> {
  const currentUser = await requirePermission(moduleKey, action);

  if (!canSeeBusinessUnit(currentUser.scope, businessUnitId)) {
    redirect("/planejamento?erro=sem-acesso");
  }

  return currentUser;
}

/** Enxerga todas as BUs, sem depender de vínculo. */
export function seesAllBusinessUnits(currentUser: CurrentUser): boolean {
  return seesEverything(currentUser.scope);
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
export type { Position, EffectiveScope, EstadoDoSegundoFator };
export { isFullAccessMaster };
