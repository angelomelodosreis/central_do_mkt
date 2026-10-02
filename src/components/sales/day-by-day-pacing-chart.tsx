"use client";

import { useState } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DayByDayPoint } from "@/lib/modules/sales/types";

function formatCurrency(val: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(val);
}

export function DayByDayPacingChart({
  series,
  currentLabel,
  previousLabel,
}: {
  series: DayByDayPoint[];
  currentLabel: string;
  previousLabel: string;
}) {
  const [metric, setMetric] = useState<"revenue" | "sales">("revenue");
  const [mode, setMode] = useState<"cumulative" | "daily">("cumulative");

  // Determina a chave de dados
  const currentKey =
    metric === "revenue"
      ? mode === "cumulative"
        ? "currentCumulativeRevenue"
        : "currentRevenue"
      : mode === "cumulative"
        ? "currentCumulativeSales"
        : "currentSales";

  const prevKey =
    metric === "revenue"
      ? mode === "cumulative"
        ? "previousCumulativeRevenue"
        : "previousRevenue"
      : mode === "cumulative"
        ? "previousCumulativeSales"
        : "previousSales";

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs">
      {/* Cabeçalho & Controles */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900">
              Pacing Comparativo Dia a Dia (1 a 31)
            </h3>
            <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-bold text-brand-700 uppercase">
              Sobreposição Dual
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Comparação da curva diária:{" "}
            <strong className="text-blue-600">{currentLabel}</strong> vs{" "}
            <strong className="text-slate-500">{previousLabel}</strong>
          </p>
        </div>

        {/* Alternadores */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Métrica: Receita vs Volume */}
          <div className="flex rounded-xl border border-slate-200 bg-slate-100/60 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setMetric("revenue")}
              className={`rounded-lg px-2.5 py-1 font-medium transition ${
                metric === "revenue"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Receita (R$)
            </button>
            <button
              type="button"
              onClick={() => setMetric("sales")}
              className={`rounded-lg px-2.5 py-1 font-medium transition ${
                metric === "sales"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Vendas (Qtd)
            </button>
          </div>

          {/* Modo: Acumulado vs Diário */}
          <div className="flex rounded-xl border border-slate-200 bg-slate-100/60 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setMode("cumulative")}
              className={`rounded-lg px-2.5 py-1 font-medium transition ${
                mode === "cumulative"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Acumulado
            </button>
            <button
              type="button"
              onClick={() => setMode("daily")}
              className={`rounded-lg px-2.5 py-1 font-medium transition ${
                mode === "daily"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Por Dia
            </button>
          </div>
        </div>
      </div>

      {/* Legenda Visual */}
      <div className="mt-4 flex items-center gap-5 text-xs">
        <div className="flex items-center gap-2">
          <span className="h-0.5 w-5 bg-blue-600 rounded-full" />
          <span className="font-semibold text-slate-800">{currentLabel} (Atual)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-0.5 w-5 bg-slate-400 border-t border-dashed border-slate-400" />
          <span className="font-medium text-slate-500">{previousLabel} (Comparado)</span>
        </div>
      </div>

      {/* Gráfico Recharts */}
      <div className="mt-4 h-72 w-full sm:h-80">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={series}
            margin={{ top: 10, right: 10, left: 10, bottom: 5 }}
          >
            <defs>
              <linearGradient id="currentPacingGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.18} />
                <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis
              dataKey="day"
              tickFormatter={(d) => `D${d}`}
              tick={{ fontSize: 11, fill: "#64748b" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#64748b" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) =>
                metric === "revenue"
                  ? v >= 1000000
                    ? `R$ ${(v / 1000000).toFixed(1)}M`
                    : v >= 1000
                      ? `R$ ${(v / 1000).toFixed(0)}k`
                      : `R$ ${v}`
                  : String(v)
              }
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload || !payload.length) return null;
                const curVal = Number(payload.find((p) => p.dataKey === currentKey)?.value || 0);
                const prevVal = Number(payload.find((p) => p.dataKey === prevKey)?.value || 0);
                const diff = curVal - prevVal;
                const isAhead = diff >= 0;

                return (
                  <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-lg text-xs">
                    <p className="font-bold text-slate-800">Dia {label} do Mês</p>
                    <div className="mt-2 space-y-1.5">
                      <div className="flex items-center justify-between gap-4">
                        <span className="flex items-center gap-1.5 text-blue-600 font-semibold">
                          <span className="size-2 rounded-full bg-blue-600" />
                          {currentLabel}:
                        </span>
                        <span className="font-bold text-slate-900">
                          {metric === "revenue" ? formatCurrency(curVal) : `${curVal} vendas`}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-4">
                        <span className="flex items-center gap-1.5 text-slate-500 font-medium">
                          <span className="size-2 rounded-full bg-slate-400" />
                          {previousLabel}:
                        </span>
                        <span className="font-medium text-slate-700">
                          {metric === "revenue" ? formatCurrency(prevVal) : `${prevVal} vendas`}
                        </span>
                      </div>

                      <div className="mt-1 pt-1.5 border-t border-slate-100 flex items-center justify-between gap-4">
                        <span className="text-[11px] text-slate-500">Ritmo (Delta):</span>
                        <span
                          className={`font-bold text-[11px] ${
                            isAhead ? "text-emerald-600" : "text-rose-600"
                          }`}
                        >
                          {isAhead ? "▲ +" : "▼ "}
                          {metric === "revenue" ? formatCurrency(diff) : `${diff} vendas`}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              }}
            />

            {/* Linha Tracejada do Período Anterior */}
            <Line
              type="monotone"
              dataKey={prevKey}
              stroke="#94a3b8"
              strokeWidth={2}
              strokeDasharray="4 4"
              dot={false}
              name={previousLabel}
            />

            {/* Linha e Área do Período Atual */}
            {mode === "cumulative" ? (
              <Area
                type="monotone"
                dataKey={currentKey}
                stroke="#2563eb"
                strokeWidth={2.5}
                fill="url(#currentPacingGradient)"
                dot={false}
                name={currentLabel}
              />
            ) : (
              <Line
                type="monotone"
                dataKey={currentKey}
                stroke="#2563eb"
                strokeWidth={2.5}
                dot={false}
                name={currentLabel}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
