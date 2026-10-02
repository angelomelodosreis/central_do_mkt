"use client";

import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DailySalesPoint } from "@/lib/modules/sales/types";

export function SalesVelocityChart({ data }: { data: DailySalesPoint[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-72 items-center justify-center rounded-2xl border border-dashed border-slate-200 text-xs text-slate-400">
        Nenhum dado de vendas no período selecionado.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-display text-base font-bold text-slate-900">
            Faturamento Acumulado & Derivada de Vendas (Ritmo Diário)
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Área azul: Faturamento Acumulado (R$) · Barras verdes: Velocidade Diária (dV/dt - vendas/dia)
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="size-3 rounded-full bg-brand-600" />
            <span className="font-medium text-slate-600">Faturamento Acumulado</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-3 rounded-md bg-emerald-500" />
            <span className="font-medium text-slate-600">Derivada (Vendas/dia)</span>
          </div>
        </div>
      </div>

      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis
              dataKey="label"
              stroke="#94a3b8"
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            {/* Eixo Esquerdo: Faturamento */}
            <YAxis
              yAxisId="left"
              stroke="#94a3b8"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`}
            />
            {/* Eixo Direito: Derivada (Vendas) */}
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="#94a3b8"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v}`}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const item = payload[0].payload as DailySalesPoint;
                  return (
                    <div className="rounded-xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur-xs text-xs">
                      <p className="font-bold text-slate-800">{item.date} ({item.label})</p>
                      <div className="mt-2 space-y-1">
                        <p className="text-brand-600 font-semibold">
                          Faturamento Acumulado: {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(item.cumulativeRevenue)}
                        </p>
                        <p className="text-emerald-600 font-medium">
                          Derivada diária (dV/dt): {item.velocitySales} vendas (+{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(item.revenue)})
                        </p>
                        <p className="text-indigo-600 font-medium">
                          Ticket Médio do dia: {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(item.averageTicket)}
                        </p>
                        <p className="text-slate-500">
                          Aceleração: {item.acceleration > 0 ? `+${item.acceleration}%` : `${item.acceleration}%`} vs dia anterior
                        </p>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            {/* Faturamento Acumulado em Área */}
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="cumulativeRevenue"
              stroke="#2563eb"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#gradRevenue)"
            />
            {/* Velocidade diária em Barras */}
            <Bar
              yAxisId="right"
              dataKey="velocitySales"
              fill="#10b981"
              radius={[4, 4, 0, 0]}
              maxBarSize={22}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
