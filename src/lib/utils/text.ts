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
