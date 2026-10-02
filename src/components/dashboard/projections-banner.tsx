"use client";

import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Compass,
  DollarSign,
  Flame,
  Percent,
  TrendingUp,
  Zap,
} from "lucide-react";
import type { SalesProjections } from "@/lib/modules/sales/calculations";

function formatCurrency(val: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(val);
}

export function ProjectionsBanner({
  projections,
  totalHistoricalRevenue,
  totalHistoricalSales,
  approvalRate = 98.1,
}: {
  projections: SalesProjections;
  totalHistoricalRevenue: number;
  totalHistoricalSales?: number;
  approvalRate?: number;
}) {
  const isPositiveMtd = projections.mtdGrowthRevenuePercent >= 0;

  return (
    <div className="rounded-[2rem] border border-slate-200/80 bg-white p-5 shadow-xs sm:p-6">
      {/* Header do Banner de Projeções */}
      <div className="flex flex-col gap-3 pb-5 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100">
        <div className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 ring-1 ring-brand-100">
            <Zap className="size-5" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-base font-bold text-slate-900 sm:text-lg">
                Radar de Projeções & Forecast ({projections.monthLabel})
              </h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Run-Rate Ativo
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Extrapolação estatística diária baseada no comportamento de compra da base MedCof
            </p>
          </div>
        </div>

        <Link
          href="/panorama"
          className="group inline-flex items-center gap-1.5 self-start rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-brand-50 hover:text-brand-700 hover:border-brand-200 sm:self-center"
        >
          <span>Abrir Cockpit MoM & Derivadas</span>
          <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      {/* Grid de 4 Cards de Forecast */}
      <div className="grid gap-4 pt-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* 1. Fechamento Projetado do Mês (Run-Rate) */}
        <div className="flex flex-col justify-between rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/50 to-white p-4 shadow-2xs">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-800">
                Fechamento Projetado
              </span>
              <span className="rounded-md bg-blue-100/70 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">
                Run-Rate
              </span>
            </div>
            <p className="mt-2 font-display text-2xl font-bold tracking-tight text-blue-950">
              {formatCurrency(projections.projectedMonthEndRevenue)}
            </p>
            <p className="mt-0.5 text-xs text-blue-700/80">
              Realizado até agora: <strong>{formatCurrency(projections.currentRevenue)}</strong>
            </p>
          </div>

          {/* Barra de Progresso do Mês */}
          <div className="mt-4 pt-3 border-t border-blue-100/60">
            <div className="flex items-center justify-between text-[11px] font-medium text-blue-900/80 mb-1">
              <span>Dia {projections.daysElapsed} de {projections.totalDaysInMonth}</span>
              <span>{projections.monthProgressPercent}% do mês</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-blue-100">
              <div
                className="h-full rounded-full bg-blue-600 transition-all"
                style={{ width: `${projections.monthProgressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* 2. Velocidade de Vendas (dV/dt) & Pacing */}
        <div className="flex flex-col justify-between rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/40 to-white p-4 shadow-2xs">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-800">
                Velocidade (dV/dt)
              </span>
              <span className="rounded-md bg-emerald-100/70 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
                {projections.velocityDaily} vendas/dia
              </span>
            </div>
            <p className="mt-2 font-display text-2xl font-bold tracking-tight text-emerald-950">
              {formatCurrency(projections.recentDailyRevenue)}
              <span className="text-xs font-normal text-emerald-700"> / dia</span>
            </p>
            <p className="mt-0.5 text-xs text-emerald-800/80">
              Estimativa: <strong>{projections.projectedMonthEndSales} matrículas</strong> no mês
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-emerald-100/60 flex items-center justify-between text-xs text-emerald-900">
            <span className="text-[11px] text-emerald-700">Volume Homólogo MTD:</span>
            <strong className="text-emerald-700 font-bold">
              {projections.mtdGrowthSalesPercent >= 0 ? "+" : ""}
              {projections.mtdGrowthSalesPercent.toFixed(1)}%
            </strong>
          </div>
        </div>

        {/* 3. Ticket Médio & Qualidade de Margem */}
        <div className="flex flex-col justify-between rounded-2xl border border-purple-100 bg-gradient-to-br from-purple-50/40 to-white p-4 shadow-2xs">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-purple-800">
                Ticket Médio
              </span>
              <span className="rounded-md bg-purple-100/70 px-1.5 py-0.5 text-[10px] font-bold text-purple-800">
                Esteira R+
              </span>
            </div>
            <p className="mt-2 font-display text-2xl font-bold tracking-tight text-purple-950">
              {formatCurrency(projections.currentAvgTicket)}
            </p>
            <p className="mt-0.5 text-xs text-purple-800/80">
              Consolidado histórico:{" "}
              <strong>
                {formatCurrency(
                  totalHistoricalSales && totalHistoricalSales > 0
                    ? totalHistoricalRevenue / totalHistoricalSales
                    : projections.currentAvgTicket,
                )}
              </strong>
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-purple-100/60 flex items-center justify-between text-xs text-purple-900">
            <span className="text-[11px] text-purple-700">Taxa de Aprovação:</span>
            <strong className="text-purple-700 font-bold">{approvalRate}%</strong>
          </div>
        </div>

        {/* 4. Receita Total Acumulada do Ciclo */}
        <div className="flex flex-col justify-between rounded-2xl border border-rose-100 bg-gradient-to-br from-rose-50/40 to-white p-4 shadow-2xs">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-rose-800">
                Faturamento Total
              </span>
              <span className="rounded-md bg-rose-100/70 px-1.5 py-0.5 text-[10px] font-bold text-rose-800">
                Acumulado
              </span>
            </div>
            <p className="mt-2 font-display text-2xl font-bold tracking-tight text-slate-900">
              {formatCurrency(totalHistoricalRevenue)}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              Projeção Anual: <strong>{formatCurrency(projections.totalAnnualProjectedRevenue)}</strong>
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-rose-100/60 flex items-center justify-between text-xs text-slate-700">
            <span className="text-[11px] text-slate-500">Pacing MoM Receita:</span>
            <strong className={isPositiveMtd ? "text-emerald-600 font-bold" : "text-amber-600 font-bold"}>
              {isPositiveMtd ? "+" : ""}{projections.mtdGrowthRevenuePercent.toFixed(1)}%
            </strong>
          </div>
        </div>
      </div>
    </div>
  );
}
