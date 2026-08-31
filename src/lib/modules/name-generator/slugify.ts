/** Marcas de acento que a normalização NFD separa das letras (ex.: é -> e + ´). */
const COMBINING_MARKS = /[̀-ͯ]/g;

/**
 * Converte texto livre digitado pelo usuário no bloco `nome_da_lista` do padrão
 * de nomenclatura: minúsculas, sem acento, palavras unidas por `_`.
 *
 * É uma função pura, sem dependência de banco ou de React — é o coração da
 * convenção e pode ser testada isoladamente.
 *
 * Exemplos:
 *   "Black Friday Novembro"      -> "black_friday_novembro"
 *   "Turma 2026 — Clínica"       -> "turma_2026_clinica"
 *   "Leads Instagram & YouTube"  -> "leads_instagram_e_youtube"
 *   "  espaços   demais  "       -> "espacos_demais"
 */
export function toSnakeCase(input: string): string {
  return (
    input
      .normalize("NFD")
      .replace(COMBINING_MARKS, "")
      .toLowerCase()
      // "&" e "+" viram a conjunção, que é como o time escreve na prática.
      .replace(/[&+]/g, " e ")
      // O ç não é decomposto pela normalização; trocamos explicitamente.
      .replace(/ç/g, "c")
      // Qualquer coisa que não seja letra ou número vira separador.
      .replace(/[^a-z0-9]+/g, "_")
      // Colapsa separadores repetidos e remove os das pontas.
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "")
  );
}

/** Comprimento máximo do bloco de nome livre, para o nome final não virar um texto. */
export const MAX_NAME_LENGTH = 60;

export type NameValidationResult =
  { ok: true; value: string } | { ok: false; error: string };

/**
 * Valida e normaliza o bloco `nome_da_lista`.
 * Retorna a mensagem de erro pronta para exibir quando algo está errado.
 */
export function validateListName(rawInput: string): NameValidationResult {
  const trimmed = rawInput.trim();

  if (!trimmed) {
    return { ok: false, error: "Digite um nome para a lista." };
  }

  const normalized = toSnakeCase(trimmed);

  if (!normalized) {
    return {
      ok: false,
      error:
        "O nome precisa ter ao menos uma letra ou número. Símbolos sozinhos não valem.",
    };
  }

  if (normalized.length > MAX_NAME_LENGTH) {
    return {
      ok: false,
      error: `O nome ficou com ${normalized.length} caracteres depois da padronização. O limite é ${MAX_NAME_LENGTH} — tente algo mais curto.`,
    };
  }

  return { ok: true, value: normalized };
}
