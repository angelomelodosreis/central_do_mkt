"use client";

import Link from "next/link";
import { ArrowRight, Compass, Flame } from "lucide-react";

export function QuickActionCards({
  tasksCount = 0,
  delayedCount = 0,
  primaryBuSlug,
}: {
  tasksCount?: number;
  delayedCount?: number;
  primaryBuSlug?: string | null;
}) {
  return (
    <div className="flex flex-col gap-4">
      {/* Card 0: Vendas em Tempo Real (Google Sheets) */}
      <Link
        href="/vendas-realtime"
        className="group relative flex items-center justify-between overflow-hidden rounded-[2rem] border border-emerald-200 bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-950 p-5 text-white shadow-[0_12px_30px_-10px_rgba(16,185,129,0.2)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_36px_-10px_rgba(16,185,129,0.3)]"
      >
        <div className="flex items-center gap-3.5 min-w-0">
          <span className="relative flex size-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/20 shadow-inner backdrop-blur-md ring-1 ring-emerald-500/30 group-hover:scale-105 transition-transform">
            <span className="absolute -top-1 -right-1 flex size-3">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex size-3 rounded-full bg-emerald-500" />
            </span>
            <Compass className="size-6 text-emerald-400" />
          </span>
          <div className="min-w-0">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
              Real-Time Google Sheets
            </span>
            <p className="truncate font-display text-base font-semibold text-white">
              Vendas & Derivadas
            </p>
          </div>
        </div>
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-white group-hover:bg-emerald-500 group-hover:translate-x-0.5 transition-all">
          <ArrowRight className="size-4" />
        </span>
      </Link>

      {/* Card 1: Planejamento Estratégico (estilo Daily Jogging da imagem) */}
      <Link
        href={
          primaryBuSlug ? `/planejamento/${primaryBuSlug}` : "/planejamento"
        }
        className="group relative flex items-center justify-between overflow-hidden rounded-[2rem] border border-slate-200/80 bg-gradient-to-r from-slate-900 to-[#1e1422] p-5 text-white shadow-[0_12px_30px_-10px_rgba(15,23,42,0.15)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_36px_-10px_rgba(15,23,42,0.25)]"
      >
        <div className="flex items-center gap-3.5 min-w-0">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 shadow-inner backdrop-blur-md ring-1 ring-white/15 group-hover:scale-105 transition-transform">
            <Compass className="size-6 text-brand-300" />
          </span>
          <div className="min-w-0">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-brand-300">
              Planejamento
            </span>
            <p className="truncate font-display text-base font-semibold text-white">
              Estratégia & BUs
            </p>
          </div>
        </div>
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-white group-hover:bg-brand-500 group-hover:translate-x-0.5 transition-all">
          <ArrowRight className="size-4" />
        </span>
      </Link>

      {/* Card 2: Minhas Tarefas com Fundo Vibrante MedCof (estilo My Jogging com gradiente rosa/vermelho da imagem) */}
      <Link
        href="/tarefas"
        className="group relative flex flex-col justify-between overflow-hidden rounded-[2rem] bg-gradient-to-br from-brand-500 via-brand-600 to-rose-700 p-6 text-white shadow-[0_16px_36px_-10px_rgba(226,38,60,0.35)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_20px_45px_-10px_rgba(226,38,60,0.45)]"
      >
        {/* Efeito de relevo / claymorphism suave */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-2xl bg-white/20 shadow-xs backdrop-blur-md ring-1 ring-white/30 group-hover:scale-105 transition-transform">
              <Flame className="size-5 text-white" />
            </span>
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-rose-100">
                Fila de Trabalho
              </span>
              <p className="font-display text-base font-semibold text-white">
                Minhas Tarefas
              </p>
            </div>
          </div>
          <span className="flex size-9 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm group-hover:bg-white group-hover:text-brand-600 transition-all">
            <ArrowRight className="size-4" />
          </span>
        </div>

        <div className="mt-5 border-t border-white/20 pt-4">
          <p className="text-[11px] font-medium uppercase tracking-wider text-rose-100">
            Total em Aberto
          </p>
          <div className="flex items-baseline justify-between">
            <p className="font-display text-3xl font-bold tracking-tight text-white">
              {tasksCount} {tasksCount === 1 ? "tarefa" : "tarefas"}
            </p>
            {delayedCount > 0 ? (
              <span className="rounded-full bg-white/25 px-2.5 py-0.5 text-xs font-semibold text-white">
                {delayedCount} atrasada{delayedCount === 1 ? "" : "s"}
              </span>
            ) : (
              <span className="rounded-full bg-white/25 px-2.5 py-0.5 text-xs font-semibold text-white">
                Em dia
              </span>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
}
