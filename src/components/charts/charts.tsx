"use client";

import { useId } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
} from "recharts";

import { cn } from "@/lib/utils/cn";

export type PontoDaSerie = {
  label: string;
  /** Barra. `null` = sem dado. */
  valor: number | null;
  /** Linha sobreposta opcional. */
  linha?: number | null;
  /** Título personalizado para o tooltip. */
  titulo?: string;
};

/**
 * Custom Tooltip no padrão shadcn/ui e MedCof Design System.
 */
function ChartCustomTooltip({
  active,
  payload,
  label,
  rotuloLinha,
}: {
  active?: boolean;
  payload?: any[];
  label?: string;
  rotuloLinha?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
      <p className="text-xs font-semibold text-slate-900">{label}</p>
      <div className="mt-1.5 space-y-1">
        {payload.map((entry, index) => {
          const isLine = entry.dataKey === "linha";
          const title = isLine ? (rotuloLinha ?? "Linha") : "Valor";
          const val = entry.value;

          return (
            <div
              key={`item-${index}`}
              className="flex items-center justify-between gap-4 text-xs"
            >
              <span className="flex items-center gap-1.5 text-slate-500">
                <span
                  className="size-2 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span>{title}:</span>
              </span>
              <span className="font-semibold tabular-nums text-slate-900">
                {typeof val === "number"
                  ? val.toLocaleString("pt-BR", { maximumFractionDigits: 2 })
                  : (val ?? "—")}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Barras com Linha opcional implementado com Recharts (ComposedChart).
 */
export function BarrasComLinha({
  pontos,
  altura = 220,
  corBarra = "#dc2626", // brand-600 MedCof
  corLinha = "#0f172a", // slate-900
  rotuloLinha,
}: {
  pontos: PontoDaSerie[];
  altura?: number;
  corBarra?: string;
  corLinha?: string;
  rotuloLinha?: string;
}) {
  const chartId = useId();

  if (pontos.length === 0) return null;

  // Converte a série para o formato do Recharts
  const data = pontos.map((p) => ({
    label: p.label,
    valor: p.valor,
    linha: p.linha ?? null,
  }));

  const temLinha = pontos.some(
    (p) => p.linha !== null && p.linha !== undefined,
  );

  // Mapeia classes Tailwind se passadas como string para cores hex
  const fillBarra = corBarra.startsWith("#")
    ? corBarra
    : corBarra.includes("brand")
      ? "#dc2626"
      : "#475569";

  const strokeLinha = corLinha.startsWith("#")
    ? corLinha
    : corLinha.includes("slate")
      ? "#0f172a"
      : "#dc2626";

  return (
    <div className="w-full">
      <div style={{ width: "100%", height: altura }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#e2e8f0"
            />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={{ stroke: "#e2e8f0" }}
              tick={{ fill: "#64748b", fontSize: 11 }}
              interval="preserveStartEnd"
            />
            <YAxis
              yAxisId="left"
              tickLine={false}
              axisLine={false}
              tick={{ fill: "#94a3b8", fontSize: 11 }}
              tickFormatter={(v) =>
                typeof v === "number"
                  ? v >= 1000
                    ? `${(v / 1000).toFixed(0)}k`
                    : `${v}`
                  : `${v}`
              }
            />
            {temLinha && (
              <YAxis
                yAxisId="right"
                orientation="right"
                tickLine={false}
                axisLine={false}
                tick={{ fill: "#94a3b8", fontSize: 11 }}
              />
            )}
            <Tooltip
              content={<ChartCustomTooltip rotuloLinha={rotuloLinha} />}
              cursor={{ fill: "rgba(241, 245, 249, 0.6)" }}
            />
            <Bar
              yAxisId="left"
              dataKey="valor"
              fill={fillBarra}
              radius={[4, 4, 0, 0]}
              maxBarSize={38}
            />
            {temLinha && (
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="linha"
                stroke={strokeLinha}
                strokeWidth={2.5}
                dot={{ r: 3, fill: strokeLinha }}
                activeDot={{ r: 5 }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {rotuloLinha ? (
        <p className="mt-2 text-center text-xs text-slate-500">
          <span
            className="mr-1.5 inline-block size-2 rounded-full align-middle"
            style={{ backgroundColor: strokeLinha }}
          />
          {rotuloLinha}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Barras horizontais ordenadas por BU / Categoria com Recharts e fallback estilizado.
 */
export function BarrasHorizontais({
  itens,
  className,
}: {
  itens: Array<{
    id: string;
    label: string;
    valor: number | null;
    valorFormatado: string;
    detalhe?: string;
    href?: string;
  }>;
  className?: string;
}) {
  const teto = Math.max(
    ...itens.map((item) => item.valor ?? 0).filter((valor) => valor > 0),
    1,
  );

  return (
    <ul className={cn("divide-y divide-slate-100", className)}>
      {itens.map((item) => {
        const largura = item.valor === null ? 0 : (item.valor / teto) * 100;
        return (
          <li
            key={item.id}
            className="px-5 py-2.5 transition hover:bg-slate-50/50"
          >
            <div className="flex items-baseline justify-between gap-3">
              <span className="min-w-0 truncate text-sm font-medium text-slate-800">
                {item.label}
              </span>
              <span className="shrink-0 text-sm font-semibold tabular-nums text-slate-900">
                {item.valorFormatado}
              </span>
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-brand-600 transition-all duration-500"
                  style={{ width: `${largura}%` }}
                />
              </div>
              {item.detalhe ? (
                <span className="shrink-0 text-xs tabular-nums text-slate-500">
                  {item.detalhe}
                </span>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
