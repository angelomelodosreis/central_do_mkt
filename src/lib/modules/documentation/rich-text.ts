import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";

/**
 * Formato do corpo de uma página.
 *
 * - `markdown`:  texto escrito no editor antigo. Continua sendo renderizado como
 *                antes; nada foi migrado à força.
 * - `rich_text`: documento estruturado (JSON do ProseMirror/TipTap), escrito no
 *                editor visual. Nunca é HTML: a tela é montada percorrendo a
 *                árvore com componentes nossos, então não existe caminho por
 *                onde conteúdo colado vire script.
 */
export const CONTENT_FORMATS = ["markdown", "rich_text"] as const;
export type ContentFormat = (typeof CONTENT_FORMATS)[number];

export function isRichText(format: string): boolean {
  return format === "rich_text";
}

/** Nó do documento estruturado, no formato do ProseMirror. */
export type RichNode = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: RichNode[];
  marks?: { type: string; attrs?: Record<string, unknown> }[];
  text?: string;
};

export type RichDoc = { type: "doc"; content?: RichNode[] };

/** Documento vazio — o que o editor entende como "nada escrito ainda". */
export const EMPTY_RICH_DOC: RichDoc = {
  type: "doc",
  content: [{ type: "paragraph" }],
};

/**
 * Lê o valor gravado na coluna `content`. Devolve `null` quando não dá para
 * interpretar, para a tela cair no estado vazio em vez de quebrar.
 */
export function parseRichDoc(raw: string | null): RichDoc | null {
  if (!raw) return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      (parsed as RichDoc).type === "doc"
    ) {
      return parsed as RichDoc;
    }
  } catch {
    // Conteúdo gravado fora do formato esperado.
  }

  return null;
}

/** `true` quando o documento não tem nenhum texto de verdade. */
export function isRichDocEmpty(doc: RichDoc | null): boolean {
  if (!doc?.content?.length) return true;

  const hasText = (nodes: RichNode[]): boolean =>
    nodes.some(
      (node) =>
        (typeof node.text === "string" && node.text.trim().length > 0) ||
        // Nós sem texto que ainda assim são conteúdo (ex.: linha divisória).
        node.type === "horizontalRule" ||
        (node.content ? hasText(node.content) : false),
    );

  return !hasText(doc.content);
}

/** Extrai só o texto legível de um documento estruturado. */
export function richDocToPlainText(doc: RichDoc | null): string {
  if (!doc?.content) return "";

  const parts: string[] = [];

  const walk = (nodes: RichNode[]) => {
    for (const node of nodes) {
      if (typeof node.text === "string") parts.push(node.text);
      if (node.content) walk(node.content);
      // Blocos viram linhas separadas para as palavras do fim de um parágrafo
      // não colarem nas do começo do próximo.
      if (node.type !== "text") parts.push("\n");
    }
  };

  walk(doc.content);
  return parts
    .join("")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

/**
 * Texto usado só para casar a busca: sem acentos e em minúsculas.
 *
 * É isto que torna a busca indiferente a acento nos dois sentidos — "configuracao"
 * encontra "configuração" e vice-versa. O `LIKE` do SQLite sozinho não faz isso,
 * porque só ignora maiúsculas/minúsculas em caracteres ASCII.
 */
export function normalizeForSearch(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/**
 * Monta o conteúdo da coluna de busca de uma página.
 *
 * Junta título, resumo e corpo num único texto já normalizado. Ter tudo numa
 * coluna só é o que permite à busca comparar uma vez por palavra, em vez de
 * normalizar cada coluna dentro da consulta — o que estourava o limite de
 * variáveis do SQLite.
 */
export function buildSearchText(input: {
  title: string;
  summary: string | null;
  content: string | null;
  contentFormat: string;
}): string | null {
  const body = input.content
    ? isRichText(input.contentFormat)
      ? richDocToPlainText(parseRichDoc(input.content))
      : input.content
    : "";

  const joined = [input.title, input.summary ?? "", body]
    .filter(Boolean)
    .join("\n");

  const normalized = normalizeForSearch(joined).trim();
  return normalized || null;
}

/**
 * Prepara o que veio do editor para gravação.
 *
 * Um editor vazio ainda produz um JSON válido (um parágrafo sem texto); guardar
 * isso faria toda página "vazia" parecer preenchida. Aqui isso vira `null`.
 */
export function normalizeRichInput(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const doc = parseRichDoc(trimmed);
  if (!doc || isRichDocEmpty(doc)) return null;

  // Regrava a partir do que foi interpretado: o que chega da requisição é texto
  // qualquer, e só o que passou pela leitura acima entra no banco.
  return JSON.stringify(doc);
}

/**
 * Converte o Markdown das páginas antigas em HTML, para o editor visual
 * conseguir abri-las.
 *
 * `allowDangerousHtml` fica desligado de propósito: o Markdown antigo pode
 * conter HTML colado que o `react-markdown` nunca executou (ele roda sem
 * `rehype-raw`). Ligar isso aqui transformaria conteúdo até então inerte em
 * HTML ativo — exatamente o risco que a renderização antiga evitava.
 */
export async function markdownToHtml(markdown: string): Promise<string> {
  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypeStringify)
    .process(markdown);

  return String(file);
}
