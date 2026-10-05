"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowRight,
  BookOpen,
  Briefcase,
  Building2,
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  KeyRound,
  Lock,
  Mail,
  Save,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  User,
  Users,
} from "lucide-react";

import { Avatar } from "@/components/org/person-card";
import { Badge, RoleBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SignOutButton } from "@/components/layout/sign-out-button";
import {
  updateProfileNameAction,
  updateUserPrimaryTeamAction,
  updateUserJobTitleAction,
  selfAssignReaderBUsAction,
} from "./actions";
import type { BuRequestItem } from "@/lib/modules/access/bu-requests";
import type { ScopedBusinessUnit } from "@/lib/modules/org/scope";
import type { UserRole } from "@/lib/db/schema";
import { formatDate } from "@/lib/utils/format";

export type AvailableTeam = {
  id: string;
  name: string;
  slug: string;
  kind: string;
  path: string;
  depth: number;
};

export type UserTeamInfo = {
  id: string;
  name: string;
  path?: string;
  isPrimary?: boolean;
  isLead?: boolean;
};

export type BuOption = {
  id: string;
  slug: string;
  code: string | null;
  label: string;
  divisionName?: string | null;
};

export type JobTitleOption = {
  id: string;
  name: string;
  sortOrder: number;
};

export type ProfileData = {
  id: string;
  name: string;
  email: string;
  emailDomain: string;
  role: UserRole;
  roleLabel: string;
  jobTitleId: string | null;
  jobTitleName: string | null;
  availableJobTitles: JobTitleOption[];
  isSuperAdmin: boolean;
  twoFactorEnabled: boolean;
  twoFactorVerified: boolean;
  primaryTeamId: string | null;
  teams: UserTeamInfo[];
  availableTeams: AvailableTeam[];
  accessibleUnits: ScopedBusinessUnit[];
  allUnits: BuOption[];
  myRequests: BuRequestItem[];
};

