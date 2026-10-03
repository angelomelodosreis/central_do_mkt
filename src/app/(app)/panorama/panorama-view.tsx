"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeftRight,
  ArrowRight,
  BarChart3,
  Calendar,
  CalendarDays,
  Compass,
  Download,
  ExternalLink,
  Filter,
  Layers,
  LineChart,
  RefreshCw,
  TrendingUp,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import { BarrasComLinha, BarrasHorizontais } from "@/components/charts/charts";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  PageHeader,
  Section,
  Toolbar,
} from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Stat, StatGrid } from "@/components/ui/stat";
import { PillTabs } from "@/components/ui/tabs";

import { PeriodComparisonCards } from "@/components/sales/period-comparison-cards";
import { DayByDayPacingChart } from "@/components/sales/day-by-day-pacing-chart";
import { BuGrowthMatrix } from "@/components/sales/bu-growth-matrix";
import { MarketingDiagnostics } from "@/components/sales/marketing-diagnostics";
import { ExportSalesButton } from "@/components/sales/export-sales-button";
import {
  ComparativePeriodPicker,
  type ComparativePeriodFilterParams,
} from "@/components/sales/comparative-period-picker";

import { SalesKpiCards } from "@/components/sales/sales-kpi-cards";
import { SalesVelocityChart } from "@/components/sales/sales-velocity-chart";
import { TicketTrendChart } from "@/components/sales/ticket-trend-chart";
import { PaymentMixChart } from "@/components/sales/payment-mix-chart";
import { LiveTransactionsTable } from "@/components/sales/live-transactions-table";

import {
  refreshSalesDataAction,
  getComparativeSalesAction,
} from "../vendas-realtime/actions";

import type { TimelineKind, TimelineStatus } from "@/lib/db/schema";
import {
  INDICADORES,
  SENTIDO,
  calcular,
  formatarIndicador,
  rotuloCurto,
  rotuloDaSemana,
  rotuloDoIndicador,
  somar,
  variacao,
  type BaseNumbers,
  type Indicador,
} from "@/lib/modules/results/metrics";
import { TIMELINE_KIND_CONFIG } from "@/lib/modules/strategy/timeline-kinds";
import { cn } from "@/lib/utils/cn";
import { formatDate } from "@/lib/utils/format";
import type {
  ComparativeAnalysisResult,
  SalesAnalyticsResult,
} from "@/lib/modules/sales/types";

type Unidade = {
  id: string;
  slug: string;
  label: string;
  divisionName: string | null;
  code?: string;
  isMine: boolean;
};

type LinhaSemanal = BaseNumbers & {
  businessUnitId: string;
  weekStart: number;
};

type ItemDaAgenda = {
  id: string;
  title: string;
  kind: TimelineKind;
  status: TimelineStatus;
  startsAt: number;
  endsAt: number;
  owner: string | null;
  businessUnitId: string;
  businessUnitLabel: string;
  businessUnitSlug: string;
};

const JANELAS = [
  { value: "4", label: "4 semanas" },
  { value: "13", label: "13 semanas" },
  { value: "26", label: "26 semanas" },
] as const;

const HORIZONTES = [
  { value: "7", label: "7 dias" },
  { value: "30", label: "30 dias" },
  { value: "90", label: "90 dias" },
] as const;

const DIA = 86_400_000;
const SEMANA = 7 * DIA;

