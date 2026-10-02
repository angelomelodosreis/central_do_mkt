"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Check, CheckCircle2, Search, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { requestBuAccessAction } from "./actions";

export type BuOption = {
  id: string;
  slug: string;
  code: string | null;
  label: string;
  divisionName?: string | null;
  isAlreadyRequested?: boolean;
  status?: "pending" | "approved" | "rejected";
};

export function BuSelectionBoard({
  businessUnits,
  initialRequestedIds = [],
  initialNote = "",
  isExistingMember = false,
}: {
  businessUnits: BuOption[];
  initialRequestedIds?: string[];
  initialNote?: string;
  isExistingMember?: boolean;
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>(initialRequestedIds);
  const [search, setSearch] = useState("");
  const [note, setNote] = useState(initialNote);
  const [isPending, startTransition] = useTransition();

  const filtered = businessUnits.filter((bu) => {
    const term = search.toLowerCase().trim();
    if (!term) return true;
    return (
      bu.label.toLowerCase().includes(term) ||
      bu.slug.toLowerCase().includes(term) ||
      (bu.code && bu.code.toLowerCase().includes(term)) ||
      (bu.divisionName && bu.divisionName.toLowerCase().includes(term))
    );
  });

  function toggleBu(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  }

  function handleSelectAll() {
    if (selectedIds.length === filtered.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map((bu) => bu.id));
    }
  }

  function handleSubmit() {
    if (selectedIds.length === 0) {
      toast.error(
        "Selecione ao menos uma Business Unit para solicitar acesso.",
      );
      return;
    }

    startTransition(async () => {
      const res = await requestBuAccessAction(selectedIds, note);
      if (res.success) {
        toast.success(res.message);
      } else {
        toast.error(res.message);
      }
    });
  }

  const hasChanges =
    selectedIds.length !== initialRequestedIds.length ||
    selectedIds.some((id) => !initialRequestedIds.includes(id)) ||
    note !== initialNote;

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold tracking-tight text-slate-900">
              {isExistingMember
                ? "Solicitar Acesso a Novas BUs"
                : "Selecione as Business Units de Atuação"}
            </h2>
            <span className="inline-flex items-center rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
              {businessUnits.length} BUs oficiais
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {isExistingMember
              ? "Escolha as frentes em que você precisa colaborar para solicitar autorização."
              : "Marque as BUs em que você vai atuar. O administrador concederá o acesso na aprovação."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleSelectAll}
            className="text-xs text-slate-600 hover:text-slate-900"
          >
            {selectedIds.length === filtered.length && filtered.length > 0
              ? "Desmarcar visíveis"
              : "Selecionar todas"}
          </Button>
          <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
            {selectedIds.length}{" "}
            {selectedIds.length === 1 ? "selecionada" : "selecionadas"}
          </div>
        </div>
      </div>

      {/* Barra de Busca */}
      <div className="mt-5 relative">
        <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Filtrar por nome (ex: Cirurgia) ou código (ex: MEDCOF_USA)…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2.5 pl-10 pr-4 text-sm text-slate-800 transition placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
          >
            Limpar
          </button>
        )}
      </div>

      {/* Grid de Cards de BUs */}
      <div className="mt-4 grid max-h-[380px] grid-cols-1 gap-2.5 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((bu) => {
          const isSelected = selectedIds.includes(bu.id);
          const wasPreviouslyRequested = initialRequestedIds.includes(bu.id);

          return (
            <div
              key={bu.id}
              role="checkbox"
              aria-checked={isSelected}
              tabIndex={0}
              onClick={() => toggleBu(bu.id)}
              onKeyDown={(e) => {
                if (e.key === " " || e.key === "Enter") {
                  e.preventDefault();
                  toggleBu(bu.id);
                }
              }}
              className={`group relative flex cursor-pointer select-none items-start gap-3 rounded-xl border p-3.5 transition-all ${
                isSelected
                  ? "border-brand-500 bg-brand-50/40 shadow-xs ring-1 ring-brand-500/30"
                  : "border-slate-200/90 bg-white hover:border-slate-300 hover:bg-slate-50/60"
              }`}
            >
              {/* Checkbox visual */}
              <div
                className={`mt-0.5 flex size-4.5 shrink-0 items-center justify-center rounded-md border transition-colors ${
                  isSelected
                    ? "border-brand-600 bg-brand-600 text-white"
                    : "border-slate-300 bg-white group-hover:border-slate-400"
                }`}
              >
                {isSelected && <Check className="size-3 stroke-[3]" />}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`truncate text-sm font-semibold tracking-tight ${
                      isSelected ? "text-brand-950" : "text-slate-800"
                    }`}
                  >
                    {bu.label}
                  </span>
                  {wasPreviouslyRequested && (
                    <span className="shrink-0 rounded-full bg-amber-100 px-1.5 py-0.2 text-[10px] font-medium text-amber-800">
                      Pendente
                    </span>
                  )}
                </div>

                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-medium text-slate-600">
                    {bu.code ?? `MEDCOF_${bu.slug.toUpperCase()}`}
                  </code>
                  {bu.divisionName && (
                    <span className="text-[11px] text-slate-400">
                      · {bu.divisionName}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="col-span-full py-8 text-center text-sm text-slate-500">
            Nenhuma Business Unit encontrada para &ldquo;{search}&rdquo;.
          </div>
        )}
      </div>

      {/* Mensagem / Justificativa Opcional */}
      <div className="mt-5 border-t border-slate-100 pt-4">
        <label
          htmlFor="request-note"
          className="block text-xs font-semibold uppercase tracking-wider text-slate-500"
        >
          Mensagem para a Administração (opcional)
        </label>
        <textarea
          id="request-note"
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Ex: Atuo como Designer responsável pelas campanhas de Cirurgia e Emergência..."
          className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 text-xs text-slate-800 transition placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        />
      </div>

      {/* Rodapé com Botão de Envio */}
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-slate-500">
          {initialRequestedIds.length > 0 ? (
            <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
              <CheckCircle2 className="size-3.5" />
              Solicitação salva. Você pode alterar as BUs a qualquer momento.
            </span>
          ) : (
            "Você pode selecionar uma ou várias BUs conforme seu escopo."
          )}
        </p>

        <Button
          type="button"
          onClick={handleSubmit}
          disabled={isPending || selectedIds.length === 0}
          className="gap-2 bg-brand-600 font-medium text-white shadow-xs hover:bg-brand-700"
        >
          <Sparkles className="size-4" />
          {isPending
            ? "Gravando solicitação..."
            : initialRequestedIds.length > 0
              ? "Atualizar BUs Solicitadas"
              : "Enviar Solicitação de Acesso"}
        </Button>
      </div>
    </div>
  );
}
