import { addDays, daysBetween, startOfDay } from "./dates";

/**
 * O mínimo que o empacotamento precisa saber de um item.
 *
 * Genérico de propósito: o servidor trabalha com a linha inteira do banco e o
 * cliente com um subconjunto serializado — as duas passam por aqui.
 */
export type Placeable = { id: string; startsAt: Date; endsAt: Date };

/** Um item posicionado numa semana da grade mensal. */
export type WeekSegment<T extends Placeable = Placeable> = {
  item: T;
  /** Coluna inicial, 0–6. */
  column: number;
  /** Quantas colunas ocupa nesta semana. */
  span: number;
  /** Faixa vertical dentro da célula, para não sobrepor. */
  row: number;
  /** O item começou antes desta semana? Muda o arredondamento do card. */
  continuesBefore: boolean;
  continuesAfter: boolean;
};

/**
 * Distribui os itens de uma semana em faixas.
 *
 * Um item que atravessa vários dias vira uma barra contínua; a faixa (`row`) é
 * a primeira que estiver livre em todas as colunas que ele ocupa. Sem isso, dois
 * itens no mesmo dia se desenhariam por cima um do outro.
 */
export function packWeek<T extends Placeable>(
  items: T[],
  weekStart: Date,
): WeekSegment<T>[] {
  const weekEnd = addDays(weekStart, 6);
  const segments: WeekSegment<T>[] = [];
  // Uma linha por faixa; cada linha guarda quais das 7 colunas já estão tomadas.
  const occupancy: boolean[][] = [];

  const visible = items
    .filter(
      (item) =>
        startOfDay(item.startsAt).getTime() <= weekEnd.getTime() &&
        startOfDay(item.endsAt).getTime() >= weekStart.getTime(),
    )
    // Barras mais longas primeiro: elas definem o desenho da semana, e itens
    // curtos preenchem os buracos abaixo.
    .sort((a, b) => {
      const lengthA = daysBetween(a.startsAt, a.endsAt);
      const lengthB = daysBetween(b.startsAt, b.endsAt);
      if (lengthA !== lengthB) return lengthB - lengthA;
      return a.startsAt.getTime() - b.startsAt.getTime();
    });

  for (const item of visible) {
    const startOffset = daysBetween(weekStart, item.startsAt);
    const endOffset = daysBetween(weekStart, item.endsAt);

    const column = Math.max(0, startOffset);
    const lastColumn = Math.min(6, endOffset);
    const span = Math.max(1, lastColumn - column + 1);

    let row = 0;
    while (true) {
      if (!occupancy[row]) occupancy[row] = Array(7).fill(false);
      const livre = occupancy[row]
        .slice(column, column + span)
        .every((taken) => !taken);
      if (livre) break;
      row += 1;
    }

    for (let i = column; i < column + span; i += 1) occupancy[row][i] = true;

    segments.push({
      item,
      column,
      span,
      row,
      continuesBefore: startOffset < 0,
      continuesAfter: endOffset > 6,
    });
  }

  return segments;
}

/** Posição de um item numa faixa horizontal contínua (visões trimestral/anual). */
export type LaneSegment<T extends Placeable = Placeable> = {
  item: T;
  /** Percentual da largura da faixa. */
  left: number;
  width: number;
  row: number;
  clippedStart: boolean;
  clippedEnd: boolean;
};

/**
 * Coloca os itens numa faixa proporcional ao período.
 *
 * É o desenho das visões trimestral e anual: em vez de uma grade de dias
 * ilegível, cada item vira uma barra cuja posição e comprimento representam o
 * período — que é o que faz a esteira de produtos saltar aos olhos.
 */
export function packLane<T extends Placeable>(
  items: T[],
  from: Date,
  to: Date,
): LaneSegment<T>[] {
  const totalDays = Math.max(1, daysBetween(from, to) + 1);
  const segments: LaneSegment<T>[] = [];
  const rowEnds: number[] = [];

  const visible = items
    .filter(
      (item) =>
        startOfDay(item.startsAt).getTime() <= startOfDay(to).getTime() &&
        startOfDay(item.endsAt).getTime() >= startOfDay(from).getTime(),
    )
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());

  for (const item of visible) {
    const startOffset = Math.max(0, daysBetween(from, item.startsAt));
    const endOffset = Math.min(totalDays - 1, daysBetween(from, item.endsAt));
    const spanDays = Math.max(1, endOffset - startOffset + 1);

    // Primeira faixa cujo último item já terminou antes deste começar.
    let row = 0;
    while (rowEnds[row] !== undefined && rowEnds[row] >= startOffset) row += 1;
    rowEnds[row] = endOffset;

    segments.push({
      item,
      left: (startOffset / totalDays) * 100,
      width: (spanDays / totalDays) * 100,
      row,
      clippedStart: daysBetween(from, item.startsAt) < 0,
      clippedEnd: daysBetween(from, item.endsAt) > totalDays - 1,
    });
  }

  return segments;
}
