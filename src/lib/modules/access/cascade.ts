import { asc, eq, inArray } from "drizzle-orm";

import { descendantIds, loadOrgTree, type OrgTree } from "./org-tree";
import { resolveScope, seesEverything, type EffectiveScope } from "./scope";
import { getDb } from "@/lib/db/client";
import {
  accessGrant,
  businessDivision,
  businessUnit,
  squad,
  squadMember,
  team,
  teamMember,
  user,
  type ScopeType,
  type UserRole,
  type UserStatus,
} from "@/lib/db/schema";
import { listPeople } from "@/lib/modules/org/people";

export type GovernanceUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  isSuperAdmin: boolean;
  jobTitleName: string | null;
  /** Se tem alcance global sobre tudo */
  isOrganizationWide: boolean;
  /** IDs das divisões onde tem concessão direta */
  directDivisionIds: string[];
  /** IDs das BUs onde tem concessão direta */
  directBuIds: string[];
  /** IDs das BUs que herdou em cascata via divisão ou organização */
  inheritedBuIds: string[];
  /** IDs das BUs onde é líder de squad */
  leadBuIds: string[];
  /** IDs das BUs onde é membro do squad */
  memberBuIds: string[];
  /** IDs das unidades organizacionais com concessão direta */
  directOrgUnitIds: string[];
  /** IDs dos times que herdou em cascata */
  inheritedTeamIds: string[];
  /** IDs dos times onde é membro */
  memberTeamIds: string[];
};

export type GovernanceDivision = {
  id: string;
  slug: string;
  name: string;
  units: Array<{
    id: string;
    slug: string;
    label: string;
    isActive: boolean;
  }>;
};

export type GovernanceOrgArea = {
  id: string;
  slug: string;
  name: string;
  subareas: Array<{
    id: string;
    slug: string;
    name: string;
    teams: Array<{
      id: string;
      slug: string;
      name: string;
    }>;
  }>;
  directTeams: Array<{
    id: string;
    slug: string;
    name: string;
  }>;
};

export type GovernanceMatrixData = {
  users: GovernanceUser[];
  divisions: GovernanceDivision[];
  areas: GovernanceOrgArea[];
  stats: {
    totalUsers: number;
    activeUsers: number;
    pendingUsers: number;
    orphanedUsers: number; // Sem nenhum escopo atribuído
    orphanBus: number; // BUs sem nenhum líder ou responsável direto
  };
};

/**
 * Monta o panorama completo de governança e cascata para a matriz interativa.
 */