export function PanoramaView({
  hoje,
  unidades,
  semanais,
  agenda,
  kinds,
  liveSalesData,
  comparativeData,
  availableMonths,
  isMaster,
}: {
  hoje: string;
  unidades: Unidade[];
  semanais: LinhaSemanal[];
  agenda: ItemDaAgenda[];
  kinds: TimelineKind[];
  liveSalesData: SalesAnalyticsResult;
  comparativeData: ComparativeAnalysisResult;
  availableMonths: Array<{ key: string; label: string; count: number }>;
  isMaster: boolean;
}) {
  const agora = useMemo(() => new Date(hoje), [hoje]);

  // Aba principal de navegação executiva
  const [activeTab, setActiveTab] = useState<
    "vendas_realtime" | "fechamento_semanal" | "agenda" | "sazonalidade"
  >("vendas_realtime");

  // Estado das Vendas em Tempo Real
  const [salesData, setSalesData] = useState(liveSalesData);
  const [compData, setCompData] = useState(comparativeData);
  const [currentMonthKey, setCurrentMonthKey] = useState(comparativeData.currentPeriod.key);
  const [previousMonthKey, setPreviousMonthKey] = useState(comparativeData.previousPeriod.key);
  const [realtimePeriod, setRealtimePeriod] = useState<"7d" | "14d" | "30d" | "all">("30d");

  // Estado do Fechamento Semanal & Agenda
  const [janela, setJanela] = useState<"4" | "13" | "26">("13");
  const [horizonte, setHorizonte] = useState<"7" | "30" | "90">("30");
  const [indicador, setIndicador] = useState<Indicador>("revenue");
  const [busSelecionadas, setBusSelecionadas] = useState<string[]>([]);
  const [tiposSelecionados, setTiposSelecionados] = useState<TimelineKind[]>([]);

  const [isPending, startTransition] = useTransition();

  const idsVisiveis =
    busSelecionadas.length > 0
      ? busSelecionadas
      : unidades.map((unidade) => unidade.id);

  // Atualização reativa de vendas ao alterar filtros de BU ou Meses
  function updateSalesData(
    bus: string[],
    currMonth = currentMonthKey,
    prevMonth = previousMonthKey,
  ) {
    const codes = bus.length > 0 ? bus : undefined;
    startTransition(async () => {
      try {
        const [updatedLive, updatedComp] = await Promise.all([
          refreshSalesDataAction({ targetBuCodes: codes }),
          getComparativeSalesAction({
            currentMonthKey: currMonth,
            previousMonthKey: prevMonth,
            targetBuCodes: codes,
          }),
        ]);
        setSalesData(updatedLive);
        setCompData(updatedComp.comparative);
      } catch {
        toast.error("Erro ao aplicar filtro de Business Unit.");
      }
    });
  }

  function handleToggleBu(id: string) {
    const next = busSelecionadas.includes(id)
      ? busSelecionadas.filter((item) => item !== id)
      : [...busSelecionadas, id];
    setBusSelecionadas(next);
    updateSalesData(next, currentMonthKey, previousMonthKey);
  }

  function handleClearBus() {
    setBusSelecionadas([]);
    updateSalesData([], currentMonthKey, previousMonthKey);
  }

  // Sincronização geral
  function handleSync() {
    const codes = busSelecionadas.length > 0 ? busSelecionadas : undefined;
    startTransition(async () => {
      try {
        const [updatedLive, updatedComp] = await Promise.all([
          refreshSalesDataAction({ targetBuCodes: codes }),
          getComparativeSalesAction({
            currentMonthKey,
            previousMonthKey,
            targetBuCodes: codes,
          }),
        ]);
        setSalesData(updatedLive);
        setCompData(updatedComp.comparative);
        toast.success("Panorama sincronizado com o Google Sheets!");
      } catch {
        toast.error("Erro ao sincronizar dados.");
      }
    });
  }

  const [activeStartDate, setActiveStartDate] = useState<string | undefined>(undefined);
  const [activeEndDate, setActiveEndDate] = useState<string | undefined>(undefined);
  const [activeCompareStartDate, setActiveCompareStartDate] = useState<string | undefined>(undefined);
  const [activeCompareEndDate, setActiveCompareEndDate] = useState<string | undefined>(undefined);

  function handleComparativeFilterChange(params: ComparativePeriodFilterParams) {
    const codes = busSelecionadas.length > 0 ? busSelecionadas : undefined;
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
            targetBuCodes: codes,
          });
          setCompData(res.comparative);
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
            targetBuCodes: codes,
          });
          setCompData(res.comparative);
          toast.success(
            `Comparativo aplicado: ${res.comparative.currentPeriod.label} vs ${res.comparative.previousPeriod.label}`,
          );
        }
      } catch {
        toast.error("Erro ao aplicar período comparativo.");
      }
    });
  }


  // ── Fechamento Semanal ───────────────────────────────────────────────────
  const semanasNaJanela = Number(janela);
  const fim = inicioDaSemanaLocal(agora);
  const inicioAtual = fim.getTime() - semanasNaJanela * SEMANA;
  const inicioAnterior = inicioAtual - semanasNaJanela * SEMANA;

  const noPeriodo = useMemo(
    () =>
      semanais.filter(
        (linha) =>
          idsVisiveis.includes(linha.businessUnitId) &&
          linha.weekStart >= inicioAtual &&
          linha.weekStart < fim.getTime(),
      ),
    [semanais, idsVisiveis, inicioAtual, fim],
  );

  const noAnterior = useMemo(
    () =>
      semanais.filter(
        (linha) =>
          idsVisiveis.includes(linha.businessUnitId) &&
          linha.weekStart >= inicioAnterior &&
          linha.weekStart < inicioAtual,
      ),
    [semanais, idsVisiveis, inicioAnterior, inicioAtual],
  );

  const atual = calcular(somar(noPeriodo));
  const anterior = calcular(somar(noAnterior));

  // Série semanal
  const serie = useMemo(() => {
    const porSemana = new Map<number, LinhaSemanal[]>();
    for (const linha of noPeriodo) {
      const lista = porSemana.get(linha.weekStart) ?? [];
      lista.push(linha);
      porSemana.set(linha.weekStart, lista);
    }

    const pontos = [];
    for (let i = 0; i < semanasNaJanela; i += 1) {
      const inicio = inicioAtual + i * SEMANA;
      const doGrupo = porSemana.get(inicio) ?? [];
      const valores = calcular(somar(doGrupo));
      pontos.push({
        label: rotuloDaSemana(new Date(inicio)),
        valor: valores[indicador],
        titulo: `${rotuloDaSemana(new Date(inicio))}: ${formatarIndicador(indicador, valores[indicador])}`,
      });
    }
    return pontos;
  }, [noPeriodo, semanasNaJanela, inicioAtual, indicador]);

  // Ranking por BU no fechamento semanal
  const porBu = useMemo(() => {
    const agrupado = new Map<string, LinhaSemanal[]>();
    for (const linha of noPeriodo) {
      const lista = agrupado.get(linha.businessUnitId) ?? [];
      lista.push(linha);
      agrupado.set(linha.businessUnitId, lista);
    }
    const anteriorPorBu = new Map<string, LinhaSemanal[]>();
    for (const linha of noAnterior) {
      const lista = anteriorPorBu.get(linha.businessUnitId) ?? [];
      lista.push(linha);
      anteriorPorBu.set(linha.businessUnitId, lista);
    }

    return unidades
      .filter((unidade) => idsVisiveis.includes(unidade.id))
      .map((unidade) => {
        const valores = calcular(somar(agrupado.get(unidade.id) ?? []));
        const antes = calcular(somar(anteriorPorBu.get(unidade.id) ?? []));
        const variou = variacao(valores[indicador], antes[indicador]);
        return {
          id: unidade.id,
          label: unidade.label,
          valor: valores[indicador],
          valorFormatado: formatarIndicador(indicador, valores[indicador]),
          detalhe: variou === null ? undefined : formatarVariacao(variou),
        };
      })
      .sort((a, b) => (b.valor ?? -1) - (a.valor ?? -1));
  }, [noPeriodo, noAnterior, unidades, idsVisiveis, indicador]);

  const comNumero = porBu.filter((linha) => linha.valor !== null);
  const semNumero = porBu.filter((linha) => linha.valor === null);

  // ── O que vem por aí ─────────────────────────────────────────────────────
  const limiteAgenda = agora.getTime() + Number(horizonte) * DIA;
  const proximos = useMemo(
    () =>
      agenda
        .filter(
          (item) =>
            idsVisiveis.includes(item.businessUnitId) &&
            item.startsAt <= limiteAgenda &&
            (tiposSelecionados.length === 0 ||
              tiposSelecionados.includes(item.kind)),
        )
        .sort((a, b) => a.startsAt - b.startsAt),
    [agenda, idsVisiveis, limiteAgenda, tiposSelecionados],
  );

  return (
    <div className="space-y-6">
      {/* 1. Header Executivo do Panorama */}
      <div className="flex flex-col gap-4 rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Panorama Executivo MedCof
            </h1>
            <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              Tempo Real Ativo
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500 leading-relaxed max-w-2xl">
            Cockpit unificado com faturamento em tempo real do Google Sheets,
            pacing dia a dia MoM/YoY, fechamento semanal consolidado e agenda de iniciativas.
          </p>
        </div>

        {/* Controles de Topo */}
        <div className="flex flex-wrap items-center gap-2.5">
          <ExportSalesButton
            series={compData.dayByDaySeries}
            buStats={compData.buComparison}
            currentLabel={compData.currentPeriod.label}
            previousLabel={compData.previousPeriod.label}
          />

          <button
            type="button"
            onClick={handleSync}
            disabled={isPending}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw
              className={`size-3.5 text-slate-500 ${isPending ? "animate-spin" : ""}`}
            />
            <span>{isPending ? "Sincronizando..." : "Sincronizar"}</span>
          </button>
        </div>
      </div>

      {/* 2. Menu de Navegação em Abas do Panorama */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 pb-2">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("vendas_realtime")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
              activeTab === "vendas_realtime"
                ? "bg-brand-600 text-white shadow-sm shadow-brand-500/20"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200/70"
            }`}
          >
            <Zap className="size-3.5" />
            <span>Vendas Real-Time & Pacing MoM</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("fechamento_semanal")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
              activeTab === "fechamento_semanal"
                ? "bg-brand-600 text-white shadow-sm shadow-brand-500/20"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200/70"
            }`}
          >
            <BarChart3 className="size-3.5" />
            <span>Fechamento Semanal & Indicadores</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("agenda")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
              activeTab === "agenda"
                ? "bg-brand-600 text-white shadow-sm shadow-brand-500/20"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200/70"
            }`}
          >
            <Calendar className="size-3.5" />
            <span>Agenda Executiva ({agenda.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("sazonalidade")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
              activeTab === "sazonalidade"
                ? "bg-brand-600 text-white shadow-sm shadow-brand-500/20"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200/70"
            }`}
          >
            <Compass className="size-3.5" />
            <span>Diagnóstico de Mídia & Sazonalidade</span>
          </button>
        </div>

        {/* Filtro Global de BUs */}
        <div className="flex items-center gap-1.5 text-xs text-slate-600">
          <Filter className="size-3.5 text-slate-400" />
          <Select
            trigger="field"
            size="sm"
            placeholder={isMaster ? "Todas as 23 BUs (Acesso Total)" : "Minhas BUs"}
            ariaLabel="Filtrar por Business Unit"
            values={busSelecionadas}
            onToggleValue={handleToggleBu}
            options={unidades.map((unidade) => ({
              value: unidade.id,
              label: unidade.label,
              hint: unidade.divisionName ?? undefined,
            }))}
          />
          {busSelecionadas.length > 0 && (
            <button
              type="button"
              onClick={handleClearBus}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50 transition"
              title="Limpar filtro de BUs"
            >
              Limpar
            </button>
          )}
        </div>
      </div>

      {isPending && (
        <div className="flex items-center gap-2 rounded-xl bg-blue-50/80 px-4 py-2 text-xs font-semibold text-blue-700 animate-pulse border border-blue-100 shadow-2xs">
          <RefreshCw className="size-3.5 animate-spin" />
          <span>Atualizando métricas para o filtro selecionado...</span>
        </div>
      )}

      {/* ======================================================== */}
      {/* ABA 1: VENDAS EM TEMPO REAL & PACING MoM / YoY           */}
      {/* ======================================================== */}
      {activeTab === "vendas_realtime" && (
        <div className="space-y-6">
          {busSelecionadas.length > 0 && salesData.summary.totalSales === 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50/90 p-4 text-xs text-amber-900 shadow-2xs">
              <div className="flex items-start sm:items-center gap-2.5">
                <AlertCircle className="size-4 shrink-0 text-amber-600 mt-0.5 sm:mt-0" />
                <div>
                  <span className="font-bold text-amber-950">
                    Nenhuma venda encontrada para esta seleção no período selecionado
                  </span>
                  <p className="mt-0.5 text-amber-800">
                    A planilha do Google Sheets está sincronizada em tempo real com todas as 23 Business Units da MedCof. Se necessário, ajuste o intervalo de datas ou limpe o filtro de BU.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClearBus}
                className="shrink-0 rounded-xl border border-amber-300 bg-white px-3 py-1.5 font-bold text-amber-900 shadow-2xs transition hover:bg-amber-100/50"
              >
                Ver Todas as 23 BUs
              </button>
            </div>
          )}
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


          {/* Cards de KPIs MoM & Decomposição */}
          <PeriodComparisonCards comparative={compData} />

          {/* Gráfico de Pacing Dia a Dia Sobreposto (1..31) */}
          <DayByDayPacingChart
            series={compData.dayByDaySeries}
            currentLabel={compData.currentPeriod.label}
            previousLabel={compData.previousPeriod.label}
          />

          {/* Matriz de Crescimento de Business Units */}
          <BuGrowthMatrix
            data={compData.buComparison}
            currentLabel={compData.currentPeriod.label}
            previousLabel={compData.previousPeriod.label}
          />

          {/* Feed de Transações Ao Vivo */}
          <LiveTransactionsTable
            transactions={salesData.recentTransactions}
            isLive={salesData.dataSource.isLive}
          />
        </div>
      )}

      {/* ======================================================== */}
      {/* ABA 2: FECHAMENTO SEMANAL & INDICADORES CONSOLIDADOS     */}
      {/* ======================================================== */}
      {activeTab === "fechamento_semanal" && (
        <div className="space-y-4">
          <Toolbar
            onClear={
              busSelecionadas.length > 0
                ? () => setBusSelecionadas([])
                : undefined
            }
          >
            <div className="w-48">
              <Select
                value={janela}
                onValueChange={(valor) => setJanela(valor as typeof janela)}
                ariaLabel="Período dos números"
                size="sm"
                options={[...JANELAS]}
              />
            </div>
          </Toolbar>

          <Card>
            <CardHeader
              title={`${
                busSelecionadas.length === 0
                  ? `${unidades.length} BUs`
                  : `${busSelecionadas.length} de ${unidades.length} BUs`
              } · últimas ${semanasNaJanela} semanas`}
              description={`Variação sobre as ${semanasNaJanela} anteriores. Clique num indicador para ver o gráfico dele.`}
            />

            <StatGrid>
              {INDICADORES.map(({ metric }) => (
                <Stat
                  key={metric}
                  label={rotuloCurto(metric)}
                  labelCompleto={rotuloDoIndicador(metric)}
                  value={formatarIndicador(metric, atual[metric])}
                  variacao={variacao(atual[metric], anterior[metric])}
                  sentido={SENTIDO[metric]}
                  selecionado={indicador === metric}
                  onSelecionar={() => setIndicador(metric)}
                />
              ))}
            </StatGrid>
          </Card>

          <div className="grid items-start gap-5 lg:grid-cols-[1fr_22rem]">
            <Card>
              <CardHeader
                title={`${rotuloDoIndicador(indicador)}, semana a semana`}
              />
              <CardBody>
                {serie.some((ponto) => ponto.valor !== null) ? (
                  <BarrasComLinha pontos={serie} />
                ) : (
                  <p className="py-8 text-center text-sm text-slate-500">
                    Nenhum número lançado neste período.
                  </p>
                )}
              </CardBody>
            </Card>

            <Card>
              <CardHeader
                title="Por BU"
                action={
                  <span className="text-xs text-slate-500">
                    {rotuloDoIndicador(indicador)}
                  </span>
                }
              />
              <CardBody className="px-0 py-0">
                {comNumero.length === 0 ? (
                  <EmptyState
                    variant="inline"
                    title="Nenhuma BU lançou números neste período."
                  />
                ) : (
                  <BarrasHorizontais itens={comNumero} />
                )}
                {semNumero.length > 0 ? (
                  <details className="border-t border-slate-200 px-5 py-2.5">
                    <summary className="cursor-pointer text-xs text-amber-700 marker:text-slate-400">
                      {semNumero.length} sem lançamento no período
                    </summary>
                    <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
                      {semNumero.map((linha) => linha.label).join(" · ")}
                    </p>
                  </details>
                ) : null}
              </CardBody>
            </Card>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ABA 3: AGENDA EXECUTIVA ("O QUE VEM POR AÍ")             */}
      {/* ======================================================== */}
      {activeTab === "agenda" && (
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 pb-2 pt-4">
            <h2 className="text-base font-semibold text-slate-900">
              Iniciativas & Lançamentos Estratégicos
            </h2>
            <PillTabs
              items={HORIZONTES.map((opcao) => ({
                value: opcao.value,
                label: opcao.label,
                count: agenda.filter(
                  (item) =>
                    idsVisiveis.includes(item.businessUnitId) &&
                    item.startsAt <=
                      agora.getTime() + Number(opcao.value) * DIA &&
                    (tiposSelecionados.length === 0 ||
                      tiposSelecionados.includes(item.kind)),
                ).length,
              }))}
              value={horizonte}
              onChange={setHorizonte}
            />
          </div>

          <CardBody className="px-0 py-0">
            {proximos.length === 0 ? (
              <EmptyState
                variant="inline"
                title={`Nada marcado para os próximos ${horizonte} dias.`}
              />
            ) : (
              <Agenda itens={proximos} agora={agora} />
            )}
          </CardBody>
        </Card>
      )}

      {/* ======================================================== */}
      {/* ABA 4: SAZONALIDADE & DIAGNÓSTICO DE MÍDIA               */}
      {/* ======================================================== */}
      {activeTab === "sazonalidade" && (
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
            dayOfWeekStats={compData.dayOfWeekStats}
            priceTiers={compData.priceTiers}
          />
        </div>
      )}
    </div>
  );
}

