import { eq, inArray } from "drizzle-orm";

import { descendantIds, loadOrgTree, type OrgTree } from "./org-tree";
import { getDb } from "@/lib/db/client";
import {
  accessGrant,
  businessUnit,
  squad,
  squadMember,
  teamMember,
  type ScopeType,
} from "@/lib/db/schema";

/**
 * O alcance efetivo de uma pessoa, já resolvido.
 *
 * O modelo tem duas metades que não se substituem:
 *
 * - PAPEL (`role_permission`) diz O QUE a pessoa pode fazer — ver, editar,
 *   delegar, administrar.
 * - ESCOPO (esta estrutura) diz SOBRE O QUÊ ela pode fazer aquilo.
 *
 * Nenhuma das duas sozinha descreve a realidade. Dois gerentes com o mesmo
 * cargo e o mesmo papel têm alcances diferentes — um responde por um time, o
 * outro por três — e é exatamente esse caso que o cargo sozinho não representa.
 */
export type EffectiveScope = {
  /** Administra a plataforma: permissões, domínios, bases oficiais, auditoria. */
  isSuperAdmin: boolean;
  /**
   * Responde pela organização inteira.
   *
   * Diferente de `isSuperAdmin` de propósito: é possível responder por tudo no
   * negócio sem mexer na configuração da ferramenta, e vice-versa.
   */
  isOrganizationWide: boolean;

  /** Unidades organizacionais sob responsabilidade, com os descendentes. */
  orgUnitIds: Set<string>;
  /** Divisões sob responsabilidade. */
  divisionIds: Set<string>;
  /** BUs sob RESPONSABILIDADE (divisões já expandidas). */
  businessUnitIds: Set<string>;
  /** BUs onde a pessoa PARTICIPA do squad — vínculo, não responsabilidade. */
  squadBusinessUnitIds: Set<string>;
  /** Squads de que participa. */
  squadIds: Set<string>;

  /** Unidades organizacionais de que participa. */
  memberOrgUnitIds: Set<string>;
  /**
   * Unidades cujas tarefas caem na fila da pessoa: as dela MAIS as de cima.
   *
   * Os ancestrais entram porque uma tarefa endereçada a "Conteúdo" é para quem
   * está em Conteúdo — inclusive quem está em Design, que fica dentro dele. Sem
   * isso, endereçar ao subsetor não chegaria a ninguém.
   */
  taskOrgUnitIds: Set<string>;
};

const VAZIO = (): Set<string> => new Set<string>();

/**
 * Resolve o alcance de uma pessoa a partir dos vínculos e das concessões.
 *
 * Tudo que é herança acontece AQUI, uma vez: escopo sobre um subsetor desce
 * para os times, escopo sobre uma divisão desce para as BUs. Espalhar essa
 * expansão pelas telas é o que faz um time criado depois nascer fora do escopo
 * de quem deveria responder por ele — sem ninguém notar.
 */
export async function resolveScope(userInfo: {
  id: string;
  isSuperAdmin: boolean;
}): Promise<EffectiveScope> {
  const db = await getDb();

  const [grants, times, squads, arvore] = await Promise.all([
    db
      .select({
        scopeType: accessGrant.scopeType,
        scopeId: accessGrant.scopeId,
      })
      .from(accessGrant)
      .where(eq(accessGrant.userId, userInfo.id)),
    db
      .select({ teamId: teamMember.teamId })
      .from(teamMember)
      .where(eq(teamMember.userId, userInfo.id)),
    db
      .select({
        squadId: squadMember.squadId,
        businessUnitId: squad.businessUnitId,
      })
      .from(squadMember)
      .innerJoin(squad, eq(squadMember.squadId, squad.id))
      .where(eq(squadMember.userId, userInfo.id)),
    loadOrgTree(),
  ]);

  const escopo: EffectiveScope = {
    isSuperAdmin: userInfo.isSuperAdmin,
    isOrganizationWide: false,
    orgUnitIds: VAZIO(),
    divisionIds: VAZIO(),
    businessUnitIds: VAZIO(),
    squadBusinessUnitIds: VAZIO(),
    squadIds: VAZIO(),
    memberOrgUnitIds: VAZIO(),
    taskOrgUnitIds: VAZIO(),
  };

  for (const vinculo of squads) {
    escopo.squadIds.add(vinculo.squadId);
    escopo.squadBusinessUnitIds.add(vinculo.businessUnitId);
  }

  for (const vinculo of times) {
    escopo.memberOrgUnitIds.add(vinculo.teamId);
    // A fila recebe as tarefas do time e as dos níveis acima dele.
    for (const id of ancestrais(arvore, vinculo.teamId)) {
      escopo.taskOrgUnitIds.add(id);
    }
  }

  const divisoesConcedidas: string[] = [];
  const squadsConcedidos: string[] = [];

  for (const grant of grants) {
    const tipo = grant.scopeType as ScopeType;
    if (tipo === "organization") {
      escopo.isOrganizationWide = true;
      continue;
    }
    if (!grant.scopeId) continue;

    switch (tipo) {
      case "org_unit":
        for (const id of descendantIds(arvore, grant.scopeId)) {
          escopo.orgUnitIds.add(id);
        }
        break;
      case "division":
        escopo.divisionIds.add(grant.scopeId);
        divisoesConcedidas.push(grant.scopeId);
        break;
      case "business_unit":
        escopo.businessUnitIds.add(grant.scopeId);
        break;
      case "squad":
        squadsConcedidos.push(grant.scopeId);
        break;
    }
  }

  // Divisão alcança as BUs dela, e squad alcança a BU que o originou. As duas
  // consultas só acontecem quando há concessão desse tipo.
  if (divisoesConcedidas.length > 0) {
    const unidades = await db
      .select({ id: businessUnit.id })
      .from(businessUnit)
      .where(inArray(businessUnit.divisionId, divisoesConcedidas));
    for (const unidade of unidades) escopo.businessUnitIds.add(unidade.id);
  }

  if (squadsConcedidos.length > 0) {
    const linhas = await db
      .select({ id: squad.id, businessUnitId: squad.businessUnitId })
      .from(squad)
      .where(inArray(squad.id, squadsConcedidos));
    for (const linha of linhas) {
      escopo.squadIds.add(linha.id);
      escopo.businessUnitIds.add(linha.businessUnitId);
    }
  }

  return escopo;
}

