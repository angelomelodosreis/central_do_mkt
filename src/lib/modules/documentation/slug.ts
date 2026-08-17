/**
 * Converte um título em slug de URL (kebab-case, sem acento).
 * Ex.: "Convenções de Mídia Paga" -> "convencoes-de-midia-paga"
 */
export function toKebabCase(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
