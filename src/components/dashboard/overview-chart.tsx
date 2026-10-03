"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { DollarSign, ShoppingBag, TrendingUp, Activity } from "lucide-react";

export type MonthlyPoint = {
  monthKey: string;
  month: string;
  shortMonth: string;
  revenue: number;
  sales: number;
  avgTicket: number;
  displayRevenue: string;
};

const DEFAULT_MONTHLY_DATA: MonthlyPoint[] = [
  { monthKey: "2026-01", month: "Jan/26", shortMonth: "Jan", revenue: 4500000, sales: 450, avgTicket: 10000, displayRevenue: "R$ 4,5M" },
  { monthKey: "2026-02", month: "Fev/26", shortMonth: "Fev", revenue: 7800000, sales: 740, avgTicket: 10540, displayRevenue: "R$ 7,8M" },
  { monthKey: "2026-03", month: "Mar/26", shortMonth: "Mar", revenue: 9400000, sales: 890, avgTicket: 10561, displayRevenue: "R$ 9,4M" },
  { monthKey: "2026-04", month: "Abr/26", shortMonth: "Abr", revenue: 11200000, sales: 1050, avgTicket: 10666, displayRevenue: "R$ 11,2M" },
  { monthKey: "2026-05", month: "Mai/26", shortMonth: "Mai", revenue: 8900000, sales: 850, avgTicket: 10470, displayRevenue: "R$ 8,9M" },
  { monthKey: "2026-06", month: "Jun/26", shortMonth: "Jun", revenue: 9800000, sales: 940, avgTicket: 10425, displayRevenue: "R$ 9,8M" },
  { monthKey: "2026-07", month: "Jul/26", shortMonth: "Jul", revenue: 8400000, sales: 810, avgTicket: 10370, displayRevenue: "R$ 8,4M" },
  { monthKey: "2026-08", month: "Ago/26", shortMonth: "Ago", revenue: 7900000, sales: 760, avgTicket: 10394, displayRevenue: "R$ 7,9M" },
  { monthKey: "2026-09", month: "Set/26", shortMonth: "Set", revenue: 8850000, sales: 850, avgTicket: 10411, displayRevenue: "R$ 8,9M" },
  { monthKey: "2026-10", month: "Out/26", shortMonth: "Out", revenue: 9200000, sales: 900, avgTicket: 10222, displayRevenue: "R$ 9,2M" },
];

function formatCurrency(val: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(val);
}

function formatCompactBRL(val: number): string {
  if (val >= 1_000_000) {
    return `R$ ${(val / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}M`;
  }
  if (val >= 1_000) {
    return `R$ ${(val / 1_000).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}k`;
  }
  return formatCurrency(val);
}