function ancestrais(tree: OrgTree, nodeId: string): string[] {
  const ids: string[] = [];
  let atual = tree.byId.get(nodeId);
  while (atual) {
    ids.push(atual.id);
    atual = atual.parentOrgUnitId
      ? tree.byId.get(atual.parentOrgUnitId)
      : undefined;
    if (ids.length > 50) break;
  }
  return ids;
}

/** Escopo vazio, para quando não há usuário. Falha fechada. */
export function emptyScope(): EffectiveScope {
  return {
    isSuperAdmin: false,
    isOrganizationWide: false,
    orgUnitIds: VAZIO(),
    divisionIds: VAZIO(),
    businessUnitIds: VAZIO(),
    squadBusinessUnitIds: VAZIO(),
    squadIds: VAZIO(),
    memberOrgUnitIds: VAZIO(),
    taskOrgUnitIds: VAZIO(),
  };
}

// ---------------------------------------------------------------------------
// Perguntas que as telas fazem ao escopo
// ---------------------------------------------------------------------------

/** Enxerga o negócio inteiro, sem precisar de vínculo com cada BU. */
export function seesEverything(scope: EffectiveScope): boolean {
  return scope.isSuperAdmin || scope.isOrganizationWide;
}

/** Pode ABRIR uma BU: por alcance total, por responsabilidade ou por squad. */
export function canSeeBusinessUnit(
  scope: EffectiveScope,
  businessUnitId: string,
): boolean {
  return (
    seesEverything(scope) ||
    scope.businessUnitIds.has(businessUnitId) ||
    scope.squadBusinessUnitIds.has(businessUnitId)
  );
}

/**
 * RESPONDE por uma BU — mais estreito que vê-la.
 *
 * Participar do squad abre a leitura; responder pela BU (ou pela divisão dela,
 * ou pela organização) é o que autoriza mudar a estratégia dela.
 */
export function isResponsibleForBusinessUnit(
  scope: EffectiveScope,
  businessUnitId: string,
): boolean {
  return seesEverything(scope) || scope.businessUnitIds.has(businessUnitId);
}

/** Responde por uma unidade organizacional (ou por algo acima dela). */
export function canManageOrgUnit(
  scope: EffectiveScope,
  orgUnitId: string,
): boolean {
  return seesEverything(scope) || scope.orgUnitIds.has(orgUnitId);
}

/** Tarefa endereçada a esta unidade cai na fila da pessoa. */
export function receivesTasksOf(
  scope: EffectiveScope,
  orgUnitId: string,
): boolean {
  return scope.taskOrgUnitIds.has(orgUnitId);
}

/**
 * O recorte de BUs, no formato que as consultas usam.
 *
 * `all` não é açúcar para "a lista com todas": é o que permite consultar sem
 * carregar 22 ids em cada `IN`, e o que faz uma BU nova aparecer para quem
 * responde pela organização sem precisar cadastrar vínculo.
 */
export type BusinessUnitScope =
  { kind: "all" } | { kind: "some"; ids: string[] };

export function businessUnitScopeOf(scope: EffectiveScope): BusinessUnitScope {
  if (seesEverything(scope)) return { kind: "all" };
  return {
    kind: "some",
    ids: [
      ...new Set([...scope.businessUnitIds, ...scope.squadBusinessUnitIds]),
    ],
  };
}

export function scopeIncludes(
  scope: BusinessUnitScope,
  businessUnitId: string,
): boolean {
  return scope.kind === "all" || scope.ids.includes(businessUnitId);
}
