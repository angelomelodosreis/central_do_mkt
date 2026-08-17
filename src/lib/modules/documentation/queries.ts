import { and, asc, eq, inArray, or, sql } from "drizzle-orm";
import type { SQLiteColumn } from "drizzle-orm/sqlite-core";

import type { CurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import {
  documentationCategory,
  documentationPage,
  type DocVisibility,
  type UserRole,
} from "@/lib/db/schema";
import {
  isRichText,
  normalizeForSearch,
  parseRichDoc,
  richDocToPlainText,
} from "@/lib/modules/documentation/rich-text";

/**
 * Níveis de visibilidade que cada papel pode ver.
 *
 * A regra é aplicada dentro da consulta ao banco (cláusula `IN`), não filtrando
 * em memória depois — assim uma página restrita nunca chega ao processo que
 * monta a tela para quem não pode vê-la.
 */
const VISIBILITY_BY_ROLE: Record<UserRole, DocVisibility[]> = {
  admin: ["all_active_users", "leader_and_admin", "admin_only"],
  leader: ["all_active_users", "leader_and_admin"],
  // Editor produz conteúdo, mas não é liderança: página marcada como restrita a
  // líderes continua restrita a líderes.
  editor: ["all_active_users"],
  member: ["all_active_users"],
};

export function visibilitiesFor(role: UserRole): DocVisibility[] {
  return VISIBILITY_BY_ROLE[role] ?? VISIBILITY_BY_ROLE.member;
}

export type DocCategory = typeof documentationCategory.$inferSelect;
export type DocPage = typeof documentationPage.$inferSelect;

export type DocPageSummary = Pick<
  DocPage,
  "id" | "slug" | "title" | "summary" | "pageType" | "visibility" | "updatedAt"
>;

export type CategoryWithPages = DocCategory & { pages: DocPageSummary[] };

/** Árvore completa de categorias e páginas visíveis para o usuário. */
export async function listCategoriesWithPages(
  currentUser: CurrentUser,
): Promise<CategoryWithPages[]> {
  const db = await getDb();

  const categories = await db
    .select()
    .from(documentationCategory)
    .orderBy(asc(documentationCategory.sortOrder), asc(documentationCategory.name));

  if (categories.length === 0) return [];

  const pages = await db
    .select({
      id: documentationPage.id,
      slug: documentationPage.slug,
      title: documentationPage.title,
      summary: documentationPage.summary,
      pageType: documentationPage.pageType,
      visibility: documentationPage.visibility,
      updatedAt: documentationPage.updatedAt,
      categoryId: documentationPage.categoryId,
    })
    .from(documentationPage)
    .where(
      inArray(documentationPage.visibility, visibilitiesFor(currentUser.role)),
    )
    .orderBy(asc(documentationPage.sortOrder), asc(documentationPage.title));

  return categories.map((category) => ({
    ...category,
    pages: pages.filter((page) => page.categoryId === category.id),
  }));
}

export async function getCategoryBySlug(
  slug: string,
): Promise<DocCategory | undefined> {
  const db = await getDb();
  return db
    .select()
    .from(documentationCategory)
    .where(eq(documentationCategory.slug, slug))
    .get();
}

export async function listCategories(): Promise<DocCategory[]> {
  const db = await getDb();
  return db
    .select()
    .from(documentationCategory)
    .orderBy(asc(documentationCategory.sortOrder), asc(documentationCategory.name));
}

/**
 * Busca uma página pelo par categoria/slug, já respeitando a visibilidade do
 * papel do usuário. Retorna `undefined` tanto quando a página não existe quanto
 * quando existe mas é restrita — de fora, os dois casos são indistinguíveis, o
 * que evita revelar a existência de conteúdo restrito.
 */
export async function getPageBySlug(
  categorySlug: string,
  pageSlug: string,
  currentUser: CurrentUser,
): Promise<{ category: DocCategory; page: DocPage } | undefined> {
  const category = await getCategoryBySlug(categorySlug);
  if (!category) return undefined;

  const db = await getDb();
  const page = await db
    .select()
    .from(documentationPage)
    .where(
      and(
        eq(documentationPage.categoryId, category.id),
        eq(documentationPage.slug, pageSlug),
        inArray(documentationPage.visibility, visibilitiesFor(currentUser.role)),
      ),
    )
    .get();

  if (!page) return undefined;
  return { category, page };
}

export type DocSearchHit = DocPageSummary & {
  categorySlug: string;
  categoryName: string;
  /** Trecho do conteúdo em volta da primeira palavra encontrada, se houver. */
  excerpt: string | null;
};

/** Caracteres com significado próprio no `LIKE` do SQLite. */
function escapeLikeTerm(term: string): string {
  return term.replace(/[\\%_]/g, (char) => `\\${char}`);
}

/**
 * `LIKE` com cláusula `ESCAPE` explícita.
 *
 * O `like()` do drizzle não emite `ESCAPE`, e sem ela a barra invertida não tem
 * significado nenhum para o SQLite — então quem buscasse por "12%" acabaria
 * procurando uma barra invertida literal, e não pelo símbolo de porcentagem.
 */
function likeEscaped(column: SQLiteColumn, pattern: string) {
  // A barra vai dobrada porque isto é um template literal do JS: `'\\'` produz o
  // `ESCAPE '\'` que o SQLite espera.
  return sql`${column} LIKE ${pattern} ESCAPE '\\'`;
}

/**
 * Busca páginas por palavra-chave em título, resumo e conteúdo.
 *
 * O termo é quebrado em palavras e todas precisam aparecer em algum dos campos
 * (não necessariamente no mesmo), então "checkout comercial" encontra a página
 * que fala dos dois assuntos sem exigir que estejam lado a lado.
 *
 * Acento e caixa não importam: tanto o termo quanto os campos passam pela mesma
 * normalização, então "configuracao" encontra "Configuração" e vice-versa.
 */
export async function searchDocPages(
  rawTerm: string,
  currentUser: CurrentUser,
): Promise<DocSearchHit[]> {
  // O termo passa pela mesma normalização gravada em `searchText`, então acento
  // e caixa deixam de importar dos dois lados.
  const words = normalizeForSearch(rawTerm)
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 6);
  if (words.length === 0) return [];

  const db = await getDb();

  // O nome da categoria também conta como acerto, mas ele vive em outra tabela e
  // são poucas categorias: resolver quais casam aqui é bem mais simples do que
  // normalizar a coluna dentro da consulta.
  const categories = await listCategories();
  const categoryIdsFor = (word: string) =>
    categories
      .filter((category) => normalizeForSearch(category.name).includes(word))
      .map((category) => category.id);

  const rows = await db
    .select({
      id: documentationPage.id,
      slug: documentationPage.slug,
      title: documentationPage.title,
      summary: documentationPage.summary,
      pageType: documentationPage.pageType,
      visibility: documentationPage.visibility,
      updatedAt: documentationPage.updatedAt,
      content: documentationPage.content,
      contentFormat: documentationPage.contentFormat,
      categorySlug: documentationCategory.slug,
      categoryName: documentationCategory.name,
    })
    .from(documentationPage)
    .innerJoin(
      documentationCategory,
      eq(documentationPage.categoryId, documentationCategory.id),
    )
    .where(
      and(
        inArray(documentationPage.visibility, visibilitiesFor(currentUser.role)),
        // Uma condição por palavra, todas obrigatórias — "checkout comercial"
        // acha a página que fala dos dois assuntos, mesmo em trechos distantes.
        // `searchText` já traz título, resumo e corpo normalizados numa coluna
        // só; comparar coluna a coluna aqui multiplicaria os parâmetros da
        // consulta até estourar o limite do SQLite.
        ...words.map((word) => {
          const matching = categoryIdsFor(word);
          const inSearchText = likeEscaped(
            documentationPage.searchText,
            `%${escapeLikeTerm(word)}%`,
          );

          return matching.length > 0
            ? or(inSearchText, inArray(documentationPage.categoryId, matching))
            : inSearchText;
        }),
      ),
    )
    .orderBy(asc(documentationPage.title));

  const hits: DocSearchHit[] = rows.map(
    ({ content, contentFormat, ...page }) => ({
      ...page,
      excerpt: buildExcerpt(
        isRichText(contentFormat)
          ? richDocToPlainText(parseRichDoc(content))
          : (content ?? ""),
        words,
      ),
    }),
  );

  // Acerto no título é sinal mais forte que uma menção solta no meio do texto.
  // A ordenação fica aqui, e não no SQL, porque comparar sem acento no banco
  // exigiria reescrever a coluna linha a linha.
  const first = words[0];
  const score = (hit: DocSearchHit) =>
    normalizeForSearch(hit.title).includes(first) ? 0 : 1;

  return hits.sort(
    (a, b) => score(a) - score(b) || a.title.localeCompare(b.title, "pt-BR"),
  );
}

