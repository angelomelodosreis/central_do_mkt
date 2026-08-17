/**
 * Aritmética de datas do calendário.
 *
 * Tudo aqui trabalha no fuso local e com o dia "achatado" à meia-noite: o
 * calendário raciocina em dias, não em instantes, e comparar timestamps com
 * hora embutida faria um item de 1º de março cair em 28 de fevereiro para quem
 * está em fuso diferente.
 */

/** Meia-noite local do dia da data informada. */
export function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

/** Último instante do dia — usado para gravar o fim de um item. */
export function endOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

export function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

export function addMonths(date: Date, months: number): Date {
  const copy = new Date(date);
  copy.setDate(1);
  copy.setMonth(copy.getMonth() + months);
  return copy;
}

export function startOfMonth(date: Date): Date {
  const copy = startOfDay(date);
  copy.setDate(1);
  return copy;
}

export function endOfMonth(date: Date): Date {
  return endOfDay(addDays(addMonths(startOfMonth(date), 1), -1));
}

/** Domingo da semana da data — a grade mensal começa no domingo. */
export function startOfWeek(date: Date): Date {
  const copy = startOfDay(date);
  return addDays(copy, -copy.getDay());
}

export function endOfWeek(date: Date): Date {
  return endOfDay(addDays(startOfWeek(date), 6));
}

export function startOfQuarter(date: Date): Date {
  const copy = startOfMonth(date);
  copy.setMonth(Math.floor(copy.getMonth() / 3) * 3);
  return copy;
}

export function endOfQuarter(date: Date): Date {
  return endOfDay(addDays(addMonths(startOfQuarter(date), 3), -1));
}

/** Dias entre duas datas, contando pelo dia local. */
export function daysBetween(from: Date, to: Date): number {
  const a = startOfDay(from).getTime();
  const b = startOfDay(to).getTime();
  return Math.round((b - a) / 86_400_000);
}

export function isSameDay(a: Date, b: Date): boolean {
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}

export function isToday(date: Date): boolean {
  return isSameDay(date, new Date());
}

/** Um item ocupa o dia? Comparação por dia, inclusiva nas duas pontas. */
export function coversDay(
  item: { startsAt: Date; endsAt: Date },
  day: Date,
): boolean {
  const d = startOfDay(day).getTime();
  return (
    startOfDay(item.startsAt).getTime() <= d &&
    startOfDay(item.endsAt).getTime() >= d
  );
}

/** Os dois períodos se tocam? */
export function overlaps(
  a: { startsAt: Date; endsAt: Date },
  b: { startsAt: Date; endsAt: Date },
): boolean {
  return (
    startOfDay(a.startsAt).getTime() <= startOfDay(b.endsAt).getTime() &&
    startOfDay(a.endsAt).getTime() >= startOfDay(b.startsAt).getTime()
  );
}

/** As 6 semanas × 7 dias que a grade mensal desenha. */
export function monthGridDays(month: Date): Date[] {
  const first = startOfWeek(startOfMonth(month));
  return Array.from({ length: 42 }, (_, index) => addDays(first, index));
}

const MONTHS = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

const MONTHS_SHORT = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];

export const WEEKDAYS_SHORT = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

export function monthName(month: number): string {
  return MONTHS[month] ?? "";
}

export function monthShort(month: number): string {
  return MONTHS_SHORT[month] ?? "";
}

/** "12 de março" — sem o ano, que já está no cabeçalho. */
export function formatDayMonth(date: Date): string {
  return `${date.getDate()} de ${monthName(date.getMonth())}`;
}

/** Período em texto curto: "12–18 de março" ou "28 de fev — 3 de mar". */
export function formatRange(startsAt: Date, endsAt: Date): string {
  if (isSameDay(startsAt, endsAt)) return formatDayMonth(startsAt);

  if (startsAt.getMonth() === endsAt.getMonth()) {
    return `${startsAt.getDate()}–${endsAt.getDate()} de ${monthName(startsAt.getMonth())}`;
  }

  return `${startsAt.getDate()} de ${monthShort(startsAt.getMonth())} — ${endsAt.getDate()} de ${monthShort(endsAt.getMonth())}`;
}

/** Data no formato que o `<input type="date">` entende. */
export function toDateInput(date: Date): string {
  const copy = startOfDay(date);
  const month = String(copy.getMonth() + 1).padStart(2, "0");
  const day = String(copy.getDate()).padStart(2, "0");
  return `${copy.getFullYear()}-${month}-${day}`;
}

/**
 * Lê o valor de um `<input type="date">` como data local.
 *
 * `new Date("2026-03-12")` seria interpretado como UTC e voltaria um dia no
 * Brasil; por isso a data é montada a partir das partes.
 */
export function fromDateInput(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;

  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return Number.isNaN(date.getTime()) ? null : startOfDay(date);
}
