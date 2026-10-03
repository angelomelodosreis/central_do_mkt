import type {
  BuComparisonStat,
  BuSalesStat,
  ComparativeAnalysisResult,
  DailySalesPoint,
  DayOfWeekStat,
  DayByDayPoint,
  PaymentMethodStat,
  PriceTierStat,
  SaleTransaction,
  SalesAnalyticsResult,
} from "./types";
import { BU_CATALOG, normalizeBuCode, normalizeBuCodes } from "./bu-catalog";


/**
 * Motor de cálculos analíticos para Marketing & Vendas:
 * - Ticket Médio: Faturamento / Volume de Vendas
 * - Derivadas de Vendas (Velocidade): dV/dt e dR/dt
 * - Aceleração: taxa de variação da velocidade vs período anterior
 * - Pacing e Projeções de Run-Rate
 * - Agrupamentos por BU e Formas de Pagamento
 */
export function calculateSalesAnalytics(
  transactions: SaleTransaction[],
  options: {
    targetBuCode?: string | string[];
    targetBuCodes?: string[];
    startDate?: string;
    endDate?: string;
    dataSourceType?: "google_sheets_live" | "google_sheets_gviz" | "sample_fallback";
    sheetUrl?: string;
  } = {},
): SalesAnalyticsResult {
  // 1. Filtragem por BU e período se especificado com normalização automática
  let filtered = transactions;
  const targetCodes = normalizeBuCodes(
    options.targetBuCodes ?? options.targetBuCode,
  );
  if (targetCodes.length > 0) {
    const targetSet = new Set(targetCodes.map((c) => c.toUpperCase()));
    filtered = filtered.filter((t) => {
      const normalizedTxCode = normalizeBuCode(t.businessUnitCode);
      return (
        (normalizedTxCode && targetSet.has(normalizedTxCode)) ||
        targetSet.has((t.businessUnitCode || "").toUpperCase())
      );
    });
  }

  if (options.startDate) {
    const startTs = new Date(options.startDate).getTime();
    filtered = filtered.filter((t) => t.timestamp >= startTs);
  }

  if (options.endDate) {
    const endTs = new Date(options.endDate).getTime();
    filtered = filtered.filter((t) => t.timestamp <= endTs);
  }

  // Ordena por data crescente para cálculos de séries temporais
  const sorted = [...filtered].sort((a, b) => a.timestamp - b.timestamp);

  // 2. Agregação Geral
  let totalRevenue = 0;
  let totalSales = 0;
  let approvedRevenue = 0;
  let approvedSales = 0;
  let pendingSales = 0;

  for (const t of sorted) {
    totalRevenue += t.amount;
    totalSales += t.quantity;

    if (t.status === "approved") {
      approvedRevenue += t.amount;
      approvedSales += t.quantity;
    } else if (t.status === "pending") {
      pendingSales += t.quantity;
    }
  }

  const overallAverageTicket =
    approvedSales > 0
      ? approvedRevenue / approvedSales
      : totalSales > 0
        ? totalRevenue / totalSales
        : 0;

  const approvalRate =
    totalSales > 0 ? (approvedSales / totalSales) * 100 : 100;

  // 3. Agregação Diária para Séries Temporais e Derivadas
  const dailyMap = new Map<string, { revenue: number; sales: number }>();

  for (const t of sorted) {
    if (t.status !== "approved" && t.status !== "pending") continue;
    const dateKey = t.date.slice(0, 10); // "YYYY-MM-DD"
    const current = dailyMap.get(dateKey) ?? { revenue: 0, sales: 0 };
    current.revenue += t.amount;
    current.sales += t.quantity;
    dailyMap.set(dateKey, current);
  }

  const sortedDates = Array.from(dailyMap.keys()).sort();
  const dailySeries: DailySalesPoint[] = [];

  let cumulativeRevenue = 0;
  let cumulativeSales = 0;
  let previousVelocitySales = 0;

  for (let i = 0; i < sortedDates.length; i++) {
    const dateKey = sortedDates[i];
    const data = dailyMap.get(dateKey)!;

    cumulativeRevenue += data.revenue;
    cumulativeSales += data.sales;

    // Derivada primeira diária: dV/dt e dR/dt
    const velocitySales = data.sales;
    const velocityRevenue = data.revenue;

    // Aceleração (segunda derivada): variação da velocidade diária
    const acceleration =
      i > 0 && previousVelocitySales > 0
        ? ((velocitySales - previousVelocitySales) / previousVelocitySales) * 100
        : 0;

    previousVelocitySales = velocitySales;

    const [ano, mes, dia] = dateKey.split("-");
    const label = `${dia}/${mes}`;

    dailySeries.push({
      date: dateKey,
      label,
      revenue: Math.round(data.revenue * 100) / 100,
      salesCount: data.sales,
      cumulativeRevenue: Math.round(cumulativeRevenue * 100) / 100,
      cumulativeSales,
      averageTicket:
        data.sales > 0
          ? Math.round((data.revenue / data.sales) * 100) / 100
          : 0,
      velocitySales,
      velocityRevenue: Math.round(velocityRevenue * 100) / 100,
      acceleration: Math.round(acceleration * 10) / 10,
    });
  }

  // 4. Velocidade Atual e Aceleração do Período Mais Recente
  const lastPoints = dailySeries.slice(-3);
  const currentDailyVelocity =
    lastPoints.length > 0 ? lastPoints[lastPoints.length - 1].velocitySales : 0;
  const currentHourlyVelocity =
    currentDailyVelocity > 0
      ? Math.round((currentDailyVelocity / 24) * 10) / 10
      : 0;

  let accelerationPercentage = 0;
  if (dailySeries.length >= 2) {
    const last = dailySeries[dailySeries.length - 1].velocitySales;
    const prev = dailySeries[dailySeries.length - 2].velocitySales;
    if (prev > 0) {
      accelerationPercentage = Math.round(((last - prev) / prev) * 100);
    }
  }

  // Projeção simples de run-rate (próximos 30 dias com base na velocidade média recente)
  const recentDays = Math.min(dailySeries.length, 7);
  const recentSum = dailySeries
    .slice(-recentDays)
    .reduce((sum, p) => sum + p.revenue, 0);
  const avgDailyRevenue = recentDays > 0 ? recentSum / recentDays : 0;
  const projectedEndPeriodRevenue = Math.round(
    totalRevenue + avgDailyRevenue * 15,
  );

  // 5. Agrupamento por Business Unit (BUs)
  const buMap = new Map<
    string,
    { label: string; revenue: number; sales: number }
  >();

  for (const t of sorted) {
    if (t.status === "cancelled" || t.status === "refunded") continue;
    const code = t.businessUnitCode || "MEDCOF_OUTROS";
    const label = t.businessUnitLabel || "Outros";

    const current = buMap.get(code) ?? { label, revenue: 0, sales: 0 };
    current.revenue += t.amount;
    current.sales += t.quantity;
    buMap.set(code, current);
  }

  const buBreakdown: BuSalesStat[] = Array.from(buMap.entries())
    .map(([buCode, val]) => ({
      buCode,
      buLabel: val.label,
      revenue: Math.round(val.revenue * 100) / 100,
      salesCount: val.sales,
      averageTicket:
        val.sales > 0 ? Math.round((val.revenue / val.sales) * 100) / 100 : 0,
      sharePercentage:
        totalRevenue > 0
          ? Math.round((val.revenue / totalRevenue) * 1000) / 10
          : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  // 6. Agrupamento por Formas de Pagamento (Mix de Pagamentos)
  const methodMap = new Map<
    string,
    { label: string; count: number; revenue: number }
  >([
    ["pix", { label: "PIX", count: 0, revenue: 0 }],
    ["credit_card", { label: "Cartão de Crédito", count: 0, revenue: 0 }],
    ["boleto", { label: "Boleto Bancário", count: 0, revenue: 0 }],
    ["other", { label: "Outros", count: 0, revenue: 0 }],
  ]);

  for (const t of sorted) {
    if (t.status !== "approved") continue;
    const m = t.paymentMethod || "other";
    const item = methodMap.get(m) ?? {
      label: m,
      count: 0,
      revenue: 0,
    };
    item.count += t.quantity;
    item.revenue += t.amount;
    methodMap.set(m, item);
  }

  const paymentMix: PaymentMethodStat[] = Array.from(methodMap.entries())
    .map(([method, data]) => ({
      method: method as PaymentMethodStat["method"],
      label: data.label,
      count: data.count,
      revenue: Math.round(data.revenue * 100) / 100,
      percentage:
        approvedSales > 0
          ? Math.round((data.count / approvedSales) * 1000) / 10
          : 0,
      averageTicket:
        data.count > 0 ? Math.round((data.revenue / data.count) * 100) / 100 : 0,
    }))
    .filter((item) => item.count > 0)
    .sort((a, b) => b.revenue - a.revenue);

  // 7. Transações Recentes (últimas 25 para feed vivo)
  const recentTransactions = [...sorted]
    .reverse()
    .slice(0, 25);

  return {
    summary: {
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalSales,
      overallAverageTicket: Math.round(overallAverageTicket * 100) / 100,
      approvedSales,
      approvedRevenue: Math.round(approvedRevenue * 100) / 100,
      pendingSales,
      approvalRate: Math.round(approvalRate * 10) / 10,
      currentDailyVelocity,
      currentHourlyVelocity,
      accelerationPercentage,
      projectedEndPeriodRevenue,
    },
    dailySeries,
    buBreakdown,
    paymentMix,
    recentTransactions,
    dataSource: {
      isLive: options.dataSourceType !== "sample_fallback",
      sourceType: options.dataSourceType ?? "sample_fallback",
      lastUpdated: new Date().toISOString(),
      sheetUrl:
        options.sheetUrl ??
        "https://docs.google.com/spreadsheets/d/1pCErQiwZ6CnMDqBm34lyFjzDhnomTlSHltgnF1IJRdw/edit?gid=1830309116#gid=1830309116",
      totalRows: filtered.length,
    },
  };
}

const MONTH_NAMES_PT = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const DAY_NAMES_PT = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

export function formatMonthYearLabel(monthKey: string): string {
  if (!monthKey) return "";
  if (monthKey.includes(" a ") || monthKey.includes("/")) return monthKey;
  if (monthKey.includes("_")) {
    const [s, e] = monthKey.split("_");
    const fmt = (iso: string) => {
      const p = iso.split("-");
      return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : iso;
    };
    return s === e ? fmt(s) : `${fmt(s)} a ${fmt(e)}`;
  }
  const parts = monthKey.split("-");
  if (parts.length === 2) {
    const year = parts[0];
    const monthNum = parseInt(parts[1], 10);
    const name = MONTH_NAMES_PT[monthNum - 1] ?? parts[1];
    return `${name}/${year}`;
  }
  if (parts.length === 3) {
    const [y, m, d] = parts;
    return `${d}/${m}/${y}`;
  }
  return monthKey;
}


export function getAvailableMonths(transactions: SaleTransaction[]): Array<{
  key: string; // "2026-10"
  label: string; // "Outubro/2026"
  count: number;
}> {
  const counts = new Map<string, number>();
  for (const t of transactions) {
    const key = t.date.slice(0, 7); // "YYYY-MM"
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[0].localeCompare(a[0])) // decrescente
    .map(([key, count]) => ({
      key,
      label: formatMonthYearLabel(key),
      count,
    }));
}

export interface MonthlyAggregatePoint {
  monthKey: string;
  month: string;
  shortMonth: string;
  revenue: number;
  sales: number;
  avgTicket: number;
  displayRevenue: string;
}

export interface SalesProjections {
  monthKey: string;
  monthLabel: string;
  daysElapsed: number;
  daysRemaining: number;
  totalDaysInMonth: number;
  monthProgressPercent: number;
  currentRevenue: number;
  currentSales: number;
  currentAvgTicket: number;
  recentDailyRevenue: number;
  recentDailySales: number;
  projectedMonthEndRevenue: number;
  projectedMonthEndSales: number;
  projectedRunRateMultiplier: number;
  mtdGrowthRevenuePercent: number;
  mtdGrowthSalesPercent: number;
  previousPeriodSameDaysRevenue: number;
  previousPeriodSameDaysSales: number;
  totalAnnualProjectedRevenue: number;
  velocityDaily: number;
  accelerationPercent: number;
}

export function getMonthlyAggregations(
  transactions: SaleTransaction[],
): MonthlyAggregatePoint[] {
  const monthsMap = new Map<string, { revenue: number; sales: number }>();
  for (const t of transactions) {
    if (t.status !== "approved" && t.status !== "pending") continue;
    const mKey = t.date.slice(0, 7); // "YYYY-MM"
    const cur = monthsMap.get(mKey) ?? { revenue: 0, sales: 0 };
    cur.revenue += t.amount;
    cur.sales += t.quantity;
    monthsMap.set(mKey, cur);
  }

  const sortedKeys = Array.from(monthsMap.keys()).sort();
  const shortNames = [
    "Jan",
    "Fev",
    "Mar",
    "Abr",
    "Mai",
    "Jun",
    "Jul",
    "Ago",
    "Set",
    "Out",
    "Nov",
    "Dez",
  ];

  return sortedKeys.map((key) => {
    const [y, m] = key.split("-").map(Number);
    const shortMonth = shortNames[m - 1] ?? key;
    const item = monthsMap.get(key)!;
    return {
      monthKey: key,
      month: `${shortMonth}/${String(y).slice(2)}`,
      shortMonth,
      revenue: Math.round(item.revenue * 100) / 100,
      sales: item.sales,
      avgTicket:
        item.sales > 0
          ? Math.round((item.revenue / item.sales) * 100) / 100
          : 0,
      displayRevenue: new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
        maximumFractionDigits: 0,
      }).format(item.revenue),
    };
  });
}

export function calculateProjections(
  transactions: SaleTransaction[],
  targetMonthKey?: string,
): SalesProjections {
  const availableMonths = getAvailableMonths(transactions);
  const currentKey =
    targetMonthKey ||
    (availableMonths.length > 0 ? availableMonths[0].key : "2026-10");

  const [currY, currM] = currentKey.split("-").map(Number);
  const totalDaysInMonth = new Date(currY, currM, 0).getDate();

  // Transações do mês atual
  const currentTxs = transactions.filter(
    (t) =>
      (t.status === "approved" || t.status === "pending") &&
      t.date.startsWith(currentKey),
  );

  let currentRevenue = 0;
  let currentSales = 0;
  const daySet = new Set<number>();

  for (const t of currentTxs) {
    currentRevenue += t.amount;
    currentSales += t.quantity;
    const day = parseInt(t.date.slice(8, 10), 10);
    if (!isNaN(day)) daySet.add(day);
  }

  const daysElapsed =
    daySet.size > 0
      ? Math.min(Math.max(...Array.from(daySet)), totalDaysInMonth)
      : 1;
  const daysRemaining = Math.max(0, totalDaysInMonth - daysElapsed);
  const monthProgressPercent = Math.min(
    100,
    Math.round((daysElapsed / totalDaysInMonth) * 1000) / 10,
  );
  const currentAvgTicket =
    currentSales > 0 ? currentRevenue / currentSales : 0;

  // Encontra mês anterior para cálculo homólogo MTD
  let prevMonthKey: string;
  const idx = availableMonths.findIndex((m) => m.key === currentKey);
  if (idx >= 0 && idx + 1 < availableMonths.length) {
    prevMonthKey = availableMonths[idx + 1].key;
  } else {
    const prevM = currM === 1 ? 12 : currM - 1;
    const prevY = currM === 1 ? currY - 1 : currY;
    prevMonthKey = `${prevY}-${String(prevM).padStart(2, "0")}`;
  }

  const prevTxs = transactions.filter(
    (t) =>
      (t.status === "approved" || t.status === "pending") &&
      t.date.startsWith(prevMonthKey),
  );

  let previousPeriodSameDaysRevenue = 0;
  let previousPeriodSameDaysSales = 0;

  for (const t of prevTxs) {
    const day = parseInt(t.date.slice(8, 10), 10);
    if (!isNaN(day) && day <= daysElapsed) {
      previousPeriodSameDaysRevenue += t.amount;
      previousPeriodSameDaysSales += t.quantity;
    }
  }

  const mtdGrowthRevenuePercent =
    previousPeriodSameDaysRevenue > 0
      ? ((currentRevenue - previousPeriodSameDaysRevenue) /
          previousPeriodSameDaysRevenue) *
        100
      : 0;

  const mtdGrowthSalesPercent =
    previousPeriodSameDaysSales > 0
      ? ((currentSales - previousPeriodSameDaysSales) /
          previousPeriodSameDaysSales) *
        100
      : 0;

  // Velocidade recente: média diária do mês atual
  const recentDailyRevenue =
    daysElapsed > 0 ? currentRevenue / daysElapsed : 0;
  const recentDailySales =
    daysElapsed > 0 ? currentSales / daysElapsed : 0;

  // Projeção Run-Rate: Fechamento do mês
  const projectedMonthEndRevenue = Math.round(
    currentRevenue + recentDailyRevenue * daysRemaining,
  );
  const projectedMonthEndSales = Math.round(
    currentSales + recentDailySales * daysRemaining,
  );
  const projectedRunRateMultiplier =
    daysElapsed > 0 ? totalDaysInMonth / daysElapsed : 1;

  // Faturamento total histórico e projeção anual
  const totalHistoricalRevenue = transactions.reduce(
    (acc, t) => acc + (t.status === "approved" ? t.amount : 0),
    0,
  );
  const totalAnnualProjectedRevenue = Math.round(
    totalHistoricalRevenue + recentDailyRevenue * daysRemaining,
  );

  return {
    monthKey: currentKey,
    monthLabel: formatMonthYearLabel(currentKey),
    daysElapsed,
    daysRemaining,
    totalDaysInMonth,
    monthProgressPercent,
    currentRevenue: Math.round(currentRevenue * 100) / 100,
    currentSales,
    currentAvgTicket: Math.round(currentAvgTicket * 100) / 100,
    recentDailyRevenue: Math.round(recentDailyRevenue * 100) / 100,
    recentDailySales: Math.round(recentDailySales * 10) / 10,
    projectedMonthEndRevenue,
    projectedMonthEndSales,
    projectedRunRateMultiplier:
      Math.round(projectedRunRateMultiplier * 10) / 10,
    mtdGrowthRevenuePercent:
      Math.round(mtdGrowthRevenuePercent * 10) / 10,
    mtdGrowthSalesPercent: Math.round(mtdGrowthSalesPercent * 10) / 10,
    previousPeriodSameDaysRevenue:
      Math.round(previousPeriodSameDaysRevenue * 100) / 100,
    previousPeriodSameDaysSales,
    totalAnnualProjectedRevenue,
    velocityDaily: Math.round(recentDailySales * 10) / 10,
    accelerationPercent: mtdGrowthRevenuePercent,
  };
}

/**
 * Análise comparativa completa de períodos (MoM, YoY ou Meses Customizados):
 * - Curva de Pacing Dia a Dia (dia 1 ao dia 31)
 * - Deltas de Faturamento, Vendas e Ticket Médio
 * - Decomposição de Crescimento: Efeito Volume vs Efeito Preço
 * - Matriz de Crescimento de Business Units
 * - Sazonalidade por Dia da Semana
 * - Faixas de Preço / Ticket
 */
export function calculateComparativeAnalysis(
  transactions: SaleTransaction[],
  options: {
    currentMonthKey?: string;
    previousMonthKey?: string;
    targetBuCode?: string | string[];
    targetBuCodes?: string[];
    startDate?: string;
    endDate?: string;
    compareStartDate?: string;
    compareEndDate?: string;
  } = {},
): ComparativeAnalysisResult {
  let filtered = transactions.filter(
    (t) => t.status === "approved" || t.status === "pending",
  );

  const targetCodes = normalizeBuCodes(
    options.targetBuCodes ?? options.targetBuCode,
  );
  if (targetCodes.length > 0) {
    const targetSet = new Set(targetCodes.map((c) => c.toUpperCase()));
    filtered = filtered.filter((t) => {
      const normalizedTxCode = normalizeBuCode(t.businessUnitCode);
      return (
        (normalizedTxCode && targetSet.has(normalizedTxCode)) ||
        targetSet.has((t.businessUnitCode || "").toUpperCase())
      );
    });
  }

  const availableMonths = getAvailableMonths(filtered);

  const isCustomRange = Boolean(options.startDate && options.endDate);

  let currentKey = options.currentMonthKey || "";
  let previousKey = options.previousMonthKey || "";
  let currentLabel = "";
  let previousLabel = "";
  let currentDaysCount = 30;
  let previousDaysCount = 30;
  let currentTxs: SaleTransaction[] = [];
  let previousTxs: SaleTransaction[] = [];

  const formatDateBR = (str: string) => {
    if (!str) return "";
    const p = str.split("-");
    return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : str;
  };

  if (isCustomRange) {
    const sDate = options.startDate!;
    const eDate = options.endDate!;
    currentTxs = filtered.filter((t) => {
      const d = t.date.slice(0, 10);
      return d >= sDate && d <= eDate;
    });

    currentLabel = sDate === eDate ? formatDateBR(sDate) : `${formatDateBR(sDate)} a ${formatDateBR(eDate)}`;
    currentKey = `${sDate}_${eDate}`;

    const startMs = new Date(`${sDate}T00:00:00`).getTime();
    const endMs = new Date(`${eDate}T00:00:00`).getTime();
    const rangeDays = Math.max(1, Math.round((endMs - startMs) / 86400000) + 1);
    currentDaysCount = rangeDays;

    let cmpStart = options.compareStartDate;
    let cmpEnd = options.compareEndDate;

    if (!cmpStart || !cmpEnd) {
      const [sY, sM, sD] = sDate.split("-").map(Number);
      const [eY, eM, eD] = eDate.split("-").map(Number);

      if (sY === eY && sM === eM) {
        const prevM = sM === 1 ? 12 : sM - 1;
        const prevY = sM === 1 ? sY - 1 : sY;
        const prevMaxDays = new Date(prevY, prevM, 0).getDate();
        const prevSd = Math.min(sD, prevMaxDays);
        const prevEd = Math.min(eD, prevMaxDays);
        cmpStart = `${prevY}-${String(prevM).padStart(2, "0")}-${String(prevSd).padStart(2, "0")}`;
        cmpEnd = `${prevY}-${String(prevM).padStart(2, "0")}-${String(prevEd).padStart(2, "0")}`;
      } else {
        const prevEndMs = startMs - 86400000;
        const prevStartMs = prevEndMs - (rangeDays - 1) * 86400000;
        cmpStart = new Date(prevStartMs).toISOString().slice(0, 10);
        cmpEnd = new Date(prevEndMs).toISOString().slice(0, 10);
      }
    }

    previousTxs = filtered.filter((t) => {
      const d = t.date.slice(0, 10);
      return d >= cmpStart! && d <= cmpEnd!;
    });

    previousLabel = cmpStart === cmpEnd ? formatDateBR(cmpStart) : `${formatDateBR(cmpStart)} a ${formatDateBR(cmpEnd)}`;
    previousKey = `${cmpStart}_${cmpEnd}`;
    previousDaysCount = rangeDays;
  } else {
    if (!currentKey) {
      currentKey = availableMonths.length > 0 ? availableMonths[0].key : "2026-10";
    }

    if (!previousKey || previousKey === currentKey) {
      const currentIndex = availableMonths.findIndex((m) => m.key === currentKey);
      if (currentIndex >= 0 && currentIndex + 1 < availableMonths.length) {
        previousKey = availableMonths[currentIndex + 1].key;
      } else if (availableMonths.length > 1) {
        const alt = availableMonths.find((m) => m.key !== currentKey);
        previousKey = alt ? alt.key : currentKey;
      } else {
        const [y, m] = currentKey.split("-").map(Number);
        const prevM = m === 1 ? 12 : m - 1;
        const prevY = m === 1 ? y - 1 : y;
        previousKey = `${prevY}-${String(prevM).padStart(2, "0")}`;
      }
    }

    currentTxs = filtered.filter((t) => t.date.startsWith(currentKey));
    previousTxs = filtered.filter((t) => t.date.startsWith(previousKey!));

    currentLabel = formatMonthYearLabel(currentKey);
    previousLabel = formatMonthYearLabel(previousKey);

    const [currY, currM] = currentKey.split("-").map(Number);
    const [prevY, prevM] = previousKey!.split("-").map(Number);
    currentDaysCount = new Date(currY, currM, 0).getDate();
    previousDaysCount = new Date(prevY, prevM, 0).getDate();
  }

  // 1. Totais do Período Atual
  let currentRevenue = 0;
  let currentSales = 0;
  for (const t of currentTxs) {
    currentRevenue += t.amount;
    currentSales += t.quantity;
  }
  const currentAvgTicket =
    currentSales > 0 ? currentRevenue / currentSales : 0;

  // 2. Totais do Período Anterior
  let previousRevenue = 0;
  let previousSales = 0;
  for (const t of previousTxs) {
    previousRevenue += t.amount;
    previousSales += t.quantity;
  }
  const previousAvgTicket =
    previousSales > 0 ? previousRevenue / previousSales : 0;

  // 3. Deltas & Decomposição
  const revenueDelta = currentRevenue - previousRevenue;
  const revenueGrowthPercent =
    previousRevenue > 0 ? (revenueDelta / previousRevenue) * 100 : 0;

  const salesDelta = currentSales - previousSales;
  const salesGrowthPercent =
    previousSales > 0 ? (salesDelta / previousSales) * 100 : 0;

  const ticketDelta = currentAvgTicket - previousAvgTicket;
  const ticketGrowthPercent =
    previousAvgTicket > 0 ? (ticketDelta / previousAvgTicket) * 100 : 0;

  // Decomposição: Variação de Volume vs Variação de Preço
  // Delta R = (Q_atual - Q_prev) * Ticket_prev + (Ticket_atual - Ticket_prev) * Q_atual
  const volumeEffectRevenue =
    (currentSales - previousSales) * previousAvgTicket;
  const priceEffectRevenue =
    (currentAvgTicket - previousAvgTicket) * currentSales;

  // 4. Pacing Dia a Dia & Identificação de Período em Aberto
  const dayByDaySeries: DayByDayPoint[] = [];
  const currentDaysMap = new Map<number, { revenue: number; sales: number }>();
  const prevDaysMap = new Map<number, { revenue: number; sales: number }>();

  if (isCustomRange) {
    const sDateMs = new Date(`${options.startDate}T00:00:00`).getTime();
    for (const t of currentTxs) {
      const tMs = new Date(t.date.slice(0, 10) + "T00:00:00").getTime();
      const dayIdx = Math.max(1, Math.round((tMs - sDateMs) / 86400000) + 1);
      const cur = currentDaysMap.get(dayIdx) ?? { revenue: 0, sales: 0 };
      cur.revenue += t.amount;
      cur.sales += t.quantity;
      currentDaysMap.set(dayIdx, cur);
    }

    const cmpStartStr = options.compareStartDate || options.startDate!;
    const cmpStartMs = new Date(`${cmpStartStr}T00:00:00`).getTime();
    for (const t of previousTxs) {
      const tMs = new Date(t.date.slice(0, 10) + "T00:00:00").getTime();
      const dayIdx = Math.max(1, Math.round((tMs - cmpStartMs) / 86400000) + 1);
      const cur = prevDaysMap.get(dayIdx) ?? { revenue: 0, sales: 0 };
      cur.revenue += t.amount;
      cur.sales += t.quantity;
      prevDaysMap.set(dayIdx, cur);
    }
  } else {
    for (const t of currentTxs) {
      const day = parseInt(t.date.slice(8, 10), 10);
      if (!isNaN(day)) {
        const cur = currentDaysMap.get(day) ?? { revenue: 0, sales: 0 };
        cur.revenue += t.amount;
        cur.sales += t.quantity;
        currentDaysMap.set(day, cur);
      }
    }

    for (const t of previousTxs) {
      const day = parseInt(t.date.slice(8, 10), 10);
      if (!isNaN(day)) {
        const cur = prevDaysMap.get(day) ?? { revenue: 0, sales: 0 };
        cur.revenue += t.amount;
        cur.sales += t.quantity;
        prevDaysMap.set(day, cur);
      }
    }
  }

  // Determina se o período atual está em aberto (mês em curso) e quantos dias decorreram
  let daysElapsed = currentDaysCount;
  let isCurrentPeriodInProgress = false;

  if (isCustomRange) {
    const sDateMs = new Date(`${options.startDate}T00:00:00`).getTime();
    const eDateMs = new Date(`${options.endDate}T00:00:00`).getTime();
    const maxTxDateStr = filtered.length > 0
      ? filtered.reduce((max, t) => (t.date > max ? t.date : max), "").slice(0, 10)
      : new Date().toISOString().slice(0, 10);
    const maxTxMs = new Date(`${maxTxDateStr}T00:00:00`).getTime();

    if (eDateMs > maxTxMs) {
      const elapsed = Math.max(1, Math.min(currentDaysCount, Math.round((maxTxMs - sDateMs) / 86400000) + 1));
      daysElapsed = elapsed;
      isCurrentPeriodInProgress = daysElapsed < currentDaysCount;
    }
  } else {
    const currentDaysWithSales = Array.from(currentDaysMap.keys());
    const maxDayWithSales = currentDaysWithSales.length > 0 ? Math.max(...currentDaysWithSales) : 0;
    const isLatestMonth = availableMonths.length > 0 && availableMonths[0].key === currentKey;
    const todayStr = new Date().toISOString().slice(0, 10);
    const isCurrentCalendarMonth = todayStr.startsWith(currentKey);

    if ((isLatestMonth || isCurrentCalendarMonth) && maxDayWithSales < currentDaysCount) {
      isCurrentPeriodInProgress = true;
      daysElapsed = Math.max(1, maxDayWithSales);
    } else {
      daysElapsed = currentDaysCount;
      isCurrentPeriodInProgress = false;
    }
  }

  // Construção da série diária (com dias futuros como null para evitar zero falso)
  const maxDays = isCustomRange
    ? Math.max(currentDaysCount, previousDaysCount, 1)
    : Math.max(currentDaysCount, previousDaysCount, 31);

  let cumCurRev = 0;
  let cumCurSales = 0;
  let cumPrevRev = 0;
  let cumPrevSales = 0;

  const dailyRunRateRev = daysElapsed > 0 && isCurrentPeriodInProgress ? currentRevenue / daysElapsed : 0;
  const dailyRunRateSales = daysElapsed > 0 && isCurrentPeriodInProgress ? currentSales / daysElapsed : 0;

  for (let d = 1; d <= maxDays; d++) {
    const curData = currentDaysMap.get(d) ?? { revenue: 0, sales: 0 };
    const prevData = prevDaysMap.get(d) ?? { revenue: 0, sales: 0 };

    const isFutureDay = isCurrentPeriodInProgress && d > daysElapsed;

    if (!isFutureDay) {
      cumCurRev += curData.revenue;
      cumCurSales += curData.sales;
    }

    cumPrevRev += prevData.revenue;
    cumPrevSales += prevData.sales;

    let dayLabel = `Dia ${String(d).padStart(2, "0")}`;
    if (isCustomRange) {
      const sDateMs = new Date(`${options.startDate}T00:00:00`).getTime();
      const pointDateMs = sDateMs + (d - 1) * 86400000;
      const pointD = new Date(pointDateMs);
      dayLabel = maxDays <= 31 ? `${String(pointD.getDate()).padStart(2, "0")}/${String(pointD.getMonth() + 1).padStart(2, "0")}` : `D${d}`;
    }

    const projectedCumRev = isFutureDay
      ? Math.round((cumCurRev + dailyRunRateRev * (d - daysElapsed)) * 100) / 100
      : Math.round(cumCurRev * 100) / 100;
    const projectedDailyRev = isFutureDay
      ? Math.round(dailyRunRateRev * 100) / 100
      : Math.round(curData.revenue * 100) / 100;

    dayByDaySeries.push({
      day: d,
      dayLabel,
      currentRevenue: isFutureDay ? null : Math.round(curData.revenue * 100) / 100,
      previousRevenue: Math.round(prevData.revenue * 100) / 100,
      currentCumulativeRevenue: isFutureDay ? null : Math.round(cumCurRev * 100) / 100,
      previousCumulativeRevenue: Math.round(cumPrevRev * 100) / 100,
      currentSales: isFutureDay ? null : curData.sales,
      previousSales: prevData.sales,
      currentCumulativeSales: isFutureDay ? null : cumCurSales,
      previousCumulativeSales: cumPrevSales,
      currentAvgTicket:
        isFutureDay
          ? null
          : curData.sales > 0
            ? Math.round((curData.revenue / curData.sales) * 100) / 100
            : 0,
      previousAvgTicket:
        prevData.sales > 0 ? Math.round((prevData.revenue / prevData.sales) * 100) / 100 : 0,
      isCurrentFuture: isFutureDay,
      projectedRevenue: projectedDailyRev,
      projectedCumulativeRevenue: projectedCumRev,
    });
  }

  // MTD (Month to Date) comparativo estritamente homólogo (dia 1 até o dia decorrido)
  let prevMtdRevenue = 0;
  let prevMtdSales = 0;
  for (let d = 1; d <= daysElapsed; d++) {
    const p = prevDaysMap.get(d);
    if (p) {
      prevMtdRevenue += p.revenue;
      prevMtdSales += p.sales;
    }
  }

  const mtdRevenueDelta = currentRevenue - prevMtdRevenue;
  const mtdRevenueGrowthPercent =
    prevMtdRevenue > 0 ? (mtdRevenueDelta / prevMtdRevenue) * 100 : 0;
  const mtdSalesDelta = currentSales - prevMtdSales;
  const mtdSalesGrowthPercent =
    prevMtdSales > 0 ? (mtdSalesDelta / prevMtdSales) * 100 : 0;

  const currentAvgTicketMtd = currentSales > 0 ? currentRevenue / currentSales : 0;
  const prevAvgTicketMtd = prevMtdSales > 0 ? prevMtdRevenue / prevMtdSales : 0;
  const mtdTicketDelta = currentAvgTicketMtd - prevAvgTicketMtd;
  const mtdTicketGrowthPercent =
    prevAvgTicketMtd > 0 ? (mtdTicketDelta / prevAvgTicketMtd) * 100 : 0;

  const mtdComparison = {
    daysElapsed,
    currentRevenue: Math.round(currentRevenue * 100) / 100,
    currentSales,
    currentAvgTicket: Math.round(currentAvgTicketMtd * 100) / 100,
    previousPeriodSameDaysRevenue: Math.round(prevMtdRevenue * 100) / 100,
    previousPeriodSameDaysSales: prevMtdSales,
    previousPeriodSameDaysAvgTicket: Math.round(prevAvgTicketMtd * 100) / 100,
    revenueDelta: Math.round(mtdRevenueDelta * 100) / 100,
    revenueGrowthPercent: Math.round(mtdRevenueGrowthPercent * 10) / 10,
    salesDelta: mtdSalesDelta,
    salesGrowthPercent: Math.round(mtdSalesGrowthPercent * 10) / 10,
    ticketDelta: Math.round(mtdTicketDelta * 100) / 100,
    ticketGrowthPercent: Math.round(mtdTicketGrowthPercent * 10) / 10,
  };

  // Comparativo Projetado Run-Rate (Fechamento do Mês Atual vs Total Anterior)
  const daysRemaining = Math.max(0, currentDaysCount - daysElapsed);
  const projectedRevenue = Math.round(currentRevenue + dailyRunRateRev * daysRemaining);
  const projectedSales = Math.round(currentSales + dailyRunRateSales * daysRemaining);
  const projectedAvgTicket =
    projectedSales > 0 ? Math.round((projectedRevenue / projectedSales) * 100) / 100 : 0;

  const projRevenueDelta = projectedRevenue - previousRevenue;
  const projRevenueGrowthPercent =
    previousRevenue > 0 ? (projRevenueDelta / previousRevenue) * 100 : 0;
  const projSalesDelta = projectedSales - previousSales;
  const projSalesGrowthPercent =
    previousSales > 0 ? (projSalesDelta / previousSales) * 100 : 0;

  const projectedComparison = {
    projectedRevenue,
    projectedSales,
    projectedAvgTicket,
    revenueDelta: Math.round(projRevenueDelta * 100) / 100,
    revenueGrowthPercent: Math.round(projRevenueGrowthPercent * 10) / 10,
    salesDelta: projSalesDelta,
    salesGrowthPercent: Math.round(projSalesGrowthPercent * 10) / 10,
  };

  // 5. Comparativo por Business Unit (23 BUs Oficiais MedCof)
  const buMap = new Map<
    string,
    {
      code: string;
      label: string;
      currRev: number;
      currSales: number;
      prevRev: number;
      prevSales: number;
      prevSameDaysRev: number;
      prevSameDaysSales: number;
    }
  >();

  // Pré-popula com todas as 23 BUs oficiais para integridade executiva
  for (const bu of BU_CATALOG) {
    buMap.set(bu.code, {
      code: bu.code,
      label: bu.label,
      currRev: 0,
      currSales: 0,
      prevRev: 0,
      prevSales: 0,
      prevSameDaysRev: 0,
      prevSameDaysSales: 0,
    });
  }

  for (const t of currentTxs) {
    const existing = buMap.get(t.businessUnitCode) ?? {
      code: t.businessUnitCode,
      label: t.businessUnitLabel,
      currRev: 0,
      currSales: 0,
      prevRev: 0,
      prevSales: 0,
      prevSameDaysRev: 0,
      prevSameDaysSales: 0,
    };
    existing.currRev += t.amount;
    existing.currSales += t.quantity;
    buMap.set(t.businessUnitCode, existing);
  }

  const prevStartMs = isCustomRange
    ? new Date(`${options.compareStartDate || options.startDate}T00:00:00`).getTime()
    : 0;

  for (const t of previousTxs) {
    const existing = buMap.get(t.businessUnitCode) ?? {
      code: t.businessUnitCode,
      label: t.businessUnitLabel,
      currRev: 0,
      currSales: 0,
      prevRev: 0,
      prevSales: 0,
      prevSameDaysRev: 0,
      prevSameDaysSales: 0,
    };
    existing.prevRev += t.amount;
    existing.prevSales += t.quantity;

    // Cálculo homólogo para BU: apenas transações que caem dentro de daysElapsed
    let dayIdx = 1;
    if (isCustomRange) {
      const tMs = new Date(t.date.slice(0, 10) + "T00:00:00").getTime();
      dayIdx = Math.max(1, Math.round((tMs - prevStartMs) / 86400000) + 1);
    } else {
      dayIdx = parseInt(t.date.slice(8, 10), 10);
    }

    if (!isNaN(dayIdx) && dayIdx <= daysElapsed) {
      existing.prevSameDaysRev += t.amount;
      existing.prevSameDaysSales += t.quantity;
    }

    buMap.set(t.businessUnitCode, existing);
  }

  let buComparisonList = Array.from(buMap.values());
  if (targetCodes.length > 0) {
    const targetSet = new Set(targetCodes.map((c) => c.toUpperCase()));
    buComparisonList = buComparisonList.filter((b) =>
      targetSet.has(b.code.toUpperCase()),
    );
  }

  const buComparison: BuComparisonStat[] = buComparisonList
    .map((bu) => {
      const revDelta = bu.currRev - bu.prevRev;
      const revGrowth =
        bu.prevRev > 0 ? (revDelta / bu.prevRev) * 100 : bu.currRev > 0 ? 100 : 0;
      const sDelta = bu.currSales - bu.prevSales;
      const sGrowth =
        bu.prevSales > 0 ? (sDelta / bu.prevSales) * 100 : bu.currSales > 0 ? 100 : 0;

      const homRevDelta = bu.currRev - bu.prevSameDaysRev;
      const homRevGrowth =
        bu.prevSameDaysRev > 0
          ? (homRevDelta / bu.prevSameDaysRev) * 100
          : bu.currRev > 0
            ? 100
            : 0;

      const homSalesDelta = bu.currSales - bu.prevSameDaysSales;
      const homSalesGrowth =
        bu.prevSameDaysSales > 0
          ? (homSalesDelta / bu.prevSameDaysSales) * 100
          : bu.currSales > 0
            ? 100
            : 0;

      return {
        buCode: bu.code,
        buLabel: bu.label,
        currentRevenue: Math.round(bu.currRev * 100) / 100,
        previousRevenue: Math.round(bu.prevRev * 100) / 100,
        revenueDelta: Math.round(revDelta * 100) / 100,
        revenueGrowthPercent: Math.round(revGrowth * 10) / 10,
        currentSales: bu.currSales,
        previousSales: bu.prevSales,
        salesDelta: sDelta,
        salesGrowthPercent: Math.round(sGrowth * 10) / 10,
        currentAvgTicket:
          bu.currSales > 0 ? Math.round((bu.currRev / bu.currSales) * 100) / 100 : 0,
        previousAvgTicket:
          bu.prevSales > 0 ? Math.round((bu.prevRev / bu.prevSales) * 100) / 100 : 0,
        previousSameDaysRevenue: Math.round(bu.prevSameDaysRev * 100) / 100,
        previousSameDaysSales: bu.prevSameDaysSales,
        homologousRevenueDelta: Math.round(homRevDelta * 100) / 100,
        homologousRevenueGrowthPercent: Math.round(homRevGrowth * 10) / 10,
        homologousSalesDelta: homSalesDelta,
        homologousSalesGrowthPercent: Math.round(homSalesGrowth * 10) / 10,
      };
    })
    .sort((a, b) => b.currentRevenue - a.currentRevenue || a.buLabel.localeCompare(b.buLabel));

  // 6. Sazonalidade por Dia da Semana (baseado no período atual ou total se período atual tiver poucos dias)
  const sourceForDayOfWeek =
    currentTxs.length >= 30 ? currentTxs : filtered;

  const dowMap = new Map<number, { revenue: number; sales: number }>();
  for (let i = 0; i <= 6; i++) {
    dowMap.set(i, { revenue: 0, sales: 0 });
  }

  let totalDowRev = 0;
  for (const t of sourceForDayOfWeek) {
    const dow = new Date(t.date).getDay();
    const cur = dowMap.get(dow) ?? { revenue: 0, sales: 0 };
    cur.revenue += t.amount;
    cur.sales += t.quantity;
    dowMap.set(dow, cur);
    totalDowRev += t.amount;
  }

  // Ordenar de Segunda (1) até Domingo (0)
  const dowOrder = [1, 2, 3, 4, 5, 6, 0];
  const dayOfWeekStats: DayOfWeekStat[] = dowOrder.map((dayIdx) => {
    const d = dowMap.get(dayIdx) ?? { revenue: 0, sales: 0 };
    return {
      dayIndex: dayIdx,
      dayName: DAY_NAMES_PT[dayIdx],
      revenue: Math.round(d.revenue * 100) / 100,
      sales: d.sales,
      avgTicket: d.sales > 0 ? Math.round((d.revenue / d.sales) * 100) / 100 : 0,
      percentageOfTotal:
        totalDowRev > 0 ? Math.round((d.revenue / totalDowRev) * 1000) / 10 : 0,
    };
  });

  // 7. Distribuição por Faixas de Preço (Price Tiers)
  const sourceForTiers = currentTxs.length > 0 ? currentTxs : filtered;
  const tiers = [
    { id: "tier_sub_3k", label: "Até R$ 3.000", min: 0, max: 3000 },
    { id: "tier_3k_7k", label: "R$ 3.000 a R$ 7.000", min: 3000, max: 7000 },
    { id: "tier_7k_12k", label: "R$ 7.000 a R$ 12.000", min: 7000, max: 12000 },
    { id: "tier_above_12k", label: "Acima de R$ 12.000", min: 12000, max: Infinity },
  ];

  const tierCounts = new Map<string, { count: number; rev: number }>();
  for (const tier of tiers) {
    tierCounts.set(tier.id, { count: 0, rev: 0 });
  }

  let totalTierSales = 0;
  let totalTierRev = 0;

  for (const t of sourceForTiers) {
    for (const tier of tiers) {
      if (t.amount >= tier.min && t.amount < tier.max) {
        const cur = tierCounts.get(tier.id)!;
        cur.count += t.quantity;
        cur.rev += t.amount;
        totalTierSales += t.quantity;
        totalTierRev += t.amount;
        break;
      }
    }
  }

  const priceTiers: PriceTierStat[] = tiers.map((tier) => {
    const data = tierCounts.get(tier.id)!;
    return {
      tierId: tier.id,
      label: tier.label,
      salesCount: data.count,
      revenue: Math.round(data.rev * 100) / 100,
      percentageOfSales:
        totalTierSales > 0 ? Math.round((data.count / totalTierSales) * 1000) / 10 : 0,
      percentageOfRevenue:
        totalTierRev > 0 ? Math.round((data.rev / totalTierRev) * 1000) / 10 : 0,
    };
  });

  return {
    currentPeriod: {
      key: currentKey,
      label: currentLabel || formatMonthYearLabel(currentKey),
      revenue: Math.round(currentRevenue * 100) / 100,
      sales: currentSales,
      avgTicket: Math.round(currentAvgTicket * 100) / 100,
      daysCount: currentDaysCount,
      daysElapsed,
      isCurrentPeriodInProgress,
    },
    previousPeriod: {
      key: previousKey!,
      label: previousLabel || formatMonthYearLabel(previousKey!),
      revenue: Math.round(previousRevenue * 100) / 100,
      sales: previousSales,
      avgTicket: Math.round(previousAvgTicket * 100) / 100,
      daysCount: previousDaysCount,
      sameDaysRevenue: Math.round(prevMtdRevenue * 100) / 100,
      sameDaysSales: prevMtdSales,
    },

    deltas: {
      revenueDelta: Math.round(revenueDelta * 100) / 100,
      revenueGrowthPercent: Math.round(revenueGrowthPercent * 10) / 10,
      salesDelta,
      salesGrowthPercent: Math.round(salesGrowthPercent * 10) / 10,
      ticketDelta: Math.round(ticketDelta * 100) / 100,
      ticketGrowthPercent: Math.round(ticketGrowthPercent * 10) / 10,
      volumeEffectRevenue: Math.round(volumeEffectRevenue * 100) / 100,
      priceEffectRevenue: Math.round(priceEffectRevenue * 100) / 100,
      mtdComparison,
      projectedComparison,
    },
    dayByDaySeries,
    buComparison,
    dayOfWeekStats,
    priceTiers,
  };
}