export function ProfileEditor({ data }: { data: ProfileData }) {
  // ── ESTADO: Nome ──
  const [name, setName] = useState(data.name);
  const [isPendingName, startNameTransition] = useTransition();

  // ── ESTADO: Cargo / Função ──
  const [selectedJobTitleId, setSelectedJobTitleId] = useState<string>(
    data.jobTitleId ?? "",
  );
  const [isPendingJobTitle, startJobTitleTransition] = useTransition();

  // ── ESTADO: Time / Área no Organograma ──
  const [selectedTeamId, setSelectedTeamId] = useState<string>(
    data.primaryTeamId ?? "",
  );
  const [isPendingTeam, startTeamTransition] = useTransition();

  // ── ESTADO: Seleção de BUs como Leitor ──
  const initialAccessibleIds = data.accessibleUnits.map((u) => u.id);
  const [selectedBuIds, setSelectedBuIds] =
    useState<string[]>(initialAccessibleIds);
  const [buSearch, setBuSearch] = useState("");
  const [isPendingBUs, startBuTransition] = useTransition();

  // Identifica BUs em que a pessoa é Líder de squad (essas não são removidas por auto-serviço de leitor)
  const leadBuIds = new Set(
    data.accessibleUnits.filter((u) => u.isLead).map((u) => u.id),
  );

  // ── Handlers ──
  function handleSaveName(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("O nome não pode ficar vazio.");
      return;
    }

    startNameTransition(async () => {
      const res = await updateProfileNameAction(name);
      if (res.success) {
        toast.success(res.message);
      } else {
        toast.error(res.message);
      }
    });
  }

  function handleSaveJobTitle(e: React.FormEvent) {
    e.preventDefault();
    startJobTitleTransition(async () => {
      const res = await updateUserJobTitleAction(
        selectedJobTitleId ? selectedJobTitleId : null,
      );
      if (res.success) {
        toast.success(res.message);
      } else {
        toast.error(res.message);
      }
    });
  }

  function handleSaveTeam(e: React.FormEvent) {
    e.preventDefault();
    startTeamTransition(async () => {
      const res = await updateUserPrimaryTeamAction(
        selectedTeamId ? selectedTeamId : null,
      );
      if (res.success) {
        toast.success(res.message);
      } else {
        toast.error(res.message);
      }
    });
  }

  function toggleBu(id: string) {
    // Se for líder nesta BU, não permite desmarcar para não perder o papel
    if (leadBuIds.has(id)) {
      toast.info("Você é Líder de Squad desta BU. O acesso é permanente.");
      return;
    }

    setSelectedBuIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  }

  const filteredBUs = data.allUnits.filter((bu) => {
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
      // Desmarca as visíveis, exceto as que o usuário é líder
      setSelectedBuIds((prev) =>
        prev.filter((id) => !visibleIds.includes(id) || leadBuIds.has(id)),
      );
    } else {
      // Marca todas as visíveis
      setSelectedBuIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
    }
  }

  function handleSaveBUs() {
    startBuTransition(async () => {
      const res = await selfAssignReaderBUsAction(selectedBuIds);
      if (res.success) {
        toast.success(res.message);
      } else {
        toast.error(res.message);
      }
    });
  }

  const hasJobTitleChanges = selectedJobTitleId !== (data.jobTitleId ?? "");
  const hasTeamChanges = selectedTeamId !== (data.primaryTeamId ?? "");
  const hasBuChanges =
    selectedBuIds.length !== initialAccessibleIds.length ||
    selectedBuIds.some((id) => !initialAccessibleIds.includes(id)) ||
    initialAccessibleIds.some((id) => !selectedBuIds.includes(id));

  const currentPrimaryTeam = data.availableTeams.find(
    (t) => t.id === (data.primaryTeamId ?? ""),
  );

  return (
    <div className="space-y-8">
      {/* ── SEÇÃO 1: Dados Pessoais & Cadastrais ── */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex shrink-0 items-center justify-center">
              <Avatar name={data.name} size="md" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight text-slate-900">
                  {data.name}
                </h2>
                <RoleBadge role={data.role} />
                {data.isSuperAdmin && (
                  <Badge tone="brand">Administrador Geral</Badge>
                )}
              </div>
              <p className="mt-1 text-sm text-slate-500">
                {data.jobTitleName ?? "Cargo não atribuído"}
                {currentPrimaryTeam && (
                  <span className="font-medium text-slate-700">
                    {" "}
                    · {currentPrimaryTeam.name}
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <SignOutButton className="text-xs" />
          </div>
        </div>

        {/* ── Bloco: Escolha de Cargo / Função (Organograma) ── */}
        <div className="mt-8 border-t border-slate-100 pt-6">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Briefcase className="size-4.5 text-brand-600" />
                <h3 className="text-sm font-semibold text-slate-900">
                  Meu Cargo / Função
                </h3>
                <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">
                  Organograma
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-500">
                Selecione seu cargo na MedCof (ex: Analista de Tráfego, Designer, Assistente, Copywriter, Coordenador...).
                Ele identifica sua atuação nas tarefas, relatórios e no organograma.
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveJobTitle} className="mt-4 max-w-2xl">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <label
                  htmlFor="user-cargo"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-500"
                >
                  Cargo Oficial
                </label>
                <select
                  id="user-cargo"
                  value={selectedJobTitleId}
                  onChange={(e) => setSelectedJobTitleId(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-sm text-slate-900 transition focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                >
                  <option value="">— Sem cargo definido —</option>
                  {data.availableJobTitles.map((cargo) => (
                    <option key={cargo.id} value={cargo.id}>
                      {cargo.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-end">
                <Button
                  type="submit"
                  disabled={isPendingJobTitle || !hasJobTitleChanges}
                  className="w-full gap-2 bg-brand-600 text-white hover:bg-brand-700"
                >
                  <Save className="size-4" />
                  {isPendingJobTitle ? "Salvando..." : "Salvar Cargo"}
                </Button>
              </div>
            </div>

            {data.jobTitleName && (
              <p className="mt-2 text-xs text-slate-500">
                Cargo atual:{" "}
                <span className="font-semibold text-slate-800">
                  {data.jobTitleName}
                </span>
              </p>
            )}
          </form>
        </div>

        {/* ── Bloco: Escolha de Time / Área de Atuação (Organograma) ── */}
        <div className="mt-8 border-t border-slate-100 pt-6">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Users className="size-4.5 text-brand-600" />
                <h3 className="text-sm font-semibold text-slate-900">
                  Meu Time / Área de Atuação (Organograma)
                </h3>
              </div>
              <p className="mt-0.5 text-xs text-slate-500">
                Selecione a qual time ou área de marketing você pertence. Você
                será posicionado automaticamente na estrutura visual do
                organograma.
              </p>
            </div>

            <Link
              href="/organograma"
              className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-brand-600 transition hover:text-brand-800"
            >
              <span>Ver Organograma</span>
              <ArrowRight className="size-3" />
            </Link>
          </div>

          <form onSubmit={handleSaveTeam} className="mt-4 max-w-2xl">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <label
                  htmlFor="user-team"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-500"
                >
                  Time ou Unidade Principal
                </label>
                <select
                  id="user-team"
                  value={selectedTeamId}
                  onChange={(e) => setSelectedTeamId(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-sm text-slate-900 transition focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                >
                  <option value="">— Sem time principal definido —</option>
                  {data.availableTeams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.path ? `${team.path}` : team.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-end">
                <Button
                  type="submit"
                  disabled={isPendingTeam || !hasTeamChanges}
                  className="w-full gap-2 bg-brand-600 text-white hover:bg-brand-700"
                >
                  <Save className="size-4" />
                  {isPendingTeam ? "Salvando..." : "Salvar Time"}
                </Button>
              </div>
            </div>

            {currentPrimaryTeam && (
              <p className="mt-2 text-xs text-slate-500">
                Posição atual:{" "}
                <span className="font-semibold text-slate-800">
                  {currentPrimaryTeam.path || currentPrimaryTeam.name}
                </span>
              </p>
            )}
          </form>
        </div>

        {/* ── Bloco: Edição de Nome ── */}
        <form
          onSubmit={handleSaveName}
          className="mt-6 border-t border-slate-100 pt-6"
        >
          <h3 className="text-sm font-semibold text-slate-900">
            Editar Nome de Exibição
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Seu nome é exibido no organograma, comentários, tarefas e auditorias
            da MedCof.
          </p>

          <div className="mt-4 grid max-w-xl gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label
                htmlFor="user-name"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-500"
              >
                Nome Completo
              </label>
              <input
                id="user-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-sm text-slate-900 transition focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>

            <div className="flex items-end">
              <Button
                type="submit"
                disabled={isPendingName || name.trim() === data.name}
                className="w-full gap-2 bg-brand-600 text-white hover:bg-brand-700"
              >
                <Save className="size-4" />
                {isPendingName ? "Salvando..." : "Salvar Nome"}
              </Button>
            </div>
          </div>

          {/* E-mail (Somente Leitura) */}
          <div className="mt-4 max-w-xl">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
              E-mail Institucional (Google Workspace)
            </label>
            <div className="mt-1.5 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-100/70 px-3.5 py-2 text-sm text-slate-600">
              <div className="flex items-center gap-2 truncate">
                <Mail className="size-4 text-slate-400" />
                <span className="truncate">{data.email}</span>
              </div>
              <span className="shrink-0 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                Domínio Autorizado
              </span>
            </div>
          </div>
        </form>
      </section>

      {/* ── SEÇÃO 2: Minhas Business Units Ativas ── */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Building2 className="size-5 text-brand-600" />
              <h2 className="text-lg font-bold tracking-tight text-slate-900">
                Minhas Business Units Ativas
              </h2>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              Frentes de negócio com acesso liberado para acompanhamento do
              planejamento e cronogramas.
            </p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
            {data.accessibleUnits.length}{" "}
            {data.accessibleUnits.length === 1 ? "BU" : "BUs"}
          </span>
        </div>

        <div className="mt-6">
          {data.accessibleUnits.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center">
              <Building2 className="mx-auto size-8 text-slate-300" />
              <p className="mt-2 text-sm font-semibold text-slate-800">
                Nenhuma Business Unit vinculada ainda
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Selecione as BUs desejadas abaixo no gerenciador de BUs para
                começar a acompanhar imediatamente como leitor.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {data.accessibleUnits.map((bu) => (
                <Link
                  key={bu.id}
                  href={`/planejamento/${bu.slug}`}
                  className="group flex flex-col justify-between rounded-xl border border-slate-200/90 bg-white p-4 transition hover:border-brand-300 hover:bg-slate-50/50 hover:shadow-2xs"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-semibold text-slate-900 group-hover:text-brand-700">
                        {bu.label}
                      </span>
                      {bu.isLead ? (
                        <Badge tone="brand">Líder</Badge>
                      ) : (
                        <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                          Leitor
                        </span>
                      )}
                    </div>

                    <div className="mt-2 flex items-center gap-1.5">
                      <code className="rounded bg-brand-50 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-brand-700">
                        {bu.slug
                          ? `MEDCOF_${bu.slug.toUpperCase()}`
                          : "MEDCOF_BU"}
                      </code>
                      {bu.divisionName && (
                        <span className="text-[11px] text-slate-400">
                          · {bu.divisionName}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-1 text-xs font-medium text-brand-600 group-hover:text-brand-800">
                    <span>Acessar Planejamento</span>
                    <ArrowRight className="size-3" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── SEÇÃO 3: Gerenciar Minhas BUs como Leitor (Auto-atribuição Imediata) ── */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <BookOpen className="size-5 text-brand-600" />
              <h2 className="text-lg font-bold tracking-tight text-slate-900">
                Gerenciar Minhas BUs de Leitor
              </h2>
              <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                Liberação Direta
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              Escolha as Business Units que você deseja acompanhar como{" "}
              <strong>Leitor</strong>. O acesso para visualizar metas,
              planejamento e cronogramas é liberado instantaneamente.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleToggleAllVisible}
              className="text-xs text-slate-600 hover:text-slate-900"
            >
              {filteredBUs.every((bu) => selectedBuIds.includes(bu.id)) &&
              filteredBUs.length > 0
                ? "Desmarcar visíveis"
                : "Selecionar todas visíveis"}
            </Button>
            <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              {selectedBuIds.length} de {data.allUnits.length} BUs
            </div>
          </div>
        </div>

        {/* Banner Informativo de Autonomia */}
        <div className="mt-4 rounded-xl border border-brand-100 bg-brand-50/60 p-3.5 text-xs text-brand-900">
          <p className="font-medium">
            💡 Como colaborador da MedCof, você tem autonomia para entrar ou
            sair do acompanhamento de qualquer BU a qualquer momento. Você terá
            permissão de <strong>visualização completa</strong> dos dados de
            estratégia, campanhas e personas.
          </p>
        </div>

        {/* Barra de Busca de BU */}
        <div className="mt-4 relative">
          <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Filtrar por nome (ex: Cirurgia, Derma, Anest) ou código…"
            value={buSearch}
            onChange={(e) => setBuSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2.5 pl-10 pr-4 text-sm text-slate-800 transition placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          />
          {buSearch && (
            <button
              type="button"
              onClick={() => setBuSearch("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
            >
              Limpar
            </button>
          )}
        </div>

        {/* Grid de Seleção de BUs */}
        <div className="mt-4 grid max-h-[420px] grid-cols-1 gap-2.5 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-3">
          {filteredBUs.map((bu) => {
            const isSelected = selectedBuIds.includes(bu.id);
            const isLead = leadBuIds.has(bu.id);

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
                  <div className="flex items-center justify-between gap-1.5">
                    <span
                      className={`truncate text-sm font-semibold tracking-tight ${
                        isSelected ? "text-brand-950" : "text-slate-800"
                      }`}
                    >
                      {bu.label}
                    </span>
                    {isLead && (
                      <span className="shrink-0 rounded-full bg-brand-100 px-1.5 py-0.2 text-[10px] font-semibold text-brand-800">
                        Líder de Squad
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

          {filteredBUs.length === 0 && (
            <div className="col-span-full py-8 text-center text-sm text-slate-500">
              Nenhuma Business Unit encontrada para &ldquo;{buSearch}&rdquo;.
            </div>
          )}
        </div>

        {/* Rodapé com Botão de Salvar BUs */}
        <div className="mt-6 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-500">
            {hasBuChanges ? (
              <span className="font-medium text-amber-700">
                Você tem alterações não salvas na sua lista de BUs.
              </span>
            ) : (
              <span>
                Suas BUs de leitor estão salvas e sincronizadas com seu acesso.
              </span>
            )}
          </p>

          <Button
            type="button"
            onClick={handleSaveBUs}
            disabled={isPendingBUs || !hasBuChanges}
            className="gap-2 bg-brand-600 font-medium text-white shadow-xs hover:bg-brand-700"
          >
            <CheckCircle2 className="size-4" />
            {isPendingBUs ? "Salvando acessos..." : "Salvar BUs como Leitor"}
          </Button>
        </div>
      </section>

      {/* ── SEÇÃO 4: Histórico das Solicitações Anteriores (se houver) ── */}
      {data.myRequests.length > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
          <h3 className="text-base font-bold tracking-tight text-slate-900">
            Histórico das Suas Solicitações
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Registro dos pedidos de acesso enviados anteriormente.
          </p>

          <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50/80 text-slate-600">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">Business Unit</th>
                  <th className="px-4 py-2.5 font-semibold">Código</th>
                  <th className="px-4 py-2.5 font-semibold">Data</th>
                  <th className="px-4 py-2.5 font-semibold">Mensagem</th>
                  <th className="px-4 py-2.5 text-right font-semibold">
                    Situação
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.myRequests.map((req) => (
                  <tr key={req.id}>
                    <td className="px-4 py-2.5 font-medium text-slate-900">
                      {req.businessUnitLabel}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-[11px] text-slate-600">
                      {req.businessUnitCode ??
                        `MEDCOF_${req.businessUnitSlug.toUpperCase()}`}
                    </td>
                    <td className="px-4 py-2.5 text-slate-500">
                      {formatDate(req.requestedAt)}
                    </td>
                    <td className="max-w-xs truncate px-4 py-2.5 text-slate-600">
                      {req.note ?? "—"}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {req.status === "approved" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                          <CheckCircle2 className="size-3" /> Aprovada
                        </span>
                      ) : req.status === "pending" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                          <Clock className="size-3" /> Pendente
                        </span>
                      ) : (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                          Recusada
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ── SEÇÃO 5: Segurança & Autenticação em 2 Etapas ── */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
        <div className="flex items-center gap-2">
          <KeyRound className="size-5 text-brand-600" />
          <h2 className="text-lg font-bold tracking-tight text-slate-900">
            Segurança e Autenticação
          </h2>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          Proteja sua conta corporativa com o segundo fator obrigatório do
          Google Authenticator.
        </p>

        <div className="mt-6 flex flex-col gap-4 rounded-xl border border-slate-200 bg-slate-50/50 p-4.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div
              className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${
                data.twoFactorVerified
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              {data.twoFactorVerified ? (
                <ShieldCheck className="size-5" />
              ) : (
                <ShieldAlert className="size-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-slate-900">
                  Autenticação em Duas Etapas (2FA)
                </span>
                {data.twoFactorVerified ? (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                    Ativo e Confirmado
                  </span>
                ) : (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                    Pendente de Configuração
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-slate-500">
                {data.twoFactorVerified
                  ? "Seu aplicativo autenticador está validado e protegendo os acessos a dados sensíveis."
                  : "Configure seu aplicativo autenticador para não ter seu acesso bloqueado nas áreas de estratégia."}
              </p>
            </div>
          </div>

          <Link
            href="/verificacao/cadastrar"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50 hover:text-slate-900"
          >
            <Shield className="size-3.5" />
            <span>Configurar 2FA</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
