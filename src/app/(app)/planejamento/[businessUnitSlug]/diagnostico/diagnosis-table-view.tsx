"use client";

import { useState, useTransition, useEffect } from "react";
import Link from "next/link";
import {
  BarChart2,
  Users,
  Package,
  Filter,
  Settings,
  AlertTriangle,
  Lightbulb,
  Info,
  ArrowRight,
  Check,
  Save,
  Compass,
  Pencil,
  Target,
  MessageSquare,
  Send,
} from "lucide-react";
import {
  saveFullDiagnosisAction,
  listDiagnosisCommentsAction,
  addDiagnosisCommentAction,
  type DiagnosisCommentItem,
} from "./actions";
import { cn } from "@/lib/utils/cn";
import { DiagnosticRadar3DIllustration } from "@/components/ui/cycle-3d-illustrations";
import { CycleStepper } from "@/components/ui/cycle-stepper";

type DiagnosisPillarDef = {
  key:
    | "businessMarketDiagnosis"
    | "clientBrandDiagnosis"
    | "portfolioOfferDiagnosis"
    | "funnelConversionDiagnosis"
    | "contextCapacityDiagnosis";
  title: string;
  icon: typeof BarChart2;
  tone: "indigo" | "rose" | "amber" | "purple" | "emerald";
  centralQuestion: string;
  provocations: string[];
  evidences: string[];
};

const PILLARS: DiagnosisPillarDef[] = [
  {
    key: "businessMarketDiagnosis",
    title: "1. Negócio e mercado",
    icon: BarChart2,
    tone: "indigo",
    centralQuestion: "Onde estamos e como estamos em relação ao mercado?",
    provocations: [
      "Estamos crescendo?",
      "Perdemos volume?",
      "O mercado cresceu mais que a MedCof?",
      "Estamos ganhando ou perdendo participação?",
      "Entraram concorrentes mais agressivos?",
    ],
    evidences: [
      "Faturamento",
      "Vendas",
      "Crescimento",
      "Tamanho do mercado",
      "Market share",
      "Concorrência",
    ],
  },
  {
    key: "clientBrandDiagnosis",
    title: "2. Cliente e marca",
    icon: Users,
    tone: "rose",
    centralQuestion: "Estamos relevantes para o público certo?",
    provocations: [
      "Perdemos algum público?",
      "Estamos alcançando novos segmentos?",
      "A marca continua sendo considerada?",
      "Perdemos relevância ou diferenciação?",
      "As necessidades do público mudaram?",
    ],
    evidences: [
      "Personas",
      "Base de alunos",
      "Aquisição",
      "Pesquisas",
      "Awareness",
      "Consideração",
      "Percepção de marca",
    ],
  },
  {
    key: "portfolioOfferDiagnosis",
    title: "3. Portfólio e oferta",
    icon: Package,
    tone: "amber",
    centralQuestion: "Nossa oferta continua competitiva e adequada ao mercado?",
    provocations: [
      "Estamos concentrados em um produto?",
      "Algum produto perdeu relevância?",
      "Temos necessidades importantes sem solução?",
      "Perdemos competitividade em preço ou valor percebido?",
    ],
    evidences: [
      "Vendas por produto",
      "Faturamento por produto",
      "Mix de produtos",
      "Ticket médio",
      "Preços",
      "Ofertas",
      "Concorrência",
    ],
  },
  {
    key: "funnelConversionDiagnosis",
    title: "4. Funil e conversão",
    icon: Filter,
    tone: "purple",
    centralQuestion: "Estamos conseguindo transformar demanda em resultado?",
    provocations: [
      "A conversão piorou?",
      "Estamos gerando leads suficientes?",
      "Em qual etapa estamos perdendo pessoas?",
      "O problema está em aquisição, oferta, experiência ou venda?",
    ],
    evidences: [
      "Leads",
      "Leads qualificados",
      "Conversão",
      "CAC",
      "CPL",
      "ROAS",
      "Canais",
      "Vendas",
      "Funil",
    ],
  },
  {
    key: "contextCapacityDiagnosis",
    title: "5. Contexto e capacidade",
    icon: Settings,
    tone: "emerald",
    centralQuestion: "Temos as condições para sustentar o crescimento?",
    provocations: [
      "Estamos aproveitando as melhores janelas do ano?",
      "Existem períodos em que deixamos oportunidades na mesa?",
      "Temos equipe, verba e capacidade operacional para crescer?",
      "O que pode limitar o próximo ciclo?",
    ],
    evidences: [
      "Sazonalidade",
      "Calendário",
      "Eventos",
      "Orçamento",
      "Equipe",
      "Capacidade operacional",
    ],
  },
];

function formatCommentDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

export function DiagnosisTableView({
  businessUnitId,
  businessUnitSlug,
  cycleSlug,
  roundId,
  canEdit,
  isOpen,
  initialData,
  onSelectTab,
}: {
  businessUnitId: string;
  businessUnitSlug: string;
  cycleSlug?: string;
  roundId: string;
  canEdit: boolean;
  isOpen: boolean;
  initialData: {
    businessMarketDiagnosis?: string | null;
    clientBrandDiagnosis?: string | null;
    portfolioOfferDiagnosis?: string | null;
    funnelConversionDiagnosis?: string | null;
    contextCapacityDiagnosis?: string | null;
    mainChallenge?: string | null;
    mainOpportunity?: string | null;
  };
  onSelectTab?: (tab: "diagnostico" | "metas" | "revisoes") => void;
}) {
  const [data, setData] = useState({
    businessMarketDiagnosis: initialData.businessMarketDiagnosis ?? "",
    clientBrandDiagnosis: initialData.clientBrandDiagnosis ?? "",
    portfolioOfferDiagnosis: initialData.portfolioOfferDiagnosis ?? "",
    funnelConversionDiagnosis: initialData.funnelConversionDiagnosis ?? "",
    contextCapacityDiagnosis: initialData.contextCapacityDiagnosis ?? "",
    mainChallenge: initialData.mainChallenge ?? "",
    mainOpportunity: initialData.mainOpportunity ?? "",
  });

  // Pergunta unificada (Item 4)
  const initialUnified =
    initialData.mainChallenge?.trim() ||
    initialData.mainOpportunity?.trim() ||
    "";
  const [unifiedQuestion, setUnifiedQuestion] = useState(initialUnified);
  const [editingUnified, setEditingUnified] = useState(!initialUnified);

  // Modo de visualização completa vs edição dos 5 pilares (Item 2)
  const [editingPillars, setEditingPillars] = useState<Record<string, boolean>>({});

  // Comentários colaborativos do diagnóstico (Item 2 - parte B)
  const [comments, setComments] = useState<DiagnosisCommentItem[]>([]);
  const [commentText, setCommentText] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadComments() {
      const res = await listDiagnosisCommentsAction(roundId);
      if (isMounted && res.ok) {
        setComments(res.comments);
      }
    }
    loadComments();
    return () => {
      isMounted = false;
    };
  }, [roundId]);

  async function handleAddComment(e: React.FormEvent) {
    e.preventDefault();
    if (!commentText.trim() || isSubmittingComment) return;

    setIsSubmittingComment(true);
    const res = await addDiagnosisCommentAction({
      roundId,
      businessUnitId,
      content: commentText.trim(),
    });
    setIsSubmittingComment(false);

    if (res.ok && res.comment) {
      setComments((prev) => [...prev, res.comment!]);
      setCommentText("");
    }
  }

  const [isPending, startTransition] = useTransition();
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  const editable = canEdit && isOpen;

  function handleChange(field: keyof typeof data, value: string) {
    if (value.length > 500) return;
    setData((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
    setStatusMessage(null);
  }

  function handleSave() {
    if (!editable) return;
    startTransition(async () => {
      setStatusMessage(null);
      const res = await saveFullDiagnosisAction({
        roundId,
        businessUnitId,
        ...data,
        mainChallenge: unifiedQuestion.trim() || null,
        mainOpportunity: unifiedQuestion.trim() || null,
      });

      if (res.ok) {
        setHasChanges(false);
        setStatusMessage("Diagnóstico salvo com sucesso!");
        setTimeout(() => setStatusMessage(null), 3500);
      } else {
        setStatusMessage(res.error || "Erro ao salvar diagnóstico.");
      }
    });
  }

  const metasHref = `/planejamento/${businessUnitSlug}/ciclos?ciclo=${cycleSlug ?? ""}&aba=metas`;

  return (
    <div className="space-y-8">
      {/* ── PARTE 1: Top Header com Stepper Oficial ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-block rounded-md px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-[#cf1730] bg-[#fef2f3] border border-rose-200">
              PARTE 1
            </span>
          </div>
          <h1 className="mt-2 font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Diagnóstico da BU
          </h1>
          <p className="mt-1 text-sm text-slate-500 max-w-2xl">
            Analise os 5 pilares estratégicos e registre seu diagnóstico com base nas evidências de mercado e negócio.
          </p>
        </div>

        {/* Stepper Oficial */}
        <div className="shrink-0">
          <CycleStepper activeStep="diagnostico" onSelectStep={onSelectTab} />
        </div>
      </div>

      {/* ── HERO BANNER: Diagnóstico Estratégico (Card com Fundo Suave Diferenciado) ── */}
      <div className="rounded-3xl border border-sky-200/80 bg-gradient-to-br from-sky-50/90 via-blue-50/50 to-indigo-50/30 p-6 sm:p-7 shadow-xs space-y-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-700 border border-sky-200 shadow-2xs">
              <Compass className="size-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-sky-700">
                DIAGNÓSTICO ESTRATÉGICO DA BU
              </span>
              <h2 className="mt-0.5 font-display text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                Onde estamos e <span className="text-sky-700">para onde o mercado está indo?</span>
              </h2>
              <p className="mt-1.5 text-xs sm:text-sm text-slate-600 leading-relaxed max-w-xl">
                Avalie os 5 pilares fundamentais da BU para identificar gaps, fortalezas e oportunidades que alimentarão os objetivos e metas do ciclo.
              </p>
            </div>
          </div>

          {/* Ilustração 3D Pastel de Radar / Diagnóstico */}
          <div className="hidden sm:flex shrink-0 items-center justify-center">
            <DiagnosticRadar3DIllustration className="w-48 h-36" />
          </div>

          {/* Callout Informativo */}
          <div className="flex max-w-xs shrink-0 items-start gap-3 rounded-2xl border border-sky-200/90 bg-white/95 backdrop-blur-xs p-4 shadow-2xs">
            <Info className="size-4.5 shrink-0 text-sky-600 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-sky-900">Cadência de Revisão</p>
              <p className="mt-0.5 text-xs font-medium text-sky-800 leading-relaxed">
                O diagnóstico é revisado a cada <strong className="font-semibold">3 meses</strong> e feito de forma completa a cada <strong className="font-semibold">6 meses</strong>.
              </p>
            </div>
          </div>
        </div>

        {/* Tabela dos 5 Pilares (Card Branco com Elevacão para Destacar do Fundo) */}
        <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-100/80 text-xs font-bold uppercase tracking-wider text-slate-700">
                  <th scope="col" className="px-4 py-3.5 w-48">
                    Pilar
                  </th>
                  <th scope="col" className="px-4 py-3.5 w-56">
                    Pergunta Central
                  </th>
                  <th scope="col" className="px-4 py-3.5 w-72">
                    Perguntas Provocativas
                  </th>
                  <th scope="col" className="px-4 py-3.5 w-72">
                    Evidências / Dados
                  </th>
                  <th scope="col" className="px-4 py-3.5 min-w-[280px]">
                    Diagnóstico da BU
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {PILLARS.map((pillar, pIdx) => {
                  const Icon = pillar.icon;
                  const value = data[pillar.key];
                  const charCount = value.length;

                  return (
                    <tr
                      key={pillar.key}
                      id={`pilar-${pIdx + 1}`}
                      data-pillar-key={pillar.key}
                      className="hover:bg-slate-50/70 transition-colors align-top scroll-mt-28 target:bg-sky-50/90 target:ring-2 target:ring-sky-400/80 rounded-xl"
                    >
                      {/* Coluna 1: Pilar */}
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={cn(
                              "flex size-9 shrink-0 items-center justify-center rounded-xl border shadow-2xs",
                              pillar.tone === "indigo" && "bg-indigo-50 text-indigo-700 border-indigo-200",
                              pillar.tone === "rose" && "bg-rose-50 text-rose-700 border-rose-200",
                              pillar.tone === "amber" && "bg-amber-50 text-amber-700 border-amber-200",
                              pillar.tone === "purple" && "bg-purple-50 text-purple-700 border-purple-200",
                              pillar.tone === "emerald" && "bg-emerald-50 text-emerald-700 border-emerald-200",
                            )}
                          >
                            <Icon className="size-4.5" />
                          </div>
                          <span className="font-bold text-slate-900 text-sm">
                            {pillar.title}
                          </span>
                        </div>
                      </td>

                      {/* Coluna 2: Pergunta Central */}
                      <td className="px-4 py-4">
                        <p className="text-sm font-semibold text-slate-800 leading-snug">
                          {pillar.centralQuestion}
                        </p>
                      </td>

                      {/* Coluna 3: Perguntas Provocativas */}
                      <td className="px-4 py-4">
                        <ul className="space-y-1.5 text-slate-600 leading-relaxed text-sm">
                          {pillar.provocations.map((prov, idx) => (
                            <li key={idx} className="flex items-start gap-1.5">
                              <span className="text-sky-600 font-bold leading-none select-none text-base">
                                •
                              </span>
                              <span>{prov}</span>
                            </li>
                          ))}
                        </ul>
                      </td>

                      {/* Coluna 4: Evidências */}
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-1.5">
                          {pillar.evidences.map((evi, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 border border-slate-200"
                            >
                              {evi}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Coluna 5: Diagnóstico da BU (Item 2: Texto completo visível + Botão Editar) */}
                      <td className="px-4 py-4 min-w-[320px]">
                        {value && !editingPillars[pillar.key] ? (
                          <div className="group relative rounded-xl border border-slate-200/90 bg-slate-50/60 p-4 shadow-2xs transition hover:border-pink-200 hover:bg-white">
                            <div className="text-sm leading-relaxed text-slate-800 whitespace-pre-wrap">
                              {value}
                            </div>
                            <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5">
                              <span className="text-[11px] font-mono tabular-nums text-slate-400">
                                {charCount}/500 caracteres
                              </span>
                              {editable && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setEditingPillars((prev) => ({
                                      ...prev,
                                      [pillar.key]: true,
                                    }))
                                  }
                                  className="inline-flex items-center gap-1.5 rounded-lg bg-pink-50 px-2.5 py-1 text-xs font-semibold text-pink-700 border border-pink-200/80 hover:bg-pink-100 transition cursor-pointer"
                                >
                                  <Pencil className="size-3 text-pink-600" />
                                  Editar
                                </button>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="relative space-y-2">
                            <textarea
                              value={value}
                              disabled={!editable}
                              maxLength={500}
                              onChange={(e) =>
                                handleChange(pillar.key, e.target.value)
                              }
                              placeholder="Escreva aqui o diagnóstico deste pilar..."
                              rows={5}
                              className={cn(
                                "w-full rounded-xl border border-slate-200 bg-white p-3.5 text-sm leading-relaxed text-slate-900 placeholder:text-slate-400 focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-100 transition shadow-2xs resize-y min-h-[110px]",
                                !editable && "bg-slate-100/60 text-slate-600 cursor-not-allowed",
                              )}
                            />
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-xs tabular-nums font-mono text-slate-400">
                                {charCount}/500
                              </span>
                              {value && editable && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setEditingPillars((prev) => ({
                                      ...prev,
                                      [pillar.key]: false,
                                    }))
                                  }
                                  className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition cursor-pointer"
                                >
                                  <Check className="size-3 text-emerald-600" />
                                  Concluir edição
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── PARTE 2: Síntese do Diagnóstico (Item 4: Unificado em pergunta única) ── */}
      <div className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-xs space-y-6">
        <div>
          <span className="inline-block rounded-md px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-[#cf1730] bg-[#fef2f3] border border-rose-200">
            PARTE 2
          </span>
          <h2 className="mt-2 font-display text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Síntese do diagnóstico
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Com base na análise dos 5 pilares, sintetize o principal desafio ou oportunidade da BU em uma visão clara para o ciclo.
          </p>
        </div>

        {/* Card Único Unificado: Qual é o principal desafio ou oportunidade da BU hoje? */}
        <div className="rounded-2xl border border-rose-200/90 bg-gradient-to-br from-[#fef2f3] via-white to-purple-50/30 p-6 sm:p-7 shadow-2xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-100 to-purple-100 text-[#e2263c] border border-rose-200/80 shadow-2xs">
                <Target className="size-5.5" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600">
                  DESAFIO OU OPORTUNIDADE ESTRATÉGICA
                </span>
                <h3 className="text-base sm:text-xl font-bold text-slate-900 leading-snug mt-0.5">
                  Qual é o principal <span className="text-[#e2263c]">desafio</span> ou <span className="text-purple-600">oportunidade</span> da BU hoje?
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl">
                  O problema ou gargalo que mais limita o crescimento, ou a oportunidade com maior potencial de impacto para a BU neste ciclo.
                </p>
              </div>
            </div>

            {unifiedQuestion && !editingUnified && editable && (
              <button
                type="button"
                onClick={() => setEditingUnified(true)}
                className="self-start inline-flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 border border-slate-200 hover:bg-slate-50 transition shadow-2xs cursor-pointer"
              >
                <Pencil className="size-3.5 text-rose-600" />
                Editar síntese
              </button>
            )}
          </div>

          {/* Grid de Exemplos (Desafios & Oportunidades Integrados) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div className="rounded-xl bg-rose-50/70 border border-rose-100 p-3.5 text-xs text-rose-950 space-y-1">
              <p className="font-bold text-rose-900 mb-1 flex items-center gap-1.5">
                <AlertTriangle className="size-3.5 text-rose-600" />
                Exemplos de Desafios:
              </p>
              <p className="flex items-start gap-1.5 leading-relaxed">
                <span className="text-[#e2263c] font-bold">•</span>
                <span>Baixa conversão de leads no produto principal.</span>
              </p>
              <p className="flex items-start gap-1.5 leading-relaxed">
                <span className="text-[#e2263c] font-bold">•</span>
                <span>Perda de relevância no mercado ou avanço da concorrência.</span>
              </p>
              <p className="flex items-start gap-1.5 leading-relaxed">
                <span className="text-[#e2263c] font-bold">•</span>
                <span>Falta de diferenciação ou dependência de uma única oferta.</span>
              </p>
            </div>

            <div className="rounded-xl bg-purple-50/70 border border-purple-100 p-3.5 text-xs text-purple-950 space-y-1">
              <p className="font-bold text-purple-900 mb-1 flex items-center gap-1.5">
                <Lightbulb className="size-3.5 text-purple-600" />
                Exemplos de Oportunidades:
              </p>
              <p className="flex items-start gap-1.5 leading-relaxed">
                <span className="text-purple-600 font-bold">•</span>
                <span>Expansão da base de leads qualificados em novos canais.</span>
              </p>
              <p className="flex items-start gap-1.5 leading-relaxed">
                <span className="text-purple-600 font-bold">•</span>
                <span>Reposicionamento de produto ou novo formato de entrega.</span>
              </p>
              <p className="flex items-start gap-1.5 leading-relaxed">
                <span className="text-purple-600 font-bold">•</span>
                <span>Crescimento em uma nova sub-especialidade ou público.</span>
              </p>
            </div>
          </div>

          {/* Campo de Texto (Modo Leitura Completa vs Edição) */}
          {unifiedQuestion && !editingUnified ? (
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs space-y-2">
              <div className="text-sm leading-relaxed text-slate-800 whitespace-pre-wrap">
                {unifiedQuestion}
              </div>
              <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-400">
                <span className="font-mono">{unifiedQuestion.length}/1000 caracteres</span>
                <span className="text-emerald-600 font-medium flex items-center gap-1">
                  <Check className="size-3.5" /> Registrado no ciclo
                </span>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <textarea
                value={unifiedQuestion}
                disabled={!editable}
                maxLength={1000}
                onChange={(e) => {
                  setUnifiedQuestion(e.target.value);
                  setHasChanges(true);
                  setStatusMessage(null);
                }}
                placeholder="Descreva aqui o principal desafio ou oportunidade da BU para este ciclo estratégico..."
                rows={4}
                className={cn(
                  "w-full rounded-2xl border border-rose-200 bg-white p-4 text-sm leading-relaxed text-slate-900 placeholder:text-slate-400 focus:border-[#e2263c] focus:outline-none focus:ring-2 focus:ring-rose-100 transition shadow-2xs resize-y min-h-[120px]",
                  !editable && "bg-slate-50 text-slate-600 cursor-not-allowed",
                )}
              />
              <div className="flex items-center justify-between text-xs">
                <span className="tabular-nums font-mono text-slate-400">
                  {unifiedQuestion.length}/1000 caracteres
                </span>
                {unifiedQuestion && editable && (
                  <button
                    type="button"
                    onClick={() => setEditingUnified(false)}
                    className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition cursor-pointer"
                  >
                    <Check className="size-3 text-emerald-600" />
                    Concluir edição
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Barra de Ações: Salvar Diagnóstico e Navegação ── */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 shadow-2xs">
          <div className="flex items-center gap-3">
            {editable && (
              <button
                type="button"
                onClick={handleSave}
                disabled={isPending || (!hasChanges && !statusMessage)}
                style={{ borderRadius: "9999px" }}
                className={cn(
                  "inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold shadow-2xs transition cursor-pointer border",
                  hasChanges
                    ? "bg-[#e2263c] text-white border-[#e2263c] hover:bg-[#cf1730]"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50",
                  isPending && "opacity-60 cursor-not-allowed",
                )}
              >
                {isPending ? (
                  <>
                    <div className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Salvando…
                  </>
                ) : statusMessage ? (
                  <>
                    <Check className="size-3.5 text-emerald-600" />
                    {statusMessage}
                  </>
                ) : (
                  <>
                    <Save className="size-3.5 text-slate-500" />
                    Salvar diagnóstico
                  </>
                )}
              </button>
            )}

            <span className="text-xs text-slate-500">
              Você poderá revisar e atualizar este diagnóstico no próximo ciclo.
            </span>
          </div>

          {onSelectTab ? (
            <button
              type="button"
              onClick={() => onSelectTab("metas")}
              style={{ borderRadius: "9999px" }}
              className="inline-flex items-center gap-2 bg-[#e2263c] hover:bg-[#cf1730] text-white px-6 py-2.5 text-xs font-bold transition shadow-xs cursor-pointer"
            >
              Continuar para Objetivo e Metas
              <ArrowRight className="size-4" />
            </button>
          ) : (
            <Link
              href={metasHref}
              style={{ borderRadius: "9999px" }}
              className="inline-flex items-center gap-2 bg-[#e2263c] hover:bg-[#cf1730] text-white px-6 py-2.5 text-xs font-bold transition shadow-xs"
            >
              Continuar para Objetivo e Metas
              <ArrowRight className="size-4" />
            </Link>
          )}
        </div>
      </div>

      {/* ── PARTE 3: Comentários do Diagnóstico (Item 2 - parte B) ── */}
      <div className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-pink-50 text-pink-600 border border-pink-200">
              <MessageSquare className="size-5" />
            </div>
            <div>
              <h3 className="font-display text-lg font-bold text-slate-900 flex items-center gap-2">
                Comentários do Diagnóstico
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">
                  {comments.length}
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Alinhamento e notas colaborativas da liderança e do time sobre o diagnóstico desta BU.
              </p>
            </div>
          </div>
        </div>

        {/* Formulário para novo comentário */}
        <form onSubmit={handleAddComment} className="space-y-3">
          <div className="relative">
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Escreva um comentário, reflexão ou sugestão sobre o diagnóstico da BU..."
              rows={3}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 p-4 text-sm leading-relaxed text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-100 transition shadow-2xs resize-none"
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">
              Pressione Enviar para registrar o comentário no histórico da rodada.
            </span>
            <button
              type="submit"
              disabled={isSubmittingComment || !commentText.trim()}
              style={{ borderRadius: "9999px" }}
              className={cn(
                "inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white shadow-2xs transition cursor-pointer",
                commentText.trim()
                  ? "bg-pink-600 hover:bg-pink-700"
                  : "bg-slate-300 cursor-not-allowed",
              )}
            >
              {isSubmittingComment ? (
                <>
                  <div className="size-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Enviando…
                </>
              ) : (
                <>
                  <Send className="size-3.5" />
                  Enviar comentário
                </>
              )}
            </button>
          </div>
        </form>

        {/* Lista de Comentários */}
        <div className="space-y-3 pt-2">
          {comments.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center bg-slate-50/40">
              <MessageSquare className="mx-auto size-8 text-slate-300 mb-2" />
              <p className="text-sm font-semibold text-slate-700">
                Nenhum comentário registrado ainda
              </p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Use este espaço para discutir os pilares, validar hipóteses ou registrar decisões de alinhamento com o time.
              </p>
            </div>
          ) : (
            comments.map((comment) => (
              <div
                key={comment.id}
                className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs flex items-start gap-3.5 transition hover:border-slate-300"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-rose-600 text-white font-bold text-xs shadow-2xs">
                  {comment.authorName.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">
                        {comment.authorName}
                      </span>
                      {comment.authorRole && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 border border-slate-200/60">
                          {comment.authorRole}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-400 font-mono">
                      {formatCommentDate(comment.createdAt)}
                    </span>
                  </div>
                  <div className="mt-2 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {comment.content}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
