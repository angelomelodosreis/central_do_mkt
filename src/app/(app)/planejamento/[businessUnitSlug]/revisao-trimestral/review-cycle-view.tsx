"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  Info,
  ChevronRight,
  ArrowRight,
  Save,
  Check,
  AlertTriangle,
  XCircle,
  RefreshCw,
} from "lucide-react";
import { saveFullQuarterlyReviewAction } from "./actions";
import type { QuarterlyReview } from "@/lib/modules/strategy/quarterly-review";
import { cn } from "@/lib/utils/cn";
import { ReviewLoop3DIllustration } from "@/components/ui/cycle-3d-illustrations";
import { CycleStepper } from "@/components/ui/cycle-stepper";

export function ReviewCycleView({
  businessUnitId,
  businessUnitSlug,
  businessUnitName,
  cycleId,
  cycleName,
  cyclePeriod,
  cycleObjective,
  canEdit,
  initialReview,
  allReviews,
  onSelectTab,
}: {
  businessUnitId: string;
  businessUnitSlug: string;
  businessUnitName: string;
  cycleId: string;
  cycleName: string;
  cyclePeriod: string;
  cycleObjective: string;
  canEdit: boolean;
  initialReview: QuarterlyReview | null;
  allReviews: QuarterlyReview[];
  onSelectTab?: (tab: "diagnostico" | "metas" | "revisoes") => void;
}) {
  // Estado da Revisão selecionada (1 ou 2)
  const [selectedQuarter, setSelectedQuarter] = useState<string>("Q1");

  // Dados do formulário das 7 perguntas + decisão tomada
  const [diagnosticValid, setDiagnosticValid] = useState<string>(
    initialReview?.diagnosticValid ?? "sim",
  );
  const [marketChanges, setMarketChanges] = useState<string>(
    initialReview?.marketChanges ?? "",
  );
  const [newProblems, setNewProblems] = useState<string>(
    initialReview?.newProblems ?? "",
  );
  const [missedOpportunities, setMissedOpportunities] = useState<string>(
    initialReview?.missedOpportunities ?? "",
  );
  const [objectiveAssumptions, setObjectiveAssumptions] = useState<string>(
    initialReview?.objectiveAssumptions ?? "",
  );
  const [needsGoalRevision, setNeedsGoalRevision] = useState<string>(
    initialReview?.needsGoalRevision ?? "nao",
  );
  const [nextQuarterFocus, setNextQuarterFocus] = useState<string>(
    initialReview?.nextQuarterFocus ?? "",
  );
  const [decisionTaken, setDecisionTaken] = useState<string>("");

  // Status do Ciclo no sidebar (Dentro do planejado, Atenção, Em risco)
  const [cycleStatus, setCycleStatus] = useState<"on_track" | "attention" | "at_risk">(
    "on_track",
  );

  const [isPending, startTransition] = useTransition();
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isCompleted, setIsCompleted] = useState(
    initialReview?.status === "completed",
  );

  function handleSave(status: "in_progress" | "completed") {
    if (!canEdit) return;

    startTransition(async () => {
      setStatusMessage(null);
      const combinedFocus = decisionTaken.trim()
        ? `${nextQuarterFocus}\n\n[Decisão Tomada]: ${decisionTaken}`
        : nextQuarterFocus;

      const res = await saveFullQuarterlyReviewAction({
        id: initialReview?.id,
        businessUnitId,
        cycleId,
        quarter: selectedQuarter,
        diagnosticValid,
        marketChanges,
        newProblems,
        missedOpportunities,
        objectiveAssumptions,
        needsGoalRevision,
        nextQuarterFocus: combinedFocus,
        status,
      });

      if (res.ok) {
        setIsCompleted(status === "completed");
        setStatusMessage(
          status === "completed"
            ? "Revisão concluída com sucesso!"
            : "Rascunho salvo com sucesso!",
        );
        setTimeout(() => setStatusMessage(null), 3500);
      } else {
        setStatusMessage(res.error || "Erro ao salvar revisão.");
      }
    });
  }

  return (
    <div className="space-y-8">
      {/* ── PARTE 2: Top Header com Stepper Oficial ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-block rounded-md px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-rose-700 bg-rose-50 border border-rose-200">
              ACOMPANHAMENTO
            </span>
          </div>
          <h1 className="mt-2 font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Revisões do Ciclo
          </h1>
          <p className="mt-1 text-sm text-slate-500 max-w-2xl">
            Acompanhe o andamento trimestral e verifique se as premissas estratégicas da BU continuam no rumo certo.
          </p>
        </div>

        {/* Stepper Oficial */}
        <div className="shrink-0">
          <CycleStepper activeStep="revisoes" onSelectStep={onSelectTab} />
        </div>
      </div>

      {/* ── HERO BANNER: Revisão Trimestral (Card 3D Pastel) ── */}
      <div className="rounded-3xl border border-emerald-100/90 bg-gradient-to-r from-emerald-50/60 via-teal-50/20 to-white p-6 sm:p-7 shadow-2xs space-y-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 border border-emerald-200/60 shadow-2xs">
              <RefreshCw className="size-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">
                REVISÃO ESTRATÉGICA DO CICLO
              </span>
              <h2 className="mt-0.5 font-display text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                Ainda estamos <span className="text-emerald-600">no caminho certo?</span>
              </h2>
              <p className="mt-1.5 text-xs sm:text-sm text-slate-600 leading-relaxed max-w-xl">
                As revisões são check-ins rápidos para entender o cenário de mercado, revalidar as premissas do diagnóstico e garantir que o ciclo continue no rumo pretendido com agilidade.
              </p>
            </div>
          </div>

          {/* Ilustração 3D Pastel de Revisão Contínua */}
          <div className="hidden sm:flex shrink-0 items-center justify-center">
            <ReviewLoop3DIllustration className="w-48 h-36" />
          </div>

          {/* Callout Informativo */}
          <div className="flex max-w-xs shrink-0 items-start gap-3 rounded-2xl border border-emerald-200/70 bg-white/90 backdrop-blur-xs p-4 shadow-2xs">
            <Info className="size-4.5 shrink-0 text-emerald-600 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-emerald-900">Ajuste de Rota Ágil</p>
              <p className="mt-0.5 text-xs font-medium text-emerald-800/90 leading-relaxed">
                As revisões acontecem a cada trimestre para corrigir rumo e destravar oportunidades sem esperar o fim do ciclo.
              </p>
            </div>
          </div>
        </div>

        {/* ── MILESTONES: Cards das 2 Revisões (Trimestral & Semestral) ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* Card 1: Revisão 1 (Trimestral) */}
          <div
            onClick={() => setSelectedQuarter("Q1")}
            className={cn(
              "rounded-2xl border p-5 transition shadow-2xs flex flex-col justify-between cursor-pointer",
              selectedQuarter === "Q1"
                ? "border-emerald-300 bg-white ring-2 ring-emerald-100"
                : "border-slate-200 bg-white/80 hover:border-slate-300",
            )}
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-2 ring-emerald-300">
                    <div className="size-3 rounded-full bg-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-slate-900">
                      Revisão 1 (Trimestral)
                    </h3>
                    <span className="text-xs text-slate-500 font-medium">1º Trimestre do Ciclo</span>
                  </div>
                </div>

                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
                  {isCompleted ? "Concluída" : "Em andamento"}
                </span>
              </div>

              <p className="mt-3 text-xs sm:text-sm text-slate-600 leading-relaxed">
                Registre o que mudou desde o diagnóstico e, se necessário, ajuste o objetivo ou as metas.
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100">
              <button
                type="button"
                className="w-full rounded-xl bg-emerald-600 py-2.5 text-xs sm:text-sm font-semibold text-white hover:bg-emerald-700 transition flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
              >
                Continuar revisão
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>

          {/* Card 2: Revisão 2 (Semestral) */}
          <div
            onClick={() => setSelectedQuarter("Q2")}
            className={cn(
              "rounded-2xl border p-5 transition shadow-2xs flex flex-col justify-between cursor-pointer",
              selectedQuarter === "Q2"
                ? "border-emerald-300 bg-white ring-2 ring-emerald-100"
                : "border-slate-200 bg-white/80 hover:border-slate-300",
            )}
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-full bg-slate-100 text-slate-400 border border-slate-200">
                    <div className="size-3 rounded-full bg-slate-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-slate-900">
                      Revisão 2 (Semestral)
                    </h3>
                    <span className="text-xs text-slate-500 font-medium">2º Trimestre / Encerramento</span>
                  </div>
                </div>

                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600 border border-slate-200">
                  Não iniciada
                </span>
              </div>

              <p className="mt-3 text-xs sm:text-sm text-slate-600 leading-relaxed">
                Revisão de encerramento do ciclo. Avaliação consolidada e aprendizados estratégicos.
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100">
              <button
                type="button"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                Iniciar revisão
                <ChevronRight className="size-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── ÁREA PRINCIPAL: FORMULÁRIO (ESQUERDA 2/3) + SIDEBAR (DIREITA 1/3) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 items-start">
        {/* LADO ESQUERDO: Formulário com as 7 Perguntas Oficiais */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 md:p-8 shadow-2xs space-y-7">
          {/* Header do Form */}
          <div className="border-b border-slate-100 pb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <div className="size-3 rounded-full border-2 border-emerald-500 bg-emerald-100" />
                <h3 className="font-display text-base font-bold text-slate-900">
                  {selectedQuarter === "Q1" ? "Revisão 1 (Trimestral)" : "Revisão 2 (Semestral)"}
                </h3>
                <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                  Em andamento
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Responda abaixo sobre o cenário da BU desde o último diagnóstico.
              </p>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
              <Clock className="size-3.5 text-slate-400" />
              <span>Preenchimento rápido ~5 minutos</span>
            </div>
          </div>

          {/* 1. O diagnóstico anterior continua válido? */}
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-sm font-bold text-emerald-600">
                1
              </span>
              <div>
                <label className="text-sm sm:text-base font-bold text-slate-900">
                  O diagnóstico anterior continua válido?
                </label>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  De forma geral, o cenário identificado no início do ciclo ainda se mantém?
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pl-10">
              {[
                {
                  id: "sim",
                  label: "Sim",
                  desc: "Sem mudanças relevantes.",
                },
                {
                  id: "parcialmente",
                  label: "Parcialmente",
                  desc: "Alguns pontos mudaram.",
                },
                {
                  id: "nao",
                  label: "Não",
                  desc: "O cenário mudou significativamente.",
                },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  disabled={!canEdit}
                  onClick={() => setDiagnosticValid(opt.id)}
                  className={cn(
                    "flex flex-col rounded-2xl border p-4 text-left transition shadow-2xs cursor-pointer",
                    diagnosticValid === opt.id
                      ? "border-emerald-300 bg-emerald-50/30 ring-1 ring-emerald-200 text-slate-900"
                      : "border-slate-200 bg-white hover:border-slate-300 text-slate-600",
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={cn(
                        "size-4 rounded-full border flex items-center justify-center transition",
                        diagnosticValid === opt.id
                          ? "border-emerald-600 bg-emerald-600"
                          : "border-slate-300",
                      )}
                    >
                      {diagnosticValid === opt.id && (
                        <div className="size-1.5 rounded-full bg-white" />
                      )}
                    </div>
                    <span className="text-sm font-bold">{opt.label}</span>
                  </div>
                  <span className="text-xs text-slate-500 mt-1 pl-6">
                    {opt.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* 2. O que mudou desde o último diagnóstico? */}
          <div className="space-y-2">
            <div className="flex items-start gap-3">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-sm font-bold text-emerald-600">
                2
              </span>
              <div>
                <label className="text-sm sm:text-base font-bold text-slate-900">
                  O que mudou desde o último diagnóstico?
                </label>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  Registre de forma breve as principais mudanças no cenário da BU.
                </p>
              </div>
            </div>

            <div className="relative pl-10">
              <textarea
                value={marketChanges}
                disabled={!canEdit}
                maxLength={500}
                onChange={(e) => setMarketChanges(e.target.value)}
                placeholder="Registre aqui as mudanças ocorridas..."
                rows={3}
                className="w-full rounded-2xl border border-slate-200 bg-white p-3.5 pb-7 text-sm leading-relaxed text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100 resize-none transition shadow-2xs"
              />
              <span className="absolute bottom-2.5 right-3 text-xs tabular-nums font-mono text-slate-400">
                {marketChanges.length}/500
              </span>
            </div>
          </div>

          {/* 3. Algum problema novo apareceu? */}
          <div className="space-y-2">
            <div className="flex items-start gap-3">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-sm font-bold text-emerald-600">
                3
              </span>
              <div>
                <label className="text-sm sm:text-base font-bold text-slate-900">
                  Algum problema novo apareceu?
                </label>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  Gargalos, riscos ou dificuldades que não estavam mapeados no início do ciclo.
                </p>
              </div>
            </div>

            <div className="relative pl-10">
              <textarea
                value={newProblems}
                disabled={!canEdit}
                maxLength={500}
                onChange={(e) => setNewProblems(e.target.value)}
                placeholder="Registre novos problemas identificados..."
                rows={3}
                className="w-full rounded-2xl border border-slate-200 bg-white p-3.5 pb-7 text-sm leading-relaxed text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100 resize-none transition shadow-2xs"
              />
              <span className="absolute bottom-2.5 right-3 text-xs tabular-nums font-mono text-slate-400">
                {newProblems.length}/500
              </span>
            </div>
          </div>

          {/* 4. Alguma oportunidade foi perdida ou precisa ser acelerada? */}
          <div className="space-y-2">
            <div className="flex items-start gap-3">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-sm font-bold text-emerald-600">
                4
              </span>
              <div>
                <label className="text-sm sm:text-base font-bold text-slate-900">
                  Alguma oportunidade foi perdida ou precisa ser acelerada?
                </label>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  Janelas de mercado, campanhas ou frentes que precisam de mais tração imediata.
                </p>
              </div>
            </div>

            <div className="relative pl-10">
              <textarea
                value={missedOpportunities}
                disabled={!canEdit}
                maxLength={500}
                onChange={(e) => setMissedOpportunities(e.target.value)}
                placeholder="Registre oportunidades a acelerar..."
                rows={3}
                className="w-full rounded-2xl border border-slate-200 bg-white p-3.5 pb-7 text-sm leading-relaxed text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100 resize-none transition shadow-2xs"
              />
              <span className="absolute bottom-2.5 right-3 text-xs tabular-nums font-mono text-slate-400">
                {missedOpportunities.length}/500
              </span>
            </div>
          </div>

          {/* 5. As premissas do objetivo ainda se sustentam? */}
          <div className="space-y-2">
            <div className="flex items-start gap-3">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-sm font-bold text-emerald-600">
                5
              </span>
              <div>
                <label className="text-sm sm:text-base font-bold text-slate-900">
                  As premissas do objetivo ainda se sustentam?
                </label>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  A ambição do ciclo continua coerente com o momento da BU?
                </p>
              </div>
            </div>

            <div className="relative pl-10">
              <textarea
                value={objectiveAssumptions}
                disabled={!canEdit}
                maxLength={500}
                onChange={(e) => setObjectiveAssumptions(e.target.value)}
                placeholder="Avalie a sustentabilidade do objetivo..."
                rows={3}
                className="w-full rounded-2xl border border-slate-200 bg-white p-3.5 pb-7 text-sm leading-relaxed text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100 resize-none transition shadow-2xs"
              />
              <span className="absolute bottom-2.5 right-3 text-xs tabular-nums font-mono text-slate-400">
                {objectiveAssumptions.length}/500
              </span>
            </div>
          </div>

          {/* 6. Alguma meta precisa ser revisada? */}
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-sm font-bold text-emerald-600">
                6
              </span>
              <div>
                <label className="text-sm sm:text-base font-bold text-slate-900">
                  Alguma meta precisa ser revisada?
                </label>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  Caso o cenário tenha mudado significativamente, as metas devem ser recalibradas.
                </p>
              </div>
            </div>

            <div className="flex gap-4 pl-10">
              {[
                { id: "nao", label: "Não — manter metas atuais" },
                { id: "sim", label: "Sim — requer ajuste de metas" },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  disabled={!canEdit}
                  onClick={() => setNeedsGoalRevision(opt.id)}
                  className={cn(
                    "flex items-center gap-2.5 rounded-2xl border px-5 py-3 text-sm font-semibold transition shadow-2xs cursor-pointer",
                    needsGoalRevision === opt.id
                      ? "border-emerald-300 bg-emerald-50/40 text-emerald-900 ring-1 ring-emerald-200"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
                  )}
                >
                  <div
                    className={cn(
                      "size-4 rounded-full border flex items-center justify-center transition",
                      needsGoalRevision === opt.id
                        ? "border-emerald-600 bg-emerald-600"
                        : "border-slate-300",
                    )}
                  >
                    {needsGoalRevision === opt.id && (
                      <div className="size-1.5 rounded-full bg-white" />
                    )}
                  </div>
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 7. Qual é o foco prioritário para o próximo trimestre? */}
          <div className="space-y-2">
            <div className="flex items-start gap-3">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-sm font-bold text-emerald-600">
                7
              </span>
              <div>
                <label className="text-sm sm:text-base font-bold text-slate-900">
                  Qual é o foco prioritário para o próximo trimestre?
                </label>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  Defina claramente onde o time deve concentrar esforço e energia para maximizar resultados.
                </p>
              </div>
            </div>

            <div className="relative pl-10">
              <textarea
                value={nextQuarterFocus}
                disabled={!canEdit}
                maxLength={500}
                onChange={(e) => setNextQuarterFocus(e.target.value)}
                placeholder="Ex.: Priorizar lançamento da extensão de pós-graduação e otimizar funil de conversão orgânica..."
                rows={3}
                className="w-full rounded-2xl border border-slate-200 bg-white p-3.5 pb-7 text-sm leading-relaxed text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100 resize-none transition shadow-2xs"
              />
              <span className="absolute bottom-2.5 right-3 text-xs tabular-nums font-mono text-slate-400">
                {nextQuarterFocus.length}/500
              </span>
            </div>
          </div>

          {/* Decisão Tomada */}
          <div className="space-y-2 border-t border-slate-100 pt-5">
            <label className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              Decisão Estratégica Tomada nesta Revisão
            </label>
            <input
              type="text"
              value={decisionTaken}
              disabled={!canEdit}
              onChange={(e) => setDecisionTaken(e.target.value)}
              placeholder="Ex.: Manter meta principal e acelerar investimento em tráfego direto para Internato."
              className="w-full rounded-2xl border border-slate-200 bg-white p-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100 transition shadow-2xs"
            />
          </div>

          {/* Botões de Ação */}
          {canEdit && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-6">
              <button
                type="button"
                onClick={() => handleSave("in_progress")}
                disabled={isPending}
                className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs cursor-pointer"
              >
                Salvar como rascunho
              </button>

              <button
                type="button"
                onClick={() => handleSave("completed")}
                disabled={isPending}
                className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-6 py-2.5 text-xs font-semibold text-white hover:bg-emerald-700 transition shadow-2xs cursor-pointer"
              >
                {isPending ? (
                  <>
                    <div className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Salvando revisão…
                  </>
                ) : statusMessage ? (
                  <>
                    <Check className="size-3.5 text-white" />
                    {statusMessage}
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="size-3.5" />
                    Concluir e Salvar Revisão
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* LADO DIREITO: Painel de Apoio e Status */}
        <div className="space-y-5">
          {/* Status do Ciclo */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-2xs space-y-4">
            <h4 className="font-display text-sm font-bold text-slate-900">
              Status do Ciclo
            </h4>
            <div className="space-y-2">
              {[
                {
                  id: "on_track",
                  label: "Dentro do planejado",
                  color: "emerald",
                  desc: "Metas e ações caminhando conforme previsto.",
                },
                {
                  id: "attention",
                  label: "Atenção necessária",
                  color: "amber",
                  desc: "Pequenos desvios exigem monitoramento ativo.",
                },
                {
                  id: "at_risk",
                  label: "Em risco",
                  color: "rose",
                  desc: "Desvios relevantes exigem intervenção imediata.",
                },
              ].map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setCycleStatus(st.id as any)}
                  className={cn(
                    "w-full rounded-2xl border p-3.5 text-left transition shadow-2xs cursor-pointer",
                    cycleStatus === st.id
                      ? "border-emerald-300 bg-emerald-50/30 ring-1 ring-emerald-200 text-slate-900"
                      : "border-slate-200 bg-white hover:border-slate-300 text-slate-600",
                  )}
                >
                  <p className="text-xs font-bold text-slate-900">{st.label}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{st.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Linha do Tempo das Revisões */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-2xs space-y-4">
            <h4 className="font-display text-sm font-bold text-slate-900 flex items-center gap-2">
              <Clock className="size-4 text-emerald-600" />
              Linha do Tempo
            </h4>

            <div className="space-y-4 relative pl-4 border-l-2 border-emerald-100 ml-2">
              <div className="relative">
                <div className="absolute -left-[23px] top-1 size-3.5 rounded-full border-2 border-emerald-500 bg-white" />
                <span className="text-xs font-bold text-slate-900">
                  Revisão 1 (Trimestral)
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Check-in de validação de rota intermediária.
                </p>
              </div>

              <div className="relative pt-2">
                <div className="absolute -left-[23px] top-3 size-3.5 rounded-full border-2 border-slate-300 bg-white" />
                <span className="text-xs font-bold text-slate-700">
                  Revisão 2 (Semestral)
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Balanço consolidado e fechamento do ciclo.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