function formatarVariacao(pct: number): string {
  const sinal = pct > 0 ? "+" : "";
  return `${sinal}${pct.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}

function Agenda({ itens, agora }: { itens: ItemDaAgenda[]; agora: Date }) {
  const seteDias = agora.getTime() + 7 * DIA;
  const trintaDias = agora.getTime() + 30 * DIA;

  const grupos = [
    {
      titulo: "Nos próximos 7 dias",
      itens: itens.filter((item) => item.startsAt <= seteDias),
    },
    {
      titulo: "Em até 30 dias",
      itens: itens.filter(
        (item) => item.startsAt > seteDias && item.startsAt <= trintaDias,
      ),
    },
    {
      titulo: "Mais adiante",
      itens: itens.filter((item) => item.startsAt > trintaDias),
    },
  ].filter((grupo) => grupo.itens.length > 0);

  return (
    <>
      {grupos.map((grupo) => (
        <Section
          key={grupo.titulo}
          title={grupo.titulo}
          meta={grupo.itens.length}
          divider
        >
          <ul className="divide-y divide-slate-100">
            {grupo.itens.map((item) => {
              const config = TIMELINE_KIND_CONFIG[item.kind];
              const jaComecou = item.startsAt <= agora.getTime();

              return (
                <li key={item.id}>
                  <Link
                    href={`/planejamento/${item.businessUnitSlug}/calendario`}
                    className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-5 py-2.5 transition-colors hover:bg-slate-50"
                  >
                    <span
                      aria-hidden
                      className={cn("size-2 shrink-0 rounded-full", config.dot)}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-slate-900">
                        {item.title}
                      </span>
                      <span className="block truncate text-xs text-slate-500">
                        {item.businessUnitLabel} · {config.label}
                        {item.owner ? ` · ${item.owner}` : ""}
                      </span>
                    </span>
                    <span className="shrink-0 text-right text-xs tabular-nums text-slate-500">
                      {jaComecou ? (
                        <Badge tone="brand">em curso</Badge>
                      ) : (
                        formatDate(new Date(item.startsAt))
                      )}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Section>
      ))}
    </>
  );
}

function inicioDaSemanaLocal(data: Date): Date {
  const copia = new Date(data);
  copia.setHours(0, 0, 0, 0);
  const dia = copia.getDay();
  copia.setDate(copia.getDate() - (dia === 0 ? 6 : dia - 1));
  return copia;
}
