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
