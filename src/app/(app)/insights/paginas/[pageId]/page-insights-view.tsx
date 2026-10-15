"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Flame,
  MousePointerClick,
  Eye,
  FileCheck,
  TrendingUp,
  ExternalLink,
  ChevronLeft,
  Camera,
  Layers,
  Monitor,
  Smartphone,
  Sliders,
  CheckCircle2,
  AlertCircle,
  BarChart2,
  ListOrdered,
  Share2,
} from "lucide-react";
import { HeatmapCanvas, type HeatmapMode } from "./heatmap-canvas";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";
import type {
  CtaHotspot,
  HeatmapPoint,
  ScrollDepthData,
} from "@/lib/modules/insights/queries";

interface PageInsightsViewProps {
  page: {
    id: string;
    name: string;
    url: string;
    businessUnitId: string | null;
    buName: string | null;
    isActive: boolean;
    version: string;
    screenshotUrlDesktop: string | null;
    screenshotUrlMobile: string | null;
    screenshotUpdatedAt: Date | null;
  };
  initialHeatmap: {
    densityPoints: HeatmapPoint[];
    maxWeight: number;
    totalClicks: number;
    ctaHotspots: CtaHotspot[];
    scrollDepth: ScrollDepthData[];
    totalVisits: number;
  };
  initialFunnel: {
    step: number;
    name: string;
    description: string;
    count: number;
    rateFromTotal: number;
    dropOffRate: number;
  }[];
  initialElements: {
    elementId: string;
    elementLabel: string;
    sectionId: string | null;
    clicks: number;
    lastClicked: Date;
    sharePercent: number;
  }[];
  initialUtms: {
    source: string;
    medium: string;
    campaign: string;
    visits: number;
    ctaClicks: number;
    leads: number;
    conversionRate: number;
  }[];
}

