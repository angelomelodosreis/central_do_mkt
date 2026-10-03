import { GOAL_METRIC_CATALOG, type GoalMetric } from "@/lib/db/schema";

/**
 * O que se digita e o que se calcula.
 *
 * Quatro números-base entram à mão; ticket médio, conversão, CPL, CAC e ROAS
 * saem de conta. A separação é a regra do módulo inteiro: dado derivado nunca
 * tem coluna no banco nem campo no formulário, porque um ticket médio digitado
 * pode discordar do faturamento dividido pelas vendas — e aí ninguém sabe qual
 * dos dois está certo.
 *
 * As chaves são as MESMAS do catálogo de indicadores das metas
 * (`GOAL_METRIC_CATALOG`). É isso que permite pôr meta e realizado lado a lado
 * sem tabela de-para: a meta de `revenue` de um semestre e o `revenue` somado
 * das semanas daquele semestre falam da mesma coisa.
 */

export type BaseNumbers = {
  revenue: number | null;
  sales: number | null;
  leads: number | null;
  mediaSpend: number | null;
};

export const CAMPOS_BASE = [
  {
    key: "revenue" as const,
    label: "Faturamento",
    prefix: "R$",
    decimais: true,
    hint: "Bruto do período, na moeda de sempre.",
  },
  {
    key: "sales" as const,
    label: "Vendas",
    prefix: null,
    decimais: false,
    hint: "Matrículas, inscrições, contratos — o que a BU conta como venda.",
  },
  {
    key: "leads" as const,
    label: "Leads",
    prefix: null,
    decimais: false,
    hint: "Novos contatos captados no período.",
  },
  {
    key: "mediaSpend" as const,
    label: "Investimento em mídia",
    prefix: "R$",
    decimais: true,
    hint: "Só mídia paga. Sem equipe, sem produção.",
  },
];

export type CampoBase = (typeof CAMPOS_BASE)[number]["key"];

/** Os oito indicadores do painel, na ordem em que são lidos. */
export const INDICADORES = [
  { metric: "revenue", derivado: false },
  { metric: "sales", derivado: false },
  { metric: "average_ticket", derivado: true },
  { metric: "leads", derivado: false },
  { metric: "sales_conversion", derivado: true },
  { metric: "cpl", derivado: true },
  { metric: "cac", derivado: true },
  { metric: "roas", derivado: true },
] as const satisfies ReadonlyArray<{ metric: GoalMetric; derivado: boolean }>;

/**
 * Investimento em mídia fica FORA da faixa de oito.
 *
 * Ele é um número-base como faturamento, mas não é um indicador de
 * desempenho: gastar mais não é bom nem ruim por si só — o que importa é o
 * CPL e o CAC, que já estão ali. Aparece onde a leitura pede o valor bruto,
 * como no roteiro da reunião.
 */
export const INVESTIMENTO = "media_spend" as const satisfies GoalMetric;

export type Indicador = (typeof INDICADORES)[number]["metric"];

/**
 * Para onde é bom o número ir.
 *
 * Sem isto, a variação percentual seria pintada de verde sempre que subisse — e
 * um CPL que sobe 40% não é uma boa notícia.
 */
export const SENTIDO: Record<Indicador | typeof INVESTIMENTO, Direcao> = {
  // Gastar mais em mídia não é bom nem ruim: o julgamento está no CPL e no
  // CAC. Pintar de vermelho um investimento que subiu diria que economizar é
  // sempre o certo, o que é falso num período de lançamento.
  media_spend: "neutro",
  revenue: "sobe",
  sales: "sobe",
  average_ticket: "sobe",
  leads: "sobe",
  sales_conversion: "sobe",
  cpl: "desce",
  cac: "desce",
  roas: "sobe",
};

export type Direcao = "sobe" | "desce" | "neutro";

export function rotuloDoIndicador(
  metric: Indicador | typeof INVESTIMENTO,
): string {
  return GOAL_METRIC_CATALOG[metric].label;
}

