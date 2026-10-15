"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Flame,
  MousePointerClick,
  Eye,
  FileCheck,
  TrendingUp,
  ExternalLink,
  Plus,
  Settings,
  Monitor,
  Smartphone,
  Layers,
  Search,
  Globe,
  ArrowRight,
  Sparkles,
  Trophy,
  Target,
  Zap,
  Activity,
  BarChart2,
  FileText,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";
import type { InsightsOverviewData } from "@/lib/modules/insights/queries";

export function InsightsOverviewView({
  initialData,
  businessUnits,
}: {
  initialData: InsightsOverviewData;
  businessUnits: { id: string; label: string; code: string }[];
}) {
  const router = useRouter();
  const [data, setData] = useState<InsightsOverviewData>(initialData);
  const [activeSubTab, setActiveSubTab] = useState<"desempenho" | "inspetor">("desempenho");
  const [period, setPeriod] = useState<number>(30);
  const [selectedBu, setSelectedBu] = useState<string>("all");
  const [viewport, setViewport] = useState<"all" | "desktop" | "mobile">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Estado do Inspetor de URL
  const [urlInput, setUrlInput] = useState("");
  const [isInspecting, setIsInspecting] = useState(false);

  async function handleFilterChange(
    newPeriod = period,
    newBu = selectedBu,
    newVp = viewport
  ) {
    setIsLoading(true);
    setPeriod(newPeriod);
    setSelectedBu(newBu);
    setViewport(newVp);

    try {
      const params = new URLSearchParams();
      params.set("period", String(newPeriod));
      if (newBu !== "all") params.set("buId", newBu);
      if (newVp !== "all") params.set("viewport", newVp);

      const res = await fetch(`/api/insights/overview?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error("Falha ao recarregar insights:", e);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleInspectUrl(targetUrl?: string) {
    let url = (targetUrl || urlInput).trim();
    if (!url) return;

    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = `https://${url}`;
    }

    setIsInspecting(true);

    try {
      const cleanTarget = url.toLowerCase().replace(/\/$/, "");
      const matched = data.topPages.find((p) => {
        const pClean = p.url.toLowerCase().replace(/\/$/, "");
        return pClean === cleanTarget || cleanTarget.includes(p.id.replace(/^lp-/, ""));
      });

      if (matched) {
        router.push(`/insights/paginas/${matched.id}`);
        return;
      }

      const parsed = new URL(url);
      const hostPart = parsed.hostname.replace(/\.com(\.br)?$/, "").replace(/^www\./, "");
      const name = hostPart.charAt(0).toUpperCase() + hostPart.slice(1);
      const res = await fetch("/api/insights/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          url,
          version: "v1",
        }),
      });

      if (res.ok) {
        const json = await res.json();
        router.push(`/insights/paginas/${json.id}`);
      } else {
        const slug = `lp-${hostPart.replace(/[^a-z0-9]+/g, "-")}`;
        router.push(`/insights/paginas/${slug}`);
      }
    } catch (e) {
      console.error("Erro ao inspecionar URL:", e);
    } finally {
      setIsInspecting(false);
    }
  }

  const filteredPages = data.topPages.filter((p) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.url.toLowerCase().includes(q) ||
      p.buName.toLowerCase().includes(q)
    );
  });

  // Identificar destaques de desempenho
  const bestConvertingPage = [...data.topPages].sort((a, b) => b.conversionRate - a.conversionRate)[0];
  const bestCtaPage = [...data.topPages].sort((a, b) => b.ctaClickRate - a.ctaClickRate)[0];
  const bestScrollPage = [...data.topPages].sort((a, b) => b.avgScrollDepth - a.avgScrollDepth)[0];
  const topLeadsPage = [...data.topPages].sort((a, b) => b.leads - a.leads)[0];

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 ring-1 ring-amber-500/20">
              <Flame className="size-5" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              MedCof Insights & Heatmap
            </h1>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Monitoramento de desempenho das Landing Pages, cliques em CTAs, funil de conversão e mapa de calor em tempo real.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/insights/configuracoes"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-2xs transition hover:bg-slate-50"
          >
            <Settings className="size-4 text-slate-500" />
            Configurar LPs
          </Link>
          <Link
            href="/insights/configuracoes?cadastrar=1"
            className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-xs transition hover:bg-brand-700"
          >
            <Plus className="size-4" />
            Nova Landing Page
          </Link>
        </div>
      </div>

      {/* Sub-abas de Navegação Interna: Desempenho das LPs vs Inspetor & Heatmap */}
      <div className="flex items-center gap-2 border-b border-slate-200 text-sm font-semibold text-slate-600">
        <button
          type="button"
          onClick={() => setActiveSubTab("desempenho")}
          className={cn(
            "flex items-center gap-2 border-b-2 px-5 py-3 transition",
            activeSubTab === "desempenho"
              ? "border-brand-600 text-brand-600 font-bold"
              : "border-transparent hover:text-slate-900"
          )}
        >
          <TrendingUp className="size-4" />
          Desempenho das LPs (Dados & Conversão)
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab("inspetor")}
          className={cn(
            "flex items-center gap-2 border-b-2 px-5 py-3 transition",
            activeSubTab === "inspetor"
              ? "border-brand-600 text-brand-600 font-bold"
              : "border-transparent hover:text-slate-900"
          )}
        >
          <Flame className="size-4 text-amber-500" />
          Inspetor & Heatmap Ao Vivo
        </button>
      </div>

      {/* Seção 1: Inspetor de Mapa de Calor Instantâneo (Visível na aba Inspetor ou como atalho) */}
      {activeSubTab === "inspetor" && (
        <div className="rounded-3xl border border-amber-200/80 bg-gradient-to-r from-amber-500/5 via-brand-500/5 to-purple-500/5 p-6 shadow-sm space-y-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="size-5 text-amber-600" />
              <h2 className="text-base font-bold text-slate-900">
                Inspetor de Mapa de Calor por URL (Iframe Ao Vivo)
              </h2>
            </div>
            <span className="text-xs font-semibold text-slate-500">
              Carrega o site real no Iframe com a camada térmica calibrada por cima
            </span>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleInspectUrl();
            }}
            className="flex flex-col gap-2 sm:flex-row sm:items-center"
          >
            <div className="relative flex-1">
              <Globe className="absolute left-3.5 top-3 size-4 text-slate-400" />
              <input
                type="text"
                placeholder="Digite ou cole qualquer URL da MedCof (ex: https://grupomedcof.com.br, https://medcofderma.com.br, https://medcofendocrino.com.br...)"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-xs font-medium text-slate-900 shadow-xs placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>

            <button
              type="submit"
              disabled={isInspecting || !urlInput.trim()}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-amber-700 disabled:opacity-50 shrink-0"
            >
              {isInspecting ? (
                <span>Carregando...</span>
              ) : (
                <>
                  <span>Abrir Heatmap no Iframe</span>
                  <ArrowRight className="size-3.5" />
                </>
              )}
            </button>
          </form>

          {/* Atalhos Rápidos das Principais LPs */}
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
            <span className="text-slate-400 font-semibold mr-1">Atalhos rápidos:</span>
            {[
              { label: "🩺 Grupo MedCof", url: "https://grupomedcof.com.br" },
              { label: "🧴 MedCof Derma", url: "https://medcofderma.com.br" },
              { label: "🧬 MedCof Endócrino", url: "https://medcofendocrino.com.br" },
              { label: "💻 App MedCof", url: "https://app.grupomedcof.com.br" },
              { label: "🎯 QBank Prime", url: "https://qbank.grupomedcof.com.br" },
              { label: "🇧🇷 Revalida", url: "https://revalida.grupomedcof.com.br" },
              { label: "🏛️ Concursus", url: "https://concursus.grupomedcof.com.br" },
              { label: "📚 Extensivo 2025/2026", url: "https://grupomedcof.com.br/extensivo-2025" },
              { label: "⚡ HIIT Target", url: "https://grupomedcof.com.br/hiit-target" },
              { label: "🫀 Cardio", url: "https://grupomedcof.com.br/cardiologia" },
              { label: "🔪 Cirurgia", url: "https://grupomedcof.com.br/cirurgia" },
              { label: "🦴 Ortopedia", url: "https://grupomedcof.com.br/ortopedia" },
              { label: "👁️ Oftalmo", url: "https://grupomedcof.com.br/oftalmologia" },
              { label: "👶 Pediatria", url: "https://grupomedcof.com.br/pediatria" },
              { label: "📦 Materiais", url: "https://materiais.grupomedcof.com.br" },
              { label: "📝 Blog", url: "https://blog.grupomedcof.com.br" },
            ].map((quick) => (
              <button
                key={quick.url}
                type="button"
                onClick={() => {
                  setUrlInput(quick.url);
                  handleInspectUrl(quick.url);
                }}
                className="inline-flex items-center gap-1 rounded-full border border-slate-200/90 bg-white/90 px-3 py-1 font-medium text-slate-700 shadow-2xs transition hover:border-brand-500 hover:text-brand-700"
              >
                <span>{quick.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Barra de Filtros Globais */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Período */}
          <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1 text-xs font-medium text-slate-600">
            {[
              { label: "Hoje", days: 1 },
              { label: "7 dias", days: 7 },
              { label: "30 dias", days: 30 },
              { label: "90 dias", days: 90 },
            ].map((item) => (
              <button
                key={item.days}
                type="button"
                onClick={() => handleFilterChange(item.days, selectedBu, viewport)}
                className={cn(
                  "rounded-lg px-2.5 py-1 transition",
                  period === item.days
                    ? "bg-white font-semibold text-slate-900 shadow-xs"
                    : "hover:text-slate-900"
                )}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Business Unit Selector */}
          <select
            value={selectedBu}
            onChange={(e) => handleFilterChange(period, e.target.value, viewport)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 focus:border-brand-500 focus:outline-none"
          >
            <option value="all">Todas as BUs</option>
            {businessUnits.map((bu) => (
              <option key={bu.id} value={bu.id}>
                {bu.label}
              </option>
            ))}
          </select>

          {/* Viewport Filter */}
          <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1 text-xs font-medium text-slate-600">
            <button
              type="button"
              onClick={() => handleFilterChange(period, selectedBu, "all")}
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
              onClick={() => handleFilterChange(period, selectedBu, "desktop")}
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
              onClick={() => handleFilterChange(period, selectedBu, "mobile")}
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

        {isLoading && (
          <span className="text-xs font-medium text-slate-400 animate-pulse">
            Atualizando dados...
          </span>
        )}
      </div>

      {/* KPI Cards Globais */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Visitas Totais
            </span>
            <span className="flex size-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <Eye className="size-4" />
            </span>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold tracking-tight text-slate-900">
              {data.totalVisits.toLocaleString("pt-BR")}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {period === 1 ? "Nas últimas 24 horas" : `Nos últimos ${period} dias`}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Cliques em CTAs
            </span>
            <span className="flex size-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <MousePointerClick className="size-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-slate-900">
              {data.totalCtaClicks.toLocaleString("pt-BR")}
            </span>
            <span className="text-xs font-semibold text-amber-600">
              CTR: {data.ctaClickRate}%
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Taxa de engajamento com botões de conversão
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Leads Confirmados
            </span>
            <span className="flex size-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <FileCheck className="size-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-slate-900">
              {data.totalFormSubmits.toLocaleString("pt-BR")}
            </span>
            <Badge tone="success">{data.conversionRate}% conv.</Badge>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Formulários enviados (HubSpot e Standard)
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Taxa Geral de Conversão
            </span>
            <span className="flex size-8 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
              <TrendingUp className="size-4" />
            </span>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold tracking-tight text-purple-600">
              {data.conversionRate}%
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Leads / Visitas no período consolidado
          </p>
        </div>
      </div>

      {/* SEÇÃO DA ABA DESEMPENHO DAS LPS: Destaques & Benchmark */}
      {activeSubTab === "desempenho" && (
        <div className="space-y-6">
          {/* Cards de Liderança de Performance */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Campeã de Conversão */}
            <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/60 to-white p-4 shadow-2xs">
              <div className="flex items-center gap-2 text-emerald-700 text-xs font-bold uppercase tracking-wider">
                <Trophy className="size-4 text-emerald-600" />
                <span>Maior Conversão</span>
              </div>
              <div className="mt-2">
                <div className="text-sm font-bold text-slate-900 truncate">
                  {bestConvertingPage?.name || "N/A"}
                </div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-2xl font-black text-emerald-600">
                    {bestConvertingPage?.conversionRate || 0}%
                  </span>
                  <span className="text-xs text-slate-500">
                    ({bestConvertingPage?.leads || 0} leads)
                  </span>
                </div>
              </div>
            </div>

            {/* Maior CTR de CTA */}
            <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50/60 to-white p-4 shadow-2xs">
              <div className="flex items-center gap-2 text-amber-700 text-xs font-bold uppercase tracking-wider">
                <Zap className="size-4 text-amber-600" />
                <span>Maior Clique em CTA</span>
              </div>
              <div className="mt-2">
                <div className="text-sm font-bold text-slate-900 truncate">
                  {bestCtaPage?.name || "N/A"}
                </div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-2xl font-black text-amber-600">
                    {bestCtaPage?.ctaClickRate || 0}%
                  </span>
                  <span className="text-xs text-slate-500">
                    ({bestCtaPage?.ctaClicks || 0} cliques)
                  </span>
                </div>
              </div>
            </div>

            {/* Maior Retenção de Scroll */}
            <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50/60 to-white p-4 shadow-2xs">
              <div className="flex items-center gap-2 text-blue-700 text-xs font-bold uppercase tracking-wider">
                <Activity className="size-4 text-blue-600" />
                <span>Maior Scroll Médio</span>
              </div>
              <div className="mt-2">
                <div className="text-sm font-bold text-slate-900 truncate">
                  {bestScrollPage?.name || "N/A"}
                </div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-2xl font-black text-blue-600">
                    {bestScrollPage?.avgScrollDepth || 0}%
                  </span>
                  <span className="text-xs text-slate-500">da página percorrida</span>
                </div>
              </div>
            </div>

            {/* Maior Volume de Leads */}
            <div className="rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-50/60 to-white p-4 shadow-2xs">
              <div className="flex items-center gap-2 text-purple-700 text-xs font-bold uppercase tracking-wider">
                <Target className="size-4 text-purple-600" />
                <span>Mais Leads Gerados</span>
              </div>
              <div className="mt-2">
                <div className="text-sm font-bold text-slate-900 truncate">
                  {topLeadsPage?.name || "N/A"}
                </div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-2xl font-black text-purple-600">
                    {topLeadsPage?.leads || 0}
                  </span>
                  <span className="text-xs text-slate-500">leads confirmados</span>
                </div>
              </div>
            </div>
          </div>

          {/* Gráfico Comparativo: Benchmark de Taxa de Conversão entre as LPs */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Benchmark de Conversão por Landing Page (%)
                </h3>
                <p className="text-xs text-slate-500">
                  Comparação direta da taxa de conversão final entre todas as páginas monitoradas
                </p>
              </div>
              <span className="text-xs font-semibold text-slate-400">
                Meta recomendada: 5.0%
              </span>
            </div>

            <div className="h-64 w-full">
              {data.topPages.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.topPages.map((p) => ({
                      name: p.name.length > 22 ? p.name.slice(0, 22) + "…" : p.name,
                      conversao: p.conversionRate,
                      leads: p.leads,
                    }))}
                    margin={{ top: 10, right: 10, left: -20, bottom: 25 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="name"
                      stroke="#94a3b8"
                      fontSize={11}
                      tickLine={false}
                      angle={-15}
                      textAnchor="end"
                    />
                    <YAxis
                      stroke="#94a3b8"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      unit="%"
                    />
                    <Tooltip
                      formatter={(val: any) => [`${val}%`, "Taxa de Conversão"]}
                      contentStyle={{
                        backgroundColor: "#ffffff",
                        borderRadius: "0.75rem",
                        border: "1px solid #e2e8f0",
                        fontSize: "12px",
                      }}
                    />
                    <Bar dataKey="conversao" radius={[6, 6, 0, 0]}>
                      {data.topPages.map((p, i) => (
                        <Cell
                          key={i}
                          fill={
                            p.conversionRate >= 5
                              ? "#10b981"
                              : p.conversionRate >= 2
                              ? "#f59e0b"
                              : "#94a3b8"
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-slate-400">
                  Nenhuma LP com dados no período
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Gráfico Diário de Evolução (Disponível em ambas as abas) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Evolução Diária de Acessos e Conversões
            </h2>
            <p className="text-xs text-slate-500">
              Curva diária de visitas, cliques em CTAs e leads gerados
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-medium text-slate-600">
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-blue-500" />
              Visitas
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-amber-500" />
              Cliques em CTAs
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-emerald-500" />
              Leads
            </span>
          </div>
        </div>

        <div className="h-64 w-full">
          {data.dailyChart.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={data.dailyChart}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorVisits" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorCta" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="label"
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    borderRadius: "0.75rem",
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    fontSize: "12px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="visits"
                  name="Visitas"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorVisits)"
                />
                <Area
                  type="monotone"
                  dataKey="ctaClicks"
                  name="Cliques em CTAs"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorCta)"
                />
                <Area
                  type="monotone"
                  dataKey="leads"
                  name="Leads"
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorLeads)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-slate-400">
              Nenhum dado registrado para o período
            </div>
          )}
        </div>
      </div>

      {/* Tabela Executiva de Desempenho Completo das Landing Pages */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
        <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Tabela de Desempenho das Landing Pages
            </h2>
            <p className="text-xs text-slate-500">
              Comparativo de visitas, engajamento em CTAs, início de formulário, leads e scroll médio
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 size-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nome ou URL..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-1.5 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-100 bg-slate-50/75 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-5 py-3">Página / URL</th>
                <th className="px-4 py-3">BU</th>
                <th className="px-4 py-3 text-right">Visitas</th>
                <th className="px-4 py-3 text-right">Cliques CTA (CTR)</th>
                <th className="px-4 py-3 text-right">Início Form</th>
                <th className="px-4 py-3 text-right">Leads</th>
                <th className="px-4 py-3 text-right">Taxa Conv.</th>
                <th className="px-4 py-3 text-right">Scroll Médio</th>
                <th className="px-5 py-3 text-right">Mapa de Calor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredPages.length > 0 ? (
                filteredPages.map((page) => (
                  <tr
                    key={page.id}
                    className="transition hover:bg-slate-50/60"
                  >
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-slate-900">
                        {page.name}
                      </div>
                      <a
                        href={page.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-brand-600 transition"
                      >
                        <span className="truncate max-w-[200px]">{page.url}</span>
                        <ExternalLink className="size-3 shrink-0" />
                      </a>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="font-medium text-slate-600">
                        {page.buName}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right font-medium text-slate-900">
                      {page.visits.toLocaleString("pt-BR")}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="font-bold text-slate-900">
                        {page.ctaClicks.toLocaleString("pt-BR")}
                      </div>
                      <div className="text-[10px] text-amber-600 font-semibold">
                        {page.ctaClickRate}% CTR
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="font-medium text-slate-900">
                        {page.formStarts.toLocaleString("pt-BR")}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {page.formStartRate}%
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right font-bold text-emerald-600">
                      {page.leads.toLocaleString("pt-BR")}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <Badge
                        tone={
                          page.conversionRate >= 5
                            ? "success"
                            : page.conversionRate > 0
                            ? "neutral"
                            : "warning"
                        }
                      >
                        {page.conversionRate}%
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="font-semibold text-slate-800">
                        {page.avgScrollDepth}%
                      </div>
                      <div className="w-16 h-1 rounded-full bg-slate-100 ml-auto mt-1 overflow-hidden">
                        <div
                          style={{ width: `${page.avgScrollDepth}%` }}
                          className="h-full bg-blue-500 rounded-full"
                        />
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Link
                        href={`/insights/paginas/${page.id}`}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-700 ring-1 ring-amber-500/20 transition hover:bg-amber-500/20"
                      >
                        <Flame className="size-3.5" />
                        Heatmap
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={9}
                    className="py-12 text-center text-slate-400 text-xs"
                  >
                    Nenhuma landing page encontrada. Comece cadastrando uma nova página.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
