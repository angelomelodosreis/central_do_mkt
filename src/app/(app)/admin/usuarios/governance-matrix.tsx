"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import {
  Shield,
  ShieldAlert,
  Users,
  Building2,
  CheckCircle2,
  HelpCircle,
  ChevronRight,
  ChevronDown,
  Sparkles,
  Search,
  ExternalLink,
  Plus,
  Trash2,
  ArrowRight,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";

import {
  toggleDirectScopeAction,
  updateUserRoleAction,
  toggleSuperAdminAction,
} from "./governance-actions";
import { Badge, RoleBadge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/field";
import {
  USER_ROLES,
  USER_ROLE_LABELS,
  type ScopeType,
  type UserRole,
} from "@/lib/db/schema";
import type {
  GovernanceMatrixData,
  GovernanceUser,
} from "@/lib/modules/access/cascade";
import { cn } from "@/lib/utils/cn";
import { matchesSearch } from "@/lib/utils/text";

type ViewMode = "negocio" | "organizacao" | "raio_x";

export function GovernanceMatrix({ data }: { data: GovernanceMatrixData }) {
  const [viewMode, setViewMode] = useState<ViewMode>("negocio");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [selectedUserId, setSelectedUserId] = useState<string>(
    data.users[0]?.id ?? "",
  );
  const [expandedDivisions, setExpandedDivisions] = useState<
    Record<string, boolean>
  >({
    div_especialidades: true,
    div_formacao: true,
    div_revalidacao: true,
    sem_divisao: true,
  });

  const [isPending, startTransition] = useTransition();

  // Filtro de usuários para a matriz
  const filteredUsers = useMemo(() => {
    return data.users.filter((u) => {
      if (roleFilter && u.role !== roleFilter) return false;
      return matchesSearch(search, u.name, u.email, u.jobTitleName ?? "");
    });
  }, [data.users, search, roleFilter]);

  const selectedUser = useMemo(
    () => data.users.find((u) => u.id === selectedUserId),
    [data.users, selectedUserId],
  );

  function toggleDivision(id: string) {
    setExpandedDivisions((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function handleToggleScope(
    userId: string,
    scopeType: ScopeType,
    scopeId: string | null,
    targetName: string,
  ) {
    startTransition(async () => {
      const res = await toggleDirectScopeAction(userId, scopeType, scopeId);
      if (res.ok) {
        toast.success(res.message ?? "Escopo atualizado com sucesso.");
      } else {
        toast.error(res.message ?? "Erro ao alterar escopo.");
      }
    });
  }

  function handleRoleChange(userId: string, newRole: UserRole) {
    startTransition(async () => {
      const res = await updateUserRoleAction(userId, newRole);
      if (res.ok) {
        toast.success(res.message ?? "Papel alterado com sucesso.");
      } else {
        toast.error(res.message ?? "Erro ao alterar papel.");
      }
    });
  }

  function handleToggleSuperAdmin(userId: string) {
    startTransition(async () => {
      const res = await toggleSuperAdminAction(userId);
      if (res.ok) {
        toast.success(res.message ?? "Super Admin alterado.");
      } else {
        toast.error(res.message ?? "Erro ao alterar Super Admin.");
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* ── PAINEL DE INDICADORES DE RISCO E GOVERNANÇA ──────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Usuários Ativos
            </span>
            <Users className="size-4 text-slate-400" />
          </div>
          <p className="mt-2 font-display text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
            {data.stats.activeUsers}
            <span className="ml-1 text-xs font-normal text-slate-500">
              de {data.stats.totalUsers} total
            </span>
          </p>
          {data.stats.pendingUsers > 0 ? (
            <p className="mt-1 text-xs font-medium text-amber-600">
              {data.stats.pendingUsers} aguardando aprovação
            </p>
          ) : (
            <p className="mt-1 text-xs text-slate-400">
              Todos os cadastros aprovados
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Usuários Órfãos
            </span>
            <ShieldAlert className="size-4 text-amber-500" />
          </div>
          <p className="mt-2 font-display text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
            {data.stats.orphanedUsers}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {data.stats.orphanedUsers > 0
              ? "Sem nenhum escopo ou squad atribuído"
              : "Nenhum usuário ativo sem alocação"}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">
              BUs Descobertas
            </span>
            <Building2 className="size-4 text-slate-400" />
          </div>
          <p className="mt-2 font-display text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
            {data.stats.orphanBus}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {data.stats.orphanBus > 0
              ? "BUs sem nenhum líder ou responsável direto"
              : "Todas as BUs têm cobertura de liderança"}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Divisões de Negócio
            </span>
            <Shield className="size-4 text-brand-600" />
          </div>
          <p className="mt-2 font-display text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
            {data.divisions.length}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Cascata ativa para 22 Business Units
          </p>
        </div>
      </div>

      {/* ── BARRA DE CONTROLE E VISUALIZAÇÕES ─────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Seletor de Modo */}
        <div className="inline-flex rounded-xl bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setViewMode("negocio")}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
              viewMode === "negocio"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900",
            )}
          >
            🏢 Cascata de Negócio (BUs)
          </button>
          <button
            type="button"
            onClick={() => setViewMode("organizacao")}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
              viewMode === "organizacao"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900",
            )}
          >
            🌳 Áreas & Times
          </button>
          <button
            type="button"
            onClick={() => setViewMode("raio_x")}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
              viewMode === "raio_x"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900",
            )}
          >
            🔍 Raio-X por Usuário
          </button>
        </div>

        {/* Filtros da Matriz */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px]">
            <Search className="absolute left-2.5 top-2.5 size-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filtrar usuário…"
              className="w-full rounded-xl border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs text-slate-900 focus:border-brand-500 focus:outline-none"
            />
          </div>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:border-brand-500 focus:outline-none"
          >
            <option value="">Todos os papéis</option>
            {USER_ROLES.map((r) => (
              <option key={r} value={r}>
                {USER_ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── MODO 1: CASCATA DE NEGÓCIO (DIVISÕES & BUSINESS UNITS) ─────────────── */}
      {viewMode === "negocio" && (
        <Card className="overflow-hidden">
          <CardHeader
            title="Matriz de Negócio: Quem Controla Quais Business Units"
            description="Visão bidirecional: confira os papéis no topo e os alcances diretos ou herdados em cascata para cada BU."
          />
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80">
                  <th className="sticky left-0 z-20 min-w-[240px] bg-slate-50 px-4 py-3 font-semibold text-slate-700">
                    Divisão / Business Unit
                  </th>
                  {filteredUsers.map((user) => (
                    <th
                      key={user.id}
                      className="min-w-[130px] border-l border-slate-200 px-3 py-2 text-center"
                    >
                      <div className="flex flex-col items-center">
                        <Link
                          href={`/admin/usuarios/${user.id}`}
                          className="font-medium text-slate-900 hover:text-brand-600 hover:underline"
                        >
                          {user.name.split(" ")[0]}
                        </Link>
                        <div className="mt-1 flex items-center gap-1">
                          <RoleBadge role={user.role} />
                          {user.isSuperAdmin && (
                            <span
                              title="Super Administrador (Acesso Global)"
                              className="inline-flex items-center rounded bg-brand-100 px-1 py-0.5 text-[10px] font-bold text-brand-800"
                            >
                              SA
                            </span>
                          )}
                        </div>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.divisions.map((div) => {
                  const isExpanded = expandedDivisions[div.id] ?? true;
                  return (
                    <tr key={div.id} className="group">
                      <td colSpan={filteredUsers.length + 1} className="p-0">
                        {/* Linha da Divisão Pai */}
                        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-100/70 px-4 py-2 font-semibold text-slate-800">
                          <button
                            type="button"
                            onClick={() => toggleDivision(div.id)}
                            className="flex items-center gap-1.5 hover:text-brand-700"
                          >
                            {isExpanded ? (
                              <ChevronDown className="size-4 text-slate-500" />
                            ) : (
                              <ChevronRight className="size-4 text-slate-500" />
                            )}
                            <span>{div.name}</span>
                            <span className="text-xs font-normal text-slate-500">
                              ({div.units.length} BUs)
                            </span>
                          </button>
                          <span className="text-[11px] text-slate-500">
                            Escopo sobre a divisão herda para todas as suas BUs
                          </span>
                        </div>

                        {/* Tabela das BUs da Divisão */}
                        {isExpanded && (
                          <div className="divide-y divide-slate-100">
                            {div.units.map((bu) => (
                              <div
                                key={bu.id}
                                className="flex items-center hover:bg-slate-50/70"
                              >
                                <div className="sticky left-0 z-10 min-w-[240px] bg-white px-4 py-2.5">
                                  <Link
                                    href={`/planejamento/${bu.slug}`}
                                    className="font-medium text-slate-900 hover:text-brand-600"
                                  >
                                    {bu.label}
                                  </Link>
                                </div>

                                {filteredUsers.map((user) => {
                                  const isDirect = user.directBuIds.includes(
                                    bu.id,
                                  );
                                  const isInherited =
                                    user.inheritedBuIds.includes(bu.id);
                                  const isLead = user.leadBuIds.includes(bu.id);
                                  const isMember = user.memberBuIds.includes(
                                    bu.id,
                                  );
                                  const hasAccess =
                                    user.isSuperAdmin ||
                                    user.isOrganizationWide ||
                                    isDirect ||
                                    isInherited;

                                  return (
                                    <div
                                      key={user.id}
                                      className="min-w-[130px] flex-1 border-l border-slate-100 px-3 py-2 text-center"
                                    >
                                      {user.isSuperAdmin ? (
                                        <span
                                          title="Super Admin: Acesso total irrestrito"
                                          className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-2 py-0.5 text-[11px] font-medium text-purple-700"
                                        >
                                          <Shield className="size-3" />
                                          Total
                                        </span>
                                      ) : isDirect ? (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleToggleScope(
                                              user.id,
                                              "business_unit",
                                              bu.id,
                                              bu.label,
                                            )
                                          }
                                          title="Concessão direta nesta BU. Clique para revogar."
                                          className="group/btn inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 transition hover:bg-red-50 hover:text-red-700"
                                        >
                                          <CheckCircle2 className="size-3 text-emerald-600 group-hover/btn:hidden" />
                                          <Trash2 className="hidden size-3 text-red-600 group-hover/btn:inline" />
                                          <span>Direto</span>
                                        </button>
                                      ) : isInherited ? (
                                        <span
                                          title="Acesso herdado em cascata da Divisão ou Organização."
                                          className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700"
                                        >
                                          <Sparkles className="size-3" />
                                          Cascata
                                        </span>
                                      ) : isLead ? (
                                        <span
                                          title="Líder do Squad da BU"
                                          className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700"
                                        >
                                          ⭐ Líder
                                        </span>
                                      ) : isMember ? (
                                        <span
                                          title="Membro do Squad"
                                          className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600"
                                        >
                                          Squad
                                        </span>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleToggleScope(
                                              user.id,
                                              "business_unit",
                                              bu.id,
                                              bu.label,
                                            )
                                          }
                                          title={`Conceder acesso direto de ${bu.label} para ${user.name}`}
                                          className="inline-flex items-center justify-center rounded-md p-1 text-slate-300 transition hover:bg-slate-100 hover:text-slate-700"
                                        >
                                          <Plus className="size-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ── MODO 2: CASCATA ORGANIZACIONAL (ÁREAS & TIMES) ────────────────────── */}
      {viewMode === "organizacao" && (
        <Card className="overflow-hidden">
          <CardHeader
            title="Matriz Organizacional: Áreas, Subáreas e Times"
            description="Conceder escopo a uma Subárea (ex.: Conteúdo) delega tarefas e responsabilidade em cascata para todos os seus times abaixo."
          />
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="sticky left-0 z-20 min-w-[260px] bg-slate-50 px-4 py-3 font-semibold text-slate-700">
                    Estrutura Organizacional
                  </th>
                  {filteredUsers.map((user) => (
                    <th
                      key={user.id}
                      className="min-w-[130px] border-l border-slate-200 px-3 py-2 text-center"
                    >
                      <span className="font-medium text-slate-900">
                        {user.name.split(" ")[0]}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.areas.map((area) => (
                  <tr key={area.id}>
                    <td colSpan={filteredUsers.length + 1} className="p-0">
                      {/* Área Raiz */}
                      <div className="border-b border-slate-200 bg-slate-100/70 px-4 py-2 font-bold text-slate-900">
                        Área: {area.name}
                      </div>

                      {/* Subáreas e Times */}
                      <div className="divide-y divide-slate-100">
                        {area.subareas.map((subarea) => (
                          <div key={subarea.id}>
                            <div className="flex items-center bg-slate-50/50 px-6 py-2 font-semibold text-slate-700">
                              ↳ Subárea: {subarea.name}
                            </div>
                            {subarea.teams.map((team) => (
                              <div
                                key={team.id}
                                className="flex items-center hover:bg-slate-50"
                              >
                                <div className="sticky left-0 z-10 min-w-[260px] bg-white py-2 pl-10 pr-4 text-slate-700">
                                  • {team.name}
                                </div>
                                {filteredUsers.map((user) => {
                                  const isMember = user.memberTeamIds.includes(
                                    team.id,
                                  );
                                  const isInherited =
                                    user.inheritedTeamIds.includes(team.id);
                                  const isDirect =
                                    user.directOrgUnitIds.includes(team.id);

                                  return (
                                    <div
                                      key={user.id}
                                      className="min-w-[130px] flex-1 border-l border-slate-100 px-3 py-1.5 text-center"
                                    >
                                      {user.isSuperAdmin ? (
                                        <span className="text-purple-600 font-medium">
                                          Total
                                        </span>
                                      ) : isDirect ? (
                                        <span className="rounded bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700">
                                          Gestor
                                        </span>
                                      ) : isInherited ? (
                                        <span className="rounded bg-blue-50 px-2 py-0.5 font-medium text-blue-700">
                                          Cascata
                                        </span>
                                      ) : isMember ? (
                                        <span className="rounded bg-slate-100 px-2 py-0.5 text-slate-700">
                                          Membro
                                        </span>
                                      ) : (
                                        <span className="text-slate-300">
                                          -
                                        </span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            ))}
                          </div>
                        ))}

                        {/* Times diretos da área */}
                        {area.directTeams.map((team) => (
                          <div
                            key={team.id}
                            className="flex items-center hover:bg-slate-50"
                          >
                            <div className="sticky left-0 z-10 min-w-[260px] bg-white py-2 pl-8 pr-4 text-slate-700">
                              • {team.name}
                            </div>
                            {filteredUsers.map((user) => {
                              const isMember = user.memberTeamIds.includes(
                                team.id,
                              );
                              return (
                                <div
                                  key={user.id}
                                  className="min-w-[130px] flex-1 border-l border-slate-100 px-3 py-1.5 text-center"
                                >
                                  {isMember ? (
                                    <span className="rounded bg-slate-100 px-2 py-0.5 text-slate-700">
                                      Membro
                                    </span>
                                  ) : (
                                    <span className="text-slate-300">-</span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ── MODO 3: SIMULADOR DE RAIO-X POR USUÁRIO ───────────────────────────── */}
      {viewMode === "raio_x" && selectedUser && (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Coluna da Esquerda: Ficha Rápida do Usuário */}
          <div className="space-y-4 lg:col-span-1">
            <Card>
              <CardHeader
                title="Usuário Selecionado"
                description="Escolha quem você quer auditar para ver o cálculo da cascata em tempo real."
              />
              <CardBody className="space-y-4">
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white p-2 text-sm font-medium text-slate-900 focus:border-brand-500 focus:outline-none"
                >
                  {data.users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({USER_ROLE_LABELS[u.role]})
                    </option>
                  ))}
                </select>

                <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Status</span>
                    <StatusBadge status={selectedUser.status} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Papel Atual</span>
                    <RoleBadge role={selectedUser.role} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Super Admin</span>
                    <span className="text-xs font-semibold">
                      {selectedUser.isSuperAdmin ? "Sim 🛡️" : "Não"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Cargo</span>
                    <span className="text-xs font-medium text-slate-800">
                      {selectedUser.jobTitleName ?? "Não definido"}
                    </span>
                  </div>
                </div>

                {/* Ações Rápidas do Usuário */}
                <div className="space-y-2 pt-2">
                  <p className="text-xs font-semibold uppercase text-slate-500">
                    Ações Rápidas
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {USER_ROLES.map((role) => (
                      <button
                        key={role}
                        type="button"
                        onClick={() => handleRoleChange(selectedUser.id, role)}
                        disabled={selectedUser.role === role}
                        className={cn(
                          "rounded-lg border px-2 py-1.5 text-xs font-medium transition",
                          selectedUser.role === role
                            ? "border-brand-600 bg-brand-50 text-brand-700"
                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                        )}
                      >
                        {USER_ROLE_LABELS[role]}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggleSuperAdmin(selectedUser.id)}
                    className={cn(
                      "mt-2 w-full rounded-lg border py-2 text-xs font-medium transition",
                      selectedUser.isSuperAdmin
                        ? "border-purple-300 bg-purple-50 text-purple-700 hover:bg-purple-100"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                    )}
                  >
                    {selectedUser.isSuperAdmin
                      ? "Revogar Super Admin"
                      : "Promover a Super Admin"}
                  </button>

                  <Link
                    href={`/admin/usuarios/${selectedUser.id}`}
                    className="mt-3 flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
                  >
                    <span>Abrir Ficha Completa</span>
                    <ExternalLink className="size-3.5" />
                  </Link>
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Coluna da Direita: Mapa Visual da Cascata de Acessos */}
          <div className="space-y-4 lg:col-span-2">
            <Card>
              <CardHeader
                title={`Mapa de Alcance Efetivo: ${selectedUser.name}`}
                description="Veja como cada permissão chega a este usuário: por concessão direta, herança de divisão ou liderança de squad."
              />
              <CardBody className="space-y-4">
                {selectedUser.isSuperAdmin ? (
                  <div className="rounded-xl border border-purple-200 bg-purple-50/70 p-4 text-purple-900">
                    <div className="flex items-center gap-2 font-semibold">
                      <Shield className="size-5 text-purple-700" />
                      <span>Privilégio de Super Administrador</span>
                    </div>
                    <p className="mt-1 text-xs text-purple-700">
                      Este usuário possui acesso irrestrito a todas as Business
                      Units, tarefas, produtos e módulos administrativos da
                      MedCof.
                    </p>
                  </div>
                ) : null}

                {/* Divisões e BUs Alcançadas */}
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Business Units e Divisões
                  </h4>

                  <div className="space-y-2">
                    {data.divisions.map((div) => {
                      const hasDivAccess =
                        selectedUser.directDivisionIds.includes(div.id);
                      return (
                        <div
                          key={div.id}
                          className="rounded-xl border border-slate-200 bg-white p-3 shadow-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-800">
                              {div.name}
                            </span>
                            {hasDivAccess ? (
                              <Badge tone="brand">Divisão Concedida</Badge>
                            ) : (
                              <span className="text-xs text-slate-400">
                                Sem escopo na divisão
                              </span>
                            )}
                          </div>

                          {/* BUs filhas */}
                          <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
                            {div.units.map((bu) => {
                              const isDirect =
                                selectedUser.directBuIds.includes(bu.id);
                              const isInherited =
                                hasDivAccess ||
                                selectedUser.isSuperAdmin ||
                                selectedUser.inheritedBuIds.includes(bu.id);
                              const isLead = selectedUser.leadBuIds.includes(
                                bu.id,
                              );

                              return (
                                <div
                                  key={bu.id}
                                  className={cn(
                                    "flex items-center justify-between rounded-lg border px-3 py-2 text-xs",
                                    isDirect
                                      ? "border-emerald-300 bg-emerald-50/60 text-emerald-900"
                                      : isInherited
                                        ? "border-blue-200 bg-blue-50/60 text-blue-900"
                                        : isLead
                                          ? "border-amber-200 bg-amber-50/60 text-amber-900"
                                          : "border-slate-100 bg-slate-50/50 text-slate-500",
                                  )}
                                >
                                  <span className="font-medium">
                                    {bu.label}
                                  </span>
                                  <span>
                                    {isDirect
                                      ? "🟢 Direto"
                                      : isInherited
                                        ? "🔵 Cascata"
                                        : isLead
                                          ? "⭐ Líder"
                                          : "⚪ Fora"}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
