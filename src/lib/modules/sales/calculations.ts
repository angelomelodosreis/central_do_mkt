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
import { BU_CATALOG } from "./bu-catalog";


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
    targetBuCode?: string;
    startDate?: string;
    endDate?: string;
    dataSourceType?: "google_sheets_live" | "google_sheets_gviz" | "sample_fallback";
    sheetUrl?: string;
  } = {},
): SalesAnalyticsResult {
  // 1. Filtragem por BU e período se especificado
  let filtered = transactions;
  if (options.targetBuCode && options.targetBuCode !== "ALL") {
    filtered = filtered.filter(
      (t) =>
        t.businessUnitCode.toUpperCase() === options.targetBuCode?.toUpperCase(),
    );
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
  const parts = monthKey.split("-");
  if (parts.length < 2) return monthKey;
  const year = parts[0];
  const monthNum = parseInt(parts[1], 10);
  const name = MONTH_NAMES_PT[monthNum - 1] ?? parts[1];
  return `${name}/${year}`;
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
    targetBuCode?: string;
  } = {},
): ComparativeAnalysisResult {
  let filtered = transactions.filter(
    (t) => t.status === "approved" || t.status === "pending",
  );

  if (options.targetBuCode && options.targetBuCode !== "ALL") {
    filtered = filtered.filter(
      (t) =>
        t.businessUnitCode.toUpperCase() === options.targetBuCode?.toUpperCase(),
    );
  }

  const availableMonths = getAvailableMonths(filtered);

  // Defaults inteligentes: se não passados, usa os 2 meses mais recentes
  const currentKey =
    options.currentMonthKey ||
    (availableMonths.length > 0 ? availableMonths[0].key : "2026-10");

  let previousKey = options.previousMonthKey;
  if (!previousKey || previousKey === currentKey) {
    // Procura o mês imediatamente anterior na lista ou decrementa 1 mês
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

  const currentTxs = filtered.filter((t) => t.date.startsWith(currentKey));
  const previousTxs = filtered.filter((t) => t.date.startsWith(previousKey!));

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

  // 4. Pacing Dia a Dia (1..31)
  const currentDaysMap = new Map<number, { revenue: number; sales: number }>();
  for (const t of currentTxs) {
    const day = parseInt(t.date.slice(8, 10), 10);
    if (!isNaN(day)) {
      const cur = currentDaysMap.get(day) ?? { revenue: 0, sales: 0 };
      cur.revenue += t.amount;
      cur.sales += t.quantity;
      currentDaysMap.set(day, cur);
    }
  }

  const prevDaysMap = new Map<number, { revenue: number; sales: number }>();
  for (const t of previousTxs) {
    const day = parseInt(t.date.slice(8, 10), 10);
    if (!isNaN(day)) {
      const cur = prevDaysMap.get(day) ?? { revenue: 0, sales: 0 };
      cur.revenue += t.amount;
      cur.sales += t.quantity;
      prevDaysMap.set(day, cur);
    }
  }

  const [currY, currM] = currentKey.split("-").map(Number);
  const [prevY, prevM] = previousKey!.split("-").map(Number);
  const daysInCurrentMonth = new Date(currY, currM, 0).getDate();
  const daysInPrevMonth = new Date(prevY, prevM, 0).getDate();
  const maxDays = Math.max(daysInCurrentMonth, daysInPrevMonth, 31);

  const dayByDaySeries: DayByDayPoint[] = [];
  let cumCurRev = 0;
  let cumCurSales = 0;
  let cumPrevRev = 0;
  let cumPrevSales = 0;

  for (let d = 1; d <= maxDays; d++) {
    const curData = currentDaysMap.get(d) ?? { revenue: 0, sales: 0 };
    const prevData = prevDaysMap.get(d) ?? { revenue: 0, sales: 0 };

    cumCurRev += curData.revenue;
    cumCurSales += curData.sales;
    cumPrevRev += prevData.revenue;
    cumPrevSales += prevData.sales;

    dayByDaySeries.push({
      day: d,
      dayLabel: `Dia ${String(d).padStart(2, "0")}`,
      currentRevenue: Math.round(curData.revenue * 100) / 100,
      previousRevenue: Math.round(prevData.revenue * 100) / 100,
      currentCumulativeRevenue: Math.round(cumCurRev * 100) / 100,
      previousCumulativeRevenue: Math.round(cumPrevRev * 100) / 100,
      currentSales: curData.sales,
      previousSales: prevData.sales,
      currentCumulativeSales: cumCurSales,
      previousCumulativeSales: cumPrevSales,
      currentAvgTicket:
        curData.sales > 0 ? Math.round((curData.revenue / curData.sales) * 100) / 100 : 0,
      previousAvgTicket:
        prevData.sales > 0 ? Math.round((prevData.revenue / prevData.sales) * 100) / 100 : 0,
    });
  }

  // MTD (Month to Date) pacing comparativo até o dia decorrido
  const currentDaysWithSales = Array.from(currentDaysMap.keys());
  const currentMonthDaysWithData =
    currentDaysWithSales.length > 0 ? Math.max(...currentDaysWithSales) : 1;

  let prevMtdRevenue = 0;
  let prevMtdSales = 0;
  for (let d = 1; d <= currentMonthDaysWithData; d++) {
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

  const mtdComparison = {
    daysElapsed: currentMonthDaysWithData,
    currentRevenue: Math.round(currentRevenue * 100) / 100,
    currentSales,
    previousPeriodSameDaysRevenue: Math.round(prevMtdRevenue * 100) / 100,
    previousPeriodSameDaysSales: prevMtdSales,
    revenueGrowthPercent: Math.round(mtdRevenueGrowthPercent * 10) / 10,
    salesGrowthPercent: Math.round(mtdSalesGrowthPercent * 10) / 10,
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
    };
    existing.currRev += t.amount;
    existing.currSales += t.quantity;
    buMap.set(t.businessUnitCode, existing);
  }

  for (const t of previousTxs) {
    const existing = buMap.get(t.businessUnitCode) ?? {
      code: t.businessUnitCode,
      label: t.businessUnitLabel,
      currRev: 0,
      currSales: 0,
      prevRev: 0,
      prevSales: 0,
    };
    existing.prevRev += t.amount;
    existing.prevSales += t.quantity;
    buMap.set(t.businessUnitCode, existing);
  }

  let buComparisonList = Array.from(buMap.values());
  if (options.targetBuCode && options.targetBuCode !== "ALL") {
    buComparisonList = buComparisonList.filter(
      (b) => b.code.toUpperCase() === options.targetBuCode?.toUpperCase(),
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
      label: formatMonthYearLabel(currentKey),
      revenue: Math.round(currentRevenue * 100) / 100,
      sales: currentSales,
      avgTicket: Math.round(currentAvgTicket * 100) / 100,
      daysCount: daysInCurrentMonth,
    },
    previousPeriod: {
      key: previousKey!,
      label: formatMonthYearLabel(previousKey!),
      revenue: Math.round(previousRevenue * 100) / 100,
      sales: previousSales,
      avgTicket: Math.round(previousAvgTicket * 100) / 100,
      daysCount: daysInPrevMonth,
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
    },
    dayByDaySeries,
    buComparison,
    dayOfWeekStats,
    priceTiers,
  };
}

