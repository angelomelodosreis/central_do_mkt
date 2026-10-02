"use client";

import { useState } from "react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const MONTHLY_DATA = [
  { month: "Jan", valor: 3200, display: "3.200" },
  { month: "Fev", valor: 4800, display: "4.800" },
  { month: "Mar", valor: 6100, display: "6.100" },
  { month: "Abr", valor: 9178, display: "9.178", current: true },
  { month: "Mai", valor: 7400, display: "7.400" },
  { month: "Jun", valor: 8900, display: "8.900" },
  { month: "Jul", valor: 8100, display: "8.100" },
  { month: "Ago", valor: 7600, display: "7.600" },
  { month: "Set", valor: 8800, display: "8.800" },
  { month: "Out", valor: 9200, display: "9.200" },
];

export function OverviewChart({
  totalHours = "748 h",
  totalProduction = "9.178",
  target = "9.200",
}: {
  totalHours?: string;
  totalProduction?: string;
  target?: string;
}) {
  const [period, setPeriod] = useState<"monthly" | "quarterly">("monthly");
  const [activeMonth, setActiveMonth] = useState("Abr");

  return (
    <div className="relative flex flex-col justify-between overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#1a121e] via-[#231526] to-[#140b17] p-6 text-white shadow-[0_20px_45px_-12px_rgba(20,11,23,0.4)] ring-1 ring-white/10 sm:p-7">
      {/* Luz ambiente interna suave */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-20 -top-20 size-72 rounded-full bg-brand-500/15 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-20 -left-20 size-72 rounded-full bg-rose-500/10 blur-3xl"
      />

      {/* Topo do Card */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-semibold tracking-tight text-white sm:text-xl">
            Visão Geral · Produção e Metas
          </h3>
          <p className="text-xs text-slate-400">
            Acompanhamento consolidado de tração do ciclo MedCof
          </p>
        </div>

        {/* Seletor de Período em Pílula translúcida */}
        <div className="flex items-center rounded-full bg-white/10 p-1 backdrop-blur-md ring-1 ring-white/15">
          <button
            type="button"
            onClick={() => setPeriod("monthly")}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
              period === "monthly"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-300 hover:text-white"
            }`}
          >
            Mensal
          </button>
          <button
            type="button"
            onClick={() => setPeriod("quarterly")}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
              period === "quarterly"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-300 hover:text-white"
            }`}
          >
            Trimestral
          </button>
        </div>
      </div>

      {/* Gráfico Fluido com Recharts */}
      <div className="relative z-10 my-4 h-48 w-full sm:h-56">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={MONTHLY_DATA}
            margin={{ top: 20, right: 10, left: 10, bottom: 0 }}
          >
            <defs>
              <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#e2263c" stopOpacity={0.45} />
                <stop offset="95%" stopColor="#e2263c" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="month" hide />
            <YAxis hide domain={["dataMin - 1000", "dataMax + 1000"]} />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="rounded-xl border border-white/20 bg-slate-900/90 px-3 py-1.5 text-xs text-white shadow-xl backdrop-blur-md">
                      <p className="font-semibold text-brand-300">
                        {data.month}: {data.display}
                      </p>
                      <p className="text-[10px] text-slate-300">
                        Meta atingida
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area
              type="natural"
              dataKey="valor"
              stroke="#f43f5e"
              strokeWidth={3.5}
              fillOpacity={1}
              fill="url(#areaGradient)"
              activeDot={{
                r: 7,
                fill: "#fff",
                stroke: "#e2263c",
                strokeWidth: 3,
                className: "drop-shadow-lg",
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Seletor de meses em pílula (como na imagem de referência) */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-1 border-t border-white/10 pt-3">
        {MONTHLY_DATA.map((item) => {
          const isSelected = activeMonth === item.month;
          return (
            <button
              key={item.month}
              type="button"
              onClick={() => setActiveMonth(item.month)}
              className={`rounded-full px-2.5 py-1 text-xs font-medium transition-all ${
                isSelected
                  ? "bg-white text-slate-900 shadow-sm ring-2 ring-white/50"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {item.month}
            </button>
          );
        })}
      </div>

      {/* Estatísticas Inferiores em Destaque */}
      <div className="relative z-10 mt-5 grid grid-cols-3 gap-2 border-t border-white/10 pt-4 text-center sm:gap-4 sm:text-left">
        <div className="rounded-2xl bg-white/5 p-3 backdrop-blur-sm sm:p-4">
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
            Tempo em Ação
          </p>
          <p className="mt-1 font-display text-xl font-bold tracking-tight text-white sm:text-2xl">
            {totalHours}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-400">{activeMonth}</p>
        </div>

        <div className="rounded-2xl bg-white/10 p-3 shadow-inner backdrop-blur-sm ring-1 ring-white/15 sm:p-4">
          <p className="text-[11px] font-medium uppercase tracking-wider text-brand-300">
            Produção Total
          </p>
          <p className="mt-1 font-display text-xl font-bold tracking-tight text-white sm:text-2xl">
            {totalProduction}
          </p>
          <p className="mt-0.5 text-[11px] text-brand-200">{activeMonth}</p>
        </div>

        <div className="rounded-2xl bg-white/5 p-3 backdrop-blur-sm sm:p-4">
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
            Alvo do Ciclo
          </p>
          <p className="mt-1 font-display text-xl font-bold tracking-tight text-slate-200 sm:text-2xl">
            {target}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-400">Objetivo</p>
        </div>
      </div>
    </div>
  );
}
