"use client";

import Link from "next/link";
import { TrendingUp, Rocket, CheckSquare, ArrowUpRight } from "lucide-react";

function formatCompact(val: number): string {
  if (val >= 1_000_000) {
    return `R$ ${(val / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}M`;
  }
  if (val >= 1_000) {
    return `R$ ${(val / 1_000).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}k`;
  }
  return `R$ ${val.toLocaleString("pt-BR")}`;
}

export function PillarsGrid({
  openTasksCount = 0,
  delayedTasksCount = 0,
  busCount = 23,
  totalRevenue = 89500000,
  monthProjected = 1400000,
}: {
  openTasksCount?: number;
  delayedTasksCount?: number;
  busCount?: number;
  totalRevenue?: number;
  monthProjected?: number;
}) {
  const pillars = [
    {
      id: "capture",
      title: "Captação & Vendas",
      subtitle: "Tempo Real & Projeção MoM",
      progress: 78,
      metricText: `${formatCompact(monthProjected)} projetados no mês`,
      daysLeft: `${formatCompact(totalRevenue)} ciclo`,
      href: "/panorama",
      icon: TrendingUp,
      gradient: "from-emerald-500 to-teal-600",
    },
    {
      id: "portfolio",
      title: "Portfólio & Lançamentos",
      subtitle: `${busCount} Business Units estruturadas`,
      progress: 88,
      metricText: "Diagnóstico 2.0 & Metas 2.0",
      daysLeft: "Ciclo ativo",
      href: "/planejamento",
      icon: Rocket,
      gradient: "from-brand-500 to-rose-600",
    },
    {
      id: "tasks",
      title: "Execução & SLA",
      subtitle:
        delayedTasksCount > 0
          ? `${delayedTasksCount} tarefas atrasadas`
          : "Fila de trabalho em dia",
      progress: delayedTasksCount > 0 ? 60 : 94,
      metricText: `${openTasksCount} na sua fila direta`,
      daysLeft: delayedTasksCount > 0 ? "Atenção necessária" : "No prazo",
      href: "/tarefas",
      icon: CheckSquare,
      gradient: "from-blue-500 to-indigo-600",
    },
  ];

  return (
    <div className="grid gap-6 pt-3 sm:grid-cols-2 lg:grid-cols-3">
      {pillars.map((item) => {
        const IconComponent = item.icon;
        return (
          <Link
            key={item.id}
            href={item.href}
            className="group relative flex flex-col justify-between rounded-[2rem] border border-slate-200/80 bg-white p-6 pt-8 shadow-[0_12px_30px_-8px_rgba(15,23,42,0.05)] transition-all duration-200 hover:-translate-y-1 hover:border-brand-300 hover:shadow-[0_20px_40px_-12px_rgba(226,38,60,0.12)]"
          >
            {/* Ícone em Cápsula Flutuante Elevada */}
            <div className="absolute -top-5 left-6 flex size-12 items-center justify-center rounded-2xl bg-white shadow-[0_8px_20px_-4px_rgba(15,23,42,0.12)] ring-1 ring-slate-100 transition-transform group-hover:scale-110">
              <span className={`flex size-9 items-center justify-center rounded-xl bg-gradient-to-br ${item.gradient} text-white shadow-xs`}>
                <IconComponent className="size-4" />
              </span>
            </div>

            {/* Seta discreta no canto superior direito */}
            <div className="flex justify-end">
              <span className="flex size-6 items-center justify-center rounded-full bg-slate-50 text-slate-400 group-hover:bg-brand-50 group-hover:text-brand-600 transition-colors">
                <ArrowUpRight className="size-3.5" />
              </span>
            </div>

            {/* Títulos */}
            <div className="mt-2">
              <h4 className="font-display text-base font-semibold text-slate-900 group-hover:text-brand-700 transition-colors">
                {item.title}
              </h4>
              <p className="mt-0.5 text-xs text-slate-500">{item.subtitle}</p>
            </div>

            {/* Barra de Progresso com porcentagem */}
            <div className="my-4 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[11px] font-medium text-slate-500">
                  Atingimento
                </span>
                <span className="font-bold tabular-nums text-slate-900">
                  {item.progress}%
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-brand-500 to-rose-400 transition-all duration-500"
                  style={{ width: `${item.progress}%` }}
                />
              </div>
            </div>

            {/* Rodapé com métrica e badge */}
            <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
              <span className="font-medium text-slate-700">
                {item.metricText}
              </span>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600 group-hover:bg-brand-50 group-hover:text-brand-700 transition-colors">
                {item.daysLeft}
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
