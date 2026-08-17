/**
 * Junta classes CSS ignorando valores falsos.
 * Suficiente para o nosso uso — não precisamos de `clsx`/`tailwind-merge`.
 */
export function cn(
  ...classes: Array<string | false | null | undefined>
): string {
  return classes.filter(Boolean).join(" ");
}
