const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});

const DATE_FORMATTER = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "America/Sao_Paulo",
});

/** Ex.: "10/08/2026 14:32" (horário de Brasília). */
export function formatDateTime(value: Date | null | undefined): string {
  if (!value) return "—";
  return DATE_TIME_FORMATTER.format(value);
}

/** Ex.: "10/08/2026". */
export function formatDate(value: Date | null | undefined): string {
  if (!value) return "—";
  return DATE_FORMATTER.format(value);
}
