"use client";

import Link from "next/link";
import {
  ArrowRight,
  HelpCircle,
  Zap,
} from "lucide-react";
import type { SalesProjections } from "@/lib/modules/sales/calculations";
import { formatCurrency, formatCompactCurrency } from "@/lib/utils/format";

function MetricHelpTooltip({
  title,
  explanation,
  formula,
}: {
  title: string;
  explanation: string;
  formula?: string;
}) {
  return (
    <span className="group relative inline-flex items-center">
      <span
        tabIndex={0}
        role="button"
        title={`${title}: ${explanation}`}
        aria-label={`Entenda: ${title}`}
        className="inline-flex size-4 items-center justify-center rounded-full text-slate-400 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-colors cursor-help"
      >
        <HelpCircle className="size-3.5" />
      </span>
      <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 hidden w-64 -translate-x-1/2 flex-col rounded-xl border border-slate-700 bg-slate-900/95 p-3 text-left text-xs text-white shadow-xl backdrop-blur-md group-hover:flex group-focus-within:flex">
        <span className="font-bold text-white">{title}</span>
        <span className="mt-1 text-slate-300 leading-relaxed">{explanation}</span>
        {formula && (
          <span className="mt-2 rounded bg-slate-800 px-2 py-1 font-mono text-[10px] text-amber-300">
            {formula}
          </span>
        )}
        <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
      </span>
    </span>
  );
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
    <div className="rounded-[2rem] border border-slate-200/80 bg-white p-5 shadow-2xs sm:p-6">
      {/* Header do Banner de Projeções */}
      <div className="flex flex-col gap-3 pb-5 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100">
        <div className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 ring-1 ring-brand-100">
            <Zap className="size-5" />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-base font-bold text-slate-900 sm:text-lg">
                Radar de Projeções & Forecast ({projections.monthLabel})
              </h2>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200/80">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Referência de Run-Rate
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Balizadores de pacing e tendência linear de compras para suporte à decisão (sujeito a janelas de lançamento)
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

      {/* Grid de 4 Cards de Forecast em Design System Limpo e de Fácil Leitura */}
      <div className="grid grid-cols-1 gap-3.5 pt-5 sm:grid-cols-2 xl:grid-cols-4">
        {/* 1. Faturamento do Mês (Realizado & Estimativa Linear) */}
        <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4.5 shadow-2xs hover:border-slate-300 transition-colors">
          <div>
            <div className="flex items-center justify-between gap-1">
              <div className="flex items-center gap-1 min-w-0">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 truncate">
                  Faturamento do Mês
                </span>
                <MetricHelpTooltip
                  title="Faturamento Realizado no Mês"
                  explanation="Receita total já confirmada neste mês até a data de hoje. Abaixo consta o balizador puramente linear de run-rate."
                  formula="Soma das transações confirmadas do mês"
                />
              </div>
              <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200/60">
                Realizado
              </span>
            </div>
            <p
              className="mt-2 font-display text-2xl font-bold tracking-tight text-slate-900 tabular-nums"
              title={`Faturamento realizado no mês: ${formatCurrency(projections.currentRevenue)}`}
            >
              {formatCurrency(projections.currentRevenue)}
            </p>
            <p className="mt-1 text-xs text-slate-500 truncate">
              Estimativa Run-Rate:{" "}
              <strong className="text-slate-700 font-semibold" title="Extrapolação matemática linear sujeita a aberturas de turmas">
                {formatCompactCurrency(projections.projectedMonthEndRevenue)}
              </strong>
            </p>
          </div>

          {/* Barra de Progresso do Mês */}
          <div className="mt-4 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between text-[11px] font-medium text-slate-600 mb-1.5">
              <span>Dia {projections.daysElapsed} de {projections.totalDaysInMonth}</span>
              <span className="font-semibold text-slate-800">· {projections.monthProgressPercent}% decorrido</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-brand-600 transition-all"
                style={{ width: `${projections.monthProgressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* 2. Velocidade de Vendas (dV/dt) & Pacing */}
        <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4.5 shadow-2xs hover:border-slate-300 transition-colors">
          <div>
            <div className="flex items-center justify-between gap-1">
              <div className="flex items-center gap-1 min-w-0">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 truncate">
                  Ritmo Diário de Vendas
                </span>
                <MetricHelpTooltip
                  title="Velocidade de Vendas (dV/dt)"
                  explanation="Derivada temporal de vendas: ritmo médio de matrículas e faturamento por dia decorrido no mês corrente."
                  formula="dV/dt = Matrículas no Mês ÷ Dias Decorridos"
                />
              </div>
              <span className="shrink-0 rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-bold text-sky-700 border border-sky-200/60">
                Pacing
              </span>
            </div>
            <p
              className="mt-2 font-display text-2xl font-bold tracking-tight text-slate-900 tabular-nums"
              title={`Ritmo diário de vendas: ${projections.velocityDaily} vendas/dia (${formatCurrency(projections.recentDailyRevenue)}/dia)`}
            >
              {projections.velocityDaily} <span className="text-sm font-normal text-slate-500">vendas/dia</span>
            </p>
            <p className="mt-1 text-xs text-slate-500 truncate">
              Receita/dia: <strong className="text-slate-800 font-semibold">{formatCompactCurrency(projections.recentDailyRevenue)}</strong>
              {" · "}Est: <strong className="text-slate-700 font-semibold">{projections.projectedMonthEndSales}</strong> vendas
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-1 text-xs text-slate-600">
            <div className="flex items-center gap-1 min-w-0">
              <span className="text-[11px] text-slate-500 whitespace-nowrap">Volume MTD:</span>
              <MetricHelpTooltip
                title="Volume Homólogo MTD"
                explanation="Compara o volume de vendas até exatamente o mesmo dia do mês anterior, eliminando a distorção do mês ainda estar no início."
                formula="(Vendas MTD Atual - Vendas MTD Anterior) ÷ Vendas MTD Anterior"
              />
            </div>
            <strong className="text-slate-800 font-semibold shrink-0">
              {projections.mtdGrowthSalesPercent >= 0 ? "+" : ""}
              {projections.mtdGrowthSalesPercent.toFixed(1)}%
            </strong>
          </div>
        </div>

        {/* 3. Ticket Médio & Qualidade de Margem */}
        <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4.5 shadow-2xs hover:border-slate-300 transition-colors">
          <div>
            <div className="flex items-center justify-between gap-1">
              <div className="flex items-center gap-1 min-w-0">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 truncate">
                  Ticket Médio
                </span>
                <MetricHelpTooltip
                  title="Ticket Médio (Esteira R+)"
                  explanation="Valor médio pago por matrícula considerando os cursos e planos da esteira MedCof no mês."
                  formula="Receita do Mês ÷ Matrículas do Mês"
                />
              </div>
              <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700 border border-slate-200/60">
                Esteira R+
              </span>
            </div>
            <p className="mt-2 font-display text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
              {formatCurrency(projections.currentAvgTicket)}
            </p>
            <p className="mt-1 text-xs text-slate-500 truncate">
              Histórico consolidado:{" "}
              <strong className="text-slate-700 font-semibold">
                {formatCurrency(
                  totalHistoricalSales && totalHistoricalSales > 0
                    ? totalHistoricalRevenue / totalHistoricalSales
                    : projections.currentAvgTicket,
                )}
              </strong>
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-1 text-xs text-slate-600">
            <div className="flex items-center gap-1 min-w-0">
              <span className="text-[11px] text-slate-500 whitespace-nowrap">Taxa de Aprovação:</span>
              <MetricHelpTooltip
                title="Taxa de Aprovação de Pagamentos"
                explanation="Percentual de transações e pedidos aprovados no gateway sem recusa ou chargeback."
              />
            </div>
            <strong className="text-slate-800 font-semibold shrink-0">{approvalRate}%</strong>
          </div>
        </div>

        {/* 4. Receita Total Acumulada do Ciclo & Projeção */}
        <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4.5 shadow-2xs hover:border-slate-300 transition-colors">
          <div>
            <div className="flex items-center justify-between gap-1">
              <div className="flex items-center gap-1 min-w-0">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 truncate">
                  Acumulado 2026
                </span>
                <MetricHelpTooltip
                  title="Faturamento do Ano Corrente (YTD) & Projeção"
                  explanation="Receita realizada em 2026 até agora pelo escopo ativo e a projeção de fechamento do ano baseada no ritmo médio diário acumulado."
                  formula="(Receita 2026 ÷ Dias Decorridos no Ano) × 365"
                />
              </div>
              <span className="shrink-0 rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-bold text-brand-700 border border-brand-200/60">
                YTD
              </span>
            </div>
            <p
              className="mt-2 font-display text-2xl font-bold tracking-tight text-slate-900 tabular-nums"
              title={`Realizado em 2026: ${formatCurrency(projections.currentYearRevenue || totalHistoricalRevenue)} (Histórico Geral: ${formatCurrency(totalHistoricalRevenue)})`}
            >
              {formatCompactCurrency(projections.currentYearRevenue || totalHistoricalRevenue)}
            </p>
            <p className="mt-1 text-xs text-slate-500 truncate">
              Projeção 2026: <strong className="text-slate-700 font-semibold">{formatCompactCurrency(projections.currentYearProjectedRevenue || projections.totalAnnualProjectedRevenue)}</strong>
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-1 text-xs text-slate-600">
            <div className="flex items-center gap-1 min-w-0">
              <span className="text-[11px] text-slate-500 whitespace-nowrap">Receita MTD:</span>
              <MetricHelpTooltip
                title="Pacing MTD Homólogo"
                explanation="Ritmo comparativo de receita do mês atual em relação a exatamente os mesmos dias do mês anterior, eliminando distorções de dias faltantes."
                formula="(Receita MTD Atual - Receita MTD Anterior) ÷ Receita MTD Anterior"
              />
            </div>
            <strong className="shrink-0 font-semibold text-slate-800">
              {isPositiveMtd ? "+" : ""}{projections.mtdGrowthRevenuePercent.toFixed(1)}%
            </strong>
          </div>
        </div>
      </div>

      {/* Nota de contexto sobre dinâmica de produtos e lançamentos */}
      <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-slate-50 px-3.5 py-2.5 text-xs text-slate-500 border border-slate-100">
        <span className="font-semibold text-slate-700 shrink-0">Nota sobre Projeções:</span>
        <p className="leading-relaxed">
          O cálculo linear de run-rate funciona como balizador aritmético de pacing. A dinâmica real de cada Business Unit varia conforme a janela de lançamento de turmas, sazonalidade do calendário médico e intensidade das campanhas.
        </p>
      </div>
    </div>
  );
}