export function PageInsightsView({
  page,
  initialHeatmap,
  initialFunnel,
  initialElements,
  initialUtms,
}: PageInsightsViewProps) {
  const [viewport, setViewport] = useState<"desktop" | "mobile">("desktop");
  const [mode, setMode] = useState<HeatmapMode>("density");
  const [period, setPeriod] = useState<number>(30);
  const [activeTab, setActiveTab] = useState<"heatmap" | "funnel" | "elements" | "utms">("heatmap");

  const [heatmapData, setHeatmapData] = useState(initialHeatmap);
  const [funnelData, setFunnelData] = useState(initialFunnel);
  const [elementsData, setElementsData] = useState(initialElements);
  const [utmsData, setUtmsData] = useState(initialUtms);
  const [isLoading, setIsLoading] = useState(false);

  // Modal para atualizar screenshot
  const [isScreenshotModalOpen, setIsScreenshotModalOpen] = useState(false);
  const [desktopScreenshotInput, setDesktopScreenshotInput] = useState(page.screenshotUrlDesktop || "");
  const [mobileScreenshotInput, setMobileScreenshotInput] = useState(page.screenshotUrlMobile || "");
  const [isSavingScreenshot, setIsSavingScreenshot] = useState(false);

  async function handleFilterChange(newViewport = viewport, newPeriod = period) {
    setIsLoading(true);
    setViewport(newViewport);
    setPeriod(newPeriod);

    try {
      const params = new URLSearchParams();
      params.set("viewport", newViewport);
      params.set("period", String(newPeriod));

      const [hmRes, fnRes, elRes] = await Promise.all([
        fetch(`/api/insights/pages/${page.id}/heatmap?${params.toString()}`),
        fetch(`/api/insights/pages/${page.id}/funnel?${params.toString()}`),
        fetch(`/api/insights/pages/${page.id}/elements?${params.toString()}`),
      ]);

      if (hmRes.ok) setHeatmapData(await hmRes.json());
      if (fnRes.ok) {
        const fnJson = await fnRes.json();
        setFunnelData(fnJson.steps || []);
      }
      if (elRes.ok) {
        const elJson = await elRes.json();
        setElementsData(elJson.elements || []);
        setUtmsData(elJson.utms || []);
      }
    } catch (e) {
      console.error("Falha ao recarregar telemetria:", e);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSaveScreenshot() {
    setIsSavingScreenshot(true);
    try {
      const res = await fetch(`/api/insights/pages/${page.id}/screenshot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          screenshotUrlDesktop: desktopScreenshotInput.trim(),
          screenshotUrlMobile: mobileScreenshotInput.trim(),
        }),
      });

      if (res.ok) {
        page.screenshotUrlDesktop = desktopScreenshotInput.trim();
        page.screenshotUrlMobile = mobileScreenshotInput.trim();
        page.screenshotUpdatedAt = new Date();
        setIsScreenshotModalOpen(false);
      }
    } catch (e) {
      console.error("Erro ao salvar screenshot:", e);
    } finally {
      setIsSavingScreenshot(false);
    }
  }

  const activeScreenshot =
    viewport === "mobile" ? page.screenshotUrlMobile : page.screenshotUrlDesktop;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/insights"
              className="inline-flex size-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition"
              title="Voltar para a Visão Geral"
            >
              <ChevronLeft className="size-4" />
            </Link>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {page.name}
            </h1>
            <span className="rounded-md bg-brand-50 px-2.5 py-0.5 text-xs font-bold text-brand-700 ring-1 ring-inset ring-brand-200 uppercase">
              {page.version}
            </span>
            <Badge tone={page.isActive ? "success" : "neutral"}>
              {page.isActive ? "Ativa" : "Inativa"}
            </Badge>
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
            <span>BU: <strong>{page.buName || "Geral"}</strong></span>
            <span>·</span>
            <a
              href={page.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-brand-600 hover:underline font-mono"
            >
              <span>{page.url}</span>
              <ExternalLink className="size-3" />
            </a>
            {page.screenshotUpdatedAt && (
              <>
                <span>·</span>
                <span>
                  Screenshot atualizado em{" "}
                  {new Date(page.screenshotUpdatedAt).toLocaleDateString("pt-BR")}
                </span>
              </>
            )}
          </div>

          {/* Atalhos Rápidos entre BUs e Subdomínios Principais */}
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-[11px] font-semibold text-slate-400 mr-1">Alternar BU:</span>
            {[
              { id: "lp-grupomedcof", label: "🩺 Grupo MedCof" },
              { id: "lp-medcofderma", label: "🧴 MedCof Derma" },
              { id: "lp-medcofendocrino", label: "🧬 MedCof Endócrino" },
              { id: "lp-app-medcof", label: "💻 App MedCof" },
              { id: "lp-qbank-prime", label: "🎯 QBank Prime" },
              { id: "lp-revalida", label: "🇧🇷 Revalida" },
              { id: "lp-extensivo-2025", label: "📚 Extensivo" },
              { id: "lp-cardiologia", label: "🫀 Cardio" },
              { id: "lp-cirurgia", label: "🔪 Cirurgia" },
              { id: "lp-clinica-medica", label: "🩺 Clínica Médica" },
              { id: "lp-pediatria", label: "👶 Pediatria" },
              { id: "lp-ginecologia", label: "🤰 Ginecologia" },
              { id: "lp-ortopedia", label: "🦴 Ortopedia" },
              { id: "lp-oftalmologia", label: "👁️ Oftalmo" },
              { id: "lp-concursus", label: "🏛️ Concursus" },
            ].map((shortcut) => (
              <Link
                key={shortcut.id}
                href={`/insights/paginas/${shortcut.id}`}
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-[11px] font-medium transition",
                  page.id === shortcut.id
                    ? "bg-amber-500 font-bold text-white shadow-2xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                )}
              >
                {shortcut.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsScreenshotModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition"
          >
            <Camera className="size-3.5 text-slate-500" />
            {activeScreenshot ? "Atualizar Screenshot" : "Configurar Screenshot"}
          </button>
        </div>
      </div>

      {/* Barra de Filtros e Modos de Heatmap */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Viewport: Desktop vs Mobile */}
          <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1 text-xs font-medium text-slate-600">
            <button
              type="button"
              onClick={() => handleFilterChange("desktop", period)}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition",
                viewport === "desktop"
                  ? "bg-white font-semibold text-slate-900 shadow-xs"
                  : "hover:text-slate-900"
              )}
            >
              <Monitor className="size-3.5 text-slate-500" />
              Desktop (1200px)
            </button>
            <button
              type="button"
              onClick={() => handleFilterChange("mobile", period)}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition",
                viewport === "mobile"
                  ? "bg-white font-semibold text-slate-900 shadow-xs"
                  : "hover:text-slate-900"
              )}
            >
              <Smartphone className="size-3.5 text-slate-500" />
              Mobile (390px)
            </button>
          </div>

          {/* Modo de Visualização do Heatmap */}
          <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1 text-xs font-medium text-slate-600">
            <button
              type="button"
              onClick={() => {
                setActiveTab("heatmap");
                setMode("density");
              }}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition",
                activeTab === "heatmap" && mode === "density"
                  ? "bg-white font-semibold text-slate-900 shadow-xs"
                  : "hover:text-slate-900"
              )}
            >
              <Flame className="size-3.5 text-amber-500" />
              Mapa de Calor (Cliques)
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("heatmap");
                setMode("points");
              }}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition",
                activeTab === "heatmap" && mode === "points"
                  ? "bg-white font-semibold text-slate-900 shadow-xs"
                  : "hover:text-slate-900"
              )}
            >
              <MousePointerClick className="size-3.5 text-blue-500" />
              Pontos & CTAs
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("heatmap");
                setMode("scroll");
              }}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition",
                activeTab === "heatmap" && mode === "scroll"
                  ? "bg-white font-semibold text-slate-900 shadow-xs"
                  : "hover:text-slate-900"
              )}
            >
              <Layers className="size-3.5 text-emerald-500" />
              Scroll
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("heatmap");
                setMode("clean");
              }}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition",
                activeTab === "heatmap" && mode === "clean"
                  ? "bg-white font-semibold text-slate-900 shadow-xs"
                  : "hover:text-slate-900"
              )}
            >
              <Eye className="size-3.5 text-slate-500" />
              Página Limpa
            </button>
          </div>

          {/* Período */}
          <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1 text-xs font-medium text-slate-600">
            {[
              { label: "Hoje", days: 1 },
              { label: "7d", days: 7 },
              { label: "30d", days: 30 },
              { label: "90d", days: 90 },
            ].map((item) => (
              <button
                key={item.days}
                type="button"
                onClick={() => handleFilterChange(viewport, item.days)}
                className={cn(
                  "rounded-lg px-2.5 py-1.5 transition",
                  period === item.days
                    ? "bg-white font-semibold text-slate-900 shadow-xs"
                    : "hover:text-slate-900"
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Resumo Rápido */}
        <div className="flex items-center gap-4 text-xs font-medium text-slate-600">
          <span>
            Visitas: <strong className="text-slate-900">{heatmapData.totalVisits}</strong>
          </span>
          <span>·</span>
          <span>
            Cliques: <strong className="text-slate-900">{heatmapData.totalClicks}</strong>
          </span>
          {isLoading && (
            <span className="text-xs text-brand-600 animate-pulse font-semibold">
              Carregando...
            </span>
          )}
        </div>
      </div>

      {/* Tabs Secundárias de Análise (Heatmap, Funil, Ranking de CTAs, UTMs) */}
      <div className="flex items-center gap-2 border-b border-slate-200 text-xs font-semibold text-slate-600">
        <button
          type="button"
          onClick={() => setActiveTab("heatmap")}
          className={cn(
            "flex items-center gap-2 border-b-2 px-4 py-2.5 transition",
            activeTab === "heatmap"
              ? "border-brand-600 text-brand-600"
              : "border-transparent hover:text-slate-900"
          )}
        >
          <Flame className="size-4" />
          Heatmap Visual
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("funnel")}
          className={cn(
            "flex items-center gap-2 border-b-2 px-4 py-2.5 transition",
            activeTab === "funnel"
              ? "border-brand-600 text-brand-600"
              : "border-transparent hover:text-slate-900"
          )}
        >
          <BarChart2 className="size-4" />
          Funil de Conversão
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("elements")}
          className={cn(
            "flex items-center gap-2 border-b-2 px-4 py-2.5 transition",
            activeTab === "elements"
              ? "border-brand-600 text-brand-600"
              : "border-transparent hover:text-slate-900"
          )}
        >
          <ListOrdered className="size-4" />
          Ranking de Elementos & CTAs ({elementsData.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("utms")}
          className={cn(
            "flex items-center gap-2 border-b-2 px-4 py-2.5 transition",
            activeTab === "utms"
              ? "border-brand-600 text-brand-600"
              : "border-transparent hover:text-slate-900"
          )}
        >
          <Share2 className="size-4" />
          Campanhas & UTMs ({utmsData.length})
        </button>
      </div>

      {/* Conteúdo da Tab Ativa */}
      {activeTab === "heatmap" && (
        <div className="rounded-2xl border border-slate-200 bg-slate-900/5 p-6 shadow-2xs">
          <HeatmapCanvas
            viewport={viewport}
            mode={mode}
            screenshotUrl={activeScreenshot}
            pageUrl={page.url}
            densityPoints={heatmapData.densityPoints}
            maxWeight={heatmapData.maxWeight}
            ctaHotspots={heatmapData.ctaHotspots}
            scrollDepth={heatmapData.scrollDepth}
            totalVisits={heatmapData.totalVisits}
            totalClicks={heatmapData.totalClicks}
          />
        </div>
      )}

      {/* Tab: Funil de Conversão */}
      {activeTab === "funnel" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs space-y-6">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Funil de Conversão Passo a Passo
            </h2>
            <p className="text-xs text-slate-500">
              Acompanhamento da retenção de usuários entre cada etapa até o envio confirmado
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {funnelData.map((step) => (
              <div
                key={step.step}
                className="relative rounded-2xl border border-slate-200 bg-slate-50/50 p-5 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="flex size-7 items-center justify-center rounded-lg bg-slate-200 font-bold text-xs text-slate-800">
                    {step.step}
                  </span>
                  <span className="text-xs font-bold text-slate-900">
                    {step.rateFromTotal}% do total
                  </span>
                </div>

                <div>
                  <h3 className="font-semibold text-sm text-slate-900">{step.name}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{step.description}</p>
                </div>

                <div className="pt-2 border-t border-slate-200">
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-black text-slate-900">
                      {step.count.toLocaleString("pt-BR")}
                    </span>
                    {step.dropOffRate > 0 && (
                      <span className="text-xs font-semibold text-rose-600">
                        -{step.dropOffRate}% drop
                      </span>
                    )}
                  </div>
                </div>

                {/* Barra de progresso visual */}
                <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
                  <div
                    style={{ width: `${step.rateFromTotal}%` }}
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      step.step === 4 ? "bg-emerald-500" : "bg-brand-600"
                    )}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Ranking de Elementos & CTAs */}
      {activeTab === "elements" && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <h2 className="text-base font-semibold text-slate-900">
              Ranking dos Elementos Mais Clicados
            </h2>
            <p className="text-xs text-slate-500">
              Identificados via <code>data-insight-id</code> ou links/botões da página
            </p>
          </div>

          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-100 bg-slate-50/75 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-5 py-3">Elemento (ID & Rótulo)</th>
                <th className="px-4 py-3">Seção</th>
                <th className="px-4 py-3 text-right">Cliques</th>
                <th className="px-4 py-3 text-right">Participação</th>
                <th className="px-5 py-3 text-right">Último Clique</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {elementsData.length > 0 ? (
                elementsData.map((el) => (
                  <tr key={el.elementId} className="hover:bg-slate-50/60 transition">
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-slate-900">
                        {el.elementLabel}
                      </div>
                      <div className="font-mono text-[11px] text-slate-400">
                        <code>{el.elementId}</code>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[11px] text-slate-700">
                        {el.sectionId || "(não definida)"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right font-bold text-slate-900">
                      {el.clicks.toLocaleString("pt-BR")}
                    </td>
                    <td className="px-4 py-3.5 text-right font-medium text-slate-600">
                      {el.sharePercent}%
                    </td>
                    <td className="px-5 py-3.5 text-right text-slate-500">
                      {new Date(el.lastClicked).toLocaleDateString("pt-BR")}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 text-xs">
                    Nenhum elemento clicado registrado ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab: Campanhas & UTMs */}
      {activeTab === "utms" && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <h2 className="text-base font-semibold text-slate-900">
              Origens de Tráfego e Campanhas (UTMs)
            </h2>
            <p className="text-xs text-slate-500">
              Desempenho de conversão por canal de aquisição
            </p>
          </div>

          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-100 bg-slate-50/75 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-5 py-3">Origem (Source)</th>
                <th className="px-4 py-3">Mídia (Medium)</th>
                <th className="px-4 py-3">Campanha</th>
                <th className="px-4 py-3 text-right">Visitas</th>
                <th className="px-4 py-3 text-right">Cliques CTA</th>
                <th className="px-4 py-3 text-right">Leads</th>
                <th className="px-5 py-3 text-right">Taxa Conv.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {utmsData.length > 0 ? (
                utmsData.map((utm, i) => (
                  <tr key={i} className="hover:bg-slate-50/60 transition">
                    <td className="px-5 py-3.5 font-semibold text-slate-900">
                      {utm.source}
                    </td>
                    <td className="px-4 py-3.5 text-slate-600 font-mono text-[11px]">
                      {utm.medium}
                    </td>
                    <td className="px-4 py-3.5 text-slate-700 font-medium">
                      {utm.campaign}
                    </td>
                    <td className="px-4 py-3.5 text-right font-medium text-slate-900">
                      {utm.visits.toLocaleString("pt-BR")}
                    </td>
                    <td className="px-4 py-3.5 text-right text-slate-700">
                      {utm.ctaClicks.toLocaleString("pt-BR")}
                    </td>
                    <td className="px-4 py-3.5 text-right font-bold text-emerald-600">
                      {utm.leads.toLocaleString("pt-BR")}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Badge tone={utm.conversionRate > 0 ? "success" : "neutral"}>
                        {utm.conversionRate}%
                      </Badge>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                    Nenhum parâmetro UTM capturado no período selecionado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal para Atualizar Screenshots */}
      {isScreenshotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900">
              Atualizar Screenshot da Landing Page
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Insira a URL pública da imagem de screenshot para Desktop e Mobile (hospedada no R2 ou Blob).
            </p>

            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Screenshot Desktop (1200px largura)
                </label>
                <input
                  type="url"
                  placeholder="https://pub-r2.medcof.tech/screenshots/lp-extensivo-desktop.png"
                  value={desktopScreenshotInput}
                  onChange={(e) => setDesktopScreenshotInput(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-900 focus:border-brand-500 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Screenshot Mobile (390px largura)
                </label>
                <input
                  type="url"
                  placeholder="https://pub-r2.medcof.tech/screenshots/lp-extensivo-mobile.png"
                  value={mobileScreenshotInput}
                  onChange={(e) => setMobileScreenshotInput(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-900 focus:border-brand-500 focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setIsScreenshotModalOpen(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveScreenshot}
                disabled={isSavingScreenshot}
                className="rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-brand-700 transition disabled:opacity-50"
              >
                {isSavingScreenshot ? "Salvando..." : "Salvar Screenshots"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
