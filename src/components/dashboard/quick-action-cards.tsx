"use client";

import Link from "next/link";
import { ArrowRight, Compass, Layers, MessageSquare, CheckSquare } from "lucide-react";
import { formatCompactNumber } from "@/lib/utils/format";

export function QuickActionCards({
  tasksCount = 0,
  delayedCount = 0,
  primaryBuSlug,
  salesCount = 51600,
  busCount = 23,
}: {
  tasksCount?: number;
  delayedCount?: number;
  primaryBuSlug?: string | null;
  salesCount?: number;
  busCount?: number;
}) {
  const cards = [
    {
      title: "Cockpit de Vendas",
      tag: "Tempo Real · MoM",
      description: "Análise comparativa dia a dia, sazonalidade e BUs.",
      metric: `${formatCompactNumber(salesCount)} vendas registradas`,
      fullMetric: `${salesCount.toLocaleString("pt-BR")} vendas registradas`,
      href: "/panorama",
      icon: Compass,
      badgeText: "Google Sheets",
      isAlert: false,
    },
    {
      title: "Planejamento 2.0",
      tag: "Estratégia & Metas",
      description: "Diagnóstico semestral e metas 2.0 de todas as unidades.",
      metric: `${busCount} Business Units`,
      fullMetric: `${busCount} Business Units estruturadas`,
      href: primaryBuSlug ? `/planejamento/${primaryBuSlug}` : "/planejamento",
      icon: Layers,
      badgeText: "23 BUs MedCof",
      isAlert: false,
    },
    {
      title: "Feed de Revisões",
      tag: "Slack Canvas Feed",
      description: "Acompanhamento semanal por BU, pautas e prazos.",
      metric: "Pautas & Planos de Ação",
      fullMetric: "Pautas & Planos de Ação",
      href: "/planejamento/revisoes",
      icon: MessageSquare,
      badgeText: "Semanal",
      isAlert: false,
    },
    {
      title: "Execução & SLA",
      tag: "Fila de Tarefas",
      description: "Entregáveis de marketing, campanhas e criativos.",
      metric: `${tasksCount} ${tasksCount === 1 ? "tarefa" : "tarefas"}`,
      fullMetric: `${tasksCount} ${tasksCount === 1 ? "tarefa atribuída" : "tarefas atribuídas"}`,
      href: "/tarefas",
      icon: CheckSquare,
      badgeText: delayedCount > 0 ? `${delayedCount} em atraso` : "Em dia",
      isAlert: delayedCount > 0,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const IconComponent = card.icon;
        return (
          <Link
            key={card.title}
            href={card.href}
            className="group relative flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-xs"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="flex size-10 items-center justify-center rounded-xl bg-slate-50 text-slate-700 ring-1 ring-slate-200/80 transition-colors group-hover:bg-brand-50 group-hover:text-brand-600 group-hover:ring-brand-200">
                  <IconComponent className="size-5" />
                </span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ring-inset ${
                    card.isAlert
                      ? "bg-danger-50 text-danger-700 ring-danger-200"
                      : "bg-slate-100 text-slate-700 ring-slate-200/70"
                  }`}
                >
                  {card.badgeText}
                </span>
              </div>

              <div className="mt-4">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  {card.tag}
                </span>
                <h4 className="font-display text-base font-bold text-slate-900 transition-colors group-hover:text-brand-600">
                  {card.title}
                </h4>
                <p className="mt-1 text-xs text-slate-500 leading-relaxed line-clamp-2">
                  {card.description}
                </p>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3.5">
              <span
                className="text-xs font-semibold text-slate-700 truncate"
                title={card.fullMetric}
              >
                {card.metric}
              </span>
              <span className="flex size-7 items-center justify-center rounded-full bg-slate-50 text-slate-400 ring-1 ring-slate-200/60 transition-all group-hover:bg-brand-50 group-hover:text-brand-600 group-hover:ring-brand-200 group-hover:translate-x-0.5 shrink-0 ml-2">
                <ArrowRight className="size-3.5" />
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

