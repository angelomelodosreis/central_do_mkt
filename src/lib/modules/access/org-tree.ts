import { getDb } from "@/lib/db/client";
import { team, type OrgUnitKind } from "@/lib/db/schema";
import { compareNames } from "@/lib/utils/text";

/**
 * Um nó da estrutura organizacional, já com os filhos resolvidos.
 */
export type OrgUnitNode = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  kind: OrgUnitKind;
  isActive: boolean;
  sortOrder: number;
  parentOrgUnitId: string | null;
  children: OrgUnitNode[];
  /** Profundidade a partir da raiz. Setor = 0. */
  depth: number;
};

export type OrgTree = {
  /** Todos os nós, indexados por id. */
  byId: Map<string, OrgUnitNode>;
  /** As raízes, na ordem de exibição. */
  roots: OrgUnitNode[];
  /** Lista achatada em ordem de leitura (pai antes dos filhos). */
  flat: OrgUnitNode[];
};

/**
 * Monta a árvore inteira numa consulta.
 *
 * Uma consulta e não uma recursiva no banco: a estrutura de uma área de
 * marketing tem dezenas de nós, não milhares, e resolver em memória mantém a
 * mesma lógica de descendência disponível para o escopo de acesso, para o
 * organograma e para os seletores — em vez de uma versão diferente em SQL para
 * cada um.
 */
export async function loadOrgTree(): Promise<OrgTree> {
  const db = await getDb();
  const rows = await db.select().from(team);

  const byId = new Map<string, OrgUnitNode>();
  for (const row of rows) {
    byId.set(row.id, {
      id: row.id,
      slug: row.slug,
      name: row.name,
      description: row.description,
      kind: row.kind,
      isActive: row.isActive,
      sortOrder: row.sortOrder,
      parentOrgUnitId: row.parentOrgUnitId,
      children: [],
      depth: 0,
    });
  }

  const roots: OrgUnitNode[] = [];
  for (const node of byId.values()) {
    const pai = node.parentOrgUnitId ? byId.get(node.parentOrgUnitId) : null;
    // Um pai que não existe mais não pode sumir com o filho da tela: ele vira
    // raiz, visível e corrigível, em vez de desaparecer do organograma.
    if (pai) pai.children.push(node);
    else roots.push(node);
  }

  const flat: OrgUnitNode[] = [];
  function percorrer(node: OrgUnitNode, depth: number) {
    node.depth = depth;
    flat.push(node);
    node.children.sort((a, b) => compareNames(a.name, b.name));
    for (const filho of node.children) percorrer(filho, depth + 1);
  }
  // Irmãos em ordem alfabética, e só isso. `sortOrder` existiu para uma ordem
  // manual que nunca ganhou tela: toda unidade nasce com o mesmo número, então
  // ele só preservava a ordem em que o seed inseriu — que na tela parecia
  // aleatória (Copy, Videomakers, Social Media, Comunicação, Design).
  roots.sort((a, b) => compareNames(a.name, b.name));
  for (const raiz of roots) percorrer(raiz, 0);

  return { byId, roots, flat };
}

/**
 * O nó e tudo que está abaixo dele.
 *
 * É o que faz responsabilidade sobre "Conteúdo" alcançar Design, Copy,
 * Videomakers, Social e Comunicação sem cadastrar os cinco — e alcançar o time
 * que for criado amanhã, que é a parte que o cadastro folha a folha erra.
 */
export function descendantIds(tree: OrgTree, rootId: string): string[] {
  const raiz = tree.byId.get(rootId);
  if (!raiz) return [];

  const ids: string[] = [];
  const fila: OrgUnitNode[] = [raiz];
  while (fila.length > 0) {
    const node = fila.shift()!;
    ids.push(node.id);
    fila.push(...node.children);
  }
  return ids;
}

/** O nó e tudo que está acima dele, do mais próximo ao mais distante. */
export function ancestorIds(tree: OrgTree, nodeId: string): string[] {
  const ids: string[] = [];
  let atual = tree.byId.get(nodeId);
  while (atual) {
    ids.push(atual.id);
    atual = atual.parentOrgUnitId
      ? tree.byId.get(atual.parentOrgUnitId)
      : undefined;
    // Ciclo é impossível pelas validações de escrita, mas um dado corrompido
    // não pode travar a aplicação num laço infinito.
    if (ids.length > 50) break;
  }
  return ids;
}

/** O caminho legível até o nó. Ex.: "Marketing › Conteúdo › Design". */
export function describePath(tree: OrgTree, nodeId: string): string {
  return ancestorIds(tree, nodeId)
    .reverse()
    .map((id) => tree.byId.get(id)?.name ?? "?")
    .join(" › ");
}

/**
 * Impede que uma unidade seja posta abaixo de si mesma.
 *
 * Sem isso, a árvore some da tela inteira: o ramo fica órfão da raiz e o
 * percurso nunca chega nele.
 */
export function wouldCreateCycle(
  tree: OrgTree,
  nodeId: string,
  novoPaiId: string | null,
): boolean {
  if (!novoPaiId) return false;
  if (novoPaiId === nodeId) return true;
  return descendantIds(tree, nodeId).includes(novoPaiId);
}
