"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  Plus,
  Copy,
  Check,
  Globe,
  Settings,
  Code2,
  ExternalLink,
  Flame,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";

interface InsightsSettingsViewProps {
  initialPages: {
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
    createdAt: Date;
  }[];
  businessUnits: { id: string; label: string; code: string }[];
  startWithModalOpen?: boolean;
}

export function InsightsSettingsView({
  initialPages,
  businessUnits,
  startWithModalOpen = false,
}: InsightsSettingsViewProps) {
  const [pages, setPages] = useState(initialPages);
  const [selectedPageForSnippet, setSelectedPageForSnippet] = useState<string>(
    pages[0]?.id || "lp-exemplo"
  );
  const [isCopied, setIsCopied] = useState(false);

  // Modal de Nova Página
  const [isModalOpen, setIsModalOpen] = useState(startWithModalOpen);
  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newBuId, setNewBuId] = useState("");
  const [newVersion, setNewVersion] = useState("v1");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const snippetCode = `<!-- MedCof Insights & Heatmap Global Collector -->
<script
  src="/medcof-insights.js"
  data-page-id="${selectedPageForSnippet}"
  data-version="v1"
  async
  defer
></script>`;

  function handleCopySnippet() {
    navigator.clipboard.writeText(snippetCode);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  }

  async function handleCreatePage(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim() || !newUrl.trim()) {
      setErrorMessage("Informe o nome e a URL da landing page.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const res = await fetch("/api/insights/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          url: newUrl.trim(),
          businessUnitId: newBuId || null,
          version: newVersion.trim() || "v1",
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erro ao cadastrar página");
      }

      // Recarrega lista
      const listRes = await fetch("/api/insights/pages");
      if (listRes.ok) {
        const json = await listRes.json();
        setPages(json.pages || []);
      }

      setIsModalOpen(false);
      setNewName("");
      setNewUrl("");
      setNewBuId("");
      setNewVersion("v1");
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function togglePageStatus(pageId: string, currentActive: boolean) {
    try {
      await fetch(`/api/insights/pages/${pageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentActive }),
      });

      setPages((prev) =>
        prev.map((p) => (p.id === pageId ? { ...p, isActive: !currentActive } : p))
      );
    } catch (e) {
      console.error("Erro ao alterar status da LP:", e);
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
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
              Configurações de Landing Pages & Tags
            </h1>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Cadastre novas LPs, configure versões, status de coleta e obtenha a tag de rastreamento.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-brand-700 transition"
        >
          <Plus className="size-4" />
          Cadastrar Nova LP
        </button>
      </div>

      {/* Snippet de Integração Global */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Code2 className="size-5 text-brand-600" />
              <h2 className="text-base font-semibold text-slate-900">
                Código de Integração Global (Tag de Coleta)
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Insira esta tag no <code>&lt;head&gt;</code> ou antes do fechamento do <code>&lt;/body&gt;</code> da sua landing page.
            </p>
          </div>

          {/* Seletor de Página para o Snippet */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Página selecionada:</span>
            <select
              value={selectedPageForSnippet}
              onChange={(e) => setSelectedPageForSnippet(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-800 focus:border-brand-500 focus:outline-none"
            >
              {pages.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.id})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="relative rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-xs text-emerald-400">
          <button
            type="button"
            onClick={handleCopySnippet}
            className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1 text-xs font-sans font-medium text-slate-200 hover:bg-slate-700 transition"
          >
            {isCopied ? (
              <>
                <Check className="size-3.5 text-emerald-400" />
                <span>Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="size-3.5 text-slate-400" />
                <span>Copiar Código</span>
              </>
            )}
          </button>
          <pre className="overflow-x-auto pr-28 select-all">{snippetCode}</pre>
        </div>

        {/* Guia de Atributos para Desenvolvedores */}
        <div className="rounded-xl border border-brand-100 bg-brand-50/50 p-4 text-xs text-brand-900 space-y-2">
          <div className="font-bold flex items-center gap-1.5">
            <Flame className="size-4 text-brand-600" />
            Guia de Atributos de Telemetria (Recomendado nas LPs):
          </div>
          <p className="text-brand-800">
            Para que botões e CTAs sejam rastreados com rótulos e seções claras nos relatórios, adicione os seguintes atributos HTML aos botões e links:
          </p>
          <div className="grid grid-cols-1 gap-2 font-mono text-[11px] sm:grid-cols-3 pt-1">
            <div className="rounded-lg bg-white/80 p-2 border border-brand-200">
              <strong>data-insight-id="hero-cta"</strong>
              <div className="text-[10px] text-slate-500 font-sans mt-0.5">Identificador único do elemento</div>
            </div>
            <div className="rounded-lg bg-white/80 p-2 border border-brand-200">
              <strong>data-insight-label="Quero começar"</strong>
              <div className="text-[10px] text-slate-500 font-sans mt-0.5">Texto amigável exibido no ranking</div>
            </div>
            <div className="rounded-lg bg-white/80 p-2 border border-brand-200">
              <strong>data-insight-section="hero"</strong>
              <div className="text-[10px] text-slate-500 font-sans mt-0.5">Seção da LP (hero, metodologia, etc.)</div>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de Landing Pages Cadastradas */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Landing Pages Ativas na Plataforma
            </h2>
            <p className="text-xs text-slate-500">
              Gerencie URLs, Business Units e versões de cada página monitorada
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            {pages.length} página{pages.length !== 1 ? "s" : ""}
          </span>
        </div>

        <table className="w-full text-left text-xs">
          <thead className="border-b border-slate-100 bg-slate-50/75 text-slate-500 uppercase tracking-wider font-semibold">
            <tr>
              <th className="px-5 py-3">Página & ID</th>
              <th className="px-4 py-3">URL da LP</th>
              <th className="px-4 py-3">Business Unit</th>
              <th className="px-4 py-3 text-center">Versão</th>
              <th className="px-4 py-3 text-center">Status</th>
              <th className="px-5 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {pages.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50/60 transition">
                <td className="px-5 py-3.5">
                  <div className="font-semibold text-slate-900">{p.name}</div>
                  <div className="font-mono text-[11px] text-slate-400">
                    <code>{p.id}</code>
                  </div>
                </td>
                <td className="px-4 py-3.5">
                  <a
                    href={p.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-slate-600 hover:text-brand-600 font-mono text-[11px] transition"
                  >
                    <span className="truncate max-w-[220px]">{p.url}</span>
                    <ExternalLink className="size-3 shrink-0" />
                  </a>
                </td>
                <td className="px-4 py-3.5">
                  <span className="font-medium text-slate-700">
                    {p.buName || "Geral"}
                  </span>
                </td>
                <td className="px-4 py-3.5 text-center">
                  <span className="rounded bg-slate-100 px-2 py-0.5 font-bold text-[10px] text-slate-700 uppercase">
                    {p.version}
                  </span>
                </td>
                <td className="px-4 py-3.5 text-center">
                  <button
                    type="button"
                    onClick={() => togglePageStatus(p.id, p.isActive)}
                    className="inline-flex items-center gap-1 text-xs transition"
                  >
                    {p.isActive ? (
                      <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                        <CheckCircle2 className="size-3.5" />
                        Ativa
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-slate-400 font-medium">
                        <XCircle className="size-3.5" />
                        Pausada
                      </span>
                    )}
                  </button>
                </td>
                <td className="px-5 py-3.5 text-right">
                  <Link
                    href={`/insights/paginas/${p.id}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700 hover:underline"
                  >
                    <Flame className="size-3.5" />
                    Heatmap
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal de Cadastro de Página */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900">
              Cadastrar Nova Landing Page
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Preencha os dados da página para começar o monitoramento e gerar o identificador.
            </p>

            {errorMessage && (
              <div className="mt-3 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 font-medium">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleCreatePage} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nome da Landing Page *
                </label>
                <input
                  type="text"
                  placeholder="Ex: Extensivo Residência 2026"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-slate-900 focus:border-brand-500 focus:bg-white focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  URL da Landing Page *
                </label>
                <input
                  type="url"
                  placeholder="https://grupomedcof.com.br/extensivo-2026"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-slate-900 focus:border-brand-500 focus:bg-white focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Business Unit
                  </label>
                  <select
                    value={newBuId}
                    onChange={(e) => setNewBuId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800 focus:border-brand-500 focus:outline-none"
                  >
                    <option value="">Selecione uma BU...</option>
                    {businessUnits.map((bu) => (
                      <option key={bu.id} value={bu.id}>
                        {bu.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Versão
                  </label>
                  <input
                    type="text"
                    placeholder="v1"
                    value={newVersion}
                    onChange={(e) => setNewVersion(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-slate-900 focus:border-brand-500 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-brand-600 px-4 py-2 font-semibold text-white shadow hover:bg-brand-700 transition disabled:opacity-50"
                >
                  {isSubmitting ? "Salvando..." : "Cadastrar Página"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