/**
 * O nome curto, para a pastilha de indicador.
 *
 * "Custo de aquisição (CAC)" numa coluna de 12rem vira "CUSTO DE AQUISIÇÃ…",
 * que é pior que a sigla: a sigla todo mundo lê, a reticência ninguém. O nome
 * inteiro continua no `title` de quem passar o mouse.
 */
const CURTO: Record<Indicador | typeof INVESTIMENTO, string> = {
  media_spend: "Investimento",
  revenue: "Faturamento",
  sales: "Vendas",
  average_ticket: "Ticket médio",
  leads: "Leads",
  sales_conversion: "Conversão",
  cpl: "CPL",
  cac: "CAC",
  roas: "ROAS",
};

export function rotuloCurto(metric: Indicador | typeof INVESTIMENTO): string {
  return CURTO[metric];
}

/** Soma os números-base de várias semanas. Nulo + nulo continua nulo. */
export function somar(linhas: BaseNumbers[]): BaseNumbers {
  const acumular = (campo: CampoBase): number | null => {
    const presentes = linhas
      .map((linha) => linha[campo])
      .filter((valor): valor is number => valor !== null);
    return presentes.length === 0
      ? null
      : presentes.reduce((total, valor) => total + valor, 0);
  };

  return {
    revenue: acumular("revenue"),
    sales: acumular("sales"),
    leads: acumular("leads"),
    mediaSpend: acumular("mediaSpend"),
  };
}

/**
 * Divide devolvendo nulo em vez de infinito.
 *
 * Semana sem venda com investimento lançado daria um CAC infinito, que no
 * gráfico vira uma barra que estoura a escala e some com todas as outras.
 */
function dividir(a: number | null, b: number | null): number | null {
  if (a === null || b === null || b === 0) return null;
  return a / b;
}

/** Os oito indicadores a partir dos quatro números-base. */
export function calcular(
  base: BaseNumbers,
): Record<Indicador | typeof INVESTIMENTO, number | null> {
  const conversao = dividir(base.sales, base.leads);

  return {
    revenue: base.revenue,
    sales: base.sales,
    leads: base.leads,
    media_spend: base.mediaSpend,
    average_ticket: dividir(base.revenue, base.sales),
    sales_conversion: conversao === null ? null : conversao * 100,
    cpl: dividir(base.mediaSpend, base.leads),
    cac: dividir(base.mediaSpend, base.sales),
    roas: dividir(base.revenue, base.mediaSpend),
  };
}

/** Quanto o período atual variou sobre o anterior, em pontos percentuais. */
export function variacao(
  atual: number | null,
  anterior: number | null,
): number | null {
  if (atual === null || anterior === null || anterior === 0) return null;
  return ((atual - anterior) / Math.abs(anterior)) * 100;
}

/**
 * O número como ele é lido na tela.
 *
 * Compacta a partir de mil: numa linha de oito indicadores, "R$ 1.284.390,00"
 * empurra os vizinhos para fora da tela, e ninguém lê os centavos de um
 * faturamento trimestral.
 */
