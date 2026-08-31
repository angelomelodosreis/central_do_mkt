import { asc, eq, inArray } from "drizzle-orm";

import { loadOrgTree, describePath } from "./org-tree";
import { resolveScope, seesEverything, type EffectiveScope } from "./scope";
import { getPermissionsForRole } from "@/lib/auth/permissions";
import { getDb } from "@/lib/db/client";
import {
  accessGrant,
  businessDivision,
  businessUnit,
  squad,
  MODULE_KEYS,
  MODULE_LABELS,
  SCOPE_TYPE_LABELS,
  type ModuleKey,
  type ScopeType,
  type UserRole,
} from "@/lib/db/schema";

/** Uma concessão já resolvida em nome legível. */
export type ResolvedGrant = {
  id: string;
  scopeType: ScopeType;
  scopeId: string | null;
  /** Nome do alvo. Ex.: "Conteúdo", "MedCof Especialidades". */
  targetName: string;
  /** Caminho completo, quando o alvo está numa hierarquia. */
  targetPath: string | null;
  /** O que a concessão alcança além do próprio alvo. */
  reach: string | null;
  note: string | null;
};

/**
 * O acesso efetivo de uma pessoa, em frases.
 *
 * Existe por causa da pergunta que toda tela de permissão deveria responder e
 * quase nenhuma responde: "por que essa pessoa vê isso?". Com papel numa aba,
 * vínculos noutra e herança implícita no meio, a resposta só existia na cabeça
 * de quem configurou — e sumia quando essa pessoa saía de férias.
 */
export type AccessSummary = {
  /** Frases curtas descrevendo o alcance. Vazio = a pessoa não alcança nada. */
  reachLines: string[];
  /** O que o papel permite, módulo a módulo. */
  modules: Array<{
    key: ModuleKey;
    label: string;
    canView: boolean;
    canEdit: boolean;
  }>;
  /** Quantas BUs a pessoa enxerga, e por quê. */
  businessUnitCount: number | "todas";
  grants: ResolvedGrant[];
  isSuperAdmin: boolean;
};

/** As concessões de alguém, já com os nomes dos alvos resolvidos. */
export async function listGrantsForUser(
  userId: string,
): Promise<ResolvedGrant[]> {
  const db = await getDb();

  const [rows, arvore] = await Promise.all([
    db
      .select()
      .from(accessGrant)
      .where(eq(accessGrant.userId, userId))
      .orderBy(asc(accessGrant.scopeType)),
    loadOrgTree(),
  ]);

  if (rows.length === 0) return [];

  const idsPorTipo = (tipo: ScopeType) =>
    rows
      .filter((row) => row.scopeType === tipo && row.scopeId)
      .map((row) => row.scopeId!);

  const [divisoes, unidades, squads] = await Promise.all([
    idsPorTipo("division").length > 0
      ? db
          .select({ id: businessDivision.id, name: businessDivision.name })
          .from(businessDivision)
          .where(inArray(businessDivision.id, idsPorTipo("division")))
      : Promise.resolve([]),
    idsPorTipo("business_unit").length > 0
      ? db
          .select({ id: businessUnit.id, label: businessUnit.label })
          .from(businessUnit)
          .where(inArray(businessUnit.id, idsPorTipo("business_unit")))
      : Promise.resolve([]),
    idsPorTipo("squad").length > 0
      ? db
          .select({ id: squad.id, name: squad.name })
          .from(squad)
          .where(inArray(squad.id, idsPorTipo("squad")))
      : Promise.resolve([]),
  ]);

  const contagemDeBusPorDivisao = new Map<string, number>();
  if (divisoes.length > 0) {
    const linhas = await db
      .select({ divisionId: businessUnit.divisionId })
      .from(businessUnit)
      .where(
        inArray(
          businessUnit.divisionId,
          divisoes.map((divisao) => divisao.id),
        ),
      );
    for (const linha of linhas) {
      if (linha.divisionId) {
        contagemDeBusPorDivisao.set(
          linha.divisionId,
          (contagemDeBusPorDivisao.get(linha.divisionId) ?? 0) + 1,
        );
      }
    }
  }

  return rows.map((row): ResolvedGrant => {
    if (row.scopeType === "organization") {
      return {
        id: row.id,
        scopeType: row.scopeType,
        scopeId: null,
        targetName: "Toda a organização",
        targetPath: null,
        reach: "todas as unidades, divisões, BUs e squads",
        note: row.note,
      };
    }

    const id = row.scopeId!;

    if (row.scopeType === "org_unit") {
      const node = arvore.byId.get(id);
      const abaixo = node ? contarDescendentes(arvore, id) : 0;
      return {
        id: row.id,
        scopeType: row.scopeType,
        scopeId: id,
        targetName: node?.name ?? "unidade removida",
        targetPath: node ? describePath(arvore, id) : null,
        reach:
          abaixo > 0
            ? `alcança ${abaixo} ${abaixo === 1 ? "unidade abaixo" : "unidades abaixo"}`
            : null,
        note: row.note,
      };
    }

    if (row.scopeType === "division") {
      const divisao = divisoes.find((item) => item.id === id);
      const total = contagemDeBusPorDivisao.get(id) ?? 0;
      return {
        id: row.id,
        scopeType: row.scopeType,
        scopeId: id,
        targetName: divisao?.name ?? "divisão removida",
        targetPath: null,
        reach:
          total > 0 ? `alcança ${total} ${total === 1 ? "BU" : "BUs"}` : null,
        note: row.note,
      };
    }

    if (row.scopeType === "business_unit") {
      const unidade = unidades.find((item) => item.id === id);
      return {
        id: row.id,
        scopeType: row.scopeType,
        scopeId: id,
        targetName: unidade?.label ?? "BU removida",
        targetPath: null,
        reach: "alcança o squad dela",
        note: row.note,
      };
    }

    const alvo = squads.find((item) => item.id === id);
    return {
      id: row.id,
      scopeType: row.scopeType,
      scopeId: id,
      targetName: alvo?.name ?? "squad removido",
      targetPath: null,
      reach: "alcança a BU do squad",
      note: row.note,
    };
  });
}

