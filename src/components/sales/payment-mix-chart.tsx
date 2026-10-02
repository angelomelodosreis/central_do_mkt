"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { PaymentMethodStat } from "@/lib/modules/sales/types";

const COLORS: Record<string, string> = {
  pix: "#10b981", // verde esmeralda
  credit_card: "#3b82f6", // azul
  boleto: "#f59e0b", // âmbar
  other: "#94a3b8", // cinza
};

export function PaymentMixChart({ data }: { data: PaymentMethodStat[] }) {
  if (!data || data.length === 0) return null;

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
      <div className="mb-4">
        <h3 className="font-display text-base font-bold text-slate-900">
          Mix de Formas de Pagamento
        </h3>
        <p className="mt-0.5 text-xs text-slate-500">
          Distribuição percentual e ticket médio por meio de captura
        </p>
      </div>

      <div className="flex flex-col items-center sm:flex-row">
        <div className="h-52 w-full sm:w-1/2">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={75}
                paddingAngle={4}
                dataKey="count"
              >
                {data.map((entry) => (
                  <Cell
                    key={entry.method}
                    fill={COLORS[entry.method] || "#94a3b8"}
                  />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0].payload as PaymentMethodStat;
                    return (
                      <div className="rounded-xl border border-slate-200 bg-white/95 p-2.5 shadow-md text-xs">
                        <p className="font-bold text-slate-900">{item.label}</p>
                        <p className="mt-1 text-slate-600">{item.count} pedidos ({item.percentage}%)</p>
                        <p className="font-semibold text-brand-600">
                          Receita: {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(item.revenue)}
                        </p>
                        <p className="text-slate-500 text-[11px]">
                          Ticket Médio: {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(item.averageTicket)}
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-4 w-full space-y-2.5 sm:mt-0 sm:w-1/2 sm:pl-4">
          {data.map((item) => (
            <div key={item.method} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span
                  className="size-3 rounded-full shrink-0"
                  style={{ backgroundColor: COLORS[item.method] || "#94a3b8" }}
                />
                <span className="font-medium text-slate-700">{item.label}</span>
              </div>
              <div className="text-right">
                <span className="font-bold text-slate-900">{item.percentage}%</span>
                <span className="ml-1 text-[11px] text-slate-400">({item.count})</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
