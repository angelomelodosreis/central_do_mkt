"use client";

import { useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Building2,
  Search,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import type { BuComparisonStat } from "@/lib/modules/sales/types";

function formatCurrency(val: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(val);
}

export function BuGrowthMatrix({
  data,
  currentLabel,
  previousLabel,
}: {
  data: BuComparisonStat[];
  currentLabel: string;
  previousLabel: string;
}) {
  const [search, setSearch] = useState("");
  const [filterMode, setFilterMode] = useState<"all" | "gainers" | "decliners">("all");

  const filtered = data
    .filter((bu) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        bu.buLabel.toLowerCase().includes(q) ||
        bu.buCode.toLowerCase().includes(q)
      );
    })
    .filter((bu) => {
      if (filterMode === "gainers") return bu.revenueGrowthPercent > 0;
      if (filterMode === "decliners") return bu.revenueGrowthPercent < 0;
      return true;
    });

  // Identificar maior receita para normalização de barra
  const maxRevenue = Math.max(...data.map((b) => b.currentRevenue), 1);

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs">
      {/* Top Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900">
              Matriz de Crescimento de Business Units (MoM)
            </h3>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
              {data.length} BUs MedCof
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Comparativo de tração por unidade: {currentLabel} vs {previousLabel}
          </p>
        </div>

        {/* Controles de Filtro e Busca */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Busca */}
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar BU..."
              className="rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-brand-500 focus:outline-none"
            />
          </div>

          {/* Filtro Rápido */}
          <div className="flex rounded-xl border border-slate-200 bg-slate-100/60 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setFilterMode("all")}
              className={`rounded-lg px-2 py-1 font-medium transition ${
                filterMode === "all"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Todas
            </button>
            <button
              type="button"
              onClick={() => setFilterMode("gainers")}
              className={`flex items-center gap-1 rounded-lg px-2 py-1 font-medium transition ${
                filterMode === "gainers"
                  ? "bg-white text-emerald-700 shadow-2xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <TrendingUp className="size-3 text-emerald-600" />
              <span>Em Alta</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterMode("decliners")}
              className={`flex items-center gap-1 rounded-lg px-2 py-1 font-medium transition ${
                filterMode === "decliners"
                  ? "bg-white text-rose-700 shadow-2xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <TrendingDown className="size-3 text-rose-600" />
              <span>Em Queda</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tabela de BUs */}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-xs min-w-[640px]">
          <thead>
            <tr className="border-b border-slate-200/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              <th className="py-2.5 pr-4 whitespace-nowrap">Business Unit</th>
              <th className="py-2.5 px-3 text-right whitespace-nowrap">{currentLabel}</th>
              <th className="py-2.5 px-3 text-right whitespace-nowrap">{previousLabel}</th>
              <th className="py-2.5 px-3 text-right whitespace-nowrap">Variação R$</th>
              <th className="py-2.5 px-3 text-right whitespace-nowrap">Crescimento %</th>
              <th className="py-2.5 pl-3 text-right whitespace-nowrap">Ticket Médio</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400">
                  Nenhuma Business Unit encontrada para os filtros aplicados.
                </td>
              </tr>
            ) : (
              filtered.map((bu) => {
                const isPositive = bu.revenueDelta >= 0;
                const progressPercent = Math.min(
                  100,
                  Math.round((bu.currentRevenue / maxRevenue) * 100),
                );

                return (
                  <tr
                    key={bu.buCode}
                    className="transition hover:bg-slate-50/80 group"
                  >
                    {/* Nome & Barra de Representatividade */}
                    <td className="py-3 pr-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-800 group-hover:text-brand-600">
                          {bu.buLabel}
                        </span>
                        <div className="mt-1 h-1 w-32 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-brand-500"
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Receita Atual & Vendas */}
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <div className="font-bold text-slate-900">
                        {formatCurrency(bu.currentRevenue)}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {bu.currentSales} vendas
                      </div>
                    </td>

                    {/* Receita Anterior & Vendas */}
                    <td className="py-3 px-3 text-right text-slate-600 whitespace-nowrap">
                      <div>{formatCurrency(bu.previousRevenue)}</div>
                      <div className="text-[10px] text-slate-400">
                        {bu.previousSales} vendas
                      </div>
                    </td>

                    {/* Variação Monetária */}
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <span
                        className={`font-semibold ${
                          isPositive ? "text-emerald-600" : "text-rose-600"
                        }`}
                      >
                        {isPositive ? "+" : ""}
                        {formatCurrency(bu.revenueDelta)}
                      </span>
                    </td>

                    {/* Variação Percentual */}
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                          isPositive
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-rose-50 text-rose-700"
                        }`}
                      >
                        {isPositive ? (
                          <ArrowUpRight className="size-3" />
                        ) : (
                          <ArrowDownRight className="size-3" />
                        )}
                        <span>
                          {isPositive ? "+" : ""}
                          {bu.revenueGrowthPercent.toFixed(1)}%
                        </span>
                      </span>
                    </td>

                    {/* Ticket Médio */}
                    <td className="py-3 pl-3 text-right whitespace-nowrap">
                      <div className="font-medium text-slate-800">
                        {formatCurrency(bu.currentAvgTicket)}
                      </div>
                      {bu.previousAvgTicket > 0 && (
                        <div className="text-[10px] text-slate-400">
                          ant: {formatCurrency(bu.previousAvgTicket)}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