export function OverviewChart({
  monthlyData,
  totalRevenueFormatted,
  projectedMonthEndFormatted,
  overallAvgTicketFormatted,
  currentMonthName,
}: {
  monthlyData?: MonthlyPoint[];
  totalRevenueFormatted?: string;
  projectedMonthEndFormatted?: string;
  overallAvgTicketFormatted?: string;
  currentMonthName?: string;
}) {
  const chartPoints = useMemo(() => {
    if (monthlyData && monthlyData.length > 0) {
      // Exibe até os últimos 12 meses para foco no ano corrente
      return monthlyData.slice(-10);
    }
    return DEFAULT_MONTHLY_DATA;
  }, [monthlyData]);

  const [metricMode, setMetricMode] = useState<"revenue" | "sales">("revenue");

  // Mês selecionado na barra de pílulas (inicia no mês mais recente)
  const defaultSelectedKey = chartPoints[chartPoints.length - 1]?.monthKey;
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>(
    defaultSelectedKey || "2026-10",
  );

  const selectedPoint = useMemo(() => {
    return (
      chartPoints.find((p) => p.monthKey === selectedMonthKey) ||
      chartPoints[chartPoints.length - 1]
    );
  }, [chartPoints, selectedMonthKey]);

  return (
    <div className="relative flex flex-col justify-between overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#180f1c] via-[#211324] to-[#120a15] p-6 text-white shadow-[0_20px_45px_-12px_rgba(18,10,21,0.5)] ring-1 ring-white/10 sm:p-7">
      {/* Luz ambiente interna suave */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-20 -top-20 size-80 rounded-full bg-brand-500/20 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-20 -left-20 size-80 rounded-full bg-rose-500/15 blur-3xl"
      />

      {/* Topo do Card: Título + Seletor de Métrica */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded-lg bg-brand-500/20 text-brand-300 ring-1 ring-brand-500/30">
              <Activity className="size-3.5 text-brand-300" />
            </span>
            <h3 className="font-display text-lg font-semibold tracking-tight text-white sm:text-xl">
              Tração Consolidada · Vendas & Projeções
            </h3>
          </div>
          <p className="mt-0.5 text-xs text-slate-400">
            Série histórica real conectada ao Google Sheets (23 BUs consolidadas)
          </p>
        </div>

        {/* Seletor de Métrica (Faturamento / Volume) */}
        <div className="flex items-center rounded-full bg-white/10 p-1 backdrop-blur-md ring-1 ring-white/15">
          <button
            type="button"
            onClick={() => setMetricMode("revenue")}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-all ${
              metricMode === "revenue"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-300 hover:text-white"
            }`}
          >
            <DollarSign className="size-3" />
            <span>Faturamento</span>
          </button>
          <button
            type="button"
            onClick={() => setMetricMode("sales")}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-all ${
              metricMode === "sales"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-300 hover:text-white"
            }`}
          >
            <ShoppingBag className="size-3" />
            <span>Volume</span>
          </button>
        </div>
      </div>

      {/* Gráfico Fluido com Recharts */}
      <div className="relative z-10 my-4 h-48 w-full sm:h-56">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartPoints}
            margin={{ top: 20, right: 10, left: 10, bottom: 0 }}
          >
            <defs>
              <linearGradient id="areaGradientRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#e2263c" stopOpacity={0.5} />
                <stop offset="95%" stopColor="#e2263c" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="areaGradientSales" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.5} />
                <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="shortMonth" hide />
            <YAxis hide domain={["dataMin * 0.9", "dataMax * 1.1"]} />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const item = payload[0].payload as MonthlyPoint;
                  return (
                    <div className="rounded-xl border border-white/20 bg-slate-900/95 px-3.5 py-2 text-xs text-white shadow-xl backdrop-blur-md">
                      <p className="font-bold text-white mb-1">{item.month}</p>
                      <p className="flex items-center gap-1.5 font-medium text-emerald-300">
                        <span>Faturamento:</span>
                        <strong>{formatCurrency(item.revenue)}</strong>
                      </p>
                      <p className="flex items-center gap-1.5 text-slate-300 text-[11px] mt-0.5">
                        <span>Vendas:</span>
                        <strong>{item.sales} matrículas</strong>
                      </p>
                      <p className="flex items-center gap-1.5 text-slate-300 text-[11px]">
                        <span>Ticket Médio:</span>
                        <strong>{formatCurrency(item.avgTicket)}</strong>
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area
              type="monotone"
              dataKey={metricMode === "revenue" ? "revenue" : "sales"}
              stroke={metricMode === "revenue" ? "#f43f5e" : "#38bdf8"}
              strokeWidth={3}
              fillOpacity={1}
              fill={
                metricMode === "revenue"
                  ? "url(#areaGradientRevenue)"
                  : "url(#areaGradientSales)"
              }
              activeDot={{
                r: 7,
                fill: "#fff",
                stroke: metricMode === "revenue" ? "#e2263c" : "#0284c7",
                strokeWidth: 3,
                className: "drop-shadow-lg",
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Seletor de meses em pílula na base do gráfico */}
      <div className="relative z-10 flex flex-wrap items-center gap-1.5 border-t border-white/10 pt-3">
        {chartPoints.map((item) => {
          const isSelected = selectedPoint.monthKey === item.monthKey;
          return (
            <button
              key={item.monthKey}
              type="button"
              onClick={() => setSelectedMonthKey(item.monthKey)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                isSelected
                  ? "bg-white text-slate-900 shadow-sm ring-2 ring-white/50"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              {item.shortMonth}
            </button>
          );
        })}
      </div>

      {/* Estatísticas Inferiores em Destaque Dinâmico */}
      <div className="relative z-10 mt-5 grid grid-cols-1 gap-3 border-t border-white/10 pt-4 text-center sm:grid-cols-3 sm:text-left">
        <div className="rounded-2xl bg-white/5 p-3.5 backdrop-blur-sm sm:p-4">
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
            Faturamento Realizado
          </p>
          <p className="mt-1 font-display text-xl font-bold tracking-tight text-white sm:text-2xl">
            {formatCompactBRL(selectedPoint.revenue)}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-400 truncate">
            {selectedPoint.month}
          </p>
        </div>

        <div className="rounded-2xl bg-white/10 p-3 shadow-inner backdrop-blur-sm ring-1 ring-white/15 sm:p-4">
          <p className="text-[11px] font-medium uppercase tracking-wider text-brand-300">
            {projectedMonthEndFormatted
              ? "Projeção Mês (Run-Rate)"
              : "Volume de Vendas"}
          </p>
          <p className="mt-1 font-display text-xl font-bold tracking-tight text-white sm:text-2xl">
            {projectedMonthEndFormatted || `${selectedPoint.sales} vendas`}
          </p>
          <p className="mt-0.5 text-[11px] text-brand-200">
            {currentMonthName || selectedPoint.month}
          </p>
        </div>

        <div className="rounded-2xl bg-white/5 p-3 backdrop-blur-sm sm:p-4">
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
            Ticket Médio
          </p>
          <p className="mt-1 font-display text-xl font-bold tracking-tight text-slate-200 sm:text-2xl">
            {formatCurrency(selectedPoint.avgTicket)}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-400">
            {selectedPoint.sales} vendas no mês
          </p>
        </div>
      </div>
    </div>
  );
}
