"use client";

import { useState } from "react";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCircle2,
  CircleDollarSign,
  Copy,
  Layers,
  Palette,
  Sparkles,
  TrendingUp,
  Type,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export function StyleGuideView() {
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    setCopiedToken(text);
    toast.success(`Copiado: ${text}`);
    setTimeout(() => setCopiedToken(null), 2000);
  }

  return (
    <div className="space-y-10 pb-16">
      {/* 1. Header do Style Guide */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-brand-500 text-white font-bold text-xs shadow-xs">
                MC
              </span>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Design System & Style Guide MedCof
              </h1>
            </div>
            <p className="mt-2 text-sm text-slate-600 max-w-3xl leading-relaxed">
              Sistema de design unificado da <strong>Central do Marketing</strong>. Padrões visuais,
              tokens de cor de alta acessibilidade (AAA), tipografia institucional e componentes de alta performance.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-2xl bg-slate-50 border border-slate-200/80 p-3 text-xs text-slate-600">
            <Sparkles className="size-4 text-brand-600 shrink-0" />
            <span>Versão 2.5 · Taste UI & Soft Elevation</span>
          </div>
        </div>
      </div>

      {/* 2. Cores & Tokens */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2">
          <Palette className="size-5 text-brand-600" />
          <h2 className="text-lg font-bold text-slate-900">Paleta de Cores Institucional</h2>
        </div>

        {/* Brand MedCof */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Brand Red (MedCof Oficial)
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Tom 500 (#e2263c) idêntico ao portal institucional. Tons 600/700 para botões e contraste de texto.
          </p>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5 md:grid-cols-10">
            {[
              { name: "50", hex: "#fef2f3", bg: "bg-[#fef2f3]", text: "text-slate-900" },
              { name: "100", hex: "#fde3e6", bg: "bg-[#fde3e6]", text: "text-slate-900" },
              { name: "200", hex: "#fbccd2", bg: "bg-[#fbccd2]", text: "text-slate-900" },
              { name: "300", hex: "#f7a3ae", bg: "bg-[#f7a3ae]", text: "text-slate-900" },
              { name: "400", hex: "#f27186", bg: "bg-[#f27186]", text: "text-white" },
              { name: "500", hex: "#e2263c", bg: "bg-[#e2263c]", text: "text-white" },
              { name: "600", hex: "#cf1730", bg: "bg-[#cf1730]", text: "text-white" },
              { name: "700", hex: "#ae0f28", bg: "bg-[#ae0f28]", text: "text-white" },
              { name: "800", hex: "#911026", bg: "bg-[#911026]", text: "text-white" },
              { name: "900", hex: "#7c1226", bg: "bg-[#7c1226]", text: "text-white" },
            ].map((c) => (
              <button
                key={c.name}
                type="button"
                onClick={() => copyToClipboard(c.hex)}
                className="group flex flex-col overflow-hidden rounded-xl border border-slate-200/60 text-left transition hover:scale-105"
              >
                <div className={`h-12 w-full ${c.bg} flex items-center justify-center`}>
                  {copiedToken === c.hex ? (
                    <Check className={`size-4 ${c.text}`} />
                  ) : (
                    <Copy className={`size-3.5 opacity-0 group-hover:opacity-100 transition-opacity ${c.text}`} />
                  )}
                </div>
                <div className="p-2 bg-white">
                  <p className="text-[11px] font-bold text-slate-900">{c.name}</p>
                  <p className="text-[10px] text-slate-400 font-mono">{c.hex}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Cores Semânticas de Dados & Status */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/40 p-4">
            <span className="text-xs font-bold text-emerald-800 uppercase">Sucesso & Vendas</span>
            <p className="mt-1 text-xs text-emerald-700/80">#10b981 (Emerald 500) / #059669</p>
            <div className="mt-3 flex items-center gap-2">
              <span className="size-3 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-semibold text-emerald-900">Transação Aprovada</span>
            </div>
          </div>

          <div className="rounded-2xl border border-blue-200/80 bg-blue-50/40 p-4">
            <span className="text-xs font-bold text-blue-800 uppercase">Primário & Pacing</span>
            <p className="mt-1 text-xs text-blue-700/80">#2563eb (Blue 600) / #1d4ed8</p>
            <div className="mt-3 flex items-center gap-2">
              <span className="size-3 rounded-full bg-blue-600" />
              <span className="text-xs font-semibold text-blue-900">Curva do Mês Atual</span>
            </div>
          </div>

          <div className="rounded-2xl border border-amber-200/80 bg-amber-50/40 p-4">
            <span className="text-xs font-bold text-amber-800 uppercase">Alerta & Pendência</span>
            <p className="mt-1 text-xs text-amber-700/80">#f59e0b (Amber 500) / #d97706</p>
            <div className="mt-3 flex items-center gap-2">
              <span className="size-3 rounded-full bg-amber-500" />
              <span className="text-xs font-semibold text-amber-900">Pagamento Pendente</span>
            </div>
          </div>

          <div className="rounded-2xl border border-rose-200/80 bg-rose-50/40 p-4">
            <span className="text-xs font-bold text-rose-800 uppercase">Queda & Atenção</span>
            <p className="mt-1 text-xs text-rose-700/80">#e11d48 (Rose 600) / #be123c</p>
            <div className="mt-3 flex items-center gap-2">
              <span className="size-3 rounded-full bg-rose-600" />
              <span className="text-xs font-semibold text-rose-900">Delta Negativo</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Tipografia & Hierarquia */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2">
          <Type className="size-5 text-brand-600" />
          <h2 className="text-lg font-bold text-slate-900">Hierarquia Tipográfica</h2>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xs space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-mono">
              Display Title · Switzer Font (Tight Tracking -0.015em)
            </span>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
              Cockpit Executivo & Inteligência MedCof
            </h1>
          </div>

          <div className="border-b border-slate-100 pb-4">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-mono">
              Card Section Header · Switzer Semibold 18px
            </span>
            <h2 className="mt-1 text-lg font-semibold text-slate-900">
              Pacing Comparativo Dia a Dia (1 a 31)
            </h2>
          </div>

          <div className="border-b border-slate-100 pb-4">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-mono">
              Body & Paragraphs · Inter 14px (Leading Relaxed)
            </span>
            <p className="mt-1 text-sm text-slate-600 leading-relaxed max-w-2xl">
              Acompanhamento detalhado de matrículas, vendas, faturamento líquido e velocidade diária com atualização
              automática a cada 30 segundos sincronizada com a planilha corporativa.
            </p>
          </div>

          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-mono">
              Numbers & Tabular Metrics · Geist Mono / Tabular Nums
            </span>
            <div className="mt-1 flex items-baseline gap-4">
              <span className="text-3xl font-bold tabular-nums text-slate-900">
                R$ 89.540.405,86
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                <ArrowUpRight className="size-3.5" />
                <span>+24.8% MoM</span>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Componentes: Cards de Estatísticas e Badges */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2">
          <Layers className="size-5 text-brand-600" />
          <h2 className="text-lg font-bold text-slate-900">Componentes de Dados & Feedback</h2>
        </div>

        {/* Amostra de Cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Faturamento Total
              </span>
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700">
                +18.4%
              </span>
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900">R$ 10.411.680</div>
            <p className="mt-1 text-xs text-slate-500">Média de 8.600 vendas registradas</p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Velocidade (dV/dt)
              </span>
              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700">
                Aceleração +12%
              </span>
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900">42 vendas/dia</div>
            <p className="mt-1 text-xs text-slate-500">Ritmo de ~1.75 vendas/hora</p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Ticket Médio
              </span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700">
                Estável
              </span>
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900">R$ 10.411,68</div>
            <p className="mt-1 text-xs text-slate-500">Mix balanceado entre Extensivo e R+</p>
          </div>
        </div>

        {/* Amostra de Badges */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Coleção de Badges e Tags de Status
          </h3>
          <div className="mt-3 flex flex-wrap items-center gap-2.5">
            <Badge tone="brand">MedCof Oficial</Badge>
            <Badge tone="neutral">Rascunho</Badge>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-100">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              Tempo Real Conectado
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 border border-blue-100">
              Pacing Dia a Dia
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700 border border-amber-100">
              Aguardando Liberação
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700 border border-rose-100">
              Ação Necessária
            </span>
          </div>
        </div>
      </section>

      {/* 5. Elevações & Sombras Táteis */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2">
          <Zap className="size-5 text-brand-600" />
          <h2 className="text-lg font-bold text-slate-900">Elevações Táteis (Soft Elevation)</h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-soft-card">
            <span className="text-xs font-bold text-slate-800 font-mono">--shadow-soft-card</span>
            <p className="mt-2 text-xs text-slate-500">
              Elevação padrão para cartões informativos, tabelas e gráficos da aplicação.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-soft-float">
            <span className="text-xs font-bold text-slate-800 font-mono">--shadow-soft-float</span>
            <p className="mt-2 text-xs text-slate-500">
              Elevação destacada para popovers, dropdowns, modais e tooltips flutuantes.
            </p>
          </div>

          <div className="rounded-2xl border border-brand-200 bg-white p-5 shadow-soft-glow">
            <span className="text-xs font-bold text-brand-600 font-mono">--shadow-soft-glow</span>
            <p className="mt-2 text-xs text-slate-500">
              Brilho suave sutil para botões de call-to-action e elementos em destaque.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
