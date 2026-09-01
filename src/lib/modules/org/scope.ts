import { and, asc, eq, inArray } from "drizzle-orm";

import type { CurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import {
  businessDivision,
  businessUnit,
  jobTitle,
  squad,
  squadMember,
  user,
  type UserRole,
} from "@/lib/db/schema";
import {
  businessUnitScopeOf,
  canSeeBusinessUnit,
  isResponsibleForBusinessUnit,
  scopeIncludes,
  seesEverything,
  type BusinessUnitScope,
} from "@/lib/modules/access/scope";
import { loadPositions, type Position } from "@/lib/modules/org/people";
import { sortByName } from "@/lib/utils/text";

export type { BusinessUnitScope };
export { scopeIncludes };

/**
 * Duas coisas diferentes decidem o que a pessoa pode fazer numa BU:
 *
 * - ESCOPO decide o que ela VÊ. Participar do squad abre a BU; responder pela
 *   BU, pela divisão dela ou pela organização também.
 * - PAPEL (matriz de permissões) decide o que ela ALTERA dentro do que vê.
 *
 * A separação é o que permite pôr uma designer no squad de uma BU para ela
 * acompanhar o calendário sem ganhar poder de editá-lo: o vínculo abre a porta,
 * o papel diz se ela pode mexer.
 *
 * A regra "admin e líder veem tudo" saiu do código e virou dado
 * (`access_grant` de escopo `organization`), porque ela é uma decisão sobre
 * pessoas, não sobre papéis: dois gerentes com o mesmo papel têm alcances
 * diferentes, e era exatamente isso que a regra fixa não sabia representar.
 */
export function seesAllBusinessUnits(currentUser: CurrentUser): boolean {
  return seesEverything(currentUser.scope);
}

export function loadBusinessUnitScope(
  currentUser: CurrentUser,
): BusinessUnitScope {
  return businessUnitScopeOf(currentUser.scope);
}

export type ScopedBusinessUnit = {
  id: string;
  slug: string;
  label: string;
  description: string | null;
  isActive: boolean;
  divisionId: string | null;
  divisionName: string | null;
  /** A pessoa participa do squad desta BU. */
  isMember: boolean;
  /** Ela responde pelo squad. */
  isLead: boolean;
  /** Ela responde pela BU (por concessão de escopo), e não só participa. */
  isResponsible: boolean;
};

/**
 * As BUs que a pessoa pode abrir, na ordem de exibição.
 *
 * BUs inativas continuam na lista para quem tem alcance total (o histórico
 * aponta para elas), mas ficam marcadas — sumi-las esconderia planejamento que
 * ainda precisa ser consultado.
 */
export async function listAccessibleBusinessUnits(
  currentUser: CurrentUser,
): Promise<ScopedBusinessUnit[]> {
  const db = await getDb();
  const scope = loadBusinessUnitScope(currentUser);

  if (scope.kind === "some" && scope.ids.length === 0) return [];

  const units = await db
    .select({
      id: businessUnit.id,
      slug: businessUnit.slug,
      label: businessUnit.label,
      description: businessUnit.description,
      isActive: businessUnit.isActive,
      divisionId: businessUnit.divisionId,
      divisionName: businessDivision.name,
    })
    .from(businessUnit)
    .leftJoin(
      businessDivision,
      eq(businessUnit.divisionId, businessDivision.id),
    )
    .where(
      scope.kind === "all" ? undefined : inArray(businessUnit.id, scope.ids),
    )
    .orderBy(asc(businessUnit.sortOrder), asc(businessUnit.label));

  // O vínculo é carregado mesmo para quem vê tudo: é o que permite destacar
  // "as suas BUs" no meio das 22 de quem coordena.
  const memberships = await db
    .select({
      businessUnitId: squad.businessUnitId,
      isLead: squadMember.isLead,
    })
    .from(squadMember)
    .innerJoin(squad, eq(squadMember.squadId, squad.id))
    .where(eq(squadMember.userId, currentUser.id));

  const mine = new Map(
    memberships.map((row) => [row.businessUnitId, row.isLead]),
  );

  return sortByName(units, (unit) => unit.label).map((unit) => ({
    ...unit,
    isMember: mine.has(unit.id),
    isLead: mine.get(unit.id) === true,
    isResponsible: isResponsibleForBusinessUnit(currentUser.scope, unit.id),
  }));
}

/**
 * Quem compõe o squad de uma BU.
 *
 * Traz TODAS as unidades de cada pessoa, e não uma só: o squad de Dermatologia
 * reúne gente de Marketing de Produto, Design e Copy, e é justamente essa
 * mistura que a visualização de squad existe para mostrar. Com uma unidade por
 * pessoa, o squad pareceria homogêneo.
 */
export type SquadMemberView = {
  userId: string;
  name: string;
  email: string;
  image: string | null;
  role: UserRole;
  jobTitleName: string | null;
  jobTitleOrder: number;
  /** Responde pelo squad. */
  isLead: boolean;
  positions: Position[];
};

export async function listBusinessUnitMembers(
  businessUnitId: string,
): Promise<SquadMemberView[]> {
  const db = await getDb();

  const rows = await db
    .select({
      userId: squadMember.userId,
      isLead: squadMember.isLead,
      name: user.name,
      email: user.email,
      image: user.image,
      role: user.role,
      jobTitleName: jobTitle.name,
      jobTitleOrder: jobTitle.sortOrder,
    })
    .from(squadMember)
    .innerJoin(squad, eq(squadMember.squadId, squad.id))
    .innerJoin(user, eq(squadMember.userId, user.id))
    .leftJoin(jobTitle, eq(user.jobTitleId, jobTitle.id))
    .where(eq(squad.businessUnitId, businessUnitId))
    .orderBy(asc(user.name));

  const positions = await loadPositions(rows.map((row) => row.userId));

  return rows
    .map((row) => ({
      ...row,
      jobTitleOrder: row.jobTitleOrder ?? 999,
      positions: positions.get(row.userId) ?? [],
    }))
    .sort(
      (a, b) =>
        // Responsável primeiro: é a referência que se procura ao abrir a BU.
        Number(b.isLead) - Number(a.isLead) ||
        // Depois por senioridade do cargo, para o squad ler de cima para baixo
        // em vez de em ordem alfabética.
        a.jobTitleOrder - b.jobTitleOrder ||
        a.name.localeCompare(b.name, "pt-BR"),
    );
}

/** Todos os squads de que uma pessoa participa — usado na ficha do usuário. */
export async function listMembershipsByUser(
  userId: string,
): Promise<
  Array<{ squadId: string; businessUnitId: string; isLead: boolean }>
> {
  const db = await getDb();
  return db
    .select({
      squadId: squad.id,
      businessUnitId: squad.businessUnitId,
      isLead: squadMember.isLead,
    })
    .from(squadMember)
    .innerJoin(squad, eq(squadMember.squadId, squad.id))
    .where(eq(squadMember.userId, userId));
}

export async function isBusinessUnitMember(
  userId: string,
  businessUnitId: string,
): Promise<boolean> {
  const db = await getDb();
  const row = await db
    .select({ id: squadMember.id })
    .from(squadMember)
    .innerJoin(squad, eq(squadMember.squadId, squad.id))
    .where(
      and(
        eq(squadMember.userId, userId),
        eq(squad.businessUnitId, businessUnitId),
      ),
    )
    .get();
  return Boolean(row);
}

/** O squad de uma BU. Criado junto com ela, então normalmente existe. */
export async function getSquadOfBusinessUnit(
  businessUnitId: string,
): Promise<{ id: string; name: string; isActive: boolean } | null> {
  const db = await getDb();
  const row = await db
    .select({ id: squad.id, name: squad.name, isActive: squad.isActive })
    .from(squad)
    .where(eq(squad.businessUnitId, businessUnitId))
    .get();
  return row ?? null;
}

export { canSeeBusinessUnit, isResponsibleForBusinessUnit };
