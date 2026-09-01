import { asc, eq, inArray } from "drizzle-orm";

import { loadOrgTree, describePath } from "@/lib/modules/access/org-tree";
import { getDb } from "@/lib/db/client";
import {
  businessUnit,
  jobTitle,
  squad,
  squadMember,
  team,
  teamMember,
  user,
  type OrgUnitKind,
  type UserRole,
  type UserStatus,
} from "@/lib/db/schema";
import { sortByName } from "@/lib/utils/text";

/**
 * Uma posição da pessoa na estrutura organizacional.
 *
 * Plural por natureza: um designer atende três frentes, quem coordena responde
 * por mais de uma. O CARGO não está aqui — está na pessoa. Já esteve aqui, e
 * produzia a pergunta sem resposta "qual dos três é o cargo dela?" toda vez que
 * a interface tinha uma linha só.
 */
export type Position = {
  /**
   * Id do vínculo em `team_member`.
   *
   * Vem junto porque toda edição de vínculo (marcar principal, sair da
   * unidade) é endereçada por ele — sem isso, cada botão precisaria de uma
   * consulta própria para descobrir qual linha alterar.
   */
  membershipId: string;
  teamId: string;
  teamSlug: string;
  teamName: string;
  kind: OrgUnitKind;
  /** Caminho completo. Ex.: "Marketing › Conteúdo › Design". */
  path: string;
  isLead: boolean;
  isPrimary: boolean;
};

/** Um squad de que a pessoa participa. */
export type Squad = {
  /** Id do vínculo em `squad_member` — é por ele que a edição é endereçada. */
  membershipId: string;
  squadId: string;
  businessUnitId: string;
  businessUnitSlug: string;
  businessUnitLabel: string;
  squadName: string;
  isLead: boolean;
};

export type Person = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: UserRole;
  status: UserStatus;
  isSuperAdmin: boolean;
  jobTitleId: string | null;
  jobTitleName: string | null;
  jobTitleOrder: number;
  positions: Position[];
  squads: Squad[];
};

/**
 * Posições de um conjunto de pessoas.
 *
 * Recebe a lista de ids em vez de resolver uma pessoa por vez: as telas que
 * precisam disso mostram dezenas de pessoas de uma vez (organograma, squad da
 * BU, lista de usuários), e uma consulta por linha seria dezenas de idas ao
 * banco para montar uma tela.
 */
export async function loadPositions(
  userIds: string[],
): Promise<Map<string, Position[]>> {
  const result = new Map<string, Position[]>();
  if (userIds.length === 0) return result;

  const db = await getDb();
  const [rows, arvore] = await Promise.all([
    db
      .select({
        membershipId: teamMember.id,
        userId: teamMember.userId,
        teamId: team.id,
        teamSlug: team.slug,
        teamName: team.name,
        kind: team.kind,
        isLead: teamMember.isLead,
        isPrimary: teamMember.isPrimary,
        teamOrder: team.sortOrder,
      })
      .from(teamMember)
      .innerJoin(team, eq(teamMember.teamId, team.id))
      .where(inArray(teamMember.userId, userIds))
      .orderBy(asc(team.sortOrder), asc(team.name)),
    loadOrgTree(),
  ]);

  for (const row of rows) {
    const list = result.get(row.userId) ?? [];
    list.push({
      membershipId: row.membershipId,
      teamId: row.teamId,
      teamSlug: row.teamSlug,
      teamName: row.teamName,
      kind: row.kind,
      path: describePath(arvore, row.teamId),
      isLead: row.isLead,
      isPrimary: row.isPrimary,
    });
    result.set(row.userId, list);
  }

  // Principal primeiro, depois liderança: é a ordem em que a pessoa se
  // apresenta.
  for (const list of result.values()) {
    list.sort(
      (a, b) =>
        Number(b.isPrimary) - Number(a.isPrimary) ||
        Number(b.isLead) - Number(a.isLead) ||
        a.teamName.localeCompare(b.teamName, "pt-BR"),
    );
  }

  return result;
}

/** Squads de um conjunto de pessoas. */
export async function loadSquads(
  userIds: string[],
): Promise<Map<string, Squad[]>> {
  const result = new Map<string, Squad[]>();
  if (userIds.length === 0) return result;

  const db = await getDb();
  const rows = await db
    .select({
      membershipId: squadMember.id,
      userId: squadMember.userId,
      squadId: squad.id,
      squadName: squad.name,
      businessUnitId: businessUnit.id,
      businessUnitSlug: businessUnit.slug,
      businessUnitLabel: businessUnit.label,
      isLead: squadMember.isLead,
    })
    .from(squadMember)
    .innerJoin(squad, eq(squadMember.squadId, squad.id))
    .innerJoin(businessUnit, eq(squad.businessUnitId, businessUnit.id))
    .where(inArray(squadMember.userId, userIds))
    .orderBy(asc(businessUnit.sortOrder), asc(businessUnit.label));

  for (const row of rows) {
    const list = result.get(row.userId) ?? [];
    list.push({
      membershipId: row.membershipId,
      squadId: row.squadId,
      squadName: row.squadName,
      businessUnitId: row.businessUnitId,
      businessUnitSlug: row.businessUnitSlug,
      businessUnitLabel: row.businessUnitLabel,
      isLead: row.isLead,
    });
    result.set(row.userId, list);
  }

  return result;
}

/** Todas as pessoas, com cargo, unidades e squads resolvidos. */
export async function listPeople({
  includeInactive = false,
}: { includeInactive?: boolean } = {}): Promise<Person[]> {
  const db = await getDb();

  const rows = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      role: user.role,
      status: user.status,
      isSuperAdmin: user.isSuperAdmin,
      jobTitleId: user.jobTitleId,
      jobTitleName: jobTitle.name,
      jobTitleOrder: jobTitle.sortOrder,
    })
    .from(user)
    .leftJoin(jobTitle, eq(user.jobTitleId, jobTitle.id))
    .where(includeInactive ? undefined : eq(user.status, "active"))
    .orderBy(asc(user.name));

  const ids = rows.map((row) => row.id);
  const [positions, squads] = await Promise.all([
    loadPositions(ids),
    loadSquads(ids),
  ]);

  return sortByName(rows, (row) => row.name).map((row) => ({
    ...row,
    jobTitleOrder: row.jobTitleOrder ?? 999,
    positions: positions.get(row.id) ?? [],
    squads: squads.get(row.id) ?? [],
  }));
}

/**
 * Como a pessoa se apresenta numa linha só.
 *
 * Existe porque a interface tem lugares de uma linha — rodapé do menu, item de
 * listagem — e "Designer · Design (+2)" é honesto sem estourar o espaço. O
 * cargo vem primeiro porque é o que identifica a pessoa; a unidade principal
 * ganha entre as unidades, e sem principal a primeira da ordenação.
 */
export function describePositions(
  positions: Position[],
  jobTitleName?: string | null,
): string | null {
  const principal = positions[0];
  if (!principal) return jobTitleName ?? null;

  const base = jobTitleName
    ? `${jobTitleName} · ${principal.teamName}`
    : principal.teamName;

  const extras = positions.length - 1;
  return extras > 0 ? `${base} (+${extras})` : base;
}

/** Ordena pessoas do mais sênior para o menos, depois por nome. */
export function sortBySeniority<
  T extends { jobTitleOrder: number; name: string },
>(people: T[]): T[] {
  return [...people].sort(
    (a, b) =>
      a.jobTitleOrder - b.jobTitleOrder ||
      a.name.localeCompare(b.name, "pt-BR"),
  );
}
