"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Building2,
  Check,
  Copy,
  ExternalLink,
  Layers,
  LayoutGrid,
  List,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export type BuDirectoryItem = {
  id: string;
  slug: string;
  code: string | null;
  label: string;
  description: string | null;
  divisionId: string | null;
  divisionName: string | null;
  isActive: boolean;
  leadName: string | null;
  pessoas: number;
  ciclos: number;
  itens: number;
  hasAccess: boolean;
  isLead: boolean;
};

export function BuDirectory({
  units,
  userAccessibleCount,
}: {
  units: BuDirectoryItem[];
  userAccessibleCount: number;
}) {
  const [search, setSearch] = useState("");
  const [selectedDivision, setSelectedDivision] = useState<string>("todas");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Extrai divisões únicas
  const divisions = Array.from(
    new Set(units.map((u) => u.divisionName).filter(Boolean)),
  ) as string[];

  const filtered = units.filter((bu) => {
    const term = search.toLowerCase().trim();
    const matchesTerm =
      !term ||
      bu.label.toLowerCase().includes(term) ||
      bu.slug.toLowerCase().includes(term) ||
      (bu.code && bu.code.toLowerCase().includes(term)) ||
      (bu.divisionName && bu.divisionName.toLowerCase().includes(term));

    const matchesDivision =
      selectedDivision === "todas" ||
      bu.divisionName === selectedDivision ||
      (selectedDivision === "sem_divisao" && !bu.divisionName);

    return matchesTerm && matchesDivision;
  });

  function copyCode(code: string) {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success(`Código copiado: ${code}`);
    setTimeout(() => setCopiedCode(null), 2000);
  }

  return (
    <div className="space-y-6">
      {/* Cards de Métricas / Visão Geral */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <p className="text-xs font-medium text-slate-500">
            Total de BUs Oficiais
          </p>
          <p className="mt-1 font-display text-2xl font-bold tracking-tight text-slate-900">
            {units.length}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-400">
            Catálogo padronizado
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <p className="text-xs font-medium text-slate-500">Seu Acesso Ativo</p>
          <p className="mt-1 font-display text-2xl font-bold tracking-tight text-brand-600">
            {userAccessibleCount}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-400">
            {userAccessibleCount === units.length
              ? "Acesso amplo / global"
              : `${Math.round((userAccessibleCount / units.length) * 100)}% das unidades`}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <p className="text-xs font-medium text-slate-500">
            Divisões de Negócio
          </p>
          <p className="mt-1 font-display text-2xl font-bold tracking-tight text-slate-900">
            {divisions.length}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-400">
            Agrupamentos estratégicos
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <p className="text-xs font-medium text-slate-500">
            Padrão Nomenclatura
          </p>
          <p className="mt-1 font-display text-base font-bold tracking-tight text-slate-900">
            MEDCOF_*
          </p>
          <p className="mt-0.5 text-[11px] text-slate-400">
            Chave estável CRM e Ads
          </p>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nome (ex: Pediatria) ou código (ex: MEDCOF_CIRURGIA)…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-slate-50/70 py-2 pl-9 pr-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Seletor de Divisão */}
          <select
            value={selectedDivision}
            onChange={(e) => setSelectedDivision(e.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50/70 px-2.5 py-2 text-xs font-medium text-slate-700 focus:border-brand-500 focus:bg-white focus:outline-none"
          >
            <option value="todas">Todas as Divisões ({units.length})</option>
            {divisions.map((div) => (
              <option key={div} value={div}>
                {div}
              </option>
            ))}
          </select>

          {/* Alternador Grid/Tabela */}
          <div className="flex rounded-lg border border-slate-200 bg-slate-100 p-0.5">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`rounded-md p-1.5 transition ${
                viewMode === "grid"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
              title="Visualização em Cartões"
            >
              <LayoutGrid className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`rounded-md p-1.5 transition ${
                viewMode === "table"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
              title="Visualização em Tabela"
            >
              <List className="size-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Conteúdo: Grid ou Tabela */}
      {viewMode === "grid" ? (
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((bu) => {
            const officialCode = bu.code ?? `MEDCOF_${bu.slug.toUpperCase()}`;
            const isCopied = copiedCode === officialCode;

            return (
              <div
                key={bu.id}
                className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-4.5 shadow-2xs transition hover:border-brand-300 hover:shadow-xs"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="truncate font-display text-base font-semibold tracking-tight text-slate-900 group-hover:text-brand-700">
                        {bu.label}
                      </h3>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {bu.divisionName ?? "Sem divisão vinculada"}
                      </p>
                    </div>

                    {bu.hasAccess ? (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-emerald-600/20">
                        <Check className="size-3 stroke-[2.5]" />
                        Seu acesso
                      </span>
                    ) : (
                      <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                        Sem acesso
                      </span>
                    )}
                  </div>

                  {/* Código Oficial com Cópia Rápida */}
                  <div className="mt-3.5 flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-1.5">
                    <code className="truncate font-mono text-xs font-semibold text-brand-700">
                      {officialCode}
                    </code>
                    <button
                      type="button"
                      onClick={() => copyCode(officialCode)}
                      title="Copiar código de nomenclatura"
                      className="ml-2 rounded p-1 text-slate-400 transition hover:bg-slate-200 hover:text-slate-700"
                    >
                      {isCopied ? (
                        <Check className="size-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="size-3.5" />
                      )}
                    </button>
                  </div>

                  {/* Metadados: Responsável e Equipe */}
                  <div className="mt-3 space-y-1 text-xs text-slate-600">
                    <div className="flex items-center gap-1.5 truncate">
                      <Users className="size-3.5 text-slate-400" />
                      <span>
                        {bu.leadName ? (
                          <>
                            Coordenação: <strong>{bu.leadName}</strong>
                          </>
                        ) : (
                          <span className="text-slate-400 italic">
                            Sem coordenador definido
                          </span>
                        )}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400">
                      {bu.ciclos > 0
                        ? `${bu.ciclos} ciclo(s) ativo(s) · ${bu.itens} eventos no calendário`
                        : "Nenhum ciclo cadastrado"}
                    </p>
                  </div>
                </div>

                {/* Ações */}
                <div className="mt-4 border-t border-slate-100 pt-3">
                  {bu.hasAccess ? (
                    <Link
                      href={`/planejamento/${bu.slug}`}
                      className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-slate-900 py-1.5 text-xs font-medium text-white transition hover:bg-brand-600"
                    >
                      <span>Abrir Planejamento</span>
                      <ExternalLink className="size-3" />
                    </Link>
                  ) : (
                    <Link
                      href="/perfil"
                      className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 hover:text-slate-900"
                    >
                      <span>Solicitar Acesso no Perfil</span>
                    </Link>
                  )}
                </div>
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="col-span-full py-12 text-center text-sm text-slate-500">
              Nenhuma Business Unit encontrada para os filtros selecionados.
            </div>
          )}
        </div>
      ) : (
        /* Tabela Detalhada */
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-2xs">
          <table className="w-full border-collapse text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50/80">
              <tr>
                <th className="px-4 py-3 font-semibold text-slate-700">
                  Business Unit
                </th>
                <th className="px-4 py-3 font-semibold text-slate-700">
                  Código Nomenclatura
                </th>
                <th className="px-4 py-3 font-semibold text-slate-700">
                  Divisão
                </th>
                <th className="px-4 py-3 font-semibold text-slate-700">
                  Responsável
                </th>
                <th className="px-4 py-3 font-semibold text-slate-700 text-center">
                  Status
                </th>
                <th className="px-4 py-3 font-semibold text-slate-700 text-right">
                  Ação
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((bu) => {
                const officialCode =
                  bu.code ?? `MEDCOF_${bu.slug.toUpperCase()}`;
                const isCopied = copiedCode === officialCode;

                return (
                  <tr key={bu.id} className="transition hover:bg-slate-50/70">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      <div className="flex items-center gap-2">
                        <span>{bu.label}</span>
                        {bu.isLead && <Badge tone="brand">Você responde</Badge>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-semibold text-brand-700">
                        <span>{officialCode}</span>
                        <button
                          type="button"
                          onClick={() => copyCode(officialCode)}
                          title="Copiar"
                          className="text-slate-400 hover:text-slate-700"
                        >
                          {isCopied ? (
                            <Check className="size-3 text-emerald-600" />
                          ) : (
                            <Copy className="size-3" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {bu.divisionName ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {bu.leadName ?? (
                        <span className="text-slate-400 italic">
                          Sem responsável
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {bu.hasAccess ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                          <Check className="size-2.5 stroke-[2.5]" />
                          Liberado
                        </span>
                      ) : (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">
                          Restrito
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {bu.hasAccess ? (
                        <Link
                          href={`/planejamento/${bu.slug}`}
                          className="font-medium text-brand-600 hover:text-brand-800 hover:underline"
                        >
                          Ver ciclo →
                        </Link>
                      ) : (
                        <Link
                          href="/perfil"
                          className="text-slate-500 hover:text-slate-800 hover:underline"
                        >
                          Solicitar
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