function contarDescendentes(
  tree: Awaited<ReturnType<typeof loadOrgTree>>,
  rootId: string,
): number {
  const raiz = tree.byId.get(rootId);
  if (!raiz) return 0;
  let total = 0;
  const fila = [...raiz.children];
  while (fila.length > 0) {
    const node = fila.shift()!;
    total += 1;
    fila.push(...node.children);
  }
  return total;
}

/**
 * Monta o resumo de acesso de uma pessoa.
 *
 * Recebe o papel e o id em vez de um `CurrentUser` porque a tela de
 * administração precisa explicar o acesso de OUTRA pessoa — que não tem sessão
 * aberta.
 */
export async function summarizeAccess({
  userId,
  role,
  isSuperAdmin,
}: {
  userId: string;
  role: UserRole;
  isSuperAdmin: boolean;
}): Promise<AccessSummary> {
  const [scope, permissions, grants] = await Promise.all([
    resolveScope({ id: userId, isSuperAdmin }),
    getPermissionsForRole(role),
    listGrantsForUser(userId),
  ]);

  return {
    reachLines: describeReach(scope, grants),
    modules: MODULE_KEYS.map((key) => ({
      key,
      label: MODULE_LABELS[key],
      canView: permissions[key].canView || permissions[key].canEdit,
      canEdit: permissions[key].canEdit,
    })),
    businessUnitCount: seesEverything(scope)
      ? "todas"
      : new Set([...scope.businessUnitIds, ...scope.squadBusinessUnitIds]).size,
    grants,
    isSuperAdmin,
  };
}

/**
 * As frases do resumo.
 *
 * Separa RESPONDER de PARTICIPAR porque a diferença é a que mais confunde: quem
 * participa de um squad enxerga a BU, mas não responde por ela. Um resumo que
 * dissesse só "tem acesso a 3 BUs" esconderia exatamente a distinção que
 * justifica o modelo.
 */
function describeReach(
  scope: EffectiveScope,
  grants: ResolvedGrant[],
): string[] {
  const linhas: string[] = [];

  if (scope.isSuperAdmin) {
    linhas.push(
      "Administra a plataforma: permissões, domínios de e-mail, bases oficiais e auditoria. Enxerga tudo, independentemente de vínculo.",
    );
  }

  if (scope.isOrganizationWide) {
    linhas.push(
      "Responde pela organização inteira: todas as unidades, divisões, BUs e squads.",
    );
  }

  const orgUnits = grants.filter((grant) => grant.scopeType === "org_unit");
  if (orgUnits.length > 0) {
    linhas.push(
      `Responde por ${orgUnits.map((grant) => grant.targetName).join(", ")} — e, por herança, pelas unidades abaixo.`,
    );
  }

  const divisions = grants.filter((grant) => grant.scopeType === "division");
  if (divisions.length > 0) {
    linhas.push(
      `Responde pela divisão ${divisions.map((grant) => grant.targetName).join(", ")} — e pelas BUs dela.`,
    );
  }

  const bus = grants.filter((grant) => grant.scopeType === "business_unit");
  if (bus.length > 0) {
    linhas.push(
      `Responde pelas BUs ${bus.map((grant) => grant.targetName).join(", ")}.`,
    );
  }

  if (scope.squadIds.size > 0) {
    linhas.push(
      `Participa de ${scope.squadIds.size} ${scope.squadIds.size === 1 ? "squad" : "squads"} — enxerga o planejamento dessas BUs, mas isso por si só não a torna responsável por elas.`,
    );
  }

  if (scope.memberOrgUnitIds.size > 0) {
    linhas.push(
      scope.memberOrgUnitIds.size === 1
        ? "Está em 1 unidade organizacional e recebe as tarefas endereçadas a ela — e as endereçadas às unidades acima dela."
        : `Está em ${scope.memberOrgUnitIds.size} unidades organizacionais e recebe as tarefas endereçadas a elas — e às unidades acima delas.`,
    );
  }

  if (linhas.length === 0) {
    linhas.push(
      "Nenhum escopo. Consegue entrar na plataforma, mas o planejamento das BUs não existe para ela — nem para consultar.",
    );
  }

  return linhas;
}

export { SCOPE_TYPE_LABELS };
