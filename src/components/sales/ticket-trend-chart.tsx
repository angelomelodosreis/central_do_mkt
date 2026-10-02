"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DailySalesPoint } from "@/lib/modules/sales/types";

export function TicketTrendChart({ data }: { data: DailySalesPoint[] }) {
  if (!data || data.length === 0) return null;

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
      <div className="mb-4">
        <h3 className="font-display text-base font-bold text-slate-900">
          Tendência do Ticket Médio (R$)
        </h3>
        <p className="mt-0.5 text-xs text-slate-500">
          Flutuação do ticket médio ponderado por dia (análise de descontos e lotes de vendas)
        </p>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis
              dataKey="label"
              stroke="#94a3b8"
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#94a3b8"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `R$ ${v}`}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const item = payload[0].payload as DailySalesPoint;
                  return (
                    <div className="rounded-xl border border-slate-200 bg-white/95 p-3 shadow-md backdrop-blur-xs text-xs">
                      <p className="font-bold text-slate-800">{item.date}</p>
                      <p className="mt-1 font-semibold text-indigo-600">
                        Ticket Médio: {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(item.averageTicket)}
                      </p>
                      <p className="text-slate-500 text-[11px]">
                        Receita do dia: {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(item.revenue)} ({item.velocitySales} vendas)
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Line
              type="monotone"
              dataKey="averageTicket"
              stroke="#6366f1"
              strokeWidth={2.5}
              dot={{ r: 3, fill: "#6366f1" }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
