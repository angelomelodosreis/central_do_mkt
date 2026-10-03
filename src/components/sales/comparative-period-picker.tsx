"use client";

import React, { useState } from "react";
import {
  Calendar as CalendarIcon,
  Search,
  ArrowRight,
  RotateCcw,
  ChevronDown,
  Clock,
  SlidersHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface ComparativePeriodFilterParams {
  mode: "months" | "custom_range";
  currentMonthKey?: string;
  previousMonthKey?: string;
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
  compareStartDate?: string; // YYYY-MM-DD
  compareEndDate?: string;   // YYYY-MM-DD
}

interface ComparativePeriodPickerProps {
  availableMonths: Array<{ key: string; label: string; count: number }>;
  currentMonthKey: string;
  previousMonthKey: string;
  activeStartDate?: string;
  activeEndDate?: string;
  activeCompareStartDate?: string;
  activeCompareEndDate?: string;
  isPending?: boolean;
  onApply: (params: ComparativePeriodFilterParams) => void;
}

export function ComparativePeriodPicker({
  availableMonths,
  currentMonthKey,
  previousMonthKey,
  activeStartDate,
  activeEndDate,
  activeCompareStartDate,
  activeCompareEndDate,
  isPending = false,
  onApply,
}: ComparativePeriodPickerProps) {
  // Modo de seleção: "custom_range" (dia/mês/ano) ou "months" (MoM clássico)
  const [mode, setMode] = useState<"custom_range" | "months">(
    activeStartDate && activeEndDate ? "custom_range" : "custom_range",
  );

  // Estados locais para modo meses
  const [selectedCurrentMonth, setSelectedCurrentMonth] = useState(currentMonthKey);
  const [selectedPrevMonth, setSelectedPrevMonth] = useState(previousMonthKey);

  // Estados locais para modo custom range (dia, mês e ano)
  // Data base padrão: 01/10/2026 até hoje (ou 02/10/2026)
  const [startDate, setStartDate] = useState(
    activeStartDate || "2026-10-01",
  );
  const [endDate, setEndDate] = useState(
    activeEndDate || "2026-10-02",
  );

  // Tipo de comparação para o período customizado
  const [compareType, setCompareType] = useState<
    "previous_month_same_days" | "preceding_period" | "previous_year" | "custom"
  >("previous_month_same_days");

  const [compareStartDate, setCompareStartDate] = useState(
    activeCompareStartDate || "2026-09-01",
  );
  const [compareEndDate, setCompareEndDate] = useState(
    activeCompareEndDate || "2026-09-02",
  );

  // Formata YYYY-MM-DD para DD/MM/AAAA
  const formatDateBR = (iso: string) => {
    if (!iso) return "—";
    const p = iso.split("-");
    return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : iso;
  };

  // Calcula automaticamente as datas de comparação com base no compareType
  const getComputedCompareDates = (): { start: string; end: string } => {
    if (compareType === "custom") {
      return { start: compareStartDate, end: compareEndDate };
    }

    if (!startDate || !endDate) {
      return { start: "2026-09-01", end: "2026-09-02" };
    }

    const [sY, sM, sD] = startDate.split("-").map(Number);
    const [eY, eM, eD] = endDate.split("-").map(Number);

    if (compareType === "previous_month_same_days") {
      // Mesmo intervalo no mês anterior
      const prevM = sM === 1 ? 12 : sM - 1;
      const prevY = sM === 1 ? sY - 1 : sY;
      const prevEndM = eM === 1 ? 12 : eM - 1;
      const prevEndY = eM === 1 ? eY - 1 : eY;

      const prevMaxDaysStart = new Date(prevY, prevM, 0).getDate();
      const prevMaxDaysEnd = new Date(prevEndY, prevEndM, 0).getDate();

      const start = `${prevY}-${String(prevM).padStart(2, "0")}-${String(Math.min(sD, prevMaxDaysStart)).padStart(2, "0")}`;
      const end = `${prevEndY}-${String(prevEndM).padStart(2, "0")}-${String(Math.min(eD, prevMaxDaysEnd)).padStart(2, "0")}`;
      return { start, end };
    }

    if (compareType === "preceding_period") {
      // Período imediatamente anterior de igual duração
      const startMs = new Date(`${startDate}T00:00:00`).getTime();
      const endMs = new Date(`${endDate}T00:00:00`).getTime();
      const durationMs = endMs - startMs;
      const prevEndMs = startMs - 86400000;
      const prevStartMs = prevEndMs - durationMs;
      return {
        start: new Date(prevStartMs).toISOString().slice(0, 10),
        end: new Date(prevEndMs).toISOString().slice(0, 10),
      };
    }

    if (compareType === "previous_year") {
      // Mesmo período no ano anterior (YoY)
      return {
        start: `${sY - 1}-${String(sM).padStart(2, "0")}-${String(sD).padStart(2, "0")}`,
        end: `${eY - 1}-${String(eM).padStart(2, "0")}-${String(eD).padStart(2, "0")}`,
      };
    }

    return { start: compareStartDate, end: compareEndDate };
  };

  const computedCompare = getComputedCompareDates();

  // Aplica presets rápidos com disparo imediato
  const applyPreset = (
    preset:
      | "today"
      | "yesterday"
      | "last7"
      | "last14"
      | "last30"
      | "current_month_mtd"
      | "last_month_full",
  ) => {
    setMode("custom_range");
    const refDate = new Date("2026-10-02T12:00:00Z");
    const toIso = (d: Date) => d.toISOString().slice(0, 10);

    let sDate = "2026-10-01";
    let eDate = "2026-10-02";
    let cType: "previous_month_same_days" | "preceding_period" = "previous_month_same_days";

    if (preset === "today") {
      const d = toIso(refDate);
      sDate = d;
      eDate = d;
      cType = "previous_month_same_days";
    } else if (preset === "yesterday") {
      const y = new Date(refDate.getTime() - 86400000);
      const d = toIso(y);
      sDate = d;
      eDate = d;
      cType = "previous_month_same_days";
    } else if (preset === "last7") {
      const s = new Date(refDate.getTime() - 6 * 86400000);
      sDate = toIso(s);
      eDate = toIso(refDate);
      cType = "preceding_period";
    } else if (preset === "last14") {
      const s = new Date(refDate.getTime() - 13 * 86400000);
      sDate = toIso(s);
      eDate = toIso(refDate);
      cType = "preceding_period";
    } else if (preset === "last30") {
      const s = new Date(refDate.getTime() - 29 * 86400000);
      sDate = toIso(s);
      eDate = toIso(refDate);
      cType = "preceding_period";
    } else if (preset === "current_month_mtd") {
      sDate = "2026-10-01";
      eDate = "2026-10-02";
      cType = "previous_month_same_days";
    } else if (preset === "last_month_full") {
      sDate = "2026-09-01";
      eDate = "2026-09-30";
      cType = "previous_month_same_days";
    }

    setStartDate(sDate);
    setEndDate(eDate);
    setCompareType(cType);

    // Computa datas de comparação e dispara imediatamente
    const [sY, sM, sD] = sDate.split("-").map(Number);
    const [eY, eM, eD] = eDate.split("-").map(Number);

    let compStart = "";
    let compEnd = "";
    if (cType === "previous_month_same_days") {
      const prevM = sM === 1 ? 12 : sM - 1;
      const prevY = sM === 1 ? sY - 1 : sY;
      const prevEndM = eM === 1 ? 12 : eM - 1;
      const prevEndY = eM === 1 ? eY - 1 : eY;
      const prevMaxDaysStart = new Date(prevY, prevM, 0).getDate();
      const prevMaxDaysEnd = new Date(prevEndY, prevEndM, 0).getDate();
      compStart = `${prevY}-${String(prevM).padStart(2, "0")}-${String(Math.min(sD, prevMaxDaysStart)).padStart(2, "0")}`;
      compEnd = `${prevEndY}-${String(prevEndM).padStart(2, "0")}-${String(Math.min(eD, prevMaxDaysEnd)).padStart(2, "0")}`;
    } else {
      const startMs = new Date(`${sDate}T00:00:00`).getTime();
      const endMs = new Date(`${eDate}T00:00:00`).getTime();
      const durationMs = endMs - startMs;
      const prevEndMs = startMs - 86400000;
      const prevStartMs = prevEndMs - durationMs;
      compStart = new Date(prevStartMs).toISOString().slice(0, 10);
      compEnd = new Date(prevEndMs).toISOString().slice(0, 10);
    }

    onApply({
      mode: "custom_range",
      startDate: sDate,
      endDate: eDate,
      compareStartDate: compStart,
      compareEndDate: compEnd,
    });
  };

  // Disparo ao clicar no botão "Buscar"
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === "custom_range") {
      const comp = getComputedCompareDates();
      onApply({
        mode: "custom_range",
        startDate,
        endDate,
        compareStartDate: comp.start,
        compareEndDate: comp.end,
      });
    } else {
      onApply({
        mode: "months",
        currentMonthKey: selectedCurrentMonth,
        previousMonthKey: selectedPrevMonth,
      });
    }
  };

  return (
    <div className="rounded-2xl border border-blue-200/80 bg-linear-to-b from-blue-50/70 to-white p-4.5 shadow-xs transition space-y-4">
      {/* Top Header: Tabs de Modo de Seleção */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between border-b border-blue-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-blue-600 text-white shadow-2xs">
            <CalendarIcon className="size-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-blue-950 uppercase tracking-wide">
              Controle de Pacing & Comparativo Temporal
            </h4>
            <p className="text-[11px] text-blue-800/80">
              Selecione o período exato (dia, mês e ano) ou compare meses fechados.
            </p>
          </div>
        </div>

        {/* Alternador de Modo */}
        <div className="flex items-center rounded-xl bg-blue-100/60 p-1">
          <button
            type="button"
            onClick={() => setMode("custom_range")}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-bold transition",
              mode === "custom_range"
                ? "bg-white text-blue-900 shadow-2xs"
                : "text-blue-800 hover:text-blue-950",
            )}
          >
            <Clock className="size-3.5" />
            <span>Por Data Exata (Dia/Mês/Ano)</span>
          </button>

          <button
            type="button"
            onClick={() => setMode("months")}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-bold transition",
              mode === "months"
                ? "bg-white text-blue-900 shadow-2xs"
                : "text-blue-800 hover:text-blue-950",
            )}
          >
            <SlidersHorizontal className="size-3.5" />
            <span>Por Mês Fechado (MoM)</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSearchSubmit} className="space-y-4">
        {mode === "custom_range" ? (
          /* MODO 1: SELEÇÃO POR DATA EXATA (DIA / MÊS / ANO ATÉ DIA / MÊS / ANO) */
          <div className="space-y-3.5">
            {/* Chips de Atalhos Rápidos com feedback visual ativo */}
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              <span className="text-[11px] font-bold text-blue-950 mr-1 flex items-center gap-1">
                <Clock className="size-3 text-blue-600" />
                <span>Atalhos de 1 Clique:</span>
              </span>
              <button
                type="button"
                onClick={() => applyPreset("current_month_mtd")}
                className={cn(
                  "rounded-lg px-2.5 py-1 text-[11px] font-semibold transition shadow-2xs border",
                  startDate === "2026-10-01" && endDate === "2026-10-02"
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-blue-900 border-blue-200 hover:bg-blue-50",
                )}
              >
                ⚡ Outubro/2026 MTD (01 a 02/10)
              </button>
              <button
                type="button"
                onClick={() => applyPreset("last7")}
                className={cn(
                  "rounded-lg px-2.5 py-1 text-[11px] font-semibold transition shadow-2xs border",
                  startDate === "2026-09-26" && endDate === "2026-10-02"
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50",
                )}
              >
                Últimos 7 dias
              </button>
              <button
                type="button"
                onClick={() => applyPreset("last14")}
                className={cn(
                  "rounded-lg px-2.5 py-1 text-[11px] font-semibold transition shadow-2xs border",
                  startDate === "2026-09-19" && endDate === "2026-10-02"
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50",
                )}
              >
                Últimos 14 dias
              </button>
              <button
                type="button"
                onClick={() => applyPreset("last_month_full")}
                className={cn(
                  "rounded-lg px-2.5 py-1 text-[11px] font-semibold transition shadow-2xs border",
                  startDate === "2026-09-01" && endDate === "2026-09-30"
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-blue-900 border-blue-200 hover:bg-blue-50",
                )}
              >
                Setembro/2026 Completo
              </button>
              <button
                type="button"
                onClick={() => applyPreset("last30")}
                className={cn(
                  "rounded-lg px-2.5 py-1 text-[11px] font-semibold transition shadow-2xs border",
                  startDate === "2026-09-03" && endDate === "2026-10-02"
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50",
                )}
              >
                Últimos 30 dias
              </button>
            </div>

            {/* Inputs de Data Exata (Dia, Mês e Ano) */}
            <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-2">
              {/* Bloco 1: Período Base */}
              <div className="rounded-xl border border-blue-200 bg-white p-3.5 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-blue-600" />
                    Período Base (Atual)
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium">
                    {formatDateBR(startDate)} até {formatDateBR(endDate)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                      De (Dia/Mês/Ano):
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-2.5 py-1.5 text-xs font-bold text-slate-800 shadow-2xs focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                      Até (Dia/Mês/Ano):
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-2.5 py-1.5 text-xs font-bold text-slate-800 shadow-2xs focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Bloco 2: Período Comparado */}
              <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-slate-400" />
                    Período Comparado
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium">
                    {formatDateBR(computedCompare.start)} até {formatDateBR(computedCompare.end)}
                  </span>
                </div>

                <div className="space-y-2">
                  <select
                    value={compareType}
                    onChange={(e) =>
                      setCompareType(
                        e.target.value as
                          | "previous_month_same_days"
                          | "preceding_period"
                          | "previous_year"
                          | "custom",
                      )
                    }
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-2.5 py-1.5 text-xs font-semibold text-slate-800 shadow-2xs focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="previous_month_same_days">
                      Mesmo intervalo no Mês Anterior ({formatDateBR(computedCompare.start)} a {formatDateBR(computedCompare.end)})
                    </option>
                    <option value="preceding_period">
                      Período imediatamente anterior ({formatDateBR(computedCompare.start)} a {formatDateBR(computedCompare.end)})
                    </option>
                    <option value="previous_year">
                      Mesmo período no Ano Anterior / YoY ({formatDateBR(computedCompare.start)} a {formatDateBR(computedCompare.end)})
                    </option>
                    <option value="custom">Personalizado (escolher datas)</option>
                  </select>

                  {compareType === "custom" && (
                    <div className="grid grid-cols-2 gap-2 pt-1 animate-in fade-in duration-150">
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                          Comparar De:
                        </label>
                        <input
                          type="date"
                          value={compareStartDate}
                          onChange={(e) => setCompareStartDate(e.target.value)}
                          className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-2.5 py-1.5 text-xs font-bold text-slate-800 shadow-2xs focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                          Comparar Até:
                        </label>
                        <input
                          type="date"
                          value={compareEndDate}
                          onChange={(e) => setCompareEndDate(e.target.value)}
                          className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-2.5 py-1.5 text-xs font-bold text-slate-800 shadow-2xs focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                          required
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* MODO 2: SELEÇÃO POR MESES FECHADOS (MoM) */
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs text-blue-950 font-semibold">
                <span className="size-2 rounded-full bg-blue-600" />
                <span>Mês Base:</span>
                <select
                  value={selectedCurrentMonth}
                  onChange={(e) => setSelectedCurrentMonth(e.target.value)}
                  className="rounded-xl border border-blue-200 bg-white px-3 py-1.5 text-xs font-bold text-blue-900 shadow-2xs focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                >
                  {availableMonths.map((m) => (
                    <option key={m.key} value={m.key}>
                      {m.label} ({m.count} vendas)
                    </option>
                  ))}
                </select>
              </div>

              <span className="text-xs font-bold text-slate-400">vs</span>

              <div className="flex items-center gap-1.5 text-xs text-slate-700 font-semibold">
                <span className="size-2 rounded-full bg-slate-400" />
                <span>Mês Comparado:</span>
                <select
                  value={selectedPrevMonth}
                  onChange={(e) => setSelectedPrevMonth(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-800 shadow-2xs focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                >
                  {availableMonths.map((m) => (
                    <option key={m.key} value={m.key}>
                      {m.label} ({m.count} vendas)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Botões Rápidos MoM e YoY */}
            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  const idx = availableMonths.findIndex((m) => m.key === selectedCurrentMonth);
                  if (idx >= 0 && idx + 1 < availableMonths.length) {
                    setSelectedPrevMonth(availableMonths[idx + 1].key);
                  }
                }}
                className="rounded-lg border border-blue-200 bg-white px-2.5 py-1 text-xs font-semibold text-blue-800 shadow-2xs hover:bg-blue-50 transition"
              >
                MoM (Mês Anterior)
              </button>
              <button
                type="button"
                onClick={() => {
                  const [y, m] = selectedCurrentMonth.split("-").map(Number);
                  const yoy = `${y - 1}-${String(m).padStart(2, "0")}`;
                  setSelectedPrevMonth(yoy);
                }}
                className="rounded-lg border border-blue-200 bg-white px-2.5 py-1 text-xs font-semibold text-blue-800 shadow-2xs hover:bg-blue-50 transition"
              >
                YoY (Ano Anterior)
              </button>
            </div>
          </div>
        )}

        {/* BARRA DE AÇÃO COM O BOTÃO "BUSCAR" (Destacado e com resumo) */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-blue-100 pt-3">
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-600 min-w-0">
            <span className="font-semibold text-slate-700 shrink-0">Consulta a ser realizada:</span>
            <span className="inline-flex items-center gap-1 rounded-md bg-blue-100/70 px-2 py-0.5 font-bold text-blue-900 text-[11px] truncate max-w-full">
              {mode === "custom_range"
                ? `${formatDateBR(startDate)} a ${formatDateBR(endDate)}`
                : availableMonths.find((m) => m.key === selectedCurrentMonth)?.label || selectedCurrentMonth}
            </span>
            <span className="text-slate-400 font-bold shrink-0">vs</span>
            <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 font-semibold text-slate-700 text-[11px] truncate max-w-full">
              {mode === "custom_range"
                ? `${formatDateBR(computedCompare.start)} a ${formatDateBR(computedCompare.end)}`
                : availableMonths.find((m) => m.key === selectedPrevMonth)?.label || selectedPrevMonth}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="submit"
              disabled={isPending}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-md shadow-blue-500/25 transition hover:bg-blue-700 active:scale-98 disabled:opacity-50 cursor-pointer"
            >
              <Search className="size-3.5" />
              <span>{isPending ? "Buscando dados..." : "Buscar e Comparar"}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
