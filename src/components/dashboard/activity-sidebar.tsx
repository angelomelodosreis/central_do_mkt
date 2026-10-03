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
  const [searchBu, setSearchBu] = useState("");
  const [showAllBus, setShowAllBus] = useState(false);

  const filteredBus = businessUnits.filter((bu) =>
    bu.label.toLowerCase().includes(searchBu.toLowerCase()),
  );

  const displayedBus =
    searchBu.trim().length > 0 || showAllBus ? filteredBus : filteredBus.slice(0, 5);

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
            Ver todas →
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

        {/* Campo de Busca Rápida de BUs quando há mais de 5 */}
        {activeTab === "bus" && businessUnits.length > 5 && (
          <div className="mt-2 mb-1">
            <input
              type="text"
              value={searchBu}
              onChange={(e) => setSearchBu(e.target.value)}
              placeholder="Buscar unidade..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
        )}

        {/* Lista */}
        <div className="mt-2.5 space-y-2 max-h-[380px] overflow-y-auto pr-0.5">
          {activeTab === "bus" ? (
            displayedBus.length === 0 ? (
              <p className="py-6 text-center text-xs text-slate-400">
                {searchBu ? "Nenhuma BU encontrada." : "Nenhuma BU vinculada."}
              </p>
            ) : (
              <>
                {displayedBus.map((bu) => (
                  <Link
                    key={bu.id}
                    href={`/planejamento/${bu.slug}`}
                    className="group flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/60 p-2.5 transition-all hover:border-brand-200 hover:bg-brand-50/30 hover:shadow-2xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white font-display text-[11px] font-bold text-brand-600 shadow-2xs ring-1 ring-slate-200/60 group-hover:bg-brand-600 group-hover:text-white transition-colors">
                        {bu.label.slice(0, 2).toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-slate-900 group-hover:text-brand-900">
                          {bu.label}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          {bu.isLead ? "Você é o responsável" : "Membro ativo"}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="size-3.5 shrink-0 text-slate-400 group-hover:text-brand-600 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                ))}

                {!searchBu && businessUnits.length > 5 && (
                  <button
                    type="button"
                    onClick={() => setShowAllBus((prev) => !prev)}
                    className="w-full pt-1 text-center text-[11px] font-semibold text-brand-600 hover:text-brand-800 transition"
                  >
                    {showAllBus
                      ? "▲ Mostrar menos"
                      : `▼ Ver todas as ${businessUnits.length} BUs (+${businessUnits.length - 5})`}
                  </button>
                )}
              </>
            )
          ) : members.length === 0 ? (
            <p className="py-6 text-center text-xs text-slate-400">
              Nenhum membro encontrado.
            </p>
          ) : (
            members.slice(0, 8).map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 p-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[11px] font-bold text-slate-700">
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

      {/* Widget Inferior: Cadência Estratégica MedCof */}
      <div className="rounded-[2rem] border border-slate-200/80 bg-white p-5 shadow-2xs">
        <div className="flex items-center justify-between pb-2">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <Calendar className="size-4" />
            </span>
            <h4 className="font-display text-xs font-bold uppercase tracking-wider text-slate-900">
              Cadência MedCof
            </h4>
          </div>
          <Badge tone="neutral">Oficial</Badge>
        </div>

        <ul className="mt-3 space-y-2 text-xs">
          <li>
            <Link
              href="/planejamento"
              className="group flex items-start gap-2.5 rounded-xl bg-slate-50/70 p-2.5 border border-slate-100 hover:border-slate-300 hover:bg-white hover:shadow-2xs transition"
              title="Abrir Diagnóstico e Metas 2.0 das Business Units"
            >
              <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-slate-700 group-hover:text-brand-600 transition-colors" />
              <div className="leading-snug min-w-0 flex-1">
                <strong className="text-slate-900 font-semibold group-hover:text-brand-700">6 Meses:</strong>{" "}
                <span className="text-slate-600">Diagnóstico 2.0 & Metas 2.0</span>
              </div>
              <ChevronRight className="size-3.5 text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5 transition-transform shrink-0 mt-0.5" />
            </Link>
          </li>
          <li>
            <Link
              href="/planejamento/revisoes"
              className="group flex items-start gap-2.5 rounded-xl bg-slate-50/70 p-2.5 border border-slate-100 hover:border-slate-300 hover:bg-white hover:shadow-2xs transition"
              title="Abrir Revisões e Pautas Trimestrais"
            >
              <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-slate-700 group-hover:text-brand-600 transition-colors" />
              <div className="leading-snug min-w-0 flex-1">
                <strong className="text-slate-900 font-semibold group-hover:text-brand-700">3 Meses:</strong>{" "}
                <span className="text-slate-600">Revisão Trimestral (7 perguntas)</span>
              </div>
              <ChevronRight className="size-3.5 text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5 transition-transform shrink-0 mt-0.5" />
            </Link>
          </li>
          <li>
            <Link
              href="/planejamento/revisoes"
              className="group flex items-start gap-2.5 rounded-xl bg-slate-50/70 p-2.5 border border-slate-100 hover:border-slate-300 hover:bg-white hover:shadow-2xs transition"
              title="Abrir Feed de Acompanhamento Semanal Slack Canvas"
            >
              <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-slate-700 group-hover:text-brand-600 transition-colors" />
              <div className="leading-snug min-w-0 flex-1">
                <strong className="text-slate-900 font-semibold group-hover:text-brand-700">Semanal:</strong>{" "}
                <span className="text-slate-600">Weekly & Acompanhamento ao vivo</span>
              </div>
              <ChevronRight className="size-3.5 text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5 transition-transform shrink-0 mt-0.5" />
            </Link>
          </li>
        </ul>
      </div>
    </div>
  );
}
