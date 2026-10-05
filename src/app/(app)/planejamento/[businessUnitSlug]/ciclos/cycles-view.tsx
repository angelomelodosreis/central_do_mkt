"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  Plus,
  Calendar,
  ChevronRight,
  FileText,
  Target,
  RefreshCw,
  Info,
  BarChart2,
  Users,
  Package,
  Filter,
  Settings,
  ArrowRight,
  Check,
  X,
} from "lucide-react";
import { createCycleAction } from "../../actions";
import { cn } from "@/lib/utils/cn";

export type CycleDetailData = {
  id: string;
  slug: string;
  name: string;
  startsAt: string;
  endsAt: string;
  isCurrent: boolean;
  periodLabel: string;
  status: "in_progress" | "planning" | "not_started" | "completed";
  statusLabel: string;
  statusTone: "emerald" | "purple" | "slate" | "blue";
  objective: string;
  goalsCount: number;
  reviewsCompleted: number;
  reviewsTotal: number;
  progressPercent: number;
  pillars: {
    key: string;
    number: number;
    title: string;
    question: string;
    finding: string;
    challenge: string;
    opportunity: string;
  }[];
};

export function CyclesView({
  businessUnitId,
  businessUnitSlug,
  businessUnitName,
  canEdit,
  initialCycles,
}: {
  businessUnitId: string;
  businessUnitSlug: string;
  businessUnitName: string;
  canEdit: boolean;
  initialCycles: CycleDetailData[];
}) {
  const [cycles, setCycles] = useState<CycleDetailData[]>(initialCycles);
  const [selectedCycleId, setSelectedCycleId] = useState<string>(
    initialCycles[0]?.id ?? "",
  );
  const [activeTab, setActiveTab] = useState<
    "diagnostico" | "metas" | "revisoes"
  >("diagnostico");

  // Modal para iniciar novo ciclo
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCycleName, setNewCycleName] = useState("");
  const [newCycleStarts, setNewCycleStarts] = useState("");
  const [newCycleEnds, setNewCycleEnds] = useState("");
  const [isPending, startTransition] = useTransition();
  const [modalError, setModalError] = useState<string | null>(null);

  const selectedCycle =
    cycles.find((c) => c.id === selectedCycleId) ?? cycles[0];

  function handleCreateCycle(e: React.FormEvent) {
    e.preventDefault();
    if (!newCycleName.trim() || !newCycleStarts || !newCycleEnds) {
      setModalError("Preencha o nome e o período do ciclo.");
      return;
    }

    startTransition(async () => {
      setModalError(null);
      const res = await createCycleAction({
        businessUnitId,
        name: newCycleName.trim(),
        startsAt: newCycleStarts,
        endsAt: newCycleEnds,
        isCurrent: false,
      });

      if (res.ok) {
        setIsModalOpen(false);
        setNewCycleName("");
        setNewCycleStarts("");
        setNewCycleEnds("");
        window.location.reload();
      } else {
        setModalError(res.error || "Erro ao criar novo ciclo.");
      }
    });
  }

  return (
    <div className="space-y-8">
      {/* ── TOPO: Cabeçalho & Botão Novo Ciclo ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-pink-600">
            PLANEJAMENTO ESTRATÉGICO
          </span>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-slate-900">
            Ciclos da BU
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Acompanhe os ciclos estratégicos da BU e acesse o diagnóstico, objetivo, metas e revisões de cada período.
          </p>
        </div>

        {canEdit && (
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-pink-600 px-4 py-2.5 text-xs font-semibold text-white shadow-2xs hover:bg-pink-700 transition"
          >
            <Plus className="size-4" />
            Iniciar novo ciclo
          </button>
        )}
      </div>

      {/* ── CARDS DOS CICLOS (Grid Horizontal) ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {cycles.map((c) => {
          const isSelected = c.id === selectedCycleId;

          return (
            <div
              key={c.id}
              onClick={() => setSelectedCycleId(c.id)}
              className={cn(
                "group relative cursor-pointer rounded-2xl border bg-white p-5 shadow-2xs transition-all duration-200 flex flex-col justify-between",
                isSelected
                  ? "border-pink-300 ring-2 ring-pink-100 shadow-sm"
                  : "border-slate-200 hover:border-slate-300 hover:shadow-xs",
              )}
            >
              <div>
                {/* Linha 1: Título, Status e Botão Seta */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-base font-bold text-slate-900">
                      {c.name}
                    </h3>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-bold border",
                        c.statusTone === "emerald" &&
                          "bg-emerald-50 text-emerald-700 border-emerald-200",
                        c.statusTone === "purple" &&
                          "bg-purple-50 text-purple-700 border-purple-200",
                        c.statusTone === "slate" &&
                          "bg-slate-100 text-slate-600 border-slate-200",
                        c.statusTone === "blue" &&
                          "bg-blue-50 text-blue-700 border-blue-200",
                      )}
                    >
                      {c.statusLabel}
                    </span>
                  </div>

                  <div
                    className={cn(
                      "flex size-7 items-center justify-center rounded-full transition",
                      isSelected
                        ? "bg-pink-50 text-pink-600"
                        : "bg-slate-50 text-slate-400 group-hover:bg-slate-100 group-hover:text-slate-600",
                    )}
                  >
                    <ChevronRight className="size-4" />
                  </div>
                </div>

                {/* Período */}
                <p className="mt-1 text-xs text-slate-500 font-medium">
                  {c.periodLabel}
                </p>

                {/* Objetivo do Ciclo */}
                <div className="mt-4 border-t border-slate-100 pt-3">
                  <p className="text-[11px] font-semibold text-slate-700">
                    Objetivo do ciclo
                  </p>
                  <p className="mt-1 text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {c.objective || "—"}
                  </p>
                </div>
              </div>

              {/* Métricas do Ciclo (3 colunas) */}
              <div className="mt-5 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 text-left">
                <div>
                  <p className="font-display text-lg font-bold text-slate-900 tabular-nums">
                    {c.goalsCount}
                  </p>
                  <p className="text-[10px] text-slate-400">Metas definidas</p>
                </div>
                <div>
                  <p className="font-display text-lg font-bold text-slate-900 tabular-nums">
                    {c.reviewsCompleted}/{c.reviewsTotal}
                  </p>
                  <p className="text-[10px] text-slate-400">Revisões realizadas</p>
                </div>
                <div>
                  <p className="font-display text-lg font-bold text-slate-900 tabular-nums">
                    {c.progressPercent}%
                  </p>
                  <p className="text-[10px] text-slate-400">Progresso do ciclo</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── DETALHES DO CICLO SELECIONADO ── */}
      {selectedCycle && (
        <div className="space-y-6 rounded-3xl border border-pink-100/90 bg-white p-6 md:p-8 shadow-xs">
          {/* Header do Ciclo Ativo */}
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between border-b border-slate-100 pb-6">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="font-display text-2xl font-bold tracking-tight text-slate-900">
                  {selectedCycle.name} · {selectedCycle.periodLabel}
                </h2>
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-xs font-bold border",
                    selectedCycle.statusTone === "emerald" &&
                      "bg-emerald-50 text-emerald-700 border-emerald-200",
                    selectedCycle.statusTone === "purple" &&
                      "bg-purple-50 text-purple-700 border-purple-200",
                    selectedCycle.statusTone === "slate" &&
                      "bg-slate-100 text-slate-600 border-slate-200",
                    selectedCycle.statusTone === "blue" &&
                      "bg-blue-50 text-blue-700 border-blue-200",
                  )}
                >
                  {selectedCycle.statusLabel}
                </span>
              </div>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed max-w-3xl">
                <strong className="font-semibold text-slate-800">
                  Objetivo do ciclo:
                </strong>{" "}
                {selectedCycle.objective ||
                  "Nenhum objetivo estratégico definido ainda para este ciclo."}
              </p>
            </div>

            {/* Box lateral de período */}
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 shrink-0">
              <Calendar className="size-5 text-pink-600" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Período do ciclo
                </p>
                <p className="text-xs font-bold text-slate-800">
                  {selectedCycle.periodLabel}
                </p>
              </div>
            </div>
          </div>

          {/* As 3 Sub-Abas do Ciclo (Diagnóstico / Objetivo e Metas / Revisões) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setActiveTab("diagnostico")}
              className={cn(
                "flex items-center gap-3 rounded-2xl border p-4 text-left transition shadow-2xs",
                activeTab === "diagnostico"
                  ? "border-pink-300 bg-pink-50/30 ring-1 ring-pink-200 text-slate-900"
                  : "border-slate-200 bg-white hover:bg-slate-50/70 text-slate-600",
              )}
            >
              <div
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-xl transition",
                  activeTab === "diagnostico"
                    ? "bg-pink-100 text-pink-600"
                    : "bg-slate-100 text-slate-400",
                )}
              >
                <FileText className="size-4.5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">Diagnóstico</p>
                <p className="text-[11px] text-slate-500">Onde estamos?</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("metas")}
              className={cn(
                "flex items-center gap-3 rounded-2xl border p-4 text-left transition shadow-2xs",
                activeTab === "metas"
                  ? "border-pink-300 bg-pink-50/30 ring-1 ring-pink-200 text-slate-900"
                  : "border-slate-200 bg-white hover:bg-slate-50/70 text-slate-600",
              )}
            >
              <div
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-xl transition",
                  activeTab === "metas"
                    ? "bg-pink-100 text-pink-600"
                    : "bg-slate-100 text-slate-400",
                )}
              >
                <Target className="size-4.5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">
                  Objetivo e Metas
                </p>
                <p className="text-[11px] text-slate-500">
                  Onde queremos chegar?
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("revisoes")}
              className={cn(
                "flex items-center gap-3 rounded-2xl border p-4 text-left transition shadow-2xs",
                activeTab === "revisoes"
                  ? "border-pink-300 bg-pink-50/30 ring-1 ring-pink-200 text-slate-900"
                  : "border-slate-200 bg-white hover:bg-slate-50/70 text-slate-600",
              )}
            >
              <div
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-xl transition",
                  activeTab === "revisoes"
                    ? "bg-pink-100 text-pink-600"
                    : "bg-slate-100 text-slate-400",
                )}
              >
                <RefreshCw className="size-4.5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">
                  Revisões do ciclo
                </p>
                <p className="text-[11px] text-slate-500">
                  Ainda estamos no caminho?
                </p>
              </div>
            </button>
          </div>

          {/* CONTEÚDO DA SUB-ABA: DIAGNÓSTICO */}
          {activeTab === "diagnostico" && (
            <div className="space-y-5 rounded-2xl border border-slate-200 bg-slate-50/30 p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-2.5">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-pink-50 text-pink-600 border border-pink-100">
                    <FileText className="size-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Diagnóstico da BU
                    </h3>
                    <p className="text-xs text-slate-500">
                      Analise os 5 pilares e registre os principais achados da BU neste ciclo.
                    </p>
                  </div>
                </div>

                <div className="flex max-w-sm items-start gap-2 rounded-xl border border-pink-200/80 bg-pink-50/60 p-2.5">
                  <Info className="size-3.5 shrink-0 text-pink-600 mt-0.5" />
                  <div>
                    <p className="text-[11px] font-bold text-pink-800">
                      Importante
                    </p>
                    <p className="text-[11px] text-pink-700 leading-snug">
                      O diagnóstico é uma fotografia do cenário no início do ciclo. Atualizações e mudanças devem ser registradas nas revisões.
                    </p>
                  </div>
                </div>
              </div>

              {/* Lista dos 5 Pilares no Estilo do Mockup */}
              <div className="space-y-2.5">
                {selectedCycle.pillars.map((p) => {
                  return (
                    <div
                      key={p.key}
                      className="grid grid-cols-1 md:grid-cols-[2rem_14rem_1fr_12rem_12rem_2.5rem] items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-2xs hover:border-slate-300 transition"
                    >
                      {/* Número */}
                      <span className="font-bold text-xs text-slate-400 text-center">
                        {p.number}
                      </span>

                      {/* Pilar & Pergunta */}
                      <div>
                        <p className="font-bold text-xs text-slate-900">
                          {p.title}
                        </p>
                        <p className="text-[11px] text-slate-500 leading-tight">
                          {p.question}
                        </p>
                      </div>

                      {/* Achado / Síntese */}
                      <div>
                        <p className="text-xs text-slate-700 line-clamp-2 leading-relaxed">
                          {p.finding || (
                            <span className="text-slate-400 italic">
                              Sem diagnóstico registrado neste pilar.
                            </span>
                          )}
                        </p>
                      </div>

                      {/* Desafio */}
                      <div className="rounded-lg bg-rose-50/70 border border-rose-100 p-2 text-[11px]">
                        <p className="font-bold text-rose-700 text-[10px] uppercase">
                          Principal desafio
                        </p>
                        <p className="text-rose-900 font-medium line-clamp-2 mt-0.5">
                          {p.challenge || "Alta competitividade."}
                        </p>
                      </div>

                      {/* Oportunidade */}
                      <div className="rounded-lg bg-emerald-50/70 border border-emerald-100 p-2 text-[11px]">
                        <p className="font-bold text-emerald-700 text-[10px] uppercase">
                          Principal oportunidade
                        </p>
                        <p className="text-emerald-900 font-medium line-clamp-2 mt-0.5">
                          {p.opportunity || "Crescimento da demanda."}
                        </p>
                      </div>

                      {/* Link direto para a página de diagnóstico */}
                      <div className="flex justify-end">
                        <Link
                          href={`/planejamento/${businessUnitSlug}/diagnostico?ciclo=${selectedCycle.slug}`}
                          className="rounded-lg p-1.5 text-slate-400 hover:text-pink-600 hover:bg-pink-50 transition"
                          title="Editar Diagnóstico Completo"
                        >
                          <ChevronRight className="size-4" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Botão de Rodapé */}
              <div className="flex justify-end pt-2">
                <Link
                  href={`/planejamento/${businessUnitSlug}/diagnostico?ciclo=${selectedCycle.slug}`}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-pink-600 px-4 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-pink-700 transition"
                >
                  Abrir Diagnóstico Completo da BU
                  <ArrowRight className="size-3.5" />
                </Link>
              </div>
            </div>
          )}

          {/* CONTEÚDO DA SUB-ABA: OBJETIVO E METAS */}
          {activeTab === "metas" && (
            <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/30 p-6 text-center">
              <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-pink-50 text-pink-600 border border-pink-100">
                <Target className="size-6" />
              </div>
              <div className="max-w-md mx-auto">
                <h3 className="text-base font-bold text-slate-900">
                  Objetivo e Metas do Ciclo
                </h3>
                <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                  Consulte os desdobramentos estratégicos, KPIs primários e secundários ancorados no diagnóstico de {selectedCycle.name}.
                </p>
              </div>
              <div className="pt-2">
                <Link
                  href={`/planejamento/${businessUnitSlug}/metas?ciclo=${selectedCycle.slug}`}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-pink-600 px-5 py-2.5 text-xs font-semibold text-white shadow-2xs hover:bg-pink-700 transition"
                >
                  Gerenciar Objetivo e Metas do Ciclo
                  <ArrowRight className="size-3.5" />
                </Link>
              </div>
            </div>
          )}

          {/* CONTEÚDO DA SUB-ABA: REVISÕES */}
          {activeTab === "revisoes" && (
            <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/30 p-6 text-center">
              <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-purple-50 text-purple-600 border border-purple-100">
                <RefreshCw className="size-6" />
              </div>
              <div className="max-w-md mx-auto">
                <h3 className="text-base font-bold text-slate-900">
                  Revisões Trimestrais do Ciclo
                </h3>
                <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                  Avalie o ritmo das metas, registre decisões corretivas e compare a evolução entre trimestres para garantir o atingimento.
                </p>
              </div>
              <div className="pt-2">
                <Link
                  href={`/planejamento/${businessUnitSlug}/revisao-trimestral`}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-5 py-2.5 text-xs font-semibold text-white shadow-2xs hover:bg-purple-700 transition"
                >
                  Acessar Revisão Trimestral da BU
                  <ArrowRight className="size-3.5" />
                </Link>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── MODAL: Iniciar Novo Ciclo ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex size-7 items-center justify-center rounded-lg bg-pink-50 text-pink-600">
                  <Plus className="size-4" />
                </div>
                <h3 className="font-display text-base font-bold text-slate-900">
                  Iniciar Novo Ciclo
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCycle} className="space-y-4">
              {modalError && (
                <div className="rounded-lg bg-rose-50 p-2.5 text-xs text-rose-700 font-medium">
                  {modalError}
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-slate-800">
                  Nome do Ciclo *
                </label>
                <input
                  type="text"
                  required
                  value={newCycleName}
                  onChange={(e) => setNewCycleName(e.target.value)}
                  placeholder="Ex.: Ciclo 2 · Jul - Dez/2027"
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-800">
                    Data de Início *
                  </label>
                  <input
                    type="date"
                    required
                    value={newCycleStarts}
                    onChange={(e) => setNewCycleStarts(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2 text-xs focus:border-pink-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-800">
                    Data de Término *
                  </label>
                  <input
                    type="date"
                    required
                    value={newCycleEnds}
                    onChange={(e) => setNewCycleEnds(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2 text-xs focus:border-pink-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-xl bg-pink-600 px-4 py-2 text-xs font-semibold text-white hover:bg-pink-700 disabled:opacity-60"
                >
                  {isPending ? "Criando…" : "Criar Ciclo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
