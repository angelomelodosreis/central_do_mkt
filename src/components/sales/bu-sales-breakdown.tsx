"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { BuSalesStat } from "@/lib/modules/sales/types";

export function BuSalesBreakdown({ data }: { data: BuSalesStat[] }) {
  if (!data || data.length === 0) return null;

  // Pega as top 10 BUs para visualização limpa
  const topBus = data.slice(0, 10);

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="font-display text-base font-bold text-slate-900">
            Top Business Units em Faturamento
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Receita bruta e volume de matrículas por especialidade MedCof
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
          {data.length} BUs com vendas
        </span>
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"
            data={topBus}
            margin={{ top: 5, right: 20, left: 40, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
            <XAxis
              type="number"
              stroke="#94a3b8"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`}
            />
            <YAxis
              type="category"
              dataKey="buLabel"
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              width={100}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const item = payload[0].payload as BuSalesStat;
                  return (
                    <div className="rounded-xl border border-slate-200 bg-white/95 p-3 shadow-md backdrop-blur-xs text-xs">
                      <p className="font-bold text-slate-900">{item.buLabel}</p>
                      <p className="mt-0.5 font-mono text-[10px] text-slate-400">{item.buCode}</p>
                      <div className="mt-2 space-y-1">
                        <p className="font-semibold text-brand-600">
                          Receita: {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(item.revenue)} ({item.sharePercentage}% do total)
                        </p>
                        <p className="text-slate-600">
                          Vendas: {item.salesCount} matrículas
                        </p>
                        <p className="text-slate-600">
                          Ticket Médio: {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(item.averageTicket)}
                        </p>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="revenue" fill="#3b82f6" radius={[0, 4, 4, 0]} maxBarSize={18} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
