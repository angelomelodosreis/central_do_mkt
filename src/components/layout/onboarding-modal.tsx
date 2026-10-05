"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Briefcase,
  Building2,
  Check,
  CheckCircle2,
  Lock,
  Search,
  Sparkles,
  Users,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { saveUserOnboardingSetupAction } from "@/app/(app)/onboarding-actions";

export type OnboardingTeam = {
  id: string;
  name: string;
  path?: string;
};

export type OnboardingBU = {
  id: string;
  label: string;
  code: string | null;
  slug: string;
  divisionName?: string | null;
};

export function OnboardingModal({
  userName,
  jobTitleName,
  availableTeams,
  businessUnits,
  initialTeamId,
  initialBuIds,
}: {
  userName: string;
  jobTitleName?: string | null;
  availableTeams: OnboardingTeam[];
  businessUnits: OnboardingBU[];
  initialTeamId?: string | null;
  initialBuIds?: string[];
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [teamId, setTeamId] = useState<string>(initialTeamId ?? "");
  const [selectedBuIds, setSelectedBuIds] = useState<string[]>(
    initialBuIds ?? [],
  );
  const [buSearch, setBuSearch] = useState("");
  const [isPending, startTransition] = useTransition();

  // Verifica se o usuário já dispensou nesta aba/sessão
  useEffect(() => {
    const isDismissed = sessionStorage.getItem(
      "medcof_onboarding_dismissed_session",
    );
    if (!isDismissed) {
      setIsOpen(true);
    }
  }, []);

  // Bloqueio de scroll do body quando o modal está aberto
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  function handleDismiss() {
    sessionStorage.setItem("medcof_onboarding_dismissed_session", "true");
    setIsOpen(false);
  }

  function toggleBu(id: string) {
    setSelectedBuIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  }

  const filteredBUs = businessUnits.filter((bu) => {
    const term = buSearch.toLowerCase().trim();
    if (!term) return true;
    return (
      bu.label.toLowerCase().includes(term) ||
      bu.slug.toLowerCase().includes(term) ||
      (bu.code && bu.code.toLowerCase().includes(term)) ||
      (bu.divisionName && bu.divisionName.toLowerCase().includes(term))
    );
  });

  function handleToggleAllVisible() {
    const visibleIds = filteredBUs.map((b) => b.id);
    const allVisibleSelected = visibleIds.every((id) =>
      selectedBuIds.includes(id),
    );

    if (allVisibleSelected) {
      setSelectedBuIds((prev) =>
        prev.filter((id) => !visibleIds.includes(id)),
      );
    } else {
      setSelectedBuIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
    }
  }

  function handleSave() {
    if (!teamId && selectedBuIds.length === 0) {
      toast.error(
        "Por favor, selecione seu time ou ao menos uma Business Unit de atuação.",
      );
      return;
    }

    startTransition(async () => {
      const res = await saveUserOnboardingSetupAction({
        teamId: teamId || null,
        businessUnitIds: selectedBuIds,
      });

      if (res.success) {
        toast.success(res.message);
        setIsOpen(false);
        router.refresh();
      } else {
        toast.error(res.message);
      }
    });
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="relative flex max-h-[92vh] w-full max-w-2xl flex-col rounded-2xl border border-slate-200/90 bg-white shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Cabeçalho do Modal */}
        <div className="flex items-start justify-between border-b border-slate-100 bg-linear-to-r from-brand-50/70 via-white to-slate-50/50 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white shadow-xs">
              <Sparkles className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2
                  id="onboarding-title"
                  className="text-lg font-bold tracking-tight text-slate-900"
                >
                  Bem-vindo(a), {userName.split(" ")[0]}!
                </h2>
                <span className="rounded-full bg-brand-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-800">
                  Configuração Inicial
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-500">
                Escolha seu time no organograma e as Business Units que você vai
                acompanhar como leitor.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Fechar"
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Corpo com Rolagem */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Informação de Cargo (Somente Leitura - Definido por Admins) */}
          <div className="flex items-center justify-between rounded-xl border border-slate-200/90 bg-slate-50/70 p-3 text-xs">
            <div className="flex items-center gap-2.5">
              <Briefcase className="size-4 text-slate-500" />
              <div>
                <span className="font-semibold text-slate-700">Cargo Oficial:</span>{" "}
                <span className="font-bold text-slate-900">
                  {jobTitleName ?? "Aguardando atribuição da gestão"}
                </span>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
              <Lock className="size-3" />
              Definido por Administradores
            </span>
          </div>

          {/* Seção 1: Time / Área no Organograma */}
          <div>
            <div className="flex items-center gap-2">
              <Users className="size-4 text-brand-600" />
              <label
                htmlFor="onboarding-time"
                className="text-xs font-bold uppercase tracking-wider text-slate-700"
              >
                1. Qual é o seu Time ou Área de Atuação? *
              </label>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              Posiciona você automaticamente na estrutura visual do Organograma
              da Central.
            </p>
            <select
              id="onboarding-time"
              value={teamId}
              onChange={(e) => setTeamId(e.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-sm text-slate-900 transition focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            >
              <option value="">— Selecione seu time ou área —</option>
              {availableTeams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.path ? t.path : t.name}
                </option>
              ))}
            </select>
          </div>

          {/* Seção 2: Business Units e Squads */}
          <div>
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Building2 className="size-4 text-brand-600" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    2. Quais Business Units você vai atuar / acompanhar? *
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-slate-500">
                  Liberação imediata como <strong>Leitor</strong> para consultar
                  metas, campanhas e planejamento.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleToggleAllVisible}
                  className="h-7 text-[11px] text-slate-600 hover:text-slate-900"
                >
                  {filteredBUs.every((bu) => selectedBuIds.includes(bu.id)) &&
                  filteredBUs.length > 0
                    ? "Desmarcar visíveis"
                    : "Marcar todas visíveis"}
                </Button>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700">
                  {selectedBuIds.length} selecionadas
                </span>
              </div>
            </div>

            {/* Barra de Busca de BUs */}
            <div className="mt-3 relative">
              <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Filtrar por nome (ex: Cirurgia, Derma, Anest) ou código…"
                value={buSearch}
                onChange={(e) => setBuSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2 pl-9 pr-3 text-xs text-slate-800 transition placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>

            {/* Grid de BUs com Checkbox */}
            <div className="mt-2.5 grid max-h-56 grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
              {filteredBUs.map((bu) => {
                const isSelected = selectedBuIds.includes(bu.id);

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
                    className={`group flex cursor-pointer select-none items-center gap-2.5 rounded-xl border p-2.5 transition-all ${
                      isSelected
                        ? "border-brand-500 bg-brand-50/40 shadow-2xs ring-1 ring-brand-500/20"
                        : "border-slate-200/90 bg-white hover:border-slate-300 hover:bg-slate-50/60"
                    }`}
                  >
                    <div
                      className={`flex size-4 shrink-0 items-center justify-center rounded border transition-colors ${
                        isSelected
                          ? "border-brand-600 bg-brand-600 text-white"
                          : "border-slate-300 bg-white group-hover:border-slate-400"
                      }`}
                    >
                      {isSelected && <Check className="size-2.5 stroke-[3]" />}
                    </div>

                    <div className="min-w-0 flex-1">
                      <span
                        className={`block truncate text-xs font-semibold ${
                          isSelected ? "text-brand-950" : "text-slate-800"
                        }`}
                      >
                        {bu.label}
                      </span>
                      <div className="flex items-center gap-1 font-mono text-[9px] text-slate-400">
                        <span>{bu.code ?? `MEDCOF_${bu.slug.toUpperCase()}`}</span>
                        {bu.divisionName && <span>· {bu.divisionName}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}

              {filteredBUs.length === 0 && (
                <div className="col-span-full py-6 text-center text-xs text-slate-400">
                  Nenhuma BU encontrada para &ldquo;{buSearch}&rdquo;.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Rodapé do Modal */}
        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50/60 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="text-xs text-slate-500 hover:text-slate-800"
          >
            Preencher mais tarde
          </Button>

          <Button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="gap-2 bg-brand-600 text-white shadow-xs hover:bg-brand-700"
          >
            <CheckCircle2 className="size-4" />
            {isPending ? "Salvando..." : "Salvar e Liberar Acessos"}
          </Button>
        </div>
      </div>
    </div>
  );
}
