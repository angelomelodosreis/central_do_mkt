import type { Metadata } from "next";
import Link from "next/link";
import { count, eq } from "drizzle-orm";
import { Bell } from "lucide-react";

import { TaskRow, type TaskRowData } from "../tarefas/task-row";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardHeader, EmptyState } from "@/components/ui/card";
import { OverviewChart } from "@/components/dashboard/overview-chart";
import { QuickActionCards } from "@/components/dashboard/quick-action-cards";
import { PillarsGrid } from "@/components/dashboard/pillars-grid";
import { ActivitySidebar } from "@/components/dashboard/activity-sidebar";
import { can, canManageUsers, requireUser } from "@/lib/auth/session";
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
    canManageUsers(currentUser)
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
      {/* Topbar moderna e limpa no estilo MedCof */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/70 pb-5">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-brand-600">
            Central do Marketing
          </span>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Olá, {firstName}
          </h1>
          <p className="mt-0.5 text-xs text-slate-500">
            {describePositions(
              currentUser.positions,
              currentUser.jobTitleName,
            ) ?? "Estratégia, Business Units e Execução em um só lugar."}
          </p>
        </div>

        {/* Notificação de Pendências de Aprovação & Atalho de Perfil */}
        <div className="flex items-center gap-3">
          {pendingUsers > 0 && (
            <Link
              href="/admin/usuarios"
              className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-900 shadow-2xs transition hover:bg-amber-100"
              title={`${pendingUsers} cadastros aguardando aprovação`}
            >
              <Bell className="size-3.5 text-amber-600" />
              <span>
                <strong>{plural(pendingUsers, "cadastro")}</strong> para aprovar
              </span>
              <span className="rounded-full bg-amber-500 px-1.5 py-0.2 text-[10px] font-bold text-white">
                {pendingUsers}
              </span>
            </Link>
          )}

          <Link
            href="/perfil"
            className="flex items-center gap-2 rounded-full border border-slate-200 bg-white p-1 pr-3 shadow-2xs hover:border-brand-300"
          >
            <span className="flex size-7 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
              {firstName.slice(0, 1).toUpperCase()}
            </span>
            <span className="text-xs font-medium text-slate-700">
              Meu Perfil
            </span>
          </Link>
        </div>
      </div>

      {/* Alerta de Acesso Negado */}
      {erro === "sem-permissao" && (
        <div
          role="alert"
          className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-2xs"
        >
          Você não tem permissão para acessar
          {deniedModuleLabel ? ` o módulo ${deniedModuleLabel}` : " essa área"}.
          Fale com um administrador se precisar desse acesso.
        </div>
      )}

      {/* Grid Principal do Dashboard: Área Central + Sidebar Direita */}
      <div className="grid gap-6 lg:grid-cols-[1fr_300px] xl:grid-cols-[1fr_340px]">
        {/* Coluna Esquerda: Overview Chart + Quick Cards + Pillars + Tarefas */}
        <div className="space-y-6">
          {/* Linha Superior: Overview Chart (Gráfico com Recharts) + QuickActionCards */}
          <div className="grid gap-5 md:grid-cols-[1fr_240px] xl:grid-cols-[1fr_260px]">
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

          {/* Linha Média: Grid de 3 Pilares com Métricas Vivas */}
          <PillarsGrid
            openTasksCount={tarefas.length}
            delayedTasksCount={atrasadas}
            busCount={minhasBus.length}
          />

          {/* Linha Inferior: Minhas Tarefas Recentes em Card Nativo */}
          {can(currentUser, "tasks") && (
            <Card className="rounded-2xl border-slate-200 shadow-2xs">
              <CardHeader
                title={
                  <span className="flex items-center gap-2">
                    <span>Minhas Tarefas</span>
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
                    ? `${atrasadas} ${atrasadas === 1 ? "está atrasada" : "estão atrasadas"}. Priorize as entregas pendentes.`
                    : "Sua fila de execução direta."
                }
                action={
                  <ButtonLink href="/tarefas" variant="ghost" size="sm">
                    Ver todas →
                  </ButtonLink>
                }
              />
              <CardBody className="px-0 py-0">
                {tarefas.length === 0 ? (
                  <EmptyState
                    variant="inline"
                    title="Nada pendente para você agora."
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

        {/* Coluna Direita: Sidebar de BUs & Equipe */}
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
