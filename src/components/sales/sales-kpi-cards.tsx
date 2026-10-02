import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  DollarSign,
  Flame,
  Percent,
  TrendingUp,
} from "lucide-react";
import type { SalesAnalyticsResult } from "@/lib/modules/sales/types";

export function SalesKpiCards({
  summary,
}: {
  summary: SalesAnalyticsResult["summary"];
}) {
  const isVelocityPositive = summary.accelerationPercentage >= 0;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {/* 1. Faturamento Total */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs transition hover:border-brand-300 hover:shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Faturamento Total
          </span>
          <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
            <DollarSign className="size-4" />
          </div>
        </div>
        <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
          {new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
            maximumFractionDigits: 0,
          }).format(summary.totalRevenue)}
        </p>
        <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
          <span className="font-semibold text-emerald-600">
            {new Intl.NumberFormat("pt-BR", {
              style: "currency",
              currency: "BRL",
              maximumFractionDigits: 0,
            }).format(summary.approvedRevenue)}
          </span>
          <span>aprovados</span>
        </p>
      </div>

      {/* 2. Volume de Vendas */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs transition hover:border-brand-300 hover:shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Volume de Vendas
          </span>
          <div className="flex size-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <TrendingUp className="size-4" />
          </div>
        </div>
        <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
          {summary.totalSales.toLocaleString("pt-BR")}
        </p>
        <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
          <span className="font-semibold text-blue-600">
            {summary.approvedSales} aprovadas
          </span>
          {summary.pendingSales > 0 && (
            <span>· {summary.pendingSales} pendentes</span>
          )}
        </p>
      </div>

      {/* 3. Ticket Médio */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs transition hover:border-brand-300 hover:shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Ticket Médio
          </span>
          <div className="flex size-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
            <Percent className="size-4" />
          </div>
        </div>
        <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
          {new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
            maximumFractionDigits: 0,
          }).format(summary.overallAverageTicket)}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Faturamento médio por transação
        </p>
      </div>

      {/* 4. Derivada de Vendas (Velocidade dV/dt) */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs transition hover:border-brand-300 hover:shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Velocidade (dV/dt)
          </span>
          <div className="flex size-7 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
            <Activity className="size-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-slate-900">
            {summary.currentDailyVelocity}
          </span>
          <span className="text-xs font-medium text-slate-500">vendas/dia</span>
        </div>
        <div className="mt-1 flex items-center gap-1 text-xs">
          {isVelocityPositive ? (
            <span className="flex items-center font-semibold text-emerald-600">
              <ArrowUpRight className="size-3.5" />
              +{summary.accelerationPercentage}%
            </span>
          ) : (
            <span className="flex items-center font-semibold text-rose-600">
              <ArrowDownRight className="size-3.5" />
              {summary.accelerationPercentage}%
            </span>
          )}
          <span className="text-slate-400">aceleração vs período</span>
        </div>
      </div>

      {/* 5. Taxa de Aprovação & Ritmo Horário */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs transition hover:border-brand-300 hover:shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Aprovação & Pacing
          </span>
          <div className="flex size-7 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
            <CheckCircle2 className="size-4" />
          </div>
        </div>
        <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
          {summary.approvalRate}%
        </p>
        <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
          <Flame className="size-3.5 text-amber-500" />
          <span>
            Ritmo: <strong>{summary.currentHourlyVelocity}</strong> vendas/h
          </span>
        </p>
      </div>
    </div>
  );
}
