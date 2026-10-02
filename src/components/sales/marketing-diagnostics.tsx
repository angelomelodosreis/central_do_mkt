"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  CalendarDays,
  CircleDollarSign,
  Compass,
  PieChart as PieIcon,
  Sparkles,
} from "lucide-react";
import type {
  DayOfWeekStat,
  PriceTierStat,
} from "@/lib/modules/sales/types";

function formatCurrency(val: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(val);
}

export function MarketingDiagnostics({
  dayOfWeekStats,
  priceTiers,
}: {
  dayOfWeekStats: DayOfWeekStat[];
  priceTiers: PriceTierStat[];
}) {
  // Encontrar o melhor dia da semana em faturamento
  const bestDay = [...dayOfWeekStats].sort((a, b) => b.revenue - a.revenue)[0];
  const bestDaySales = [...dayOfWeekStats].sort((a, b) => b.sales - a.sales)[0];

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* 1. Sazonalidade por Dia da Semana */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarDays className="size-4 text-brand-600" />
            <h3 className="text-base font-bold text-slate-900">
              Sazonalidade por Dia da Semana
            </h3>
          </div>
          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 uppercase">
            Mídia & CRM
          </span>
        </div>

        <p className="mt-1 text-xs text-slate-500">
          Distribuição de faturamento ao longo da semana para calibração de campanhas
        </p>

        {/* Insight em destaque */}
        {bestDay && (
          <div className="mt-3 flex items-start gap-2 rounded-xl bg-blue-50/70 p-3 text-xs text-blue-950 border border-blue-100/60">
            <Sparkles className="mt-0.5 size-3.5 shrink-0 text-brand-600" />
            <p className="leading-relaxed">
              <strong>Pico de Conversão:</strong> O melhor dia em receita é{" "}
              <strong>{bestDay.dayName}</strong> ({formatCurrency(bestDay.revenue)} -{" "}
              {bestDay.percentageOfTotal}% do volume semanal). Ideal para picos de
              investimento no Meta/Google Ads e disparos de WhatsApp.
            </p>
          </div>
        )}

        {/* Gráfico de Barras por Dia */}
        <div className="mt-4 h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={dayOfWeekStats}
              margin={{ top: 10, right: 10, left: 10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="dayName"
                tickFormatter={(d) => d.split("-")[0].slice(0, 3)}
                tick={{ fontSize: 11, fill: "#64748b" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#64748b" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) =>
                  v >= 1000000
                    ? `R$ ${(v / 1000000).toFixed(1)}M`
                    : `R$ ${(v / 1000).toFixed(0)}k`
                }
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  const item = payload[0].payload as DayOfWeekStat;
                  return (
                    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-lg text-xs">
                      <p className="font-bold text-slate-900">{item.dayName}</p>
                      <div className="mt-1.5 space-y-1">
                        <div className="flex justify-between gap-4">
                          <span className="text-slate-500">Faturamento:</span>
                          <span className="font-bold text-slate-800">
                            {formatCurrency(item.revenue)}
                          </span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-slate-500">Vendas:</span>
                          <span className="font-medium text-slate-700">
                            {item.sales} alunos
                          </span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-slate-500">Ticket Médio:</span>
                          <span className="font-semibold text-brand-600">
                            {formatCurrency(item.avgTicket)}
                          </span>
                        </div>
                        <div className="flex justify-between gap-4 pt-1 border-t border-slate-100">
                          <span className="text-slate-400">Share da semana:</span>
                          <span className="font-bold text-slate-700">
                            {item.percentageOfTotal}%
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                }}
              />
              <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                {dayOfWeekStats.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.dayIndex === bestDay?.dayIndex ? "#2563eb" : "#93c5fd"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 2. Distribuição por Faixas de Preço (Price Tiers) */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CircleDollarSign className="size-4 text-emerald-600" />
            <h3 className="text-base font-bold text-slate-900">
              Concentração por Faixa de Ticket
            </h3>
          </div>
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 uppercase">
            Pricing & Mix
          </span>
        </div>

        <p className="mt-1 text-xs text-slate-500">
          Decomposição das vendas por camadas de preço dos infoprodutos MedCof
        </p>

        <div className="mt-4 space-y-3.5">
          {priceTiers.map((tier) => (
            <div
              key={tier.tierId}
              className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 transition hover:bg-slate-50"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800">{tier.label}</span>
                <span className="font-extrabold text-slate-900">
                  {formatCurrency(tier.revenue)}
                </span>
              </div>

              {/* Duas barras de progresso: Share de Receita vs Share de Vendas */}
              <div className="mt-2.5 space-y-1.5 text-[11px]">
                <div>
                  <div className="flex justify-between text-slate-500">
                    <span>Participação na Receita</span>
                    <span className="font-semibold text-slate-700">
                      {tier.percentageOfRevenue}%
                    </span>
                  </div>
                  <div className="mt-0.5 h-1.5 w-full rounded-full bg-slate-200/70 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-500"
                      style={{ width: `${tier.percentageOfRevenue}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-500">
                    <span>Volume de Alunos ({tier.salesCount} vendas)</span>
                    <span className="font-semibold text-slate-700">
                      {tier.percentageOfSales}%
                    </span>
                  </div>
                  <div className="mt-0.5 h-1.5 w-full rounded-full bg-slate-200/70 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-blue-500"
                      style={{ width: `${tier.percentageOfSales}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
