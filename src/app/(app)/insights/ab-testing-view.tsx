"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Trophy,
  ArrowRight,
  Sparkles,
  TrendingUp,
  Eye,
  MousePointerClick,
  FileText,
  CheckCircle2,
  Flame,
  ExternalLink,
  Layers,
  Monitor,
  Smartphone,
  ChevronRight,
  Scale,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";
import type { AbComparisonResult } from "@/lib/modules/insights/queries";

interface AbTestingViewProps {
  availablePages: {
    id: string;
    name: string;
    url: string;
    buName: string;
    version: string;
    visits: number;
    conversionRate: number;
  }[];
  initialPageAId?: string;
  initialPageBId?: string;
}

export function AbTestingView({
  availablePages,
  initialPageAId,
  initialPageBId,
}: AbTestingViewProps) {
  const [pageAId, setPageAId] = useState<string>(
    initialPageAId || availablePages[0]?.id || ""
  );
  const [pageBId, setPageBId] = useState<string>(
    initialPageBId || availablePages[1]?.id || availablePages[0]?.id || ""
  );
  const [period, setPeriod] = useState<number>(30);
  const [viewport, setViewport] = useState<string>("all");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [comparison, setComparison] = useState<AbComparisonResult | null>(null);

  useEffect(() => {
    if (!pageAId || !pageBId) return;

    let isMounted = true;
    setIsLoading(true);

    fetch(
      `/api/insights/ab-test?pageA=${encodeURIComponent(pageAId)}&pageB=${encodeURIComponent(
        pageBId
      )}&period=${period}&viewport=${viewport}`
    )
      .then((res) => (res.ok ? res.json() : null))
      .then((data: AbComparisonResult | null) => {
        if (isMounted && data) {
          setComparison(data);
        }
      })
      .catch((err) => console.error("Erro ao carregar teste A/B:", err))
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [pageAId, pageBId, period, viewport]);

  const pageA = comparison?.pageA;
  const pageB = comparison?.pageB;
  const winner = comparison?.winner;

  return (
    <div className="space-y-6">
      {/* Barra de Configuração e Seletores A/B */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
              <Scale className="size-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Comparador de Desempenho e Teste A/B
              </h2>
              <p className="text-xs text-slate-500">
                Selecione duas páginas para confrontar conversão, engajamento e funil em tempo real.
              </p>
            </div>
          </div>

          {/* Filtros de Período e Dispositivo */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1 text-xs font-medium text-slate-600">
              {[7, 14, 30, 90].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setPeriod(d)}
                  className={cn(
                    "rounded-lg px-2.5 py-1 transition",
                    period === d
                      ? "bg-white font-semibold text-slate-900 shadow-xs"
                      : "hover:text-slate-900"
                  )}
                >
                  {d}d
                </button>
              ))}
            </div>

            <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1 text-xs font-medium text-slate-600">
              <button
                type="button"
                onClick={() => setViewport("all")}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-2.5 py-1 transition",
                  viewport === "all"
                    ? "bg-white font-semibold text-slate-900 shadow-xs"
                    : "hover:text-slate-900"
                )}
              >
                <Layers className="size-3.5 text-slate-400" />
                Todos
              </button>
              <button
                type="button"
                onClick={() => setViewport("desktop")}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-2.5 py-1 transition",
                  viewport === "desktop"
                    ? "bg-white font-semibold text-slate-900 shadow-xs"
                    : "hover:text-slate-900"
                )}
              >
                <Monitor className="size-3.5 text-slate-400" />
                Desktop
              </button>
              <button
                type="button"
                onClick={() => setViewport("mobile")}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-2.5 py-1 transition",
                  viewport === "mobile"
                    ? "bg-white font-semibold text-slate-900 shadow-xs"
                    : "hover:text-slate-900"
                )}
              >
                <Smartphone className="size-3.5 text-slate-400" />
                Mobile
              </button>
            </div>
          </div>
        </div>

        {/* Seletores Visuais de Página A e Página B */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr,auto,1fr] gap-4 items-center">
          {/* Seletor Página A */}
          <div className="rounded-xl border border-blue-200 bg-blue-50/30 p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-700 flex items-center gap-1.5">
                <span className="flex size-5 items-center justify-center rounded-full bg-blue-600 text-[10px] font-black text-white">
                  A
                </span>
                Página de Controle (A)
              </span>
              {pageA && (
                <span className="text-[11px] text-slate-500 font-mono truncate max-w-[180px]">
                  {pageA.url}
                </span>
              )}
            </div>
            <select
              value={pageAId}
              onChange={(e) => setPageAId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 shadow-2xs focus:border-blue-500 focus:outline-none"
            >
              {availablePages.map((p) => (
                <option key={`a-${p.id}`} value={p.id}>
                  {p.name} ({p.buName}) · {p.conversionRate}% conv.
                </option>
              ))}
            </select>
          </div>

          {/* Divisor VS */}
          <div className="flex justify-center">
            <span className="flex size-9 items-center justify-center rounded-full border border-slate-200 bg-white text-xs font-black text-slate-600 shadow-2xs">
              VS
            </span>
          </div>

          {/* Seletor Página B */}
          <div className="rounded-xl border border-purple-200 bg-purple-50/30 p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-700 flex items-center gap-1.5">
                <span className="flex size-5 items-center justify-center rounded-full bg-purple-600 text-[10px] font-black text-white">
                  B
                </span>
                Página Variante (B)
              </span>
              {pageB && (
                <span className="text-[11px] text-slate-500 font-mono truncate max-w-[180px]">
                  {pageB.url}
                </span>
              )}
            </div>
            <select
              value={pageBId}
              onChange={(e) => setPageBId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 shadow-2xs focus:border-purple-500 focus:outline-none"
            >
              {availablePages.map((p) => (
                <option key={`b-${p.id}`} value={p.id}>
                  {p.name} ({p.buName}) · {p.conversionRate}% conv.
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12 rounded-2xl border border-slate-200 bg-white">
          <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
            <span className="size-2 rounded-full bg-brand-500 animate-ping" />
            Processando telemetria comparativa do LibSQL...
          </div>
        </div>
      )}

      {!isLoading && comparison && pageA && pageB && (
        <>
          {/* BANNER DA PÁGINA VENCEDORA 🏆 */}
          <div
            className={cn(
              "rounded-2xl p-6 shadow-2xs border transition",
              winner === "tie"
                ? "border-slate-200 bg-slate-50"
                : winner === "A"
                ? "border-blue-200 bg-gradient-to-r from-blue-500/10 via-brand-500/5 to-emerald-500/10"
                : "border-purple-200 bg-gradient-to-r from-purple-500/10 via-brand-500/5 to-emerald-500/10"
            )}
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3.5">
                <span
                  className={cn(
                    "flex size-12 shrink-0 items-center justify-center rounded-2xl text-xl font-bold shadow-xs",
                    winner === "tie"
                      ? "bg-slate-200 text-slate-700"
                      : "bg-amber-400 text-amber-950"
                  )}
                >
                  {winner === "tie" ? "⚖️" : "🏆"}
                </span>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Resultado do Teste A/B
                    </span>
                    {winner !== "tie" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 ring-1 ring-emerald-600/20">
                        <TrendingUp className="size-3" />
                        +{comparison.upliftPercent}% de Uplift
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-black text-slate-900 mt-1">
                    {winner === "tie"
                      ? "Empate Técnico de Conversão"
                      : winner === "A"
                      ? `Página A Venceu: "${pageA.name}"`
                      : `Página B Venceu: "${pageB.name}"`}
                  </h3>
                  <p className="mt-1 text-xs text-slate-600 max-w-3xl leading-relaxed">
                    {comparison.summaryText}
                  </p>
                </div>
              </div>

              {/* Botão de Ação para Inspecionar o Heatmap da Vencedora */}
              <div className="shrink-0 flex items-center gap-2">
                <Link
                  href={`/insights/paginas/${winner === "B" ? pageB.id : pageA.id}`}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-slate-800 transition"
                >
                  <Flame className="size-3.5 text-amber-300" />
                  Ver Heatmap da Vencedora
                  <ArrowRight className="size-3.5 ml-0.5" />
                </Link>
              </div>
            </div>
          </div>

          {/* GRID COMPARATIVO DE KPIS PRINCIPAIS (LADO A LADO) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Taxa de Conversão */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Taxa de Conversão</span>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                  Leads / Visitas
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div
                  className={cn(
                    "rounded-xl p-3 border",
                    winner === "A"
                      ? "border-emerald-200 bg-emerald-50/50 text-emerald-900"
                      : "border-slate-100 bg-slate-50 text-slate-700"
                  )}
                >
                  <div className="text-[10px] font-bold text-blue-700 uppercase">Página A</div>
                  <div className="text-xl font-black mt-0.5">{pageA.conversionRate}%</div>
                  <div className="text-[10px] text-slate-500">{pageA.leads} leads</div>
                </div>

                <div
                  className={cn(
                    "rounded-xl p-3 border",
                    winner === "B"
                      ? "border-emerald-200 bg-emerald-50/50 text-emerald-900"
                      : "border-slate-100 bg-slate-50 text-slate-700"
                  )}
                >
                  <div className="text-[10px] font-bold text-purple-700 uppercase">Página B</div>
                  <div className="text-xl font-black mt-0.5">{pageB.conversionRate}%</div>
                  <div className="text-[10px] text-slate-500">{pageB.leads} leads</div>
                </div>
              </div>
            </div>

            {/* Visitas Totais */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Visitas Totais</span>
                <Eye className="size-4 text-slate-400" />
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="rounded-xl p-3 border border-slate-100 bg-slate-50">
                  <div className="text-[10px] font-bold text-blue-700 uppercase">Página A</div>
                  <div className="text-xl font-black text-slate-900 mt-0.5">
                    {pageA.visits.toLocaleString("pt-BR")}
                  </div>
                  <div className="text-[10px] text-slate-500">Tráfego A</div>
                </div>

                <div className="rounded-xl p-3 border border-slate-100 bg-slate-50">
                  <div className="text-[10px] font-bold text-purple-700 uppercase">Página B</div>
                  <div className="text-xl font-black text-slate-900 mt-0.5">
                    {pageB.visits.toLocaleString("pt-BR")}
                  </div>
                  <div className="text-[10px] text-slate-500">Tráfego B</div>
                </div>
              </div>
            </div>

            {/* Cliques em CTA (CTR) */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Interações CTA (CTR)</span>
                <MousePointerClick className="size-4 text-slate-400" />
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div
                  className={cn(
                    "rounded-xl p-3 border",
                    pageA.ctaClickRate > pageB.ctaClickRate
                      ? "border-emerald-200 bg-emerald-50/40"
                      : "border-slate-100 bg-slate-50"
                  )}
                >
                  <div className="text-[10px] font-bold text-blue-700 uppercase">Página A</div>
                  <div className="text-xl font-black text-slate-900 mt-0.5">
                    {pageA.ctaClickRate}%
                  </div>
                  <div className="text-[10px] text-slate-500">{pageA.ctaClicks} cliques</div>
                </div>

                <div
                  className={cn(
                    "rounded-xl p-3 border",
                    pageB.ctaClickRate > pageA.ctaClickRate
                      ? "border-emerald-200 bg-emerald-50/40"
                      : "border-slate-100 bg-slate-50"
                  )}
                >
                  <div className="text-[10px] font-bold text-purple-700 uppercase">Página B</div>
                  <div className="text-xl font-black text-slate-900 mt-0.5">
                    {pageB.ctaClickRate}%
                  </div>
                  <div className="text-[10px] text-slate-500">{pageB.ctaClicks} cliques</div>
                </div>
              </div>
            </div>

            {/* Início de Formulário */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Inícios de Formulário</span>
                <FileText className="size-4 text-slate-400" />
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="rounded-xl p-3 border border-slate-100 bg-slate-50">
                  <div className="text-[10px] font-bold text-blue-700 uppercase">Página A</div>
                  <div className="text-xl font-black text-slate-900 mt-0.5">
                    {pageA.formStarts}
                  </div>
                  <div className="text-[10px] text-slate-500">{pageA.formStartRate}% das visitas</div>
                </div>

                <div className="rounded-xl p-3 border border-slate-100 bg-slate-50">
                  <div className="text-[10px] font-bold text-purple-700 uppercase">Página B</div>
                  <div className="text-xl font-black text-slate-900 mt-0.5">
                    {pageB.formStarts}
                  </div>
                  <div className="text-[10px] text-slate-500">{pageB.formStartRate}% das visitas</div>
                </div>
              </div>
            </div>
          </div>

          {/* FUNIL DUPLO DE CONVERSÃO COMPARATIVO */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs space-y-6">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Funil de Conversão Comparativo: Página A vs Página B
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Compare as 4 etapas essenciais da jornada do usuário para entender onde ocorrem as maiores retenções.
              </p>
            </div>

            <div className="space-y-4">
              {/* Etapa 1: Visita */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                  <span>1. Visita à Página (Topo do Funil)</span>
                  <div className="flex items-center gap-4 text-[11px] font-mono">
                    <span className="text-blue-700 font-bold">A: {pageA.visits} (100%)</span>
                    <span className="text-purple-700 font-bold">B: {pageB.visits} (100%)</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600 rounded-full w-full" />
                  </div>
                  <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-600 rounded-full w-full" />
                  </div>
                </div>
              </div>

              {/* Etapa 2: Clique em CTA */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                  <span>2. Interação com CTA / Botão</span>
                  <div className="flex items-center gap-4 text-[11px] font-mono">
                    <span className="text-blue-700 font-bold">
                      A: {pageA.ctaClicks} ({pageA.ctaClickRate}%)
                    </span>
                    <span className="text-purple-700 font-bold">
                      B: {pageB.ctaClicks} ({pageB.ctaClickRate}%)
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(pageA.ctaClickRate * 2, 100)}%` }}
                    />
                  </div>
                  <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(pageB.ctaClickRate * 2, 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Etapa 3: Início de Formulário */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                  <span>3. Início de Preenchimento de Formulário</span>
                  <div className="flex items-center gap-4 text-[11px] font-mono">
                    <span className="text-blue-700 font-bold">
                      A: {pageA.formStarts} ({pageA.formStartRate}%)
                    </span>
                    <span className="text-purple-700 font-bold">
                      B: {pageB.formStarts} ({pageB.formStartRate}%)
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-400 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(pageA.formStartRate * 4, 100)}%` }}
                    />
                  </div>
                  <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-400 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(pageB.formStartRate * 4, 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Etapa 4: Lead Confirmado */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                  <span>4. Conversão Concluída (Lead Confirmado)</span>
                  <div className="flex items-center gap-4 text-[11px] font-mono">
                    <span
                      className={cn(
                        "font-bold",
                        winner === "A" ? "text-emerald-600 font-black" : "text-blue-700"
                      )}
                    >
                      A: {pageA.leads} ({pageA.conversionRate}%) {winner === "A" && "🏆"}
                    </span>
                    <span
                      className={cn(
                        "font-bold",
                        winner === "B" ? "text-emerald-600 font-black" : "text-purple-700"
                      )}
                    >
                      B: {pageB.leads} ({pageB.conversionRate}%) {winner === "B" && "🏆"}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        winner === "A" ? "bg-emerald-500" : "bg-blue-600"
                      )}
                      style={{ width: `${Math.min(pageA.conversionRate * 6, 100)}%` }}
                    />
                  </div>
                  <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        winner === "B" ? "bg-emerald-500" : "bg-purple-600"
                      )}
                      style={{ width: `${Math.min(pageB.conversionRate * 6, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ELEMENTOS MAIS CLICADOS (LADO A LADO) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Elementos Página A */}
            <div className="rounded-2xl border border-blue-200/80 bg-white p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="flex size-5 items-center justify-center rounded-full bg-blue-600 text-[10px] font-black text-white">
                    A
                  </span>
                  <h4 className="text-xs font-bold text-slate-900 uppercase">
                    Top CTAs · {pageA.name}
                  </h4>
                </div>
                <Link
                  href={`/insights/paginas/${pageA.id}`}
                  className="text-[11px] font-semibold text-blue-600 hover:underline inline-flex items-center gap-1"
                >
                  Abrir Mapa
                  <ExternalLink className="size-3" />
                </Link>
              </div>

              {pageA.topElements.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">Nenhum CTA clicado no período.</p>
              ) : (
                <div className="space-y-2">
                  {pageA.topElements.map((el, i) => (
                    <div
                      key={`cta-a-${el.id}-${i}`}
                      className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 p-2.5 text-xs"
                    >
                      <div className="truncate pr-2">
                        <span className="font-semibold text-slate-900 block truncate">
                          {el.label}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">{el.id}</span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-bold text-slate-900">{el.clicks} cliques</span>
                        <span className="block text-[10px] text-slate-500">{el.sharePercent}% do total</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Elementos Página B */}
            <div className="rounded-2xl border border-purple-200/80 bg-white p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="flex size-5 items-center justify-center rounded-full bg-purple-600 text-[10px] font-black text-white">
                    B
                  </span>
                  <h4 className="text-xs font-bold text-slate-900 uppercase">
                    Top CTAs · {pageB.name}
                  </h4>
                </div>
                <Link
                  href={`/insights/paginas/${pageB.id}`}
                  className="text-[11px] font-semibold text-purple-600 hover:underline inline-flex items-center gap-1"
                >
                  Abrir Mapa
                  <ExternalLink className="size-3" />
                </Link>
              </div>

              {pageB.topElements.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">Nenhum CTA clicado no período.</p>
              ) : (
                <div className="space-y-2">
                  {pageB.topElements.map((el, i) => (
                    <div
                      key={`cta-b-${el.id}-${i}`}
                      className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 p-2.5 text-xs"
                    >
                      <div className="truncate pr-2">
                        <span className="font-semibold text-slate-900 block truncate">
                          {el.label}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">{el.id}</span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-bold text-slate-900">{el.clicks} cliques</span>
                        <span className="block text-[10px] text-slate-500">{el.sharePercent}% do total</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* INSPEÇÃO VISUAL RÁPIDA DE HEATMAP LADO A LADO */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Inspeção Visual dos Mapas de Calor (A vs B)
                </h3>
                <p className="text-xs text-slate-500">
                  Clique para abrir e auditar visualmente a dispersão de calor e cliques de cada página testada.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <Link
                href={`/insights/paginas/${pageA.id}`}
                className="group flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50/20 p-4 transition hover:border-blue-300 hover:bg-blue-50/50"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-blue-700">
                    <Flame className="size-4 text-amber-500" />
                    Heatmap Página A: {pageA.name}
                  </div>
                  <p className="text-[11px] text-slate-500 font-mono truncate max-w-xs">{pageA.url}</p>
                </div>
                <span className="inline-flex size-8 items-center justify-center rounded-lg bg-blue-600 text-white shadow-xs group-hover:scale-105 transition">
                  <ChevronRight className="size-4" />
                </span>
              </Link>

              <Link
                href={`/insights/paginas/${pageB.id}`}
                className="group flex items-center justify-between rounded-xl border border-purple-200 bg-purple-50/20 p-4 transition hover:border-purple-300 hover:bg-purple-50/50"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-purple-700">
                    <Flame className="size-4 text-amber-500" />
                    Heatmap Página B: {pageB.name}
                  </div>
                  <p className="text-[11px] text-slate-500 font-mono truncate max-w-xs">{pageB.url}</p>
                </div>
                <span className="inline-flex size-8 items-center justify-center rounded-lg bg-purple-600 text-white shadow-xs group-hover:scale-105 transition">
                  <ChevronRight className="size-4" />
                </span>
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
