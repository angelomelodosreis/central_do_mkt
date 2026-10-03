"use client";

import Link from "next/link";
import { ArrowRight, Compass, Layers, MessageSquare, CheckSquare } from "lucide-react";

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
      metric: `${salesCount.toLocaleString("pt-BR")} vendas registradas`,
      href: "/panorama",
      icon: Compass,
      badgeText: "Google Sheets",
      badgeClass: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
      accentBg: "from-emerald-950 via-slate-900 to-slate-950",
      iconColor: "text-emerald-400",
      hoverBorder: "hover:border-emerald-400/50",
    },
    {
      title: "Planejamento 2.0",
      tag: "Estratégia & Metas",
      description: "Diagnóstico semestral e metas 2.0 de todas as unidades.",
      metric: `${busCount} Business Units estruturadas`,
      href: primaryBuSlug ? `/planejamento/${primaryBuSlug}` : "/planejamento",
      icon: Layers,
      badgeText: "23 BUs MedCof",
      badgeClass: "bg-blue-500/15 text-blue-300 border-blue-500/30",
      accentBg: "from-blue-950 via-slate-900 to-slate-950",
      iconColor: "text-blue-400",
      hoverBorder: "hover:border-blue-400/50",
    },
    {
      title: "Feed de Revisões",
      tag: "Slack Canvas Feed",
      description: "Acompanhamento semanal por BU, pautas e prazos.",
      metric: "Pautas & Planos de Ação",
      href: "/planejamento/revisoes",
      icon: MessageSquare,
      badgeText: "Novo Feed",
      badgeClass: "bg-purple-500/15 text-purple-300 border-purple-500/30",
      accentBg: "from-purple-950 via-slate-900 to-slate-950",
      iconColor: "text-purple-400",
      hoverBorder: "hover:border-purple-400/50",
    },
    {
      title: "Execução & SLA",
      tag: "Fila de Tarefas",
      description: "Entregáveis de marketing, campanhas e criativos.",
      metric: `${tasksCount} ${tasksCount === 1 ? "tarefa atribuída" : "tarefas atribuídas"}`,
      href: "/tarefas",
      icon: CheckSquare,
      badgeText: delayedCount > 0 ? `${delayedCount} em atraso` : "Em dia",
      badgeClass:
        delayedCount > 0
          ? "bg-rose-500/20 text-rose-300 border-rose-500/30"
          : "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
      accentBg: "from-rose-950 via-slate-900 to-slate-950",
      iconColor: "text-rose-400",
      hoverBorder: "hover:border-rose-400/50",
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
            className={`group relative flex flex-col justify-between overflow-hidden rounded-[1.75rem] border border-white/10 bg-gradient-to-br ${card.accentBg} p-5 text-white shadow-lg transition-all duration-200 hover:-translate-y-1 hover:shadow-xl ${card.hoverBorder}`}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="flex size-11 items-center justify-center rounded-2xl bg-white/10 shadow-inner backdrop-blur-md ring-1 ring-white/15 transition-transform group-hover:scale-105">
                  <IconComponent className={`size-5 ${card.iconColor}`} />
                </span>
                <span
                  className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${card.badgeClass}`}
                >
                  {card.badgeText}
                </span>
              </div>

              <div className="mt-4">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  {card.tag}
                </span>
                <h4 className="font-display text-base font-bold text-white transition-colors group-hover:text-brand-300">
                  {card.title}
                </h4>
                <p className="mt-1 text-xs text-slate-300/80 leading-relaxed line-clamp-2">
                  {card.description}
                </p>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-3">
              <span className="text-xs font-semibold text-slate-200">
                {card.metric}
              </span>
              <span className="flex size-7 items-center justify-center rounded-full bg-white/10 text-white transition-all group-hover:bg-white group-hover:text-slate-900 group-hover:translate-x-0.5">
                <ArrowRight className="size-3.5" />
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