export function formatarIndicador(
  metric: Indicador | typeof INVESTIMENTO,
  valor: number | null,
  { compacto = true }: { compacto?: boolean } = {},
): string {
  if (valor === null) return "—";

  const { unit } = GOAL_METRIC_CATALOG[metric];

  if (unit === "percent") {
    return `${valor.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
  }
  if (unit === "ratio") {
    return `${valor.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}×`;
  }
  if (unit === "currency") return formatarMoeda(valor, compacto);
  return valor.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
}

export function formatarMoeda(valor: number, compacto = true): string {
  if (compacto && Math.abs(valor) >= 1_000_000) {
    return `R$ ${(valor / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mi`;
  }
  if (compacto && Math.abs(valor) >= 10_000) {
    return `R$ ${(valor / 1_000).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} mil`;
  }
  // Duas casas SEMPRE abaixo de dez mil: "R$ 1.938,1" parece número truncado,
  // e um ticket médio é lido como preço.
  return `R$ ${valor.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

// ── Semanas ────────────────────────────────────────────────────────────────

const DIA = 86_400_000;

/**
 * A segunda-feira que abre a semana de uma data.
 *
 * Segunda e não domingo porque é o que o time chama de "semana": o fechamento
 * pedido às sextas fala dos cinco dias anteriores. Zerar a hora é o que faz a
 * chave única (BU, semana) funcionar — duas gravações no mesmo dia em horas
 * diferentes viravam duas semanas.
 */
export function inicioDaSemana(data: Date): Date {
  const copia = new Date(data);
  copia.setHours(0, 0, 0, 0);
  const diaDaSemana = copia.getDay(); // 0 = domingo
  const recuo = diaDaSemana === 0 ? 6 : diaDaSemana - 1;
  copia.setDate(copia.getDate() - recuo);
  return copia;
}

export function fimDaSemana(inicio: Date): Date {
  return new Date(inicio.getTime() + 6 * DIA);
}

/** Todas as segundas entre duas datas, da mais antiga para a mais recente. */
export function semanasEntre(de: Date, ate: Date): Date[] {
  const semanas: Date[] = [];
  let cursor = inicioDaSemana(de);
  const limite = inicioDaSemana(ate);
  while (cursor <= limite) {
    semanas.push(new Date(cursor));
    cursor = new Date(cursor.getTime() + 7 * DIA);
  }
  return semanas;
}

/** "1–7 set" · "29 set–5 out" — o rótulo curto de uma semana. */
export function rotuloDaSemana(inicio: Date): string {
  const fim = fimDaSemana(inicio);
  const mes = (data: Date) =>
    data.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");

  return inicio.getMonth() === fim.getMonth()
    ? `${inicio.getDate()}–${fim.getDate()} ${mes(fim)}`
    : `${inicio.getDate()} ${mes(inicio)}–${fim.getDate()} ${mes(fim)}`;
}

/**
 * Retorna a string "YYYY-MM-DD" correspondente à segunda-feira da semana de uma data.
 * Utiliza o fuso horário oficial de negócios (America/Sao_Paulo) de forma determinística,
 * evitando divergências de fuso entre servidor Vercel (UTC) e cliente (UTC-3).
 */
export function getWeekStartIso(data: Date | string | number): string {
  const d = typeof data === "object" ? data : new Date(data);
  const ymd = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
  const [year, month, day] = ymd.split("-").map(Number);
  const utcDate = new Date(Date.UTC(year, month - 1, day));
  const dayOfWeek = utcDate.getUTCDay();
  const recuo = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(utcDate.getTime() - recuo * DIA);
  return monday.toISOString().slice(0, 10);
}

/**
 * Retorna uma data no meio do dia (12:00:00 UTC) para a segunda-feira especificada.
 * O horário de 12:00 UTC garante que em qualquer fuso do mundo (UTC-12 a UTC+12)
 * a data continue caindo no mesmo dia civil exato, prevenindo deslizamentos de dia/mês.
 */
export function getWeekStartDate(isoWeek: string): Date {
  const [year, month, day] = isoWeek.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
}

/**
 * Retorna N semanas consecutivas em formato ISO ("YYYY-MM-DD"), em ordem cronológica,
 * terminando na semana informada (com deslocamento opcional para períodos anteriores).
 */
export function getWeeksRangeIso(
  currentWeekIso: string,
  count: number,
  offsetCount = 0,
): string[] {
  const result: string[] = [];
  const baseDate = getWeekStartDate(currentWeekIso);
  for (let i = count - 1; i >= 0; i--) {
    const shiftWeeks = i + offsetCount;
    const d = new Date(baseDate.getTime() - shiftWeeks * 7 * DIA);
    result.push(getWeekStartIso(d));
  }
  return result;
}

