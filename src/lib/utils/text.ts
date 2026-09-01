/** Marcas de acento que a normalização NFD separa das letras (ex.: é → e + ´). */
const ACENTOS = /[\u0300-\u036f]/g;

/**
 * Texto pronto para comparar numa busca: sem acento, em minúsculas.
 *
 * Existe porque toda busca da ferramenta é feita por quem escreve rápido e sem
 * acento — "clinica" precisa encontrar "Clínica". Comparar as formas cruas faz
 * a busca falhar exatamente nas palavras mais comuns em português.
 */
export function normalizeForSearch(texto: string): string {
  return texto.normalize("NFD").replace(ACENTOS, "").toLowerCase().trim();
}

/**
 * A consulta casa com algum dos campos?
 *
 * Casa por PALAVRA, e não pela frase inteira: quem digita "ana derma" espera
 * encontrar "Ana Paula — Dermatologia". Exigir a sequência exata transformaria
 * a busca em algo que só funciona quando já se sabe o nome completo.
 */
export function matchesSearch(
  query: string,
  ...campos: Array<string | null | undefined>
): boolean {
  const termos = normalizeForSearch(query).split(/\s+/).filter(Boolean);
  if (termos.length === 0) return true;

  const alvo = campos
    .filter((campo): campo is string => Boolean(campo))
    .map(normalizeForSearch)
    .join(" ");

  return termos.every((termo) => alvo.includes(termo));
}

/**
 * Concorda o substantivo com o número.
 *
 * Existe porque a interface vinha escrevendo `{n} itens` direto no JSX, e o
 * caso de um só aparecia como "1 itens" em quatro lugares. Erro pequeno e
 * constante — o tipo de coisa que faz a ferramenta parecer descuidada mesmo
 * quando tudo funciona.
 *
 * O plural do português quase sempre é o singular + "s"; quando não é
 * (`pessoa`/`pessoas` é regular, `qual`/`quais` não), o terceiro argumento diz.
 */
export function plural(
  quantidade: number,
  singular: string,
  formaPlural?: string,
): string {
  const palavra = quantidade === 1 ? singular : (formaPlural ?? `${singular}s`);
  return `${quantidade} ${palavra}`;
}

/** Só a palavra, já concordada — para quando o número aparece separado. */
export function pluralWord(
  quantidade: number,
  singular: string,
  formaPlural?: string,
): string {
  return quantidade === 1 ? singular : (formaPlural ?? `${singular}s`);
}

/**
 * Compara dois nomes como uma pessoa esperaria ver numa lista.
 *
 * `sensitivity: "base"` iguala maiúscula com minúscula e letra com acento, que
 * é o que faz "Ácido" cair entre "Abono" e "Ajuste" em vez de ir para o fim da
 * lista — e "enamed" ficar junto de "Enamed" em vez de depois de "Zebra".
 *
 * O `numeric` põe "R2" depois de "R1" e antes de "R10", que a ordem de texto
 * pura inverteria.
 */
const COLECIONADOR = new Intl.Collator("pt-BR", {
  sensitivity: "base",
  numeric: true,
});

export function compareNames(a: string, b: string): number {
  return COLECIONADOR.compare(a, b);
}

/** Ordena uma lista pelo nome extraído de cada item. */
export function sortByName<T>(itens: T[], nome: (item: T) => string): T[] {
  return [...itens].sort((a, b) => compareNames(nome(a), nome(b)));
}
