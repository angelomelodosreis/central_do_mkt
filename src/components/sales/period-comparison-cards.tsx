"use client";

import {
  ArrowDownRight,
  ArrowUpRight,
  DollarSign,
  Layers,
  Scale,
  ShoppingBag,
  TrendingUp,
} from "lucide-react";
import type { ComparativeAnalysisResult } from "@/lib/modules/sales/types";

function formatCurrency(val: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(val);
}

function formatPercent(val: number): string {
  const prefix = val > 0 ? "+" : "";
  return `${prefix}${val.toFixed(1)}%`;
}

export function PeriodComparisonCards({
  comparative,
}: {
  comparative: ComparativeAnalysisResult;
}) {
  const { currentPeriod, previousPeriod, deltas } = comparative;

  const isPositiveRev = deltas.revenueGrowthPercent >= 0;
  const isPositiveSales = deltas.salesGrowthPercent >= 0;
  const isPositiveTicket = deltas.ticketGrowthPercent >= 0;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* 1. Receita Total Comparada */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Receita MoM
            </span>
            <div
              className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ${
                isPositiveRev
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-rose-50 text-rose-700"
              }`}
            >
              {isPositiveRev ? (
                <ArrowUpRight className="size-3.5" />
              ) : (
                <ArrowDownRight className="size-3.5" />
              )}
              <span>{formatPercent(deltas.revenueGrowthPercent)}</span>
            </div>
          </div>

          <div className="mt-2">
            <div className="text-2xl font-bold tracking-tight text-slate-900">
              {formatCurrency(currentPeriod.revenue)}
            </div>
            <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
              <span>{currentPeriod.label}:</span>
              <span className="font-medium text-slate-700">
                {formatCurrency(currentPeriod.revenue)}
              </span>
            </div>
            <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-400">
              <span>{previousPeriod.label}:</span>
              <span>{formatCurrency(previousPeriod.revenue)}</span>
              <span className="text-[11px] font-semibold text-slate-600">
                ({deltas.revenueDelta >= 0 ? "+" : ""}
                {formatCurrency(deltas.revenueDelta)})
              </span>
            </div>
          </div>
        </div>

        {/* 2. Volume de Vendas Comparado */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Volume de Alunos / Vendas
            </span>
            <div
              className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ${
                isPositiveSales
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-rose-50 text-rose-700"
              }`}
            >
              {isPositiveSales ? (
                <ArrowUpRight className="size-3.5" />
              ) : (
                <ArrowDownRight className="size-3.5" />
              )}
              <span>{formatPercent(deltas.salesGrowthPercent)}</span>
            </div>
          </div>

          <div className="mt-2">
            <div className="text-2xl font-bold tracking-tight text-slate-900">
              {currentPeriod.sales.toLocaleString("pt-BR")}{" "}
              <span className="text-sm font-normal text-slate-500">vendas</span>
            </div>
            <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
              <span>{currentPeriod.label}:</span>
              <span className="font-medium text-slate-700">
                {currentPeriod.sales} vendas
              </span>
            </div>
            <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-400">
              <span>{previousPeriod.label}:</span>
              <span>{previousPeriod.sales} vendas</span>
              <span className="text-[11px] font-semibold text-slate-600">
                ({deltas.salesDelta >= 0 ? "+" : ""}
                {deltas.salesDelta})
              </span>
            </div>
          </div>
        </div>

        {/* 3. Ticket Médio Ponderado */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Ticket Médio
            </span>
            <div
              className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ${
                isPositiveTicket
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-rose-50 text-rose-700"
              }`}
            >
              {isPositiveTicket ? (
                <ArrowUpRight className="size-3.5" />
              ) : (
                <ArrowDownRight className="size-3.5" />
              )}
              <span>{formatPercent(deltas.ticketGrowthPercent)}</span>
            </div>
          </div>

          <div className="mt-2">
            <div className="text-2xl font-bold tracking-tight text-slate-900">
              {formatCurrency(currentPeriod.avgTicket)}
            </div>
            <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
              <span>{currentPeriod.label}:</span>
              <span className="font-medium text-slate-700">
                {formatCurrency(currentPeriod.avgTicket)}
              </span>
            </div>
            <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-400">
              <span>{previousPeriod.label}:</span>
              <span>{formatCurrency(previousPeriod.avgTicket)}</span>
              <span className="text-[11px] font-semibold text-slate-600">
                ({deltas.ticketDelta >= 0 ? "+" : ""}
                {formatCurrency(deltas.ticketDelta)})
              </span>
            </div>
          </div>
        </div>

        {/* 4. Ritmo Médio Diário (dV/dt do mês) */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Ritmo Diário Médio
            </span>
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
              Pacing
            </span>
          </div>

          <div className="mt-2">
            <div className="text-2xl font-bold tracking-tight text-slate-900">
              {formatCurrency(
                currentPeriod.daysCount > 0
                  ? currentPeriod.revenue / currentPeriod.daysCount
                  : 0,
              )}
              <span className="text-xs font-normal text-slate-500">/dia</span>
            </div>
            <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
              <span>Volume médio:</span>
              <span className="font-medium text-slate-700">
                {(currentPeriod.daysCount > 0
                  ? currentPeriod.sales / currentPeriod.daysCount
                  : 0
                ).toFixed(1)}{" "}
                vendas/dia
              </span>
            </div>
            <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-400">
              <span>Anterior:</span>
              <span>
                {formatCurrency(
                  previousPeriod.daysCount > 0
                    ? previousPeriod.revenue / previousPeriod.daysCount
                    : 0,
                )}
                /dia
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Decomposição Matemática de Receita: Efeito Volume vs Efeito Preço */}
      <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-slate-50 via-white to-slate-50 p-4 shadow-2xs sm:p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Scale className="size-4 text-brand-600" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Decomposição Matemática de Crescimento (Volume vs Preço/Mix)
            </h4>
          </div>
          <span className="text-[11px] text-slate-500">
            Explica a origem da variação de faturamento de{" "}
            <strong className="text-slate-800">
              {formatCurrency(deltas.revenueDelta)}
            </strong>
          </span>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {/* Efeito Volume */}
          <div className="rounded-xl border border-slate-200/60 bg-white p-3.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-600">
                Efeito Volume (Quantidade)
              </span>
              <span
                className={`font-bold ${
                  deltas.volumeEffectRevenue >= 0
                    ? "text-emerald-600"
                    : "text-rose-600"
                }`}
              >
                {deltas.volumeEffectRevenue >= 0 ? "+" : ""}
                {formatCurrency(deltas.volumeEffectRevenue)}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-slate-500 leading-snug">
              Variação decorrente de ter vendido {Math.abs(deltas.salesDelta)}{" "}
              alunos {deltas.salesDelta >= 0 ? "a mais" : "a menos"} ao ticket
              anterior.
            </p>
          </div>

          {/* Efeito Preço / Mix */}
          <div className="rounded-xl border border-slate-200/60 bg-white p-3.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-600">
                Efeito Preço / Mix de Produtos
              </span>
              <span
                className={`font-bold ${
                  deltas.priceEffectRevenue >= 0
                    ? "text-emerald-600"
                    : "text-rose-600"
                }`}
              >
                {deltas.priceEffectRevenue >= 0 ? "+" : ""}
                {formatCurrency(deltas.priceEffectRevenue)}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-slate-500 leading-snug">
              Variação decorrente do aumento/redução do ticket médio médio em{" "}
              {formatCurrency(deltas.ticketDelta)} por aluno vendido.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
