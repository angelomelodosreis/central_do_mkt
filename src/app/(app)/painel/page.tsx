import type { Metadata } from "next";
import Link from "next/link";
import { count, eq } from "drizzle-orm";
import { Search, Bell, Sparkles } from "lucide-react";

import { TaskRow, type TaskRowData } from "../tarefas/task-row";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardHeader, EmptyState } from "@/components/ui/card";
import { OverviewChart } from "@/components/dashboard/overview-chart";
import { QuickActionCards } from "@/components/dashboard/quick-action-cards";
import { PillarsGrid } from "@/components/dashboard/pillars-grid";
import { ActivitySidebar } from "@/components/dashboard/activity-sidebar";
import { can, requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { MODULE_LABELS, user } from "@/lib/db/schema";
import { describePositions } from "@/lib/modules/org/people";
import { listAccessibleBusinessUnits } from "@/lib/modules/org/scope";
import { listMyTasks, relationFor } from "@/lib/modules/tasks/queries";
import { plural } from "@/lib/utils/text";

export const metadata: Metadata = { title: "Painel Principal" };
export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; modulo?: string }>;
}) {
  const currentUser = await requireUser();
  const { erro, modulo } = await searchParams;

  const db = await getDb();

  const [tarefas, minhasBus, pendentes, membros] = await Promise.all([
    can(currentUser, "tasks") ? listMyTasks(currentUser) : Promise.resolve([]),
    can(currentUser, "strategy")
      ? listAccessibleBusinessUnits(currentUser)
      : Promise.resolve([]),
    currentUser.role === "admin"
      ? db
          .select({ total: count() })
          .from(user)
          .where(eq(user.status, "pending"))
      : Promise.resolve([{ total: 0 }]),
    db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      })
      .from(user)
      .where(eq(user.status, "active"))
      .limit(10),
  ]);

  const pendingUsers = pendentes[0].total;
  const atrasadas = tarefas.filter(
    (item) => item.dueDate && item.dueDate.getTime() < Date.now(),
  ).length;

  const bus = minhasBus.filter((unit) => unit.isMember);
  const buParaMostrar = bus.length > 0 ? bus : minhasBus;
  const primaryBuSlug = buParaMostrar[0]?.slug ?? null;

  const firstName = currentUser.name.split(" ")[0] || currentUser.name;
  const deniedModuleLabel =
    modulo && modulo in MODULE_LABELS
      ? MODULE_LABELS[modulo as keyof typeof MODULE_LABELS]
      : null;

  return (
    <div className="space-y-6">
      {/* Topbar moderna (estilo Dashboard Header da imagem de referência) */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/60 pb-5">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-brand-600">
            Primary Dashboard
          </span>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Olá, {firstName}
          </h1>
          <p className="text-xs text-slate-500">
            {describePositions(
              currentUser.positions,
              currentUser.jobTitleName,
            ) ?? "Central do Marketing MedCof · Estratégia, BUs e Execução"}
          </p>
        </div>

        {/* Controles do Topbar: Barra de Busca Pílula + Perfil/Notificações */}
        <div className="flex items-center gap-3">
          <Link
            href="/planejamento"
            className="hidden items-center gap-2 rounded-full border border-slate-200/80 bg-slate-100/80 px-4 py-2 text-xs font-medium text-slate-600 shadow-inner hover:bg-slate-200/70 sm:flex"
          >
            <Search className="size-3.5 text-slate-400" />
            <span>Buscar no sistema…</span>
            <kbd className="rounded bg-white px-1.5 py-0.5 text-[10px] font-bold text-slate-400 shadow-2xs">
              Ctrl K
            </kbd>
          </Link>

          {/* Notificação de Pendências de Aprovação */}
          {pendingUsers > 0 && (
            <Link
              href="/admin/usuarios"
              className="relative flex size-10 items-center justify-center rounded-full bg-amber-50 text-amber-700 shadow-xs ring-1 ring-amber-200 transition hover:bg-amber-100"
              title={`${pendingUsers} cadastros aguardando aprovação`}
            >
              <Bell className="size-4" />
              <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">
                {pendingUsers}
              </span>
            </Link>
          )}

          {/* Avatar com Anel */}
          <Link
            href="/perfil"
            className="flex items-center gap-2.5 rounded-full border border-slate-200 bg-white p-1 pr-3 shadow-xs hover:border-brand-300"
          >
            <span className="flex size-8 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white shadow-2xs">
              {firstName.slice(0, 1).toUpperCase()}
            </span>
            <span className="hidden text-xs font-semibold text-slate-700 sm:inline">
              {firstName}
            </span>
          </Link>
        </div>
      </div>

      {/* Alerta de Acesso Negado */}
      {erro === "sem-permissao" && (
        <div
          role="alert"
          className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-xs"
        >
          Você não tem permissão para acessar
          {deniedModuleLabel ? ` o módulo ${deniedModuleLabel}` : " essa área"}.
          Fale com um administrador se precisar desse acesso.
        </div>
      )}

      {/* Grid Principal do Dashboard: Área Central + Sidebar Direita */}
      <div className="grid gap-6 lg:grid-cols-[1fr_320px] xl:grid-cols-[1fr_360px]">
        {/* Coluna Esquerda: Hero Overview + Quick Cards + Pillars + Tarefas */}
        <div className="space-y-6">
          {/* Linha Superior: Overview Chart (Gráfico fluido) + QuickActionCards */}
          <div className="grid gap-5 md:grid-cols-[1fr_240px] xl:grid-cols-[1fr_280px]">
            <OverviewChart
              totalHours="748 h"
              totalProduction="9.178"
              target="9.200"
            />
            <QuickActionCards
              tasksCount={tarefas.length}
              delayedCount={atrasadas}
              primaryBuSlug={primaryBuSlug}
            />
          </div>

          {/* Linha Média: Grid de 3 Pilares com Ícones Flutuantes Elevados */}
          <PillarsGrid
            openTasksCount={tarefas.length}
            delayedTasksCount={atrasadas}
            busCount={minhasBus.length}
          />

          {/* Linha Inferior: Minhas Tarefas Recentes em Card Tátil */}
          {can(currentUser, "tasks") && (
            <Card className="rounded-[2rem] border-slate-200/80 shadow-[0_12px_32px_-10px_rgba(15,23,42,0.05)]">
              <CardHeader
                title={
                  <span className="flex items-center gap-2">
                    <span>Fila Operacional Recente</span>
                    {tarefas.length > 0 && (
                      <Badge tone={atrasadas > 0 ? "danger" : "brand"}>
                        {tarefas.length}{" "}
                        {tarefas.length === 1 ? "tarefa" : "tarefas"}
                      </Badge>
                    )}
                  </span>
                }
                description={
                  atrasadas > 0
                    ? `${atrasadas} ${atrasadas === 1 ? "tarefa atrasada" : "tarefas atrasadas"}. Priorize entregas de hoje.`
                    : "Suas prioridades de execução da semana."
                }
                action={
                  <ButtonLink href="/tarefas" variant="ghost" size="sm">
                    Abrir gerenciador de tarefas →
                  </ButtonLink>
                }
              />
              <CardBody className="px-0 py-0">
                {tarefas.length === 0 ? (
                  <EmptyState
                    variant="inline"
                    title="Nenhuma tarefa pendente na sua fila."
                  />
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {tarefas.slice(0, 5).map((item) => (
                      <TaskRow
                        key={item.id}
                        destinos={[]}
                        task={
                          {
                            id: item.id,
                            title: item.title,
                            status: item.status,
                            priority: item.priority,
                            dueDate: item.dueDate?.toISOString() ?? null,
                            blockedReason: item.blockedReason,
                            assigneeId: item.assigneeId,
                            assigneeName: null,
                            assignedTeamName: item.assignedTeamName,
                            businessUnitLabel: item.businessUnitLabel,
                            businessUnitSlug: item.businessUnitSlug,
                            createdByName: item.createdByName,
                            createdAt: item.createdAt.toISOString(),
                            relation: relationFor(currentUser, item, {
                              canDelegate: false,
                            }),
                          } satisfies TaskRowData
                        }
                      />
                    ))}
                  </ul>
                )}
              </CardBody>
            </Card>
          )}
        </div>

        {/* Coluna Direita: Sidebar de BUs & Equipe + Cadência MedCof */}
        <div>
          <ActivitySidebar
            businessUnits={buParaMostrar.map((bu) => ({
              id: bu.id,
              slug: bu.slug,
              label: bu.label,
              isLead: bu.isLead,
            }))}
            members={membros.map((m) => ({
              id: m.id,
              name: m.name,
              email: m.email,
              jobTitle: null,
              roleLabel: m.role,
            }))}
          />
        </div>
      </div>
    </div>
  );
}
