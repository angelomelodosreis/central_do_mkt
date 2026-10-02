"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Users,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";

export type BusinessUnitSummary = {
  id: string;
  slug: string;
  label: string;
  isLead?: boolean;
};

export type MemberSummary = {
  id: string;
  name: string;
  email: string;
  jobTitle?: string | null;
  roleLabel?: string;
};

export function ActivitySidebar({
  businessUnits,
  members,
}: {
  businessUnits: BusinessUnitSummary[];
  members: MemberSummary[];
}) {
  const [activeTab, setActiveTab] = useState<"bus" | "team">("bus");

  return (
    <div className="flex flex-col gap-5">
      {/* Bloco de Atividades / Equipe */}
      <div className="rounded-[2rem] border border-slate-200/80 bg-white p-5 shadow-[0_10px_30px_-5px_rgba(15,23,42,0.04)]">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between pb-3">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <Users className="size-4" />
            </span>
            <h3 className="font-display text-base font-semibold text-slate-900">
              Hub & Atividades
            </h3>
          </div>
          <Link
            href="/planejamento"
            className="text-xs font-medium text-brand-600 hover:text-brand-800"
          >
            Ver todas
          </Link>
        </div>

        {/* Seletor de Pílula */}
        <div className="my-2 flex rounded-full bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setActiveTab("bus")}
            className={`flex-1 rounded-full py-1.5 text-xs font-semibold transition-all ${
              activeTab === "bus"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Minhas BUs ({businessUnits.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("team")}
            className={`flex-1 rounded-full py-1.5 text-xs font-semibold transition-all ${
              activeTab === "team"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Equipe ({members.length})
          </button>
        </div>

        {/* Lista */}
        <div className="mt-3 space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
          {activeTab === "bus" ? (
            businessUnits.length === 0 ? (
              <p className="py-6 text-center text-xs text-slate-400">
                Nenhuma BU vinculada.
              </p>
            ) : (
              businessUnits.map((bu) => (
                <Link
                  key={bu.id}
                  href={`/planejamento/${bu.slug}`}
                  className="group flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/60 p-3 transition-all hover:border-brand-200 hover:bg-brand-50/30 hover:shadow-sm"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white font-display text-xs font-bold text-brand-600 shadow-xs ring-1 ring-slate-200/60 group-hover:bg-brand-600 group-hover:text-white transition-colors">
                      {bu.label.slice(0, 2).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-slate-900 group-hover:text-brand-900">
                        {bu.label}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {bu.isLead ? "Você é o responsável" : "Membro ativo"}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-slate-400 group-hover:text-brand-600 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              ))
            )
          ) : members.length === 0 ? (
            <p className="py-6 text-center text-xs text-slate-400">
              Nenhum membro encontrado.
            </p>
          ) : (
            members.slice(0, 6).map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/50 p-2.5"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-700">
                    {m.name.slice(0, 1).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-slate-900">
                      {m.name}
                    </p>
                    <p className="truncate text-[10px] text-slate-500">
                      {m.jobTitle || m.roleLabel || m.email}
                    </p>
                  </div>
                </div>
                <span
                  className="size-2 shrink-0 rounded-full bg-emerald-500"
                  title="Ativo"
                />
              </div>
            ))
          )}
        </div>
      </div>

      {/* Widget Inferior: Cadência Estratégica MedCof (Inspirado no Live Map widget) */}
      <div className="rounded-[2rem] border border-brand-200/80 bg-gradient-to-br from-brand-50/60 to-white p-5 shadow-[0_10px_30px_-5px_rgba(226,38,60,0.05)]">
        <div className="flex items-center justify-between pb-2">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-xl bg-brand-600 text-white">
              <Calendar className="size-4" />
            </span>
            <h4 className="font-display text-xs font-bold uppercase tracking-wider text-brand-900">
              Cadência MedCof
            </h4>
          </div>
          <Badge tone="brand">Oficial</Badge>
        </div>

        <ul className="mt-3 space-y-2 text-xs">
          <li className="flex items-start gap-2 rounded-xl bg-white/80 p-2.5 shadow-2xs">
            <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-brand-600" />
            <div>
              <strong className="text-slate-900">6 Meses:</strong> Diagnóstico
              2.0 & Metas 2.0
            </div>
          </li>
          <li className="flex items-start gap-2 rounded-xl bg-white/80 p-2.5 shadow-2xs">
            <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-brand-600" />
            <div>
              <strong className="text-slate-900">3 Meses:</strong> Revisão
              Trimestral (7 perguntas)
            </div>
          </li>
          <li className="flex items-start gap-2 rounded-xl bg-white/80 p-2.5 shadow-2xs">
            <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-brand-600" />
            <div>
              <strong className="text-slate-900">Semanal:</strong> Weekly &
              Acompanhamento ao vivo
            </div>
          </li>
        </ul>
      </div>
    </div>
  );
}
