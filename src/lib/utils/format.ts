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

/** Formatação monetária BRL completa. Ex.: "R$ 14.387.827". */
export function formatCurrency(val: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(val);
}

/**
 * Formatação monetária compacta para evitar quebra de layout em cards.
 * Ex.: 14_387_827 -> "R$ 14,4M", 928_247 -> "R$ 928k", 9_191 -> "R$ 9.191".
 */
export function formatCompactCurrency(val: number): string {
  const abs = Math.abs(val);
  if (abs >= 1_000_000) {
    const formatted = (val / 1_000_000).toLocaleString("pt-BR", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    });
    return `R$ ${formatted}M`;
  }
  if (abs >= 100_000) {
    const formatted = (val / 1_000).toLocaleString("pt-BR", {
      maximumFractionDigits: 0,
    });
    return `R$ ${formatted}k`;
  }
  return formatCurrency(val);
}

/** Formatação numérica compacta. Ex.: 51_600 -> "51,6k". */
export function formatCompactNumber(val: number): string {
  const abs = Math.abs(val);
  if (abs >= 1_000_000) {
    return `${(val / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}M`;
  }
  if (abs >= 100_000) {
    return `${(val / 1_000).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}k`;
  }
  return val.toLocaleString("pt-BR");
}
