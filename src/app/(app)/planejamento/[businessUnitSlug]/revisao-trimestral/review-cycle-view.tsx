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
} from "lucide-react";
import { saveFullQuarterlyReviewAction } from "./actions";
import type { QuarterlyReview } from "@/lib/modules/strategy/quarterly-review";
import { cn } from "@/lib/utils/cn";

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
      {/* ── TOPO: Contexto do Ciclo ── */}
      <div className="rounded-3xl border border-pink-100 bg-white p-6 shadow-2xs">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <Link
              href={`/planejamento/${businessUnitSlug}/ciclos`}
              className="text-xs font-semibold text-pink-600 hover:text-pink-700 transition flex items-center gap-1 mb-2"
            >
              ← Voltar para ciclos
            </Link>

            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">
                {cycleName} · {cyclePeriod}
              </h1>
              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200">
                Em andamento
              </span>
            </div>

            <p className="mt-1.5 text-xs text-slate-600 leading-relaxed max-w-3xl">
              {cycleObjective ||
                `Ser a principal referência nacional em educação médica para ${businessUnitName}.`}
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3 shrink-0">
            <Calendar className="size-5 text-pink-600" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Período do ciclo
              </p>
              <p className="text-xs font-bold text-slate-800">{cyclePeriod}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── TÍTULO DA SEÇÃO & AVISO ── */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold text-slate-900">
            Revisões do ciclo
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Acompanhe as revisões trimestral e semestral e registre o que mudou desde o último diagnóstico.
          </p>
        </div>

        <div className="flex max-w-sm items-start gap-2.5 rounded-2xl border border-pink-200/80 bg-pink-50/50 p-3 shadow-2xs">
          <Info className="size-4 shrink-0 text-pink-600 mt-0.5" />
          <p className="text-xs font-medium text-pink-800 leading-relaxed">
            As revisões são check-ins rápidos para entender o cenário e garantir que o ciclo continue no caminho certo.
          </p>
        </div>
      </div>

      {/* ── MILESTONES: Cards das 2 Revisões (Trimestral & Semestral) ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 relative">
        {/* Card 1: Revisão 1 (Trimestral) */}
        <div
          onClick={() => setSelectedQuarter("Q1")}
          className={cn(
            "rounded-2xl border p-5 transition shadow-2xs flex flex-col justify-between cursor-pointer",
            selectedQuarter === "Q1"
              ? "border-pink-300 bg-white ring-2 ring-pink-100"
              : "border-slate-200 bg-white hover:border-slate-300",
          )}
        >
          <div>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-full bg-pink-50 text-pink-600 ring-2 ring-pink-400">
                  <div className="size-3 rounded-full bg-pink-600" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    Revisão 1 (Trimestral)
                  </h3>
                  <span className="text-xs text-slate-500 font-medium">Mar/2027</span>
                </div>
              </div>

              <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 border border-blue-200">
                {isCompleted ? "Concluída" : "Em andamento"}
              </span>
            </div>

            <p className="mt-3 text-sm text-slate-600 leading-relaxed">
              Registre o que mudou desde o diagnóstico e, se necessário, ajuste o objetivo ou as metas.
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100">
            <button
              type="button"
              className="w-full rounded-xl bg-pink-600 py-2.5 text-xs sm:text-sm font-semibold text-white hover:bg-pink-700 transition flex items-center justify-center gap-1.5 shadow-2xs"
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
              ? "border-pink-300 bg-white ring-2 ring-pink-100"
              : "border-slate-200 bg-white hover:border-slate-300",
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
                  <span className="text-xs text-slate-500 font-medium">Jun/2027</span>
                </div>
              </div>

              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600 border border-slate-200">
                Não iniciada
              </span>
            </div>

            <p className="mt-3 text-sm text-slate-600 leading-relaxed">
              Revisão de encerramento do ciclo. Avaliação completa e resultados consolidados.
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100">
            <button
              type="button"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition flex items-center justify-center gap-1.5"
            >
              Iniciar revisão
              <ChevronRight className="size-3.5" />
            </button>
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
                <div className="size-3 rounded-full border-2 border-pink-500 bg-pink-100" />
                <h3 className="font-display text-base font-bold text-slate-900">
                  Revisão 1 (Trimestral) · Mar/2027
                </h3>
                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200">
                  Em andamento
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Responda abaixo sobre o cenário da BU desde o último diagnóstico (Jan/2027).
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
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-pink-50 text-sm font-bold text-pink-600">
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
                    "flex flex-col rounded-2xl border p-4 text-left transition shadow-2xs",
                    diagnosticValid === opt.id
                      ? "border-pink-300 bg-pink-50/30 ring-1 ring-pink-200 text-slate-900"
                      : "border-slate-200 bg-white hover:border-slate-300 text-slate-600",
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={cn(
                        "size-4 rounded-full border flex items-center justify-center transition",
                        diagnosticValid === opt.id
                          ? "border-pink-600 bg-pink-600"
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
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-pink-50 text-sm font-bold text-pink-600">
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
                placeholder="Ex.: A conversão melhorou nas últimas semanas, mas o volume de leads está abaixo do esperado."
                rows={3}
                className="w-full rounded-2xl border border-slate-200 bg-white p-3.5 pb-7 text-sm leading-relaxed text-slate-900 placeholder:text-slate-400 focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-100 resize-none transition"
              />
              <span className="absolute bottom-2.5 right-3 text-xs tabular-nums font-mono text-slate-400">
                {marketChanges.length}/500
              </span>
            </div>
          </div>

          {/* 3. Algum problema novo apareceu? */}
          <div className="space-y-2">
            <div className="flex items-start gap-3">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-pink-50 text-sm font-bold text-pink-600">
                3
              </span>
              <div>
                <label className="text-sm sm:text-base font-bold text-slate-900">
                  Algum problema novo apareceu?
                </label>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  Novos gargalos, riscos, concorrentes agressivos ou limitações operacionais.
                </p>
              </div>
            </div>

            <div className="relative pl-10">
              <textarea
                value={newProblems}
                disabled={!canEdit}
                maxLength={500}
                onChange={(e) => setNewProblems(e.target.value)}
                placeholder="Ex.: Alta competitividade regional e aumento de CPL em campanhas pagas..."
                rows={2}
                className="w-full rounded-2xl border border-slate-200 bg-white p-3.5 pb-7 text-sm leading-relaxed text-slate-900 placeholder:text-slate-400 focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-100 resize-none transition"
              />
              <span className="absolute bottom-2.5 right-3 text-xs tabular-nums font-mono text-slate-400">
                {newProblems.length}/500
              </span>
            </div>
          </div>

          {/* 4. Alguma oportunidade deixou de existir? */}
          <div className="space-y-2">
            <div className="flex items-start gap-3">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-pink-50 text-sm font-bold text-pink-600">
                4
              </span>
              <div>
                <label className="text-sm sm:text-base font-bold text-slate-900">
                  Alguma oportunidade deixou de existir?
                </label>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  Mudanças de mercado, produtos ou frentes que perderam tração ou prioridade.
                </p>
              </div>
            </div>

            <div className="relative pl-10">
              <textarea
                value={missedOpportunities}
                disabled={!canEdit}
                maxLength={500}
                onChange={(e) => setMissedOpportunities(e.target.value)}
                placeholder="Ex.: Janela de lançamento de Hands On encurtada pela grade de provas..."
                rows={2}
                className="w-full rounded-2xl border border-slate-200 bg-white p-3.5 pb-7 text-sm leading-relaxed text-slate-900 placeholder:text-slate-400 focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-100 resize-none transition"
              />
              <span className="absolute bottom-2.5 right-3 text-xs tabular-nums font-mono text-slate-400">
                {missedOpportunities.length}/500
              </span>
            </div>
          </div>

          {/* 5. Alguma premissa do objetivo mudou? */}
          <div className="space-y-2">
            <div className="flex items-start gap-3">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-pink-50 text-sm font-bold text-pink-600">
                5
              </span>
              <div>
                <label className="text-sm sm:text-base font-bold text-slate-900">
                  Alguma premissa do objetivo mudou?
                </label>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  O direcionamento amplo da BU continua o mesmo ou precisa de calibração?
                </p>
              </div>
            </div>

            <div className="relative pl-10">
              <textarea
                value={objectiveAssumptions}
                disabled={!canEdit}
                maxLength={500}
                onChange={(e) => setObjectiveAssumptions(e.target.value)}
                placeholder="Ex.: A ambição macro se mantém com maior peso no Internato..."
                rows={2}
                className="w-full rounded-2xl border border-slate-200 bg-white p-3.5 pb-7 text-sm leading-relaxed text-slate-900 placeholder:text-slate-400 focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-100 resize-none transition"
              />
              <span className="absolute bottom-2.5 right-3 text-xs tabular-nums font-mono text-slate-400">
                {objectiveAssumptions.length}/500
              </span>
            </div>
          </div>

          {/* 6. Precisamos revisar alguma meta? */}
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-pink-50 text-sm font-bold text-pink-600">
                6
              </span>
              <div>
                <label className="text-sm sm:text-base font-bold text-slate-900">
                  Precisamos revisar alguma meta?
                </label>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  Essa mudança impacta o objetivo ou alguma meta mensurável do ciclo?
                </p>
              </div>
            </div>

            <div className="flex gap-6 pl-10">
              {[
                { id: "sim", label: "Sim" },
                { id: "nao", label: "Não" },
              ].map((opt) => (
                <label
                  key={opt.id}
                  className="flex items-center gap-2.5 cursor-pointer text-sm font-semibold text-slate-700 hover:text-slate-900"
                >
                  <input
                    type="radio"
                    name="needsGoalRevision"
                    value={opt.id}
                    checked={needsGoalRevision === opt.id}
                    disabled={!canEdit}
                    onChange={() => setNeedsGoalRevision(opt.id)}
                    className="size-4.5 text-pink-600 focus:ring-pink-500 border-slate-300"
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* 7. Qual é o principal ponto de atenção para o próximo trimestre? */}
          <div className="space-y-2">
            <div className="flex items-start gap-3">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-pink-50 text-sm font-bold text-pink-600">
                7
              </span>
              <div>
                <label className="text-sm sm:text-base font-bold text-slate-900">
                  Qual é o principal ponto de atenção para o próximo trimestre?
                </label>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  O maior foco de acompanhamento para os próximos 3 meses.
                </p>
              </div>
            </div>

            <div className="relative pl-10">
              <textarea
                value={nextQuarterFocus}
                disabled={!canEdit}
                maxLength={500}
                onChange={(e) => setNextQuarterFocus(e.target.value)}
                placeholder="Ex.: Manter a eficiência de aquisição e aumentar o share de mercado..."
                rows={2}
                className="w-full rounded-2xl border border-slate-200 bg-white p-3.5 pb-7 text-sm leading-relaxed text-slate-900 placeholder:text-slate-400 focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-100 resize-none transition"
              />
              <span className="absolute bottom-2.5 right-3 text-xs tabular-nums font-mono text-slate-400">
                {nextQuarterFocus.length}/500
              </span>
            </div>
          </div>

          {/* 8. Qual decisão foi tomada? */}
          <div className="space-y-2">
            <div className="flex items-start gap-3">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-pink-50 text-sm font-bold text-pink-600">
                8
              </span>
              <div>
                <label className="text-sm sm:text-base font-bold text-slate-900">
                  Qual decisão foi tomada?
                </label>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  Descreva quais ajustes serão feitos (se houver).
                </p>
              </div>
            </div>

            <div className="relative pl-10">
              <textarea
                value={decisionTaken}
                disabled={!canEdit}
                maxLength={500}
                onChange={(e) => setDecisionTaken(e.target.value)}
                placeholder="Ex.: Ajustar meta de matrículas e reforçar estratégia de geração de demanda."
                rows={2}
                className="w-full rounded-2xl border border-slate-200 bg-white p-3.5 pb-7 text-sm leading-relaxed text-slate-900 placeholder:text-slate-400 focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-100 resize-none transition"
              />
              <span className="absolute bottom-2.5 right-3 text-xs tabular-nums font-mono text-slate-400">
                {decisionTaken.length}/500
              </span>
            </div>
          </div>

          {/* Botões de Ação do Form */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100 pl-10">
            <button
              type="button"
              disabled={isPending || !canEdit}
              onClick={() => handleSave("in_progress")}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              Salvar como rascunho
            </button>

            <div className="flex items-center gap-3">
              {statusMessage && (
                <span className="text-sm text-emerald-700 font-semibold flex items-center gap-1.5">
                  <Check className="size-4" />
                  {statusMessage}
                </span>
              )}

              <button
                type="button"
                disabled={isPending || !canEdit}
                onClick={() => handleSave("completed")}
                className="rounded-xl bg-pink-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-pink-700 transition flex items-center gap-1.5 shadow-2xs"
              >
                Concluir revisão →
              </button>
            </div>
          </div>
        </div>

        {/* LADO DIREITO: Sidebar com Status, Mudanças e Linha do Tempo */}
        <div className="space-y-5">
          {/* Card 1: Status do Ciclo */}
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-2xs space-y-3">
            <div className="flex items-center gap-2">
              <div className="size-2 rounded-full bg-pink-500" />
              <h4 className="text-xs font-bold text-slate-900">
                Status do ciclo
              </h4>
            </div>

            <div className="flex items-center gap-2 rounded-2xl bg-emerald-50/80 border border-emerald-200/80 p-3">
              <CheckCircle2 className="size-4.5 text-emerald-600 shrink-0" />
              <div>
                <p className="text-xs font-bold text-emerald-900">
                  Dentro do planejado
                </p>
                <p className="text-[11px] text-emerald-700 mt-0.5 leading-snug">
                  O ciclo segue conforme o esperado, com ajustes pontuais.
                </p>
              </div>
            </div>
          </div>

          {/* Card 2: Principais mudanças desta revisão */}
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-2xs space-y-3">
            <div className="flex items-center gap-2">
              <FileText className="size-4 text-pink-600" />
              <h4 className="text-xs font-bold text-slate-900">
                Principais mudanças desta revisão
              </h4>
            </div>

            <ul className="space-y-2 text-xs text-slate-600 leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="text-pink-500 font-bold leading-none select-none">
                  •
                </span>
                <span>Conversão apresentou melhora nas últimas semanas.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-pink-500 font-bold leading-none select-none">
                  •
                </span>
                <span>Identificamos uma nova oportunidade no público R2/R3.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-pink-500 font-bold leading-none select-none">
                  •
                </span>
                <span>Ajuste na meta de matrículas para o 2º semestre.</span>
              </li>
            </ul>
          </div>

          {/* Card 3: Linha do tempo das revisões */}
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
            <div className="flex items-center gap-2">
              <Clock className="size-4 text-pink-600" />
              <h4 className="text-xs font-bold text-slate-900">
                Linha do tempo das revisões
              </h4>
            </div>

            <div className="space-y-4 relative pl-4 border-l-2 border-pink-100 ml-2">
              {/* Ponto 1 */}
              <div className="relative">
                <div className="absolute -left-[23px] top-1 size-3.5 rounded-full border-2 border-pink-500 bg-white" />
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900">
                    Revisão 1 (Trimestral)
                  </span>
                  <span className="rounded-full bg-blue-50 px-1.5 py-0.2 text-[9px] font-bold text-blue-700">
                    Em andamento
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Mar/2027 · Preenchimento em andamento.
                </p>
              </div>

              {/* Ponto 2 */}
              <div className="relative pt-2">
                <div className="absolute -left-[23px] top-3 size-3.5 rounded-full border-2 border-slate-300 bg-white" />
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-700">
                    Revisão 2 (Semestral)
                  </span>
                  <span className="rounded-full bg-slate-100 px-1.5 py-0.2 text-[9px] font-bold text-slate-600">
                    Não iniciada
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Jun/2027 · Revisão de encerramento do ciclo.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
