import { asc, eq } from "drizzle-orm";

import { getDb } from "@/lib/db/client";
import {
  businessUnit,
  jobTitle,
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

      return {
        ...porId.get(node.id)!,
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

  const [titles, people, units] = await Promise.all([
    db.select().from(jobTitle),
    db.select({ jobTitleId: user.jobTitleId }).from(user),
    db.select({ id: team.id, name: team.name }).from(team),
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

  return sortByName(titles, (title) => title.name).map((title) => ({
    ...title,
    peopleCount: contagem.get(title.id) ?? 0,
    suggestedTeamName: title.suggestedTeamId
      ? (nomeDaUnidade.get(title.suggestedTeamId) ?? null)
      : null,
  }));
}

/** Cargos ativos, para os seletores. */
export async function listActiveJobTitles(): Promise<JobTitle[]> {
  const db = await getDb();
  const titles = await db
    .select()
    .from(jobTitle)
    .where(eq(jobTitle.isActive, true));
  return sortByName(titles, (title) => title.name);
}
