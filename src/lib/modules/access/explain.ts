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
import { plural } from "@/lib/utils/text";

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
        reach: "todos os times, divisões, BUs e squads",
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
        targetName: node?.name ?? "removido da estrutura",
        targetPath: node ? describePath(arvore, id) : null,
        reach:
          abaixo > 0
            ? `alcança ${abaixo} ${abaixo === 1 ? "time abaixo" : "times abaixo"}`
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
        reach: total > 0 ? `alcança ${plural(total, "BU")}` : null,
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

export { SCOPE_TYPE_LABELS };
