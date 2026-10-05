"use client";

import { useState, useTransition } from "react";
import {
  ArrowLeftRight,
  BarChart3,
  Calendar,
  Compass,
  ExternalLink,
  Filter,
  Layers,
  LineChart,
  RefreshCw,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import { SalesKpiCards } from "@/components/sales/sales-kpi-cards";
import { SalesVelocityChart } from "@/components/sales/sales-velocity-chart";
import { TicketTrendChart } from "@/components/sales/ticket-trend-chart";
import { BuSalesBreakdown } from "@/components/sales/bu-sales-breakdown";
import { PaymentMixChart } from "@/components/sales/payment-mix-chart";
import { LiveTransactionsTable } from "@/components/sales/live-transactions-table";
import { PeriodComparisonCards } from "@/components/sales/period-comparison-cards";
import { DayByDayPacingChart } from "@/components/sales/day-by-day-pacing-chart";
import { BuGrowthMatrix } from "@/components/sales/bu-growth-matrix";
import { MarketingDiagnostics } from "@/components/sales/marketing-diagnostics";
import { ExportSalesButton } from "@/components/sales/export-sales-button";
import {
  ComparativePeriodPicker,
  type ComparativePeriodFilterParams,
} from "@/components/sales/comparative-period-picker";

import {
  refreshSalesDataAction,
  getComparativeSalesAction,
} from "./actions";
import type {
  ComparativeAnalysisResult,
  SalesAnalyticsResult,
} from "@/lib/modules/sales/types";

export function SalesRealtimeView({
  initialData,
  initialComparative,
  availableMonths,
  userAccessibleBus,
  isMaster,
}: {
  initialData: SalesAnalyticsResult;
  initialComparative: ComparativeAnalysisResult;
  availableMonths: Array<{ key: string; label: string; count: number }>;
  userAccessibleBus: Array<{ id: string; label: string; code?: string | null; slug?: string }>;
  isMaster: boolean;
}) {
  const [activeTab, setActiveTab] = useState<"realtime" | "comparative" | "diagnostics">("comparative");
  const [data, setData] = useState(initialData);
  const [comparative, setComparative] = useState(initialComparative);
  const [selectedBu, setSelectedBu] = useState<string>("ALL");
  const [period, setPeriod] = useState<"7d" | "14d" | "30d" | "all">("30d");

  const [currentMonthKey, setCurrentMonthKey] = useState(initialComparative.currentPeriod.key);
  const [previousMonthKey, setPreviousMonthKey] = useState(initialComparative.previousPeriod.key);

  const [isPending, startTransition] = useTransition();

  // Filtragem local conforme período selecionado (aba realtime)
  const filteredDailySeries = data.dailySeries.slice(
    period === "7d" ? -7 : period === "14d" ? -14 : period === "30d" ? -30 : 0,
  );

  function handleRefresh() {
    startTransition(async () => {
      try {
        const buCode = selectedBu === "ALL" ? undefined : selectedBu;
        const [updatedData, updatedComp] = await Promise.all([
          refreshSalesDataAction({ targetBuCode: buCode, forceRefresh: true }),
          getComparativeSalesAction({
            currentMonthKey,
            previousMonthKey,
            targetBuCode: buCode,
            forceRefresh: true,
          }),
        ]);
        setData(updatedData);
        setComparative(updatedComp.comparative);
        toast.success("Dados sincronizados com a planilha do Google!");
      } catch {
        toast.error("Erro ao sincronizar dados com o Google Sheets.");
      }
    });
  }

  function handleBuChange(buCode: string) {
    setSelectedBu(buCode);
    startTransition(async () => {
      try {
        const targetBu = buCode === "ALL" ? undefined : buCode;
        const [updatedData, updatedComp] = await Promise.all([
          refreshSalesDataAction({ targetBuCode: targetBu, forceRefresh: false }),
          getComparativeSalesAction({
            currentMonthKey,
            previousMonthKey,
            targetBuCode: targetBu,
            forceRefresh: false,
          }),
        ]);
        setData(updatedData);
        setComparative(updatedComp.comparative);
      } catch {
        toast.error("Erro ao filtrar por Business Unit.");
      }
    });
  }

  const [activeStartDate, setActiveStartDate] = useState<string | undefined>(undefined);
  const [activeEndDate, setActiveEndDate] = useState<string | undefined>(undefined);
  const [activeCompareStartDate, setActiveCompareStartDate] = useState<string | undefined>(undefined);
  const [activeCompareEndDate, setActiveCompareEndDate] = useState<string | undefined>(undefined);

  function handleComparativeFilterChange(params: ComparativePeriodFilterParams) {
    const buCode = selectedBu === "ALL" ? undefined : selectedBu;
    startTransition(async () => {
      try {
        if (params.mode === "custom_range") {
          setActiveStartDate(params.startDate);
          setActiveEndDate(params.endDate);
          setActiveCompareStartDate(params.compareStartDate);
          setActiveCompareEndDate(params.compareEndDate);

          const res = await getComparativeSalesAction({
            startDate: params.startDate,
            endDate: params.endDate,
            compareStartDate: params.compareStartDate,
            compareEndDate: params.compareEndDate,
            targetBuCode: buCode,
            forceRefresh: false,
          });
          setComparative(res.comparative);
          toast.success(
            `Comparativo aplicado: ${res.comparative.currentPeriod.label} vs ${res.comparative.previousPeriod.label}`,
          );
        } else {
          setActiveStartDate(undefined);
          setActiveEndDate(undefined);
          setActiveCompareStartDate(undefined);
          setActiveCompareEndDate(undefined);

          const cur = params.currentMonthKey || currentMonthKey;
          const prev = params.previousMonthKey || previousMonthKey;
          setCurrentMonthKey(cur);
          setPreviousMonthKey(prev);

          const res = await getComparativeSalesAction({
            currentMonthKey: cur,
            previousMonthKey: prev,
            targetBuCode: buCode,
            forceRefresh: false,
          });
          setComparative(res.comparative);
          toast.success(
            `Comparativo aplicado: ${res.comparative.currentPeriod.label} vs ${res.comparative.previousPeriod.label}`,
          );
        }
      } catch {
        toast.error("Erro ao aplicar período comparativo.");
      }
    });
  }


  return (
    <div className="space-y-6">
      {/* 1. Barra de Controles Globais & Status da Conexão */}
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span
              className={`size-2.5 rounded-full ${
                data.dataSource.isLive
                  ? "bg-emerald-500 shadow-[0_0_8px_#10b981]"
                  : "bg-brand-500 shadow-[0_0_8px_#3b82f6]"
              }`}
            />
            <span className="text-xs font-semibold text-slate-800">
              {data.dataSource.isLive
                ? "Google Sheets Conectado em Real-Time (8.600 vendas)"
                : "Base MedCof Ativa (23 BUs)"}
            </span>
          </div>

          <a
            href={data.dataSource.sheetUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-[11px] font-medium text-brand-600 hover:text-brand-800 hover:underline"
            title="Abrir planilha no Google Docs"
          >
            <span>Planilha Google</span>
            <ExternalLink className="size-3" />
          </a>
        </div>

        {/* Filtro Global por BU e Sincronização */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Seletor de BU */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <Filter className="size-3.5 text-slate-400" />
            <select
              value={selectedBu}
              onChange={(e) => handleBuChange(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:border-brand-500 focus:outline-none"
            >
              <option value="ALL">
                {isMaster
                  ? "Todas as 23 BUs (Acesso Total)"
                  : "Todas as minhas BUs autorizadas"}
              </option>
              {userAccessibleBus.map((bu) => (
                <option key={bu.id} value={bu.code || bu.id}>
                  {bu.label}
                </option>
              ))}
            </select>
          </div>

          {/* Exportar Dados para CSV */}
          <ExportSalesButton
            series={comparative.dayByDaySeries}
            buStats={comparative.buComparison}
            currentLabel={comparative.currentPeriod.label}
            previousLabel={comparative.previousPeriod.label}
          />

          {/* Botão de Atualização Manual */}
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isPending}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw
              className={`size-3.5 text-slate-500 ${isPending ? "animate-spin" : ""}`}
            />
            <span>{isPending ? "Atualizando..." : "Sincronizar"}</span>
          </button>
        </div>
      </div>

      {/* 2. Menu de Navegação em Abas para o Analista */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 pb-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("comparative")}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
              activeTab === "comparative"
                ? "bg-brand-600 text-white shadow-sm shadow-brand-500/20"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200/70"
            }`}
          >
            <ArrowLeftRight className="size-3.5" />
            <span>Comparativo MoM & Pacing Dia a Dia</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("realtime")}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
              activeTab === "realtime"
                ? "bg-brand-600 text-white shadow-sm shadow-brand-500/20"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200/70"
            }`}
          >
            <Zap className="size-3.5" />
            <span>Monitor Ao Vivo & Derivadas (dV/dt)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("diagnostics")}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
              activeTab === "diagnostics"
                ? "bg-brand-600 text-white shadow-sm shadow-brand-500/20"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200/70"
            }`}
          >
            <Compass className="size-3.5" />
            <span>Diagnóstico de Mídia & Sazonalidade</span>
          </button>
        </div>

        {/* Indicador de carregamento */}
        {isPending && (
          <span className="flex items-center gap-1.5 text-xs font-medium text-brand-600 animate-pulse">
            <RefreshCw className="size-3 animate-spin" />
            <span>Recalculando modelos matemáticos...</span>
          </span>
        )}
      </div>

      {/* ======================================================== */}
      {/* ABA 1: COMPARATIVO MoM, YoY & PACING DIA A DIA           */}
      {/* ======================================================== */}
      {activeTab === "comparative" && (
        <div className="space-y-6">
          {/* Seletor Avançado de Período & Comparativo (com botão Buscar e seleção Dia/Mês/Ano) */}
          <ComparativePeriodPicker
            availableMonths={availableMonths}
            currentMonthKey={currentMonthKey}
            previousMonthKey={previousMonthKey}
            activeStartDate={activeStartDate}
            activeEndDate={activeEndDate}
            activeCompareStartDate={activeCompareStartDate}
            activeCompareEndDate={activeCompareEndDate}
            isPending={isPending}
            onApply={handleComparativeFilterChange}
          />

          {/* Cards de KPIs com Deltas e Decomposição de Crescimento */}
          <PeriodComparisonCards comparative={comparative} />

          {/* Gráfico de Linhas Sobrepostas: Pacing Dia a Dia (1..31) */}
          <DayByDayPacingChart
            series={comparative.dayByDaySeries}
            currentLabel={comparative.currentPeriod.label}
            previousLabel={comparative.previousPeriod.label}
          />

          {/* Matriz de Crescimento de Business Units */}
          <BuGrowthMatrix
            data={comparative.buComparison}
            currentLabel={comparative.currentPeriod.label}
            previousLabel={comparative.previousPeriod.label}
            daysElapsed={comparative.currentPeriod.daysElapsed}
            isInProgress={comparative.currentPeriod.isCurrentPeriodInProgress}
          />
        </div>
      )}

      {/* ======================================================== */}
      {/* ABA 2: MONITOR AO VIVO & DERIVADAS MATEMÁTICAS           */}
      {/* ======================================================== */}
      {activeTab === "realtime" && (
        <div className="space-y-6">
          {/* Seletor de Período Local */}
          <div className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-slate-50/80 px-4 py-2.5">
            <span className="text-xs font-semibold text-slate-700">
              Período de Análise em Real-Time:
            </span>
            <div className="flex rounded-xl border border-slate-200 bg-white p-0.5 text-xs shadow-2xs">
              {(
                [
                  { key: "7d", label: "Últimos 7 dias" },
                  { key: "14d", label: "14 dias" },
                  { key: "30d", label: "30 dias" },
                  { key: "all", label: "Todo o histórico" },
                ] as const
              ).map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setPeriod(p.key)}
                  className={`rounded-lg px-2.5 py-1 font-medium transition ${
                    period === p.key
                      ? "bg-brand-600 text-white shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* KPIs Principais */}
          <SalesKpiCards summary={data.summary} />

          {/* Gráfico Principal de Faturamento & Derivada */}
          <SalesVelocityChart data={filteredDailySeries} />

          {/* Grid com Tendência de Ticket Médio, Top BUs e Mix de Pagamento */}
          <div className="grid gap-6 lg:grid-cols-2">
            <TicketTrendChart data={filteredDailySeries} />
            <PaymentMixChart data={data.paymentMix} />
          </div>

          {/* Ranking de Business Units */}
          <BuSalesBreakdown data={data.buBreakdown} />

          {/* Tabela ao Vivo de Transações Recentes */}
          <LiveTransactionsTable
            transactions={data.recentTransactions}
            isLive={data.dataSource.isLive}
          />
        </div>
      )}

      {/* ======================================================== */}
      {/* ABA 3: DIAGNÓSTICO DE MARKETING & SAZONALIDADE           */}
      {/* ======================================================== */}
      {activeTab === "diagnostics" && (
        <div className="space-y-6">
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3.5 text-xs text-emerald-950">
            <div className="flex items-center gap-2">
              <Compass className="size-4 text-emerald-600" />
              <span className="font-bold">
                Inteligência Acionável de Mídia & Otimização de Tráfego
              </span>
            </div>
            <p className="mt-1 text-emerald-900/90 leading-relaxed">
              Estes gráficos revelam o comportamento real de compra dos médicos e vestibulandos:
              dias de maior conversão para agendamento de criativos/disparos e concentração de receita por faixa de preço.
            </p>
          </div>

          <MarketingDiagnostics
            dayOfWeekStats={comparative.dayOfWeekStats}
            priceTiers={comparative.priceTiers}
          />
        </div>
      )}
    </div>
  );
}
