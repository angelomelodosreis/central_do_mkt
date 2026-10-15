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
} from "lucide-react";
import {
  AreaChart,
  Area,
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
  const [data, setData] = useState<InsightsOverviewData>(initialData);
  const [period, setPeriod] = useState<number>(30);
  const [selectedBu, setSelectedBu] = useState<string>("all");
  const [viewport, setViewport] = useState<"all" | "desktop" | "mobile">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);

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

  const router = useRouter();
  const [urlInput, setUrlInput] = useState("");
  const [isInspecting, setIsInspecting] = useState(false);

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
              Insights & Comportamento das LPs
            </h1>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Monitoramento de visitas, cliques em CTAs, formulários, funil de conversão e mapa de calor em tempo real.
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

      {/* Inspetor Instantâneo de URL (Cloudflare Heatmap Engine) */}
      <div className="rounded-3xl border border-amber-200/80 bg-gradient-to-r from-amber-500/5 via-brand-500/5 to-purple-500/5 p-6 shadow-sm space-y-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="size-5 text-amber-600" />
            <h2 className="text-base font-bold text-slate-900">
              Inspetor de Mapa de Calor por URL (Iframe Ao Vivo)
            </h2>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            Renderização em tempo real com camada térmica sobre o site real
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
            { label: "📚 Extensivo 2025/2026", url: "https://grupomedcof.com.br/extensivo-2025" },
            { label: "🫀 Cardio", url: "https://cardio.grupomedcof.com.br" },
            { label: "🔪 Cirurgia", url: "https://cirurgia.grupomedcof.com.br" },
            { label: "🦴 Ortopedia", url: "https://ortopedia.grupomedcof.com.br" },
            { label: "👁️ Oftalmo", url: "https://oftalmo.grupomedcof.com.br" },
            { label: "👶 Pediatria", url: "https://pediatria.grupomedcof.com.br" },
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

      {/* Filter Bar */}
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

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Visitas */}
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

        {/* Cliques em CTA */}
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
            Interações com botões de ação e conversão
          </p>
        </div>

        {/* Leads Confirmados */}
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

        {/* Taxa Média de Conversão */}
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

      {/* Gráfico Diário de Conversão e Engajamento */}
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

      {/* Tabela de Landing Pages Monitoradas */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
        <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Landing Pages Monitoradas
            </h2>
            <p className="text-xs text-slate-500">
              Selecione uma LP para visualizar o Mapa de Calor, Funil e detalhes de cliques
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
                <th className="px-4 py-3">Business Unit</th>
                <th className="px-4 py-3 text-center">Versão</th>
                <th className="px-4 py-3 text-right">Visitas</th>
                <th className="px-4 py-3 text-right">Cliques CTA</th>
                <th className="px-4 py-3 text-right">Leads</th>
                <th className="px-4 py-3 text-right">Taxa Conv.</th>
                <th className="px-5 py-3 text-right">Ação</th>
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
                        <span className="truncate max-w-[240px]">{page.url}</span>
                        <ExternalLink className="size-3 shrink-0" />
                      </a>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="font-medium text-slate-600">
                        {page.buName}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700 uppercase">
                        {page.version}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right font-medium text-slate-900">
                      {page.visits.toLocaleString("pt-BR")}
                    </td>
                    <td className="px-4 py-3.5 text-right font-medium text-slate-900">
                      {page.ctaClicks.toLocaleString("pt-BR")}
                    </td>
                    <td className="px-4 py-3.5 text-right font-semibold text-emerald-600">
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
                    <td className="px-5 py-3.5 text-right">
                      <Link
                        href={`/insights/paginas/${page.id}`}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-700 ring-1 ring-amber-500/20 transition hover:bg-amber-500/20"
                      >
                        <Flame className="size-3.5" />
                        Ver Heatmap
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={8}
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
