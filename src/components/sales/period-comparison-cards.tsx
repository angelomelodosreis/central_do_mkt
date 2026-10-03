"use client";

import { useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  DollarSign,
  HelpCircle,
  Info,
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

export function PeriodComparisonCards({
  comparative,
}: {
  comparative: ComparativeAnalysisResult;
}) {
  const { currentPeriod, previousPeriod, deltas } = comparative;
  const isInProgress = Boolean(currentPeriod.isCurrentPeriodInProgress);
  const mtd = deltas.mtdComparison;
  const proj = deltas.projectedComparison;

  // Modo padrão: homólogo se o mês estiver em aberto (evita distorções de comparar 3 dias com 30 dias)
  const [mode, setMode] = useState<"homologous" | "projection" | "closed">(
    isInProgress && mtd ? "homologous" : "closed",
  );

  // Valores ativos conforme o modo selecionado
  const activeRev =
    mode === "homologous" && mtd
      ? mtd.currentRevenue
      : mode === "projection" && proj
        ? proj.projectedRevenue
        : currentPeriod.revenue;

  const activePrevRev =
    mode === "homologous" && mtd
      ? mtd.previousPeriodSameDaysRevenue
      : previousPeriod.revenue;

  const activeRevDelta =
    mode === "homologous" && mtd
      ? mtd.revenueDelta
      : mode === "projection" && proj
        ? proj.revenueDelta
        : deltas.revenueDelta;

  const activeRevGrowth =
    mode === "homologous" && mtd
      ? mtd.revenueGrowthPercent
      : mode === "projection" && proj
        ? proj.revenueGrowthPercent
        : deltas.revenueGrowthPercent;

  const activeSales =
    mode === "homologous" && mtd
      ? mtd.currentSales
      : mode === "projection" && proj
        ? proj.projectedSales
        : currentPeriod.sales;

  const activePrevSales =
    mode === "homologous" && mtd
      ? mtd.previousPeriodSameDaysSales
      : previousPeriod.sales;

  const activeSalesDelta =
    mode === "homologous" && mtd
      ? mtd.salesDelta
      : mode === "projection" && proj
        ? proj.salesDelta
        : deltas.salesDelta;

  const activeSalesGrowth =
    mode === "homologous" && mtd
      ? mtd.salesGrowthPercent
      : mode === "projection" && proj
        ? proj.salesGrowthPercent
        : deltas.salesGrowthPercent;

  const activeTicket =
    mode === "homologous" && mtd
      ? mtd.currentAvgTicket
      : mode === "projection" && proj
        ? proj.projectedAvgTicket
        : currentPeriod.avgTicket;

  const activePrevTicket =
    mode === "homologous" && mtd
      ? mtd.previousPeriodSameDaysAvgTicket
      : previousPeriod.avgTicket;

  const activeTicketDelta =
    mode === "homologous" && mtd
      ? mtd.ticketDelta
      : deltas.ticketDelta;

  const activeTicketGrowth =
    mode === "homologous" && mtd
      ? mtd.ticketGrowthPercent
      : deltas.ticketGrowthPercent;

  const isPositiveRev = activeRevGrowth >= 0;
  const isPositiveSales = activeSalesGrowth >= 0;
  const isPositiveTicket = activeTicketGrowth >= 0;

  // Dias efetivos para cálculo de velocidade diária
  const effectiveCurrentDays = isInProgress && currentPeriod.daysElapsed > 0
    ? currentPeriod.daysElapsed
    : currentPeriod.daysCount > 0
      ? currentPeriod.daysCount
      : 1;

  const dailyCurrentRev = currentPeriod.revenue / effectiveCurrentDays;
  const dailyCurrentSales = currentPeriod.sales / effectiveCurrentDays;
  const dailyPrevRev = previousPeriod.daysCount > 0 ? previousPeriod.revenue / previousPeriod.daysCount : 0;
  const dailyPrevSales = previousPeriod.daysCount > 0 ? previousPeriod.sales / previousPeriod.daysCount : 0;

  return (
    <div className="space-y-4">
      {/* Barra de Seleção de Modo Comparativo (quando o mês estiver em aberto) */}
      {isInProgress && mtd && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-blue-200/80 bg-gradient-to-r from-blue-50/90 via-white to-blue-50/70 p-3.5 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <span className="flex size-2.5 rounded-full bg-blue-600 animate-pulse" />
            <div>
              <p className="text-xs font-bold text-slate-900">
                Mês em Curso: Dia {String(currentPeriod.daysElapsed).padStart(2, "0")} de {currentPeriod.daysCount} decorridos
              </p>
              <p className="text-[11px] text-slate-500">
                Escolha a metodologia para comparar períodos com durações diferentes sem distorções:
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-slate-200 bg-white p-1 text-xs shadow-2xs">
            <button
              type="button"
              onClick={() => setMode("homologous")}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-semibold transition ${
                mode === "homologous"
                  ? "bg-blue-600 text-white shadow-2xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <span>Homólogo MTD (Dia 01 a {String(currentPeriod.daysElapsed).padStart(2, "0")})</span>
              <span className={`rounded-full px-1.5 py-0.2 text-[9px] uppercase font-bold ${mode === "homologous" ? "bg-blue-700 text-white" : "bg-blue-100 text-blue-800"}`}>
                Justo
              </span>
            </button>

            {proj && (
              <button
                type="button"
                onClick={() => setMode("projection")}
                className={`rounded-lg px-2.5 py-1 font-medium transition ${
                  mode === "projection"
                    ? "bg-blue-600 text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                Projeção Run-Rate
              </button>
            )}

            <button
              type="button"
              onClick={() => setMode("closed")}
              className={`rounded-lg px-2.5 py-1 font-medium transition ${
                mode === "closed"
                  ? "bg-blue-600 text-white shadow-2xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              Realizado Bruto
            </button>
          </div>
        </div>
      )}

      {/* Grid de 4 KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* 1. Receita */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {mode === "homologous"
                  ? `Receita MTD (D01 a D${String(currentPeriod.daysElapsed).padStart(2, "0")})`
                  : mode === "projection"
                    ? "Fechamento Projetado"
                    : "Receita MoM"}
              </span>
              <MetricHelpTooltip
                title={
                  mode === "homologous"
                    ? "Receita Homóloga MTD"
                    : mode === "projection"
                      ? "Fechamento Projetado (Run-Rate)"
                      : "Receita MoM (Month-over-Month)"
                }
                explanation={
                  mode === "homologous"
                    ? `Compara o faturamento de ${currentPeriod.label} até o dia ${currentPeriod.daysElapsed} contra exatamente o mesmo intervalo de dias no mês anterior.`
                    : mode === "projection"
                      ? "Extrapolação estatística do mês baseada no ritmo diário atual multiplicado pelos 31 dias."
                      : "Faturamento bruto acumulado de cada período."
                }
              />
            </div>
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
              <span>{formatPercent(activeRevGrowth)}</span>
            </div>
          </div>

          <div className="mt-2">
            <div className="text-2xl font-bold tracking-tight text-slate-900">
              {formatCurrency(activeRev)}
            </div>
            <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 text-xs text-slate-500">
              <span className="truncate max-w-[130px]" title={currentPeriod.label}>
                {mode === "projection" ? "Projeção Mês:" : `${currentPeriod.label}:`}
              </span>
              <span className="font-semibold text-slate-700 shrink-0">
                {formatCurrency(activeRev)}
              </span>
            </div>
            <div className="mt-0.5 flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 text-xs text-slate-400">
              <span className="truncate max-w-[110px]" title={previousPeriod.label}>
                {mode === "homologous" ? `${previousPeriod.label} (mesmos dias):` : `${previousPeriod.label}:`}
              </span>
              <div className="flex items-center gap-1 shrink-0">
                <span>{formatCurrency(activePrevRev)}</span>
                <span className="text-[10px] font-semibold text-slate-600">
                  ({activeRevDelta >= 0 ? "+" : ""}
                  {formatCurrency(activeRevDelta)})
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Volume de Alunos */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {mode === "homologous"
                  ? `Volume MTD (D01 a D${String(currentPeriod.daysElapsed).padStart(2, "0")})`
                  : mode === "projection"
                    ? "Volume Projetado"
                    : "Volume de Alunos"}
              </span>
              <MetricHelpTooltip
                title="Volume de Alunos"
                explanation="Quantidade total de alunos inscritos ou produtos vendidos no período selecionado."
              />
            </div>
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
              <span>{formatPercent(activeSalesGrowth)}</span>
            </div>
          </div>

          <div className="mt-2">
            <div className="text-2xl font-bold tracking-tight text-slate-900">
              {activeSales.toLocaleString("pt-BR")}{" "}
              <span className="text-sm font-normal text-slate-500">vendas</span>
            </div>
            <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 text-xs text-slate-500">
              <span className="truncate max-w-[130px]" title={currentPeriod.label}>
                {mode === "projection" ? "Estimativa Mês:" : `${currentPeriod.label}:`}
              </span>
              <span className="font-semibold text-slate-700 shrink-0">
                {activeSales} vendas
              </span>
            </div>
            <div className="mt-0.5 flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 text-xs text-slate-400">
              <span className="truncate max-w-[110px]" title={previousPeriod.label}>
                {mode === "homologous" ? `${previousPeriod.label} (mesmos dias):` : `${previousPeriod.label}:`}
              </span>
              <div className="flex items-center gap-1 shrink-0">
                <span>{activePrevSales} vendas</span>
                <span className="text-[10px] font-semibold text-slate-600">
                  ({activeSalesDelta >= 0 ? "+" : ""}
                  {activeSalesDelta})
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Ticket Médio */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Ticket Médio
              </span>
              <MetricHelpTooltip
                title="Ticket Médio Ponderado"
                explanation="Faturamento total dividido pelo total de matrículas no período analisado."
                formula="Receita do Período ÷ Total de Vendas"
              />
            </div>
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
              <span>{formatPercent(activeTicketGrowth)}</span>
            </div>
          </div>

          <div className="mt-2">
            <div className="text-2xl font-bold tracking-tight text-slate-900">
              {formatCurrency(activeTicket)}
            </div>
            <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 text-xs text-slate-500">
              <span className="truncate max-w-[130px]" title={currentPeriod.label}>
                {currentPeriod.label}:
              </span>
              <span className="font-semibold text-slate-700 shrink-0">
                {formatCurrency(activeTicket)}
              </span>
            </div>
            <div className="mt-0.5 flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 text-xs text-slate-400">
              <span className="truncate max-w-[110px]" title={previousPeriod.label}>
                {previousPeriod.label}:
              </span>
              <div className="flex items-center gap-1 shrink-0">
                <span>{formatCurrency(activePrevTicket)}</span>
                <span className="text-[10px] font-semibold text-slate-600">
                  ({activeTicketDelta >= 0 ? "+" : ""}
                  {formatCurrency(activeTicketDelta)})
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 4. Ritmo Diário Real (calculado pelos dias transcorridos) */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Ritmo Diário Real (dV/dt)
              </span>
              <MetricHelpTooltip
                title="Ritmo Diário Real (Pacing)"
                explanation={`Calculado dividindo o faturamento real pelos ${effectiveCurrentDays} dias decorridos do mês atual, refletindo com fidelidade a velocidade diária de conversão.`}
                formula="Receita Atual ÷ Dias Decorridos"
              />
            </div>
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
              {isInProgress ? `Dia ${currentPeriod.daysElapsed}` : "Pacing"}
            </span>
          </div>

          <div className="mt-2">
            <div className="text-2xl font-bold tracking-tight text-slate-900">
              {formatCurrency(dailyCurrentRev)}
              <span className="text-xs font-normal text-slate-500">/dia</span>
            </div>
            <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 text-xs text-slate-500">
              <span>Volume médio:</span>
              <span className="font-semibold text-slate-700 shrink-0">
                {dailyCurrentSales.toFixed(1)} vendas/dia
              </span>
            </div>
            <div className="mt-0.5 flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 text-xs text-slate-400">
              <span>Anterior:</span>
              <span className="shrink-0">
                {formatCurrency(dailyPrevRev)}/dia ({dailyPrevSales.toFixed(1)} vendas/dia)
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
            <MetricHelpTooltip
              title="Decomposição Volume vs Preço/Mix"
              explanation="Metodologia estatística que divide o delta financeiro total em dois fatores: quanto variou por vender mais/menos unidades (Volume) e quanto variou pela mudança de preço médio/mix (Preço). A soma de ambos resulta exatamente no delta de faturamento."
              formula="ΔReceita = Efeito Volume + Efeito Preço"
            />
          </div>
          <span className="text-[11px] text-slate-500">
            Origem da variação de faturamento de{" "}
            <strong className="text-slate-800">
              {formatCurrency(activeRevDelta)}
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
                  (activeSalesDelta * activePrevTicket) >= 0
                    ? "text-emerald-600"
                    : "text-rose-600"
                }`}
              >
                {(activeSalesDelta * activePrevTicket) >= 0 ? "+" : ""}
                {formatCurrency(activeSalesDelta * activePrevTicket)}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-slate-500 leading-snug">
              Variação decorrente de ter vendido {Math.abs(activeSalesDelta)}{" "}
              alunos {activeSalesDelta >= 0 ? "a mais" : "a menos"} ao ticket
              anterior ({formatCurrency(activePrevTicket)}).
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
                  (activeTicketDelta * activeSales) >= 0
                    ? "text-emerald-600"
                    : "text-rose-600"
                }`}
              >
                {(activeTicketDelta * activeSales) >= 0 ? "+" : ""}
                {formatCurrency(activeTicketDelta * activeSales)}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-slate-500 leading-snug">
              Variação decorrente da mudança de ticket médio em{" "}
              {formatCurrency(activeTicketDelta)} por aluno sobre o volume analisado ({activeSales} vendas).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
