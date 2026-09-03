import { asc, eq } from "drizzle-orm";

import { getDb } from "@/lib/db/client";
import {
  businessUnit,
  jobTitle,
  jobTitleTeam,
  team,
  teamMember,
  user,
  type JobTitle,
  type OrgUnitKind,
  type Team,
} from "@/lib/db/schema";
import { loadOrgTree, describePath } from "@/lib/modules/access/org-tree";
import { sortByName } from "@/lib/utils/text";

export async function getBusinessUnitById(
  id: string,
): Promise<{ id: string; slug: string; label: string } | null> {
  const db = await getDb();
  const row = await db
    .select({
      id: businessUnit.id,
      slug: businessUnit.slug,
      label: businessUnit.label,
    })
    .from(businessUnit)
    .where(eq(businessUnit.id, id))
    .get();

  return row ?? null;
}

export type OrgUnitRow = Team & {
  /** Quantas pessoas estão nesta unidade, sem contar as de baixo. */
  memberCount: number;
  /** Quantas pessoas estão nesta unidade E nas de baixo. */
  totalMemberCount: number;
  /** "Marketing › Conteúdo › Design". */
  path: string;
  depth: number;
  childIds: string[];
  /**
   * A área no topo da árvore desta unidade.
   *
   * Uma área é a própria área. Vem calculado do servidor porque é o que a
   * cascata Área → Time usa para filtrar, e refazer a subida da árvore no
   * cliente exigiria mandar a árvore inteira junto.
   */
  areaId: string;
};

/**
 * A estrutura organizacional inteira, em ordem de leitura.
 *
 * Devolve achatada com `depth` em vez de aninhada porque quase toda tela que a
 * usa é uma lista (seletor, tabela, administração) — e quem precisa da árvore
 * remonta a partir de `childIds`, que sai daqui de graça.
 */
export async function listOrgUnits(): Promise<OrgUnitRow[]> {
  const db = await getDb();

  const [rows, memberships, arvore] = await Promise.all([
    db.select().from(team),
    db.select({ teamId: teamMember.teamId }).from(teamMember),
    loadOrgTree(),
  ]);

  const diretos = new Map<string, number>();
  for (const linha of memberships) {
    diretos.set(linha.teamId, (diretos.get(linha.teamId) ?? 0) + 1);
  }

  const porId = new Map(rows.map((row) => [row.id, row]));

  return arvore.flat
    .filter((node) => porId.has(node.id))
    .map((node) => {
      // O total soma a própria unidade e tudo abaixo: é o número que responde
      // "quantas pessoas respondem a Conteúdo?", que é a pergunta que se faz de
      // um subsetor. Só os diretos responderiam zero, e zero seria mentira.
      let total = 0;
      const fila = [node];
      while (fila.length > 0) {
        const atual = fila.shift()!;
        total += diretos.get(atual.id) ?? 0;
        fila.push(...atual.children);
      }

      let raiz = node;
      while (raiz.parentOrgUnitId) {
        const pai = arvore.byId.get(raiz.parentOrgUnitId);
        if (!pai) break;
        raiz = pai;
      }

      return {
        ...porId.get(node.id)!,
        areaId: raiz.id,
        memberCount: diretos.get(node.id) ?? 0,
        totalMemberCount: total,
        path: describePath(arvore, node.id),
        depth: node.depth,
        childIds: node.children.map((filho) => filho.id),
      };
    });
}

/** Unidades ativas, para os seletores. */
export async function listActiveTeams(): Promise<Team[]> {
  const db = await getDb();
  return db
    .select()
    .from(team)
    .where(eq(team.isActive, true))
    .orderBy(asc(team.sortOrder), asc(team.name));
}

/** Unidades de um nível específico. */
export async function listOrgUnitsOfKind(
  kind: OrgUnitKind,
): Promise<OrgUnitRow[]> {
  const todas = await listOrgUnits();
  return todas.filter((unidade) => unidade.kind === kind);
}

export type JobTitleRow = JobTitle & {
  /** Quantas pessoas ocupam o cargo — cargo ocupado não pode ser excluído. */
  peopleCount: number;
  suggestedTeamName: string | null;
  /** Times em que o cargo existe. Vazio = vale em qualquer time. */
  teamIds: string[];
  teamNames: string[];
};

/**
 * O catálogo de cargos, com quantas pessoas ocupam cada um.
 *
 * A contagem vem junto porque é ela que decide se o cargo pode ser excluído ou
 * apenas desativado — e sem ela a tela ofereceria uma exclusão que o servidor
 * recusa, que é a pior combinação possível.
 */
export async function listJobTitles(): Promise<JobTitleRow[]> {
  const db = await getDb();

  const [titles, people, units, vinculos] = await Promise.all([
    db.select().from(jobTitle),
    db.select({ jobTitleId: user.jobTitleId }).from(user),
    db.select({ id: team.id, name: team.name }).from(team),
    db.select().from(jobTitleTeam),
  ]);

  const contagem = new Map<string, number>();
  for (const linha of people) {
    if (linha.jobTitleId) {
      contagem.set(linha.jobTitleId, (contagem.get(linha.jobTitleId) ?? 0) + 1);
    }
  }
  const nomeDaUnidade = new Map(
    units.map((unidade) => [unidade.id, unidade.name]),
  );

  const timesPorCargo = new Map<string, string[]>();
  for (const vinculo of vinculos) {
    const lista = timesPorCargo.get(vinculo.jobTitleId) ?? [];
    lista.push(vinculo.teamId);
    timesPorCargo.set(vinculo.jobTitleId, lista);
  }

  return sortByName(titles, (title) => title.name).map((title) => {
    const teamIds = timesPorCargo.get(title.id) ?? [];
    return {
      ...title,
      peopleCount: contagem.get(title.id) ?? 0,
      suggestedTeamName: title.suggestedTeamId
        ? (nomeDaUnidade.get(title.suggestedTeamId) ?? null)
        : null,
      teamIds,
      teamNames: teamIds
        .map((id) => nomeDaUnidade.get(id))
        .filter((nome): nome is string => Boolean(nome))
        .sort(),
    };
  });
}

/** Cargos ativos, para os seletores. */
export type ActiveJobTitle = JobTitle & {
  /** Times em que o cargo existe. Vazio = vale em qualquer time. */
  teamIds: string[];
};

/**
 * Cargos ativos para os seletores, cada um com os times em que existe.
 *
 * Os times vêm junto porque é a tela que filtra: mandar só os cargos
 * obrigaria uma segunda consulta do lado do cliente, ou — pior — filtrar por
 * nome.
 */
export async function listActiveJobTitles(): Promise<ActiveJobTitle[]> {
  const db = await getDb();
  const [titles, vinculos] = await Promise.all([
    db.select().from(jobTitle).where(eq(jobTitle.isActive, true)),
    db.select().from(jobTitleTeam),
  ]);

  const timesPorCargo = new Map<string, string[]>();
  for (const vinculo of vinculos) {
    const lista = timesPorCargo.get(vinculo.jobTitleId) ?? [];
    lista.push(vinculo.teamId);
    timesPorCargo.set(vinculo.jobTitleId, lista);
  }

  return sortByName(titles, (title) => title.name).map((title) => ({
    ...title,
    teamIds: timesPorCargo.get(title.id) ?? [],
  }));
}