export async function loadGovernanceMatrix(): Promise<GovernanceMatrixData> {
  const db = await getDb();

  const [
    allUsers,
    divisionsRows,
    buRows,
    squadRows,
    squadMemberRows,
    grantsRows,
    orgTree,
  ] = await Promise.all([
    listPeople({ includeInactive: false }),
    db
      .select({
        id: businessDivision.id,
        slug: businessDivision.slug,
        name: businessDivision.name,
      })
      .from(businessDivision)
      .orderBy(asc(businessDivision.sortOrder)),
    db
      .select({
        id: businessUnit.id,
        slug: businessUnit.slug,
        label: businessUnit.label,
        divisionId: businessUnit.divisionId,
        isActive: businessUnit.isActive,
      })
      .from(businessUnit)
      .orderBy(asc(businessUnit.sortOrder), asc(businessUnit.label)),
    db
      .select({ id: squad.id, businessUnitId: squad.businessUnitId })
      .from(squad),
    db
      .select({
        squadId: squadMember.squadId,
        userId: squadMember.userId,
        isLead: squadMember.isLead,
      })
      .from(squadMember),
    db
      .select({
        id: accessGrant.id,
        userId: accessGrant.userId,
        scopeType: accessGrant.scopeType,
        scopeId: accessGrant.scopeId,
      })
      .from(accessGrant),
    loadOrgTree(),
  ]);

  // Mapa de BUs por Divisão
  const busPorDivisao = new Map<string, typeof buRows>();
  const busSemDivisao: typeof buRows = [];

  for (const bu of buRows) {
    if (bu.divisionId) {
      const lista = busPorDivisao.get(bu.divisionId) ?? [];
      lista.push(bu);
      busPorDivisao.set(bu.divisionId, lista);
    } else {
      busSemDivisao.push(bu);
    }
  }

  const divisions: GovernanceDivision[] = divisionsRows.map((div) => ({
    id: div.id,
    slug: div.slug,
    name: div.name,
    units: (busPorDivisao.get(div.id) ?? []).map((bu) => ({
      id: bu.id,
      slug: bu.slug,
      label: bu.label,
      isActive: bu.isActive,
    })),
  }));

  if (busSemDivisao.length > 0) {
    divisions.push({
      id: "sem_divisao",
      slug: "outras",
      name: "Outras Business Units",
      units: busSemDivisao.map((bu) => ({
        id: bu.id,
        slug: bu.slug,
        label: bu.label,
        isActive: bu.isActive,
      })),
    });
  }

  // Mapa de squads e lideranças por BU
  const buPorSquadId = new Map(squadRows.map((s) => [s.id, s.businessUnitId]));
  const leadsPorUsuario = new Map<string, Set<string>>();
  const squadMembersPorUsuario = new Map<string, Set<string>>();

  for (const sm of squadMemberRows) {
    const buId = buPorSquadId.get(sm.squadId);
    if (!buId) continue;
    if (sm.isLead) {
      const set = leadsPorUsuario.get(sm.userId) ?? new Set();
      set.add(buId);
      leadsPorUsuario.set(sm.userId, set);
    } else {
      const set = squadMembersPorUsuario.get(sm.userId) ?? new Set();
      set.add(buId);
      squadMembersPorUsuario.set(sm.userId, set);
    }
  }

  // Agrupamento de concessões por usuário
  const grantsPorUsuario = new Map<string, typeof grantsRows>();
  for (const g of grantsRows) {
    const lista = grantsPorUsuario.get(g.userId) ?? [];
    lista.push(g);
    grantsPorUsuario.set(g.userId, lista);
  }

  // Processa cada usuário com resolução de cascata
  const users: GovernanceUser[] = allUsers.map((person) => {
    const userGrants = grantsPorUsuario.get(person.id) ?? [];
    const directDivisionIds: string[] = [];
    const directBuIds: string[] = [];
    const directOrgUnitIds: string[] = [];
    let isOrganizationWide = false;

    for (const grant of userGrants) {
      if (grant.scopeType === "organization") {
        isOrganizationWide = true;
      } else if (grant.scopeType === "division" && grant.scopeId) {
        directDivisionIds.push(grant.scopeId);
      } else if (grant.scopeType === "business_unit" && grant.scopeId) {
        directBuIds.push(grant.scopeId);
      } else if (grant.scopeType === "org_unit" && grant.scopeId) {
        directOrgUnitIds.push(grant.scopeId);
      }
    }

    // Calcula BUs herdadas em cascata (pela divisão ou pela organização)
    const inheritedBuIdsSet = new Set<string>();
    if (isOrganizationWide || person.isSuperAdmin) {
      for (const bu of buRows) {
        if (!directBuIds.includes(bu.id)) inheritedBuIdsSet.add(bu.id);
      }
    } else if (directDivisionIds.length > 0) {
      for (const divId of directDivisionIds) {
        const bus = busPorDivisao.get(divId) ?? [];
        for (const bu of bus) {
          if (!directBuIds.includes(bu.id)) inheritedBuIdsSet.add(bu.id);
        }
      }
    }

    // Calcula times herdados em cascata
    const inheritedTeamIdsSet = new Set<string>();
    for (const unitId of directOrgUnitIds) {
      for (const descId of descendantIds(orgTree, unitId)) {
        if (descId !== unitId) inheritedTeamIdsSet.add(descId);
      }
    }

    return {
      id: person.id,
      name: person.name,
      email: person.email,
      role: person.role,
      status: person.status,
      isSuperAdmin: person.isSuperAdmin,
      jobTitleName: person.jobTitleName,
      isOrganizationWide,
      directDivisionIds,
      directBuIds,
      inheritedBuIds: Array.from(inheritedBuIdsSet),
      leadBuIds: Array.from(leadsPorUsuario.get(person.id) ?? []),
      memberBuIds: Array.from(squadMembersPorUsuario.get(person.id) ?? []),
      directOrgUnitIds,
      inheritedTeamIds: Array.from(inheritedTeamIdsSet),
      memberTeamIds: person.positions.map((p) => p.teamId),
    };
  });

  // Estrutura organizacional: Áreas -> Subáreas -> Times
  const areas: GovernanceOrgArea[] = orgTree.roots.map((areaNode) => {
    const subareas: GovernanceOrgArea["subareas"] = [];
    const directTeams: GovernanceOrgArea["directTeams"] = [];

    for (const child of areaNode.children) {
      if (child.kind === "subarea") {
        subareas.push({
          id: child.id,
          slug: child.slug,
          name: child.name,
          teams: child.children.map((t) => ({
            id: t.id,
            slug: t.slug,
            name: t.name,
          })),
        });
      } else {
        directTeams.push({ id: child.id, slug: child.slug, name: child.name });
      }
    }

    return {
      id: areaNode.id,
      slug: areaNode.slug,
      name: areaNode.name,
      subareas,
      directTeams,
    };
  });

  // Estatísticas de risco e governança
  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.status === "active").length;
  const pendingUsers = users.filter((u) => u.status === "pending").length;
  const orphanedUsers = users.filter(
    (u) =>
      u.status === "active" &&
      !u.isSuperAdmin &&
      !u.isOrganizationWide &&
      u.directDivisionIds.length === 0 &&
      u.directBuIds.length === 0 &&
      u.directOrgUnitIds.length === 0 &&
      u.leadBuIds.length === 0 &&
      u.memberBuIds.length === 0,
  ).length;

  const busComResponsavel = new Set<string>();
  for (const u of users) {
    if (u.status !== "active") continue;
    if (u.isSuperAdmin || u.isOrganizationWide) {
      for (const bu of buRows) busComResponsavel.add(bu.id);
    } else {
      for (const buId of u.directBuIds) busComResponsavel.add(buId);
      for (const buId of u.inheritedBuIds) busComResponsavel.add(buId);
      for (const buId of u.leadBuIds) busComResponsavel.add(buId);
    }
  }

  const orphanBus = buRows.filter(
    (b) => b.isActive && !busComResponsavel.has(b.id),
  ).length;

  return {
    users,
    divisions,
    areas,
    stats: {
      totalUsers,
      activeUsers,
      pendingUsers,
      orphanedUsers,
      orphanBus,
    },
  };
}
