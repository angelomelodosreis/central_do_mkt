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
} from "lucide-react";
import { saveFullDiagnosisAction } from "./actions";
import { cn } from "@/lib/utils/cn";

type DiagnosisPillarDef = {
  key:
    | "businessMarketDiagnosis"
    | "clientBrandDiagnosis"
    | "portfolioOfferDiagnosis"
    | "funnelConversionDiagnosis"
    | "contextCapacityDiagnosis";
  title: string;
  icon: typeof BarChart2;
  centralQuestion: string;
  provocations: string[];
  evidences: string[];
};

const PILLARS: DiagnosisPillarDef[] = [
  {
    key: "businessMarketDiagnosis",
    title: "1. Negócio e mercado",
    icon: BarChart2,
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
      {/* ── PARTE 1: Cabeçalho & Diagnóstico da BU ── */}
      <div>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-block rounded-md px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-pink-600 bg-pink-50 border border-pink-200">
                PARTE 1
              </span>
            </div>
            <h1 className="mt-2 font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Diagnóstico da BU
            </h1>
            <p className="mt-1 text-sm sm:text-base text-slate-600">
              Analise os 5 pilares abaixo e registre seu diagnóstico. Use as perguntas como guia e consulte os dados sugeridos.
            </p>
          </div>

          {/* Banner de Aviso Oficial */}
          <div className="flex max-w-sm items-start gap-2.5 rounded-2xl border border-pink-200/80 bg-pink-50/50 p-3.5 shadow-2xs">
            <Info className="size-4.5 shrink-0 text-pink-600 mt-0.5" />
            <p className="text-xs sm:text-sm font-medium text-pink-800 leading-relaxed">
              O diagnóstico é revisado a cada <strong className="font-semibold">3 meses</strong> e feito de forma completa a cada <strong className="font-semibold">6 meses</strong>.
            </p>
          </div>
        </div>

        {/* Tabela dos 5 Pilares */}
        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-bold uppercase tracking-wider text-slate-600">
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
                    Evidências / Dados para Consultar
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
                          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-pink-50 text-pink-600 border border-pink-100">
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
                              <span className="text-pink-500 font-bold leading-none select-none text-base">
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
                              "w-full rounded-xl border border-slate-200 bg-white p-3 pb-7 text-sm leading-relaxed text-slate-900 placeholder:text-slate-400 focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-100 transition resize-none",
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

      {/* ── PARTE 2: Síntese do Diagnóstico ── */}
      <div className="rounded-2xl border border-pink-100/80 bg-pink-50/20 p-6 md:p-7 shadow-2xs">
        <div>
          <span className="inline-block rounded-md px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-pink-600 bg-pink-50 border border-pink-200">
            PARTE 2
          </span>
          <h2 className="mt-2 font-display text-lg sm:text-xl font-bold text-slate-900">
            Síntese do diagnóstico
          </h2>
          <p className="mt-0.5 text-sm text-slate-600">
            Com base na análise dos 5 pilares, registre o principal desafio e a principal oportunidade da BU.
          </p>
        </div>

        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Card: Principal Desafio */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-start gap-3">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-pink-50 text-pink-600 border border-pink-100">
                  <Target className="size-4" />
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
                    "w-full rounded-xl border border-slate-200 bg-white p-3 pb-7 text-sm leading-relaxed text-slate-900 placeholder:text-slate-400 focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-100 transition resize-none",
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
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-start gap-3">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-pink-50 text-pink-600 border border-pink-100">
                  <Lightbulb className="size-4" />
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
                    "w-full rounded-xl border border-slate-200 bg-white p-3 pb-7 text-sm leading-relaxed text-slate-900 placeholder:text-slate-400 focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-100 transition resize-none",
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
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
        <div className="flex items-center gap-3">
          {editable && (
            <button
              type="button"
              onClick={handleSave}
              disabled={isPending || (!hasChanges && !statusMessage)}
              className={cn(
                "inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold shadow-2xs transition",
                hasChanges
                  ? "bg-pink-600 text-white hover:bg-pink-700"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                isPending && "opacity-60 cursor-not-allowed",
              )}
            >
              {isPending ? (
                <>
                  <div className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Salvando diagnóstico…
                </>
              ) : statusMessage ? (
                <>
                  <Check className="size-4 text-emerald-600" />
                  {statusMessage}
                </>
              ) : (
                <>
                  <Save className="size-4" />
                  Salvar Diagnóstico
                </>
              )}
            </button>
          )}

          {hasChanges && !statusMessage && (
            <span className="text-sm text-amber-700 font-medium">
              ● Alterações não salvas
            </span>
          )}

          {!hasChanges && !statusMessage && editable && (
            <span className="text-sm text-slate-500">
              Todas as constatações salvas na rodada.
            </span>
          )}

          {!isOpen && (
            <span className="text-sm text-slate-500 italic">
              Esta rodada está fechada para edição (somente leitura).
            </span>
          )}
        </div>

        <Link
          href={metasHref}
          className="inline-flex items-center gap-1.5 rounded-xl border border-pink-200 bg-pink-50/60 px-4 py-2.5 text-sm font-semibold text-pink-700 hover:bg-pink-100 transition shadow-2xs"
        >
          Avançar para Metas do Ciclo
          <ArrowRight className="size-4 text-pink-600" />
        </Link>
      </div>
    </div>
  );
}
