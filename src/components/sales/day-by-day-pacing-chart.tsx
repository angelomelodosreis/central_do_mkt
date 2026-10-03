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
  const [showProjection, setShowProjection] = useState(true);

  // Verifica se há dias futuros no período atual
  const hasFutureDays = series.some((p) => p.isCurrentFuture || p.currentRevenue === null);
  const elapsedDays = series.filter((p) => p.currentRevenue !== null && !p.isCurrentFuture);
  const lastElapsedDay = elapsedDays.length > 0 ? elapsedDays[elapsedDays.length - 1].day : 0;

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

  const projKey =
    metric === "revenue"
      ? mode === "cumulative"
        ? "projectedCumulativeRevenue"
        : "projectedRevenue"
      : undefined;

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs">
      {/* Cabeçalho & Controles */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-bold text-slate-900">
              Pacing Comparativo Dia a Dia {series.length > 0 ? `(Dia 1 a ${series.length})` : ""}
            </h3>
            {hasFutureDays ? (
              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 uppercase ring-1 ring-blue-200/70">
                Mês em Curso · Até Dia {String(lastElapsedDay).padStart(2, "0")}
              </span>
            ) : (
              <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-bold text-brand-700 uppercase">
                Período Fechado
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500">
            Comparação da curva diária:{" "}
            <strong className="text-blue-600">{currentLabel}</strong> vs{" "}
            <strong className="text-slate-500">{previousLabel}</strong>
            {hasFutureDays && " (dias futuros não são preenchidos com zero; a linha encerra em hoje)"}
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

          {/* Toggle de Projeção Run-Rate se houver dias futuros e métrica de receita */}
          {hasFutureDays && metric === "revenue" && (
            <button
              type="button"
              onClick={() => setShowProjection((prev) => !prev)}
              className={`rounded-xl border px-2.5 py-1 text-xs font-medium transition ${
                showProjection
                  ? "border-blue-300 bg-blue-50 text-blue-800"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
              title="Exibir ou ocultar projeção estatística Run-Rate para os dias restantes do mês"
            >
              {showProjection ? "Projeção Ativa ✓" : "+ Ver Projeção"}
            </button>
          )}
        </div>
      </div>

      {/* Legenda Visual */}
      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs">
        <div className="flex items-center gap-2">
          <span className="h-0.5 w-5 bg-blue-600 rounded-full" />
          <span className="font-semibold text-slate-800">
            {currentLabel} {hasFutureDays ? `(Realizado até Dia ${String(lastElapsedDay).padStart(2, "0")})` : "(Atual)"}
          </span>
        </div>
        {hasFutureDays && showProjection && metric === "revenue" && (
          <div className="flex items-center gap-2">
            <span className="h-0.5 w-5 border-t-2 border-dotted border-blue-400" />
            <span className="font-medium text-blue-600">Projeção Run-Rate (Dias restantes)</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <span className="h-0.5 w-5 bg-slate-400 border-t border-dashed border-slate-400" />
          <span className="font-medium text-slate-500">{previousLabel} (Comparado completo)</span>
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

                const curItem = payload.find((p) => p.dataKey === currentKey);
                const prevItem = payload.find((p) => p.dataKey === prevKey);
                const projItem = projKey ? payload.find((p) => p.dataKey === projKey) : null;

                const curRaw = curItem?.value;
                const isCurFuture = curRaw === null || curRaw === undefined;
                const curVal = isCurFuture ? null : Number(curRaw);
                const prevVal = prevItem?.value !== null && prevItem?.value !== undefined ? Number(prevItem.value) : null;
                const projVal = projItem?.value !== null && projItem?.value !== undefined ? Number(projItem.value) : null;

                const diff = curVal !== null && prevVal !== null ? curVal - prevVal : null;
                const isAhead = diff !== null ? diff >= 0 : false;

                return (
                  <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-lg text-xs min-w-[210px]">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                      <p className="font-bold text-slate-800">Dia {label} do Período</p>
                      {isCurFuture && (
                        <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                          Dia futuro (em aberto)
                        </span>
                      )}
                    </div>

                    <div className="mt-2 space-y-1.5">
                      <div className="flex items-center justify-between gap-4">
                        <span className="flex items-center gap-1.5 text-blue-600 font-semibold">
                          <span className="size-2 rounded-full bg-blue-600" />
                          {currentLabel}:
                        </span>
                        <span className="font-bold text-slate-900">
                          {isCurFuture
                            ? "Não decorrido"
                            : metric === "revenue"
                              ? formatCurrency(curVal!)
                              : `${curVal} vendas`}
                        </span>
                      </div>

                      {isCurFuture && projVal !== null && showProjection && metric === "revenue" && (
                        <div className="flex items-center justify-between gap-4 text-blue-600/90">
                          <span className="flex items-center gap-1.5 text-[11px] font-medium">
                            <span className="size-1.5 rounded-full bg-blue-400" />
                            Projeção Run-Rate:
                          </span>
                          <span className="font-semibold text-[11px]">
                            {formatCurrency(projVal)}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center justify-between gap-4">
                        <span className="flex items-center gap-1.5 text-slate-500 font-medium">
                          <span className="size-2 rounded-full bg-slate-400" />
                          {previousLabel}:
                        </span>
                        <span className="font-medium text-slate-700">
                          {prevVal !== null
                            ? metric === "revenue"
                              ? formatCurrency(prevVal)
                              : `${prevVal} vendas`
                            : "—"}
                        </span>
                      </div>

                      <div className="mt-1 pt-1.5 border-t border-slate-100 flex items-center justify-between gap-4">
                        <span className="text-[11px] text-slate-500">Ritmo (Delta):</span>
                        {diff !== null ? (
                          <span
                            className={`font-bold text-[11px] ${
                              isAhead ? "text-emerald-600" : "text-rose-600"
                            }`}
                          >
                            {isAhead ? "▲ +" : "▼ "}
                            {metric === "revenue" ? formatCurrency(diff) : `${diff} vendas`}
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium text-slate-400">
                            Aguardando realização
                          </span>
                        )}
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
              connectNulls={false}
            />

            {/* Projeção Run-Rate Tracejada para o Mês Atual */}
            {hasFutureDays && showProjection && projKey && (
              <Line
                type="monotone"
                dataKey={projKey}
                stroke="#60a5fa"
                strokeWidth={2}
                strokeDasharray="3 3"
                dot={false}
                name="Projeção Run-Rate"
                connectNulls={true}
              />
            )}

            {/* Linha e Área do Período Atual (com connectNulls=false para encerrar em hoje) */}
            {mode === "cumulative" ? (
              <Area
                type="monotone"
                dataKey={currentKey}
                stroke="#2563eb"
                strokeWidth={2.5}
                fill="url(#currentPacingGradient)"
                dot={false}
                name={currentLabel}
                connectNulls={false}
              />
            ) : (
              <Line
                type="monotone"
                dataKey={currentKey}
                stroke="#2563eb"
                strokeWidth={2.5}
                dot={false}
                name={currentLabel}
                connectNulls={false}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
