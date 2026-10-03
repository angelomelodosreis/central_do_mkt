export type SaleTransaction = {
  id: string;
  date: string; // ISO string
  timestamp: number;
  product: string;
  businessUnitCode: string;
  businessUnitLabel: string;
  amount: number;
  quantity: number;
  paymentMethod: "pix" | "credit_card" | "boleto" | "other";
  status: "approved" | "pending" | "refunded" | "cancelled";
  buyerName?: string;
  buyerEmail?: string;
  utmSource?: string;
  utmCampaign?: string;
};

export type DailySalesPoint = {
  date: string; // "YYYY-MM-DD"
  label: string; // "02/Out"
  revenue: number;
  salesCount: number;
  cumulativeRevenue: number;
  cumulativeSales: number;
  averageTicket: number;
  /** Derivada primeira de vendas: variação diária (dV/dt) */
  velocitySales: number;
  /** Derivada primeira de receita: variação diária de receita (dR/dt) */
  velocityRevenue: number;
  /** Aceleração (segunda derivada): variação da velocidade vs dia anterior */
  acceleration: number;
};

export type BuSalesStat = {
  buCode: string;
  buLabel: string;
  revenue: number;
  salesCount: number;
  averageTicket: number;
  sharePercentage: number;
};

export type PaymentMethodStat = {
  method: "pix" | "credit_card" | "boleto" | "other";
  label: string;
  count: number;
  revenue: number;
  percentage: number;
  averageTicket: number;
};

export type SalesAnalyticsResult = {
  summary: {
    totalRevenue: number;
    totalSales: number;
    overallAverageTicket: number;
    approvedSales: number;
    approvedRevenue: number;
    pendingSales: number;
    approvalRate: number; // 0 - 100 %
    currentDailyVelocity: number; // dV/dt atual (vendas/dia)
    currentHourlyVelocity: number; // vendas/hora nas últimas 24h
    accelerationPercentage: number; // aceleração percentual
    projectedEndPeriodRevenue: number; // run-rate projetado
  };
  dailySeries: DailySalesPoint[];
  buBreakdown: BuSalesStat[];
  paymentMix: PaymentMethodStat[];
  recentTransactions: SaleTransaction[];
  dataSource: {
    isLive: boolean;
    sourceType: "google_sheets_live" | "google_sheets_gviz" | "sample_fallback";
    lastUpdated: string;
    sheetUrl: string;
    totalRows: number;
  };
};

export type DayByDayPoint = {
  day: number; // 1 a 31
  dayLabel: string; // "Dia 01", "Dia 02"
  currentRevenue: number | null; // null para dias futuros do período em aberto
  previousRevenue: number | null;
  currentCumulativeRevenue: number | null; // null para dias futuros do período em aberto
  previousCumulativeRevenue: number | null;
  currentSales: number | null;
  previousSales: number | null;
  currentCumulativeSales: number | null;
  previousCumulativeSales: number | null;
  currentAvgTicket: number | null;
  previousAvgTicket: number | null;
  isCurrentFuture?: boolean; // indica se o dia ainda não decorreu no mês atual
  projectedRevenue?: number | null; // projeção run-rate diária
  projectedCumulativeRevenue?: number | null; // projeção acumulada do mês
};

export type BuComparisonStat = {
  buCode: string;
  buLabel: string;
  currentRevenue: number;
  previousRevenue: number;
  revenueDelta: number;
  revenueGrowthPercent: number;
  currentSales: number;
  previousSales: number;
  salesDelta: number;
  salesGrowthPercent: number;
  currentAvgTicket: number;
  previousAvgTicket: number;
  // Comparativo Homólogo MTD (mesmos dias decorridos)
  previousSameDaysRevenue?: number;
  previousSameDaysSales?: number;
  homologousRevenueDelta?: number;
  homologousRevenueGrowthPercent?: number;
  homologousSalesDelta?: number;
  homologousSalesGrowthPercent?: number;
};

export type DayOfWeekStat = {
  dayIndex: number; // 0 = Domingo, 1 = Segunda, etc.
  dayName: string; // "Segunda-feira"
  revenue: number;
  sales: number;
  avgTicket: number;
  percentageOfTotal: number;
};

export type PriceTierStat = {
  tierId: string;
  label: string; // "Até R$ 3k", "R$ 3k a R$ 7k", etc.
  salesCount: number;
  revenue: number;
  percentageOfSales: number;
  percentageOfRevenue: number;
};

export type ComparativeAnalysisResult = {
  currentPeriod: {
    key: string; // "2026-10"
    label: string; // "Outubro/2026"
    revenue: number;
    sales: number;
    avgTicket: number;
    daysCount: number;
    daysElapsed: number;
    isCurrentPeriodInProgress: boolean;
  };
  previousPeriod: {
    key: string; // "2026-09"
    label: string; // "Setembro/2026"
    revenue: number;
    sales: number;
    avgTicket: number;
    daysCount: number;
    sameDaysRevenue?: number;
    sameDaysSales?: number;
  };
  deltas: {
    revenueDelta: number;
    revenueGrowthPercent: number;
    salesDelta: number;
    salesGrowthPercent: number;
    ticketDelta: number;
    ticketGrowthPercent: number;
    /** Decomposição de Receita: quanto veio de Volume e quanto veio de Preço */
    volumeEffectRevenue: number;
    priceEffectRevenue: number;
    /** Comparativo MTD (Month to Date) até o mesmo dia decorrido */
    mtdComparison?: {
      daysElapsed: number;
      currentRevenue: number;
      currentSales: number;
      currentAvgTicket: number;
      previousPeriodSameDaysRevenue: number;
      previousPeriodSameDaysSales: number;
      previousPeriodSameDaysAvgTicket: number;
      revenueDelta: number;
      revenueGrowthPercent: number;
      salesDelta: number;
      salesGrowthPercent: number;
      ticketDelta: number;
      ticketGrowthPercent: number;
    };
    /** Comparativo Projetado Run-Rate (Fechamento do Mês Atual vs Total do Anterior) */
    projectedComparison?: {
      projectedRevenue: number;
      projectedSales: number;
      projectedAvgTicket: number;
      revenueDelta: number;
      revenueGrowthPercent: number;
      salesDelta: number;
      salesGrowthPercent: number;
    };
  };
  dayByDaySeries: DayByDayPoint[];
  buComparison: BuComparisonStat[];
  dayOfWeekStats: DayOfWeekStat[];
  priceTiers: PriceTierStat[];
};