/**
 * Monta um trecho do conteúdo em volta da primeira palavra encontrada, para a
 * pessoa entender por que aquela página apareceu no resultado.
 */
function buildExcerpt(plain: string, words: string[]): string | null {
  if (!plain) return null;

  const flat = plain.replace(/\s+/g, " ").trim();
  if (!flat) return null;

  // `words` já vem normalizado, então o texto do trecho precisa ser comparado
  // do mesmo jeito. `normalizeForSearch` preserva o comprimento, então os
  // índices continuam válidos para recortar o texto original.
  const haystack = normalizeForSearch(flat);
  const at = words
    .map((word) => haystack.indexOf(word))
    .filter((index) => index >= 0)
    .sort((a, b) => a - b)[0];

  if (at === undefined) return null;

  const start = Math.max(0, at - 60);
  const end = Math.min(flat.length, at + 140);

  return `${start > 0 ? "…" : ""}${flat.slice(start, end)}${
    end < flat.length ? "…" : ""
  }`;
}

/**
 * Endereço atual de uma página, resolvido pelo `id`.
 *
 * O slug de uma página é regerado a partir do título toda vez que ela é salva,
 * então qualquer link fixo no código quebra silenciosamente na primeira vez que
 * alguém renomeia a página — foi exatamente o que aconteceu com o botão "Ver as
 * convenções" do Gerador de Nomes. O `id` não muda; é por ele que se aponta.
 *
 * Devolve `null` quando a página não existe mais ou é restrita para este
 * usuário, para quem chama poder esconder o link em vez de exibir um caminho
 * que leva a "não encontrado".
 */
export async function getPageHrefById(
  id: string,
  currentUser: CurrentUser,
): Promise<string | null> {
  const db = await getDb();

  const row = await db
    .select({
      pageSlug: documentationPage.slug,
      categorySlug: documentationCategory.slug,
    })
    .from(documentationPage)
    .innerJoin(
      documentationCategory,
      eq(documentationPage.categoryId, documentationCategory.id),
    )
    .where(
      and(
        eq(documentationPage.id, id),
        inArray(documentationPage.visibility, visibilitiesFor(currentUser.role)),
      ),
    )
    .get();

  return row ? `/documentacao/${row.categorySlug}/${row.pageSlug}` : null;
}

/** Busca por id, para as telas de edição. */
export async function getPageById(id: string): Promise<DocPage | undefined> {
  const db = await getDb();
  return db
    .select()
    .from(documentationPage)
    .where(eq(documentationPage.id, id))
    .get();
}
