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
import { DiagnosisTableView } from "../diagnostico/diagnosis-table-view";
import { OpenRoundForm } from "../diagnostico/round-forms";
import { KpiGoalsTable } from "../metas/kpi-goals-table";
import { ReviewCycleView } from "../revisao-trimestral/review-cycle-view";
import { Badge } from "@/components/ui/badge";
import { roundLabel, type Round } from "@/lib/modules/strategy/diagnosis";
import { formatDate } from "@/lib/utils/format";
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
  selectedCycleId: initialSelectedCycleId,
  selectedCycleSlug,
  initialTab = "diagnostico",
  rounds = [],
  activeRound = null,
  kpiGoals = [],
  reviews = [],
  initialReview = null,
  initialCycleObjective = "",
  initialCyclePeriod = "",
  diagnosisInsights = [],
}: {
  businessUnitId: string;
  businessUnitSlug: string;
  businessUnitName: string;
  canEdit: boolean;
  initialCycles: CycleDetailData[];
  selectedCycleId?: string;
  selectedCycleSlug?: string;
  initialTab?: "diagnostico" | "metas" | "revisoes";
  rounds?: Round[];
  activeRound?: Round | null;
  kpiGoals?: any[];
  reviews?: any[];
  initialReview?: any | null;
  initialCycleObjective?: string;
  initialCyclePeriod?: string;
  diagnosisInsights?: string[];
}) {
  const [cycles] = useState<CycleDetailData[]>(initialCycles);
  const [selectedCycleId, setSelectedCycleId] = useState<string>(
    initialSelectedCycleId ?? initialCycles[0]?.id ?? "",
  );
  const [activeTab, setActiveTab] = useState<
    "diagnostico" | "metas" | "revisoes"
  >(initialTab);

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
          <span className="text-xs font-bold uppercase tracking-wider text-pink-600">
            PLANEJAMENTO ESTRATÉGICO
          </span>
          <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Ciclos da BU
          </h1>
          <p className="mt-1 text-sm sm:text-base text-slate-500">
            Acompanhe os ciclos estratégicos da BU e acesse o diagnóstico, objetivo, metas e revisões de cada período em uma só visão integrada.
          </p>
        </div>

        {canEdit && (
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-pink-600 px-4 py-2.5 text-sm font-semibold text-white shadow-2xs hover:bg-pink-700 transition"
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
            <Link
              key={c.id}
              href={`/planejamento/${businessUnitSlug}/ciclos?ciclo=${c.slug}&aba=${activeTab}`}
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
                    <h3 className="font-display text-lg font-bold text-slate-900">
                      {c.name}
                    </h3>
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-1 text-xs font-semibold border",
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
                <p className="mt-1 text-sm text-slate-500 font-medium">
                  {c.periodLabel}
                </p>

                {/* Objetivo do Ciclo */}
                <div className="mt-4 border-t border-slate-100 pt-3">
                  <p className="text-xs font-semibold text-slate-700">
                    Objetivo do ciclo
                  </p>
                  <p className="mt-1 text-sm text-slate-600 line-clamp-2 leading-relaxed">
                    {c.objective || "—"}
                  </p>
                </div>
              </div>

              {/* Métricas do Ciclo (3 colunas) */}
              <div className="mt-5 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 text-left">
                <div>
                  <p className="font-display text-xl font-bold text-slate-900 tabular-nums">
                    {c.goalsCount}
                  </p>
                  <p className="text-xs text-slate-500">Metas definidas</p>
                </div>
                <div>
                  <p className="font-display text-xl font-bold text-slate-900 tabular-nums">
                    {c.reviewsCompleted}/{c.reviewsTotal}
                  </p>
                  <p className="text-xs text-slate-500">Revisões</p>
                </div>
                <div>
                  <p className="font-display text-xl font-bold text-slate-900 tabular-nums">
                    {c.progressPercent}%
                  </p>
                  <p className="text-xs text-slate-500">Progresso</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* ── DETALHES DO CICLO SELECIONADO ── */}
      {selectedCycle && (
        <div className="space-y-6 rounded-3xl border border-slate-200/80 bg-slate-50/60 p-6 md:p-8 shadow-xs">
          {/* Header do Ciclo Ativo */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                  {selectedCycle.name} · {selectedCycle.periodLabel}
                </h2>
                <span
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-bold border",
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
              <p className="mt-2 text-sm sm:text-base text-slate-600 leading-relaxed max-w-3xl">
                <strong className="font-semibold text-slate-800">
                  Objetivo do ciclo:
                </strong>{" "}
                {selectedCycle.objective ||
                  "Nenhum objetivo estratégico definido ainda para este ciclo."}
              </p>
            </div>

            {/* Box lateral de período */}
            <div className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50/50 px-4 py-3 shrink-0">
              <Calendar className="size-5 text-[#e2263c]" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-rose-600">
                  Período do ciclo
                </p>
                <p className="text-sm font-bold text-slate-900">
                  {selectedCycle.periodLabel}
                </p>
              </div>
            </div>
          </div>

          {/* As 3 Sub-Abas do Ciclo (Diagnóstico / Objetivo e Metas / Revisões) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <button
              type="button"
              onClick={() => setActiveTab("diagnostico")}
              className={cn(
                "flex items-center gap-3.5 rounded-2xl border p-4 sm:p-5 text-left transition shadow-2xs cursor-pointer",
                activeTab === "diagnostico"
                  ? "border-rose-300 bg-[#fef2f3] ring-2 ring-rose-100 text-slate-900"
                  : "border-slate-200 bg-white hover:bg-slate-50/70 text-slate-600",
              )}
            >
              <div
                className={cn(
                  "flex size-10 sm:size-11 shrink-0 items-center justify-center rounded-xl transition",
                  activeTab === "diagnostico"
                    ? "bg-rose-100 text-[#e2263c]"
                    : "bg-slate-100 text-slate-400",
                )}
              >
                <FileText className="size-5" />
              </div>
              <div>
                <p className="text-sm sm:text-base font-bold text-slate-900">Diagnóstico</p>
                <p className="text-xs text-slate-500 font-medium">Onde estamos?</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("metas")}
              className={cn(
                "flex items-center gap-3.5 rounded-2xl border p-4 sm:p-5 text-left transition shadow-2xs cursor-pointer",
                activeTab === "metas"
                  ? "border-purple-300 bg-[#faf5ff] ring-2 ring-purple-100 text-slate-900"
                  : "border-slate-200 bg-white hover:bg-slate-50/70 text-slate-600",
              )}
            >
              <div
                className={cn(
                  "flex size-10 sm:size-11 shrink-0 items-center justify-center rounded-xl transition",
                  activeTab === "metas"
                    ? "bg-purple-100 text-purple-600"
                    : "bg-slate-100 text-slate-400",
                )}
              >
                <Target className="size-5" />
              </div>
              <div>
                <p className="text-sm sm:text-base font-bold text-slate-900">
                  Objetivo e Metas
                </p>
                <p className="text-xs text-slate-500 font-medium">
                  Onde queremos chegar?
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("revisoes")}
              className={cn(
                "flex items-center gap-3.5 rounded-2xl border p-4 sm:p-5 text-left transition shadow-2xs cursor-pointer",
                activeTab === "revisoes"
                  ? "border-rose-300 bg-[#fef2f3] ring-2 ring-rose-100 text-slate-900"
                  : "border-slate-200 bg-white hover:bg-slate-50/70 text-slate-600",
              )}
            >
              <div
                className={cn(
                  "flex size-10 sm:size-11 shrink-0 items-center justify-center rounded-xl transition",
                  activeTab === "revisoes"
                    ? "bg-rose-100 text-[#e2263c]"
                    : "bg-slate-100 text-slate-400",
                )}
              >
                <RefreshCw className="size-5" />
              </div>
              <div>
                <p className="text-sm sm:text-base font-bold text-slate-900">
                  Revisões do ciclo
                </p>
                <p className="text-xs text-slate-500 font-medium">
                  Ainda estamos no caminho?
                </p>
              </div>
            </button>
          </div>

          {/* ── CONTEÚDO DA SUB-ABA: DIAGNÓSTICO COMPLETO ── */}
          {activeTab === "diagnostico" && (
            <div className="space-y-6 pt-2">
              {activeRound ? (
                <>
                  {/* Barra de Status da Rodada */}
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/50 px-5 py-3.5 shadow-2xs">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="font-bold text-slate-900 text-sm">
                        {roundLabel(activeRound)}
                      </span>
                      <span className="text-slate-300">·</span>
                      <span className="text-sm text-slate-500 font-medium">
                        Ref: {formatDate(activeRound.referenceDate)}
                      </span>
                      {activeRound.isOpen ? (
                        <Badge tone="brand">Aberta para edição</Badge>
                      ) : (
                        <Badge>Fechada</Badge>
                      )}
                    </div>
                  </div>

                  <DiagnosisTableView
                    businessUnitId={businessUnitId}
                    businessUnitSlug={businessUnitSlug}
                    cycleSlug={selectedCycle.slug}
                    roundId={activeRound.id}
                    canEdit={canEdit}
                    isOpen={activeRound.isOpen}
                    initialData={activeRound}
                    onSelectTab={setActiveTab}
                  />
                </>
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs">
                  <h3 className="text-base font-bold text-slate-900 mb-2">
                    Nenhuma rodada aberta para este ciclo
                  </h3>
                  <p className="text-sm text-slate-500 mb-4">
                    Abra a primeira rodada para iniciar o preenchimento do diagnóstico.
                  </p>
                  <OpenRoundForm cycleId={selectedCycle.id} isFirst />
                </div>
              )}
            </div>
          )}

          {/* ── CONTEÚDO DA SUB-ABA: OBJETIVO E METAS DO CICLO ── */}
          {activeTab === "metas" && (
            <div className="space-y-6 pt-2">
              <KpiGoalsTable
                businessUnitId={businessUnitId}
                businessUnitSlug={businessUnitSlug}
                businessUnitName={businessUnitName}
                cycleId={selectedCycle.id}
                cycleSlug={selectedCycle.slug}
                canEdit={canEdit}
                initialCycleObjective={initialCycleObjective}
                initialCyclePeriod={initialCyclePeriod}
                initialGoals={kpiGoals}
                diagnosisInsights={diagnosisInsights}
                onSelectTab={setActiveTab}
              />
            </div>
          )}

          {/* ── CONTEÚDO DA SUB-ABA: REVISÕES DO CICLO ── */}
          {activeTab === "revisoes" && (
            <div className="space-y-6 pt-2">
              <ReviewCycleView
                businessUnitId={businessUnitId}
                businessUnitSlug={businessUnitSlug}
                businessUnitName={businessUnitName}
                cycleId={selectedCycle.id}
                cycleName={selectedCycle.name}
                cyclePeriod={initialCyclePeriod}
                cycleObjective={initialCycleObjective}
                canEdit={canEdit}
                initialReview={initialReview}
                allReviews={reviews}
                onSelectTab={setActiveTab}
              />
            </div>
          )}
        </div>
      )}

      {/* ── MODAL: INICIAR NOVO CICLO ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 md:p-8 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-display text-lg font-bold text-slate-900">
                  Iniciar Novo Ciclo Estratégico
                </h3>
                <p className="mt-0.5 text-xs sm:text-sm text-slate-500">
                  Defina o nome e o período do novo ciclo para {businessUnitName}.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCycle} className="mt-6 space-y-4">
              {modalError && (
                <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs sm:text-sm text-rose-700">
                  {modalError}
                </div>
              )}

              <div>
                <label className="text-xs sm:text-sm font-semibold text-slate-800">
                  Nome do Ciclo
                </label>
                <input
                  type="text"
                  required
                  value={newCycleName}
                  onChange={(e) => setNewCycleName(e.target.value)}
                  placeholder="Ex.: Ciclo 2 · 2027 ou 2º Semestre"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-100 transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs sm:text-sm font-semibold text-slate-800">
                    Data de Início
                  </label>
                  <input
                    type="date"
                    required
                    value={newCycleStarts}
                    onChange={(e) => setNewCycleStarts(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-100 transition"
                  />
                </div>
                <div>
                  <label className="text-xs sm:text-sm font-semibold text-slate-800">
                    Data de Término
                  </label>
                  <input
                    type="date"
                    required
                    value={newCycleEnds}
                    onChange={(e) => setNewCycleEnds(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-100 transition"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex items-center gap-2 rounded-xl bg-pink-600 px-5 py-2.5 text-xs sm:text-sm font-semibold text-white hover:bg-pink-700 transition shadow-2xs disabled:opacity-60"
                >
                  {isPending ? "Criando ciclo…" : "Criar Ciclo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
