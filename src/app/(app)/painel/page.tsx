import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { count, eq } from "drizzle-orm";
import { Bell, TrendingUp, Zap, CheckCircle2 } from "lucide-react";

import { TaskRow, type TaskRowData } from "../tarefas/task-row";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardHeader, EmptyState } from "@/components/ui/card";
import { OverviewChart } from "@/components/dashboard/overview-chart";
import { QuickActionCards } from "@/components/dashboard/quick-action-cards";
import { ProjectionsBanner } from "@/components/dashboard/projections-banner";
import { ActivitySidebar } from "@/components/dashboard/activity-sidebar";
import { can, canManageUsers, requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { MODULE_LABELS, user } from "@/lib/db/schema";
import { describePositions } from "@/lib/modules/org/people";
import { listAccessibleBusinessUnits, seesAllBusinessUnits } from "@/lib/modules/org/scope";
import { listMyTasks, relationFor } from "@/lib/modules/tasks/queries";
import { getLiveDashboardData } from "@/lib/modules/sales/google-sheets-client";
import { DashboardBuFilter } from "@/components/sales/dashboard-bu-filter";
import { formatCurrency, formatCompactCurrency } from "@/lib/utils/format";
import { plural } from "@/lib/utils/text";

export const metadata: Metadata = { title: "Painel Principal | Central do Marketing" };
export const dynamic = "force-dynamic";

function ProjectionsBannerSkeleton() {
  return (
    <div className="rounded-[2rem] border border-slate-200/80 bg-white p-5 shadow-2xs sm:p-6 animate-pulse">
      <div className="flex flex-col gap-3 pb-5 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-2xl bg-slate-100" />
          <div className="space-y-1.5">
            <div className="h-4 w-48 rounded bg-slate-200" />
            <div className="h-3 w-64 rounded bg-slate-100" />
          </div>
        </div>
        <div className="h-8 w-44 rounded-xl bg-slate-100" />
      </div>

      <div className="grid grid-cols-1 gap-3 pt-5 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-3 w-24 rounded bg-slate-200" />
              <div className="h-4 w-12 rounded bg-slate-100" />
            </div>
            <div className="h-7 w-28 rounded bg-slate-200" />
            <div className="h-3 w-36 rounded bg-slate-100" />
            <div className="pt-3 border-t border-slate-100">
              <div className="h-2 w-full rounded-full bg-slate-100" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function OverviewChartSkeleton() {
  return (
    <div className="relative flex flex-col justify-between overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#180f1c] via-[#211324] to-[#120a15] p-6 text-white shadow-xl ring-1 ring-white/10 sm:p-7 animate-pulse">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1.5">
          <div className="h-5 w-52 rounded bg-white/10" />
          <div className="h-3 w-72 rounded bg-white/5" />
        </div>
        <div className="h-8 w-36 rounded-full bg-white/10" />
      </div>
      <div className="my-6 h-48 w-full rounded-xl bg-white/5" />
      <div className="grid grid-cols-1 gap-3 border-t border-white/10 pt-4 sm:grid-cols-3">
        <div className="h-20 rounded-2xl bg-white/5" />
        <div className="h-20 rounded-2xl bg-white/10" />
        <div className="h-20 rounded-2xl bg-white/5" />
      </div>
    </div>
  );
}

async function AsyncForecastBadge({
  targetBuCodes,
}: {
  targetBuCodes?: string[];
}) {
  try {
    const dashboardSales = await getLiveDashboardData({ targetBuCodes });
    const projectedFormatted = formatCompactCurrency(
      dashboardSales.projections.projectedMonthEndRevenue,
    );

    return (
      <Link
        href="/panorama"
        className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-2xs transition hover:border-slate-300 hover:text-slate-900"
        title={`Forecast ${dashboardSales.projections.monthLabel}: ${formatCurrency(dashboardSales.projections.projectedMonthEndRevenue)} (clique para abrir o Panorama)`}
      >
        <TrendingUp className="size-3.5 text-slate-500" />
        <span>
          Forecast {dashboardSales.projections.monthLabel}:{" "}
          <strong className="text-slate-900">{projectedFormatted}</strong>
        </span>
      </Link>
    );
  } catch {
    return (
      <Link
        href="/panorama"
        className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-2xs transition hover:border-slate-300 hover:text-slate-900"
      >
        <TrendingUp className="size-3.5 text-slate-500" />
        <span>Cockpit MoM</span>
      </Link>
    );
  }
}

async function AsyncProjectionsSection({
  targetBuCodes,
}: {
  targetBuCodes?: string[];
}) {
  const dashboardSales = await getLiveDashboardData({ targetBuCodes });
  return (
    <ProjectionsBanner
      projections={dashboardSales.projections}
      totalHistoricalRevenue={dashboardSales.liveSales.summary.totalRevenue}
      totalHistoricalSales={dashboardSales.liveSales.summary.totalSales}
      approvalRate={dashboardSales.liveSales.summary.approvalRate}
    />
  );
}

async function AsyncOverviewChartSection({
  targetBuCodes,
}: {
  targetBuCodes?: string[];
}) {
  const dashboardSales = await getLiveDashboardData({ targetBuCodes });
  const totalRevenueFormatted = formatCompactCurrency(
    dashboardSales.liveSales.summary.totalRevenue,
  );
  const projectedMonthEndFormatted = formatCompactCurrency(
    dashboardSales.projections.projectedMonthEndRevenue,
  );
  const overallAvgTicketFormatted = formatCurrency(
    dashboardSales.liveSales.summary.overallAverageTicket,
  );

  return (
    <OverviewChart
      monthlyData={dashboardSales.monthlyHistory}
      totalRevenueFormatted={totalRevenueFormatted}
      projectedMonthEndFormatted={projectedMonthEndFormatted}
      overallAvgTicketFormatted={overallAvgTicketFormatted}
      currentMonthName={dashboardSales.projections.monthLabel}
    />
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; modulo?: string; bu?: string }>;
}) {
  const currentUser = await requireUser();
  const { erro, modulo, bu } = await searchParams;

  const db = await getDb();

  // Carrega imediatamente os dados locais do banco de dados (tempo < 10ms)
  const [tarefas, minhasBus, pendentes, membros] =
    await Promise.all([
      can(currentUser, "tasks")
        ? listMyTasks(currentUser)
        : Promise.resolve([]),
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

  const isMaster = seesAllBusinessUnits(currentUser);

  // Determina o escopo de BUs para as métricas financeiras de vendas
  let effectiveBuCodes: string[] | undefined = undefined;
  let activeBuParam: string | null = null;

  if (bu && bu !== "all") {
    // Se o usuário selecionou uma BU específica no filtro
    const matched = minhasBus.find((u) => u.id === bu || u.slug === bu);
    if (isMaster || matched) {
      effectiveBuCodes = [matched?.slug || matched?.id || bu];
      activeBuParam = matched?.id || matched?.slug || bu;
    } else {
      // Tentativa de acessar BU fora do escopo: recua para suas BUs autorizadas
      effectiveBuCodes = minhasBus.length > 0 ? minhasBus.map((u) => u.slug || u.id) : ["__NONE__"];
    }
  } else if (!isMaster) {
    // Usuário não-master sem filtro explícito: limita por padrão apenas às suas BUs atribuídas
    effectiveBuCodes = minhasBus.length > 0 ? minhasBus.map((u) => u.slug || u.id) : ["__NONE__"];
  } else {
    // Master visualiza todas as 23 BUs consolidadas por padrão
    effectiveBuCodes = undefined;
  }

  const bus = minhasBus.filter((unit) => unit.isMember);
  const buParaMostrar = bus.length > 0 ? bus : minhasBus;
  const selectedUnit = activeBuParam
    ? minhasBus.find((u) => u.id === activeBuParam || u.slug === activeBuParam)
    : null;
  const primaryBuSlug = selectedUnit?.slug ?? buParaMostrar[0]?.slug ?? null;

  const firstName = currentUser.name.split(" ")[0] || currentUser.name;
  const deniedModuleLabel =
    modulo && modulo in MODULE_LABELS
      ? MODULE_LABELS[modulo as keyof typeof MODULE_LABELS]
      : null;

  const scopeKey = activeBuParam || (isMaster ? "all" : "scope");

  return (
    <div className="space-y-6">
      {/* Topbar moderna e limpa no estilo MedCof com status de sincronização imediata */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/70 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-brand-600">
              Central do Marketing · MedCof
            </span>
            <span
              className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200/80"
              title="Google Sheets conectado e sincronizado em tempo real"
            >
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Tempo Real Ativo
            </span>
          </div>
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

        {/* Notificação de Pendências de Aprovação, Status de Vendas & Perfil */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Badge de Projeção Rápida com Streaming */}
          <Suspense
            key={`badge_${scopeKey}`}
            fallback={
              <Link
                href="/panorama"
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-2xs"
                title="Abrir projeção de vendas no Panorama Executivo"
              >
                <TrendingUp className="size-3.5 text-slate-500" />
                <span>Forecast Outubro/2026</span>
              </Link>
            }
          >
            <AsyncForecastBadge targetBuCodes={effectiveBuCodes} />
          </Suspense>

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
            </Link>
          )}

          <Link
            href="/perfil"
            className="flex items-center gap-2 rounded-full border border-slate-200 bg-white p-1 pr-3 shadow-2xs hover:border-brand-300"
          >
            <span
              aria-hidden="true"
              className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white select-none"
            >
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

      {/* Seletor e Filtro de Business Units para escopo de Métricas */}
      <DashboardBuFilter
        accessibleUnits={minhasBus}
        activeBuCode={activeBuParam}
        isMaster={isMaster}
      />

      {/* Grid Principal do Dashboard: Área Central + Sidebar Direita */}
      <div className="grid gap-6 lg:grid-cols-[1fr_300px] xl:grid-cols-[1fr_340px]">
        {/* Coluna Esquerda: Projeções + Overview Chart Full Width + Cockpits + Tarefas */}
        <div className="space-y-6 min-w-0">
          {/* Linha 1: Radar de Projeções e Forecast do Mês via Suspense Streaming */}
          <Suspense key={`proj_${scopeKey}`} fallback={<ProjectionsBannerSkeleton />}>
            <AsyncProjectionsSection targetBuCodes={effectiveBuCodes} />
          </Suspense>

          {/* Linha 2: Tração Consolidada · Vendas & Projeções via Suspense Streaming */}
          <Suspense key={`chart_${scopeKey}`} fallback={<OverviewChartSkeleton />}>
            <AsyncOverviewChartSection targetBuCodes={effectiveBuCodes} />
          </Suspense>

          {/* Linha 3: Os 4 Cockpits Estratégicos da Central do Marketing (renderização imediata) */}
          <QuickActionCards
            tasksCount={tarefas.length}
            delayedCount={atrasadas}
            primaryBuSlug={primaryBuSlug}
            salesCount={51600}
            busCount={
              activeBuParam
                ? 1
                : isMaster
                  ? 23
                  : minhasBus.length || 1
            }
          />

          {/* Linha 4: Minhas Tarefas Recentes em Card Nativo */}
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
                  <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 text-xs text-slate-500">
                    <div className="flex items-center gap-3">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
                        <CheckCircle2 className="size-4" />
                      </span>
                      <div>
                        <p className="font-semibold text-slate-800">Fila 100% em dia</p>
                        <p className="text-[11px] text-slate-500">Nenhuma entrega pendente para você no momento.</p>
                      </div>
                    </div>
                    <Link
                      href="/tarefas"
                      className="text-xs font-semibold text-brand-600 hover:text-brand-800 transition"
                    >
                      Explorar quadro geral →
                    </Link>
                  </div>
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

        {/* Coluna Direita: Sidebar de BUs & Equipe (renderização imediata) */}
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
