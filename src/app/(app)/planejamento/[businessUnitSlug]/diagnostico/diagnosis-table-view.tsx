"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  BarChart2,
  Users,
  Package,
  Filter,
  Settings,
  Target,
  Lightbulb,
  Info,
  ArrowRight,
  Check,
  Save,
  Compass,
} from "lucide-react";
import { saveFullDiagnosisAction } from "./actions";
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
            <span className="inline-block rounded-md px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-rose-700 bg-rose-50 border border-rose-200">
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

      {/* ── HERO BANNER: Diagnóstico Estratégico (Card 3D Pastel) ── */}
      <div className="rounded-3xl border border-sky-100/90 bg-gradient-to-r from-sky-50/60 via-blue-50/20 to-white p-6 sm:p-7 shadow-2xs space-y-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-600 border border-sky-200/60 shadow-2xs">
              <Compass className="size-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-sky-600">
                DIAGNÓSTICO ESTRATÉGICO DA BU
              </span>
              <h2 className="mt-0.5 font-display text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                Onde estamos e <span className="text-sky-600">para onde o mercado está indo?</span>
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
          <div className="flex max-w-xs shrink-0 items-start gap-3 rounded-2xl border border-sky-200/70 bg-white/90 backdrop-blur-xs p-4 shadow-2xs">
            <Info className="size-4.5 shrink-0 text-sky-600 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-sky-900">Cadência de Revisão</p>
              <p className="mt-0.5 text-xs font-medium text-sky-800/90 leading-relaxed">
                O diagnóstico é revisado a cada <strong className="font-semibold">3 meses</strong> e feito de forma completa a cada <strong className="font-semibold">6 meses</strong>.
              </p>
            </div>
          </div>
        </div>

        {/* Tabela dos 5 Pilares */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/90 text-xs font-bold uppercase tracking-wider text-slate-600">
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
                {PILLARS.map((pillar) => {
                  const Icon = pillar.icon;
                  const value = data[pillar.key];
                  const charCount = value.length;

                  return (
                    <tr
                      key={pillar.key}
                      className="hover:bg-slate-50/40 transition-colors align-top"
                    >
                      {/* Coluna 1: Pilar */}
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={cn(
                              "flex size-9 shrink-0 items-center justify-center rounded-xl border shadow-2xs",
                              pillar.tone === "indigo" && "bg-indigo-50 text-indigo-600 border-indigo-100",
                              pillar.tone === "rose" && "bg-rose-50 text-rose-600 border-rose-100",
                              pillar.tone === "amber" && "bg-amber-50 text-amber-600 border-amber-100",
                              pillar.tone === "purple" && "bg-purple-50 text-purple-600 border-purple-100",
                              pillar.tone === "emerald" && "bg-emerald-50 text-emerald-600 border-emerald-100",
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
                              <span className="text-sky-500 font-bold leading-none select-none text-base">
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
                              className="inline-flex items-center rounded-full bg-slate-100/90 px-2.5 py-1 text-xs font-medium text-slate-700 border border-slate-200/80"
                            >
                              {evi}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Coluna 5: Diagnóstico da BU */}
                      <td className="px-4 py-4">
                        <div className="relative">
                          <textarea
                            value={value}
                            disabled={!editable}
                            maxLength={500}
                            onChange={(e) =>
                              handleChange(pillar.key, e.target.value)
                            }
                            placeholder="Escreva aqui o diagnóstico deste pilar..."
                            rows={4}
                            className={cn(
                              "w-full rounded-xl border border-slate-200 bg-white p-3 pb-7 text-sm leading-relaxed text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100 transition resize-none shadow-2xs",
                              !editable && "bg-slate-50 text-slate-600 cursor-not-allowed",
                            )}
                          />
                          <span className="absolute bottom-2 right-2.5 text-xs tabular-nums font-mono text-slate-400">
                            {charCount}/500
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── PARTE 2: Síntese do Diagnóstico (Desafio & Oportunidade) ── */}
      <div className="rounded-3xl border border-rose-100/80 bg-gradient-to-r from-rose-50/30 via-pink-50/15 to-white p-6 md:p-7 shadow-2xs space-y-6">
        <div>
          <span className="inline-block rounded-md px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-rose-700 bg-rose-50 border border-rose-200">
            SÍNTESE DO DIAGNÓSTICO
          </span>
          <h2 className="mt-2 font-display text-lg sm:text-xl font-bold text-slate-900">
            Desafio Crítico e Oportunidade Principal
          </h2>
          <p className="mt-0.5 text-sm text-slate-600">
            Com base na análise dos 5 pilares, sintetize o principal gargalo e a alavanca mais potente de crescimento.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Card: Principal Desafio */}
          <div className="rounded-2xl border border-rose-100 bg-white p-5 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-start gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600 border border-rose-100">
                  <Target className="size-4.5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">
                    Qual é o principal desafio da BU hoje?
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                    O principal gargalo, risco ou problema crítico identificado no diagnóstico.
                  </p>
                </div>
              </div>

              <div className="relative mt-3.5">
                <textarea
                  value={data.mainChallenge}
                  disabled={!editable}
                  maxLength={500}
                  onChange={(e) => handleChange("mainChallenge", e.target.value)}
                  placeholder="Ex.: Perda de relevância e conversão no produto Extensivo frente a novos concorrentes regionais..."
                  rows={3}
                  className={cn(
                    "w-full rounded-xl border border-slate-200 bg-white p-3 pb-7 text-sm leading-relaxed text-slate-900 placeholder:text-slate-400 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-100 transition resize-none shadow-2xs",
                    !editable && "bg-slate-50 text-slate-600 cursor-not-allowed",
                  )}
                />
                <span className="absolute bottom-2 right-2.5 text-xs tabular-nums font-mono text-slate-400">
                  {data.mainChallenge.length}/500
                </span>
              </div>
            </div>
          </div>

          {/* Card: Principal Oportunidade */}
          <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-start gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                  <Lightbulb className="size-4.5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">
                    Qual é a principal oportunidade de crescimento?
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                    A alavanca mais promissora para destravar resultado nos próximos meses.
                  </p>
                </div>
              </div>

              <div className="relative mt-3.5">
                <textarea
                  value={data.mainOpportunity}
                  disabled={!editable}
                  maxLength={500}
                  onChange={(e) =>
                    handleChange("mainOpportunity", e.target.value)
                  }
                  placeholder="Ex.: Reposicionamento com foco no Internato e expansão da base de leads qualificados via eventos ao vivo..."
                  rows={3}
                  className={cn(
                    "w-full rounded-xl border border-slate-200 bg-white p-3 pb-7 text-sm leading-relaxed text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100 transition resize-none shadow-2xs",
                    !editable && "bg-slate-50 text-slate-600 cursor-not-allowed",
                  )}
                />
                <span className="absolute bottom-2 right-2.5 text-xs tabular-nums font-mono text-slate-400">
                  {data.mainOpportunity.length}/500
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Barra de Ações e Fluxo para Metas ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
        <div className="flex items-center gap-3">
          {editable && (
            <button
              type="button"
              onClick={handleSave}
              disabled={isPending || (!hasChanges && !statusMessage)}
              className={cn(
                "inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-xs font-semibold shadow-2xs transition cursor-pointer",
                hasChanges
                  ? "bg-rose-600 text-white hover:bg-rose-700"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                isPending && "opacity-60 cursor-not-allowed",
              )}
            >
              {isPending ? (
                <>
                  <div className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Salvando diagnóstico…
                </>
              ) : statusMessage ? (
                <>
                  <Check className="size-3.5 text-emerald-600" />
                  {statusMessage}
                </>
              ) : (
                <>
                  <Save className="size-3.5" />
                  Salvar Diagnóstico
                </>
              )}
            </button>
          )}

          {hasChanges && !statusMessage && (
            <span className="text-xs text-amber-700 font-medium">
              ● Alterações não salvas
            </span>
          )}

          {!hasChanges && !statusMessage && editable && (
            <span className="text-xs text-slate-500">
              Todas as constatações salvas na rodada.
            </span>
          )}

          {!isOpen && (
            <span className="text-xs text-slate-500 italic">
              Esta rodada está fechada para edição (somente leitura).
            </span>
          )}
        </div>

        {onSelectTab ? (
          <button
            type="button"
            onClick={() => onSelectTab("metas")}
            className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50/70 px-4 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition shadow-2xs cursor-pointer"
          >
            Avançar para Objetivo e Metas
            <ArrowRight className="size-3.5 text-rose-600" />
          </button>
        ) : (
          <Link
            href={metasHref}
            className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50/70 px-4 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition shadow-2xs"
          >
            Avançar para Objetivo e Metas
            <ArrowRight className="size-3.5 text-rose-600" />
          </Link>
        )}
      </div>
    </div>
  );
}
