"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock,
  KeyRound,
  Lock,
  Mail,
  Save,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  User,
  Users,
} from "lucide-react";

import { Avatar } from "@/components/org/person-card";
import { Badge, RoleBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { SignOutButton } from "@/components/layout/sign-out-button";
import { updateProfileNameAction } from "./actions";
import {
  BuSelectionBoard,
  type BuOption,
} from "@/app/(public)/aguardando-aprovacao/bu-selection-board";
import type { BuRequestItem } from "@/lib/modules/access/bu-requests";
import type { ScopedBusinessUnit } from "@/lib/modules/org/scope";
import type { UserRole } from "@/lib/db/schema";
import { formatDate } from "@/lib/utils/format";

export type ProfileData = {
  id: string;
  name: string;
  email: string;
  emailDomain: string;
  role: UserRole;
  roleLabel: string;
  jobTitleName: string | null;
  isSuperAdmin: boolean;
  twoFactorEnabled: boolean;
  twoFactorVerified: boolean;
  teams: Array<{ id: string; name: string }>;
  accessibleUnits: ScopedBusinessUnit[];
  allUnits: BuOption[];
  myRequests: BuRequestItem[];
};

export function ProfileEditor({ data }: { data: ProfileData }) {
  const [name, setName] = useState(data.name);
  const [isPending, startTransition] = useTransition();

  const accessibleUnitIds = new Set(data.accessibleUnits.map((u) => u.id));
  const otherUnits = data.allUnits.filter((u) => !accessibleUnitIds.has(u.id));
  const activePendingBuIds = data.myRequests
    .filter((r) => r.status === "pending")
    .map((r) => r.businessUnitId);

  function handleSaveName(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("O nome não pode ficar vazio.");
      return;
    }

    startTransition(async () => {
      const res = await updateProfileNameAction(name);
      if (res.success) {
        toast.success(res.message);
      } else {
        toast.error(res.message);
      }
    });
  }

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
                {data.teams.length > 0 &&
                  ` · ${data.teams.map((t) => t.name).join(", ")}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <SignOutButton className="text-xs" />
          </div>
        </div>

        {/* Formulário de Edição de Nome */}
        <form
          onSubmit={handleSaveName}
          className="mt-8 border-t border-slate-100 pt-6"
        >
          <h3 className="text-sm font-semibold text-slate-900">
            Editar Informações Básicas
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
                disabled={isPending || name.trim() === data.name}
                className="w-full gap-2 bg-brand-600 text-white hover:bg-brand-700"
              >
                <Save className="size-4" />
                {isPending ? "Salvando..." : "Salvar Nome"}
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

      {/* ── SEÇÃO 2: Minhas Business Units ── */}
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
              Frentes de negócio em que você possui acesso ao planejamento e
              calendários.
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
                Você pode solicitar acesso a qualquer uma das BUs abaixo para
                começar a colaborar.
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
                      {bu.isLead && <Badge tone="brand">Líder</Badge>}
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

      {/* ── SEÇÃO 3: Solicitar Acesso a Novas BUs ── */}
      {otherUnits.length > 0 && (
        <section aria-labelledby="request-board">
          <BuSelectionBoard
            businessUnits={otherUnits}
            initialRequestedIds={activePendingBuIds}
            isExistingMember={true}
          />
        </section>
      )}

      {/* Histórico de Solicitações do Usuário */}
      {data.myRequests.length > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
          <h3 className="text-base font-bold tracking-tight text-slate-900">
            Histórico das Suas Solicitações de BU
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Acompanhe o status dos seus pedidos de acesso.
          </p>

          <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">Business Unit</th>
                  <th className="px-4 py-2.5 font-semibold">Código</th>
                  <th className="px-4 py-2.5 font-semibold">Data</th>
                  <th className="px-4 py-2.5 font-semibold">Mensagem</th>
                  <th className="px-4 py-2.5 font-semibold text-right">
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
                    <td className="px-4 py-2.5 text-slate-600 max-w-xs truncate">
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

      {/* ── SEÇÃO 4: Segurança & Autenticação em 2 Etapas ── */}
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
            href="/segundo-fator/configurar"
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
