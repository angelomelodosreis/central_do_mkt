import type {
  BuSalesStat,
  DailySalesPoint,
  PaymentMethodStat,
  SaleTransaction,
  SalesAnalyticsResult,
} from "./types";

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
