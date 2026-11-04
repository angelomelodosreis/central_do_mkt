"use client";

import { useState } from "react";
import {
  ArrowUpRight,
  Check,
  CircleDollarSign,
  Copy,
  ExternalLink,
  Layers,
  Moon,
  Palette,
  Search,
  Sparkles,
  Sun,
  Type,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Button, ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/field";

export function StyleGuideView() {
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [previewTheme, setPreviewTheme] = useState<"light" | "dark">("light");

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    setCopiedToken(text);
    toast.success(`Copiado: ${text}`);
    setTimeout(() => setCopiedToken(null), 2000);
  }

  return (
    <div className="space-y-12 pb-20">
      {/* 1. Header do Style Guide com Identidade MedCof */}
      <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-soft-card sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl border border-slate-200/90 bg-white shadow-100">
                <svg
                  width="44"
                  height="54"
                  viewBox="0 0 44 54"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-auto"
                >
                  <g clipPath="url(#medcof-sg-clip)">
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M0.690982 21.2556C-2.96901 31.6769 8.00826 39.6372 31.9089 43.1845C38.9832 43.903 43.7553 40.763 43.1075 35.4392C37.8361 38.1634 6.36721 29.1791 0.690982 21.2556Z"
                      fill="#E2263C"
                    />
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M36.214 10.9135C25.0882 6.58262 15.4039 5.38887 14.6454 8.2007C11.7897 2.20929 22.2893 0.644967 30.1707 3.30404C30.5917 2.57704 29.1099 0.916532 28.2489 0C32.2625 1.6888 37.4907 6.973 38.0656 10.6137C38.2221 11.6122 37.3233 11.3463 36.214 10.9135Z"
                      fill="#E2263C"
                    />
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M19.6711 8.11582C18.3782 8.01964 17.5577 8.26292 17.3363 8.33364C16.6157 8.56277 16.0731 8.8994 15.7277 9.14834C16.2972 9.67166 17.1474 10.3902 18.2702 11.1059C19.4821 11.8781 20.5051 12.3223 21.3823 12.6815C25.2177 14.2515 27.2016 14.9898 29.5768 15.5075C30.3811 15.6829 30.7806 15.7706 31.1801 15.8045C33.8657 16.0365 36.0843 14.9304 37.4366 14.0535C33.7334 12.9955 30.9236 11.9177 29.01 11.1087C26.7805 10.1667 24.4323 9.57548 22.1839 8.68724C21.9518 8.59672 20.9828 8.20917 19.6684 8.11299L19.6711 8.11582Z"
                      fill="#E2263C"
                    />
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M38.3408 14.5203C46.1385 23.2782 34.1194 30.4549 10.594 21.6998C6.16475 20.0025 4.01896 18.4664 3.43055 16.9332C2.43728 14.3505 7.16072 10.7947 7.34696 10.5939C13.6251 14.5061 34.4568 20.9784 38.3408 14.5231V14.5203Z"
                      fill="#E2263C"
                    />
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M29.4473 47.1392C22.8992 46.6696 17.1366 45.5154 13.3552 44.0869C15.8357 43.524 21.3526 43.838 26.8453 43.7984C20.6077 42.6216 15.3174 41.0912 11.069 39.2327C9.26332 39.6428 8.08381 40.4575 7.61957 41.6824C5.63572 45.7276 13.5819 50.5931 20.9532 51.4672C21.053 52.3102 19.0476 53.1872 17.9032 53.6511C22.2244 53.8434 29.064 51.2805 31.0181 48.2113C31.5553 47.3683 30.6268 47.224 29.4473 47.1392Z"
                      fill="#E2263C"
                    />
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M34.0007 26.8538C32.5567 27.1339 30.9534 27.2866 29.199 27.2866C25.2043 27.2866 20.5726 26.5342 15.5901 25.1C20.8318 27.7817 26.3595 30.4266 29.1531 32.701C33.3691 33.7222 37.1668 34.3332 39.7768 34.3332C41.3828 34.3332 42.0063 34.1012 42.1979 33.9994L42.2978 33.9485C41.0319 31.6826 37.99 29.23 34.0007 26.8538Z"
                      fill="#E2263C"
                    />
                  </g>
                  <defs>
                    <clipPath id="medcof-sg-clip">
                      <rect width="43.1641" height="53.6596" fill="white" />
                    </clipPath>
                  </defs>
                </svg>
              </span>
              <div>
                <span className="inline-block rounded-full bg-brand-50 border border-brand-200 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-900">
                  MedCof UI Official Design Guide
                </span>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                  Design System & Style Guide
                </h1>
              </div>
            </div>
            <p className="text-sm text-slate-600 max-w-3xl leading-relaxed">
              Padrões canônicos de interface, degradês oficiais de ação, componentes táteis e tokens de acessibilidade (WCAG AAA) unificados entre as Landing Pages, o QBank e a <strong>Central do Marketing</strong>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 shadow-100">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              Tokens Conectados v4
            </span>
            <div className="inline-flex items-center rounded-xl border border-slate-200 bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setPreviewTheme("light")}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  previewTheme === "light"
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Sun className="size-3.5" />
                <span>Light</span>
              </button>
              <button
                type="button"
                onClick={() => setPreviewTheme("dark")}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  previewTheme === "dark"
                    ? "bg-slate-900 text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Moon className="size-3.5" />
                <span>Dark</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Primitivas MedCof UI: Vitrine Interativa de Botões (Espelho de primitives.html) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200/90 pb-2">
          <div className="flex items-center gap-2">
            <Sparkles className="size-5 text-brand-600" />
            <h2 className="text-lg font-bold text-slate-900">Botões & Ações Primárias (Button)</h2>
          </div>
          <span className="text-xs text-slate-500 font-mono">from-btn-brand-from to-btn-brand-to</span>
        </div>

        <div
          className={`rounded-3xl border transition-colors p-6 sm:p-8 space-y-6 ${
            previewTheme === "dark"
              ? "bg-[#171719] border-neutral-800 text-white"
              : "bg-white border-slate-200/90 text-slate-900"
          }`}
        >
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="brand" size="md">
              Brand (Oficial)
            </Button>
            <Button variant="dark" size="md">
              Primary (Dark Grafite)
            </Button>
            <Button variant="secondary" size="md">
              Secondary (Branco Tátil)
            </Button>
            <Button variant="ghost" size="md">
              Ghost (Terciário)
            </Button>
            <Button variant="danger" size="md">
              Danger (Destrutivo)
            </Button>
            <Button variant="brand" size="md" disabled>
              Disabled
            </Button>
            <Button variant="brand" size="md" loading>
              Carregando
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 dark:border-neutral-800">
            <span className="text-xs font-semibold text-slate-400 dark:text-neutral-500 uppercase tracking-wider mr-2">
              Tamanho Pequeno (sm):
            </span>
            <Button variant="brand" size="sm">
              Brand sm
            </Button>
            <Button variant="dark" size="sm">
              Primary sm
            </Button>
            <Button variant="secondary" size="sm">
              Secondary sm
            </Button>
            <Button variant="danger" size="sm">
              Danger sm
            </Button>
          </div>
        </div>
      </section>

      {/* 3. Primitivas MedCof UI: Badges & Chips (Espelho de primitives.html) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200/90 pb-2">
          <div className="flex items-center gap-2">
            <Layers className="size-5 text-brand-600" />
            <h2 className="text-lg font-bold text-slate-900">Badges & Chips de Status (Badge)</h2>
          </div>
          <span className="text-xs text-slate-500 font-mono">rounded-full shadow-100</span>
        </div>

        <div
          className={`rounded-3xl border transition-colors p-6 sm:p-8 space-y-4 ${
            previewTheme === "dark"
              ? "bg-[#171719] border-neutral-800 text-white"
              : "bg-white border-slate-200/90 text-slate-900"
          }`}
        >
          <div className="flex flex-wrap items-center gap-2.5">
            <Badge tone="brand">MedCof Oficial</Badge>
            <Badge tone="primary">Primary Chip</Badge>
            <Badge tone="outline">Outline Badge</Badge>
            <Badge tone="success">Success / Aprovado</Badge>
            <Badge tone="warning">Warning / Pendente</Badge>
            <Badge tone="danger">Danger / Atenção</Badge>
            <Badge tone="neutral">Neutral / Rascunho</Badge>
          </div>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1 text-xs font-bold shadow-100">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              Tempo Real Conectado
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200 px-3 py-1 text-xs font-bold shadow-100">
              Pacing Homólogo MTD
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 text-purple-800 border border-purple-200 px-3 py-1 text-xs font-bold shadow-100">
              Diagnóstico Estratégico
            </span>
          </div>
        </div>
      </section>

      {/* 4. Controles de Formulário & Inputs de Alto Contraste */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200/90 pb-2">
          <div className="flex items-center gap-2">
            <Zap className="size-5 text-brand-600" />
            <h2 className="text-lg font-bold text-slate-900">Campos de Formulário & Legibilidade (Inputs)</h2>
          </div>
          <span className="text-xs text-slate-500 font-mono">WCAG AAA (7:1 Contrast)</span>
        </div>

        <div className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-8 space-y-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <Field label="Nome da Campanha" required hint="Título visível no calendário e no extrator de leads">
              <Input placeholder="Ex.: Lote Promocional Extensivo 2027" defaultValue="Black November Cirurgia" />
            </Field>

            <Field label="Busca de Business Unit" hint="Campo com ícone e cantos em pílula oficial">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-500" />
                <Input
                  className="pl-10 rounded-full"
                  placeholder="Buscar BU por nome ou código (ex: MEDCOF_CIRURGIA)..."
                />
              </div>
            </Field>
          </div>

          <Field label="Observações Estratégicas (Textarea Expansível)" hint="Suporte a resize vertical e contraste de leitura total">
            <Textarea
              rows={3}
              placeholder="Detalhes adicionais, hipóteses de crescimento ou alinhamento com o time..."
              defaultValue="Foco em conversão dos leads captados no Simulado Nacional ENARE com condição especial de 12x sem juros."
            />
          </Field>
        </div>
      </section>

      {/* 5. Cores & Tokens MedCof */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200/90 pb-2">
          <div className="flex items-center gap-2">
            <Palette className="size-5 text-brand-600" />
            <h2 className="text-lg font-bold text-slate-900">Paleta Institucional & Tokens Oficiais</h2>
          </div>
          <span className="text-xs text-slate-500">Clique para copiar o valor HEX</span>
        </div>

        {/* Brand Red Oficial */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Brand Red — Escala Oficial da Marca
            </h3>
            <span className="text-xs font-mono text-brand-600 font-semibold">Tom 500: #e2263c</span>
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5 md:grid-cols-10">
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
                className="group flex flex-col overflow-hidden rounded-xl border border-slate-200 text-left transition hover:scale-105 cursor-pointer shadow-100"
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
                  <p className="text-[10px] text-slate-500 font-mono">{c.hex}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Degradês de Ação MedCof UI */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div
            onClick={() => copyToClipboard("linear-gradient(to bottom right, #d81d33, #ef344a)")}
            className="group rounded-2xl border border-slate-200/90 bg-white p-4 shadow-100 cursor-pointer hover:border-brand-300 transition"
          >
            <div className="h-14 rounded-xl bg-linear-to-br from-[#d81d33] to-[#ef344a] flex items-center justify-center text-white font-bold text-xs shadow-2xs">
              btn-brand (#d81d33 → #ef344a)
            </div>
            <p className="mt-2 text-xs font-semibold text-slate-800">Degradê Brand (Botão Primário)</p>
            <p className="text-[10px] text-slate-500 font-mono">--color-btn-brand-from / to</p>
          </div>

          <div
            onClick={() => copyToClipboard("linear-gradient(to bottom right, #292929, #3c3c3c)")}
            className="group rounded-2xl border border-slate-200/90 bg-white p-4 shadow-100 cursor-pointer hover:border-slate-400 transition"
          >
            <div className="h-14 rounded-xl bg-linear-to-br from-[#292929] to-[#3c3c3c] flex items-center justify-center text-white font-bold text-xs shadow-2xs">
              btn-primary (#292929 → #3c3c3c)
            </div>
            <p className="mt-2 text-xs font-semibold text-slate-800">Degradê Dark (Botão Grafite)</p>
            <p className="text-[10px] text-slate-500 font-mono">--color-btn-primary-from / to</p>
          </div>

          <div
            onClick={() => copyToClipboard("linear-gradient(to bottom right, #7f0e1b, #90202d)")}
            className="group rounded-2xl border border-slate-200/90 bg-white p-4 shadow-100 cursor-pointer hover:border-rose-300 transition"
          >
            <div className="h-14 rounded-xl bg-linear-to-br from-[#7f0e1b] to-[#90202d] flex items-center justify-center text-white font-bold text-xs shadow-2xs">
              btn-destructive (#7f0e1b → #90202d)
            </div>
            <p className="mt-2 text-xs font-semibold text-slate-800">Degradê Destructive (Exclusão)</p>
            <p className="text-[10px] text-slate-500 font-mono">--color-btn-destructive-from / to</p>
          </div>
        </div>
      </section>

      {/* 6. Tipografia & Hierarquia Institucional */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200/90 pb-2">
          <div className="flex items-center gap-2">
            <Type className="size-5 text-brand-600" />
            <h2 className="text-lg font-bold text-slate-900">Tipografia & Números Tabulares</h2>
          </div>
          <span className="text-xs text-slate-500 font-mono">Switzer / Urbanist + Inter / Roboto</span>
        </div>

        <div className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-8 space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">
              Display Title · Switzer / Urbanist (Tight Tracking -0.015em)
            </span>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
              Cockpit Executivo & Inteligência de Marketing
            </h1>
          </div>

          <div className="border-b border-slate-100 pb-4">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">
              Corpo de Texto · Inter / Roboto 14px (Leading Relaxed)
            </span>
            <p className="mt-1 text-sm text-slate-700 leading-relaxed max-w-3xl">
              Acompanhamento integrado de metas de faturamento, matrículas, personas de conversão e pautas de revisão trimestral em tempo real.
            </p>
          </div>

          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">
              Métricas & Valores Tabulares · Geist Mono (Tabular Nums)
            </span>
            <div className="mt-2 flex flex-wrap items-baseline gap-4">
              <span className="text-3xl font-bold tabular-nums text-slate-900">
                R$ 89.540.405,86
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-800 shadow-100">
                <ArrowUpRight className="size-3.5" />
                <span>+24.8% Homólogo MTD</span>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Elevações Táteis (Soft Elevation & Shadows) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200/90 pb-2">
          <div className="flex items-center gap-2">
            <Layers className="size-5 text-brand-600" />
            <h2 className="text-lg font-bold text-slate-900">Elevações Táteis (Soft Elevation)</h2>
          </div>
          <span className="text-xs text-slate-500 font-mono">shadow-soft-card / shadow-100</span>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-soft-card">
            <span className="text-xs font-bold text-slate-900 font-mono">--shadow-soft-card</span>
            <p className="mt-2 text-xs text-slate-600 leading-relaxed">
              Elevação padrão para cartões informativos, tabelas e gráficos da aplicação.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-soft-float">
            <span className="text-xs font-bold text-slate-900 font-mono">--shadow-soft-float</span>
            <p className="mt-2 text-xs text-slate-600 leading-relaxed">
              Elevação destacada para popovers, dropdowns, modais e tooltips flutuantes.
            </p>
          </div>

          <div className="rounded-2xl border border-brand-200 bg-white p-5 shadow-soft-glow">
            <span className="text-xs font-bold text-brand-600 font-mono">--shadow-soft-glow</span>
            <p className="mt-2 text-xs text-slate-600 leading-relaxed">
              Brilho sutil para botões de call-to-action e elementos principais em destaque.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
