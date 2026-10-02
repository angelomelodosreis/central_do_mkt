import React from "react";
import { Compass, RefreshCw, Target, TrendingUp, CalendarCheck, CheckCircle2 } from "lucide-react";

export function PlanningMethodologyGuide() {
  const steps = [
    {
      num: "01",
      title: "Diagnóstico",
      cadence: "A cada 6 meses",
      color: "border-sky-500 text-sky-700 bg-sky-50/50",
      icon: Compass,
      desc: "Entender o contexto e o mercado, olhar o histórico dos 5 pilares, identificar alavancas e fragilidades reais da BU.",
    },
    {
      num: "02",
      title: "Revisão Trimestral",
      cadence: "A cada 3 meses",
      color: "border-indigo-500 text-indigo-700 bg-indigo-50/50",
      icon: RefreshCw,
      desc: "Validação e ajustes de rota. 6 meses para pensar estrategicamente; 3 meses para checar se ainda estamos pensando certo.",
    },
    {
      num: "03",
      title: "Objetivo do Ciclo",
      cadence: "A cada 6 meses",
      color: "border-emerald-500 text-emerald-700 bg-emerald-50/50",
      icon: Target,
      desc: "Onde a BU quer chegar neste ciclo. Claro, mensurável, focado na principal alavanca ou desafio identificado.",
    },
    {
      num: "04",
      title: "Metas 2.0 & KPIs",
      cadence: "A cada 6 meses",
      color: "border-amber-500 text-amber-700 bg-amber-50/50",
      icon: TrendingUp,
      desc: "Desdobramento executivo da meta com embasamento no diagnóstico e pares de KPI Primário + KPI Secundário.",
    },
    {
      num: "05",
      title: "Acompanhamento",
      cadence: "Ritmo Contínuo",
      color: "border-purple-500 text-purple-700 bg-purple-50/50",
      icon: CalendarCheck,
      desc: "Check-ins semanais e mensais. Monitoramento de ritmo, esteira de produtos e entregas do calendário.",
    },
  ];

  return (
    <div className="mb-8 rounded-xl border border-slate-200/90 bg-gradient-to-br from-white via-slate-50/40 to-slate-50/80 p-5 shadow-xs">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3.5 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">
              ✓
            </span>
            <h2 className="font-display text-sm font-semibold text-slate-900">
              Metodologia Oficial de Planejamento Estratégico MedCof
            </h2>
          </div>
          <p className="mt-0.5 text-xs text-slate-500">
            Estrutura padronizada de ciclos: diagnóstico aprofundado, metas embasadas e acompanhamento em cadência contínua.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1 text-[11px] font-medium text-brand-800 self-start sm:self-auto">
          <CheckCircle2 className="h-3.5 w-3.5 text-brand-600" />
          5 Etapas Oficiais
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {steps.map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.num}
              className="flex flex-col justify-between rounded-lg border border-slate-200/80 bg-white p-3.5 transition-all hover:border-slate-300 hover:shadow-sm"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-mono font-bold text-slate-400">
                    ETAPA {s.num}
                  </span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${s.color}`}>
                    {s.cadence}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Icon className="h-4 w-4 text-slate-700 shrink-0" />
                  <h3 className="text-xs font-bold text-slate-900">{s.title}</h3>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-600">
                  {s.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
