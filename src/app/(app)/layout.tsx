import type { ReactNode } from "react";

import { eq } from "drizzle-orm";

import { CommandPalette } from "@/components/layout/command-palette";
import { Nav, type NavItem } from "@/components/layout/nav";
import { OnboardingModal } from "@/components/layout/onboarding-modal";
import { RouteLoadingIndicator } from "@/components/layout/route-loading-indicator";
import { TestModeBanner } from "@/components/layout/test-mode-banner";
import { ROLE_LABELS } from "@/components/ui/badge";
import { can, isPlatformAdmin, requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { jobTitle } from "@/lib/db/schema";
import { listBusinessUnits } from "@/lib/modules/bases/queries";
import { isFullAccessMaster } from "@/lib/modules/access/scope";
import { describePositions } from "@/lib/modules/org/people";
import { listOrgUnits } from "@/lib/modules/org/queries";
import { countAllPendingForUser } from "@/lib/modules/notifications/queries";

/**
 * Toda rota deste grupo lê a sessão do request, então nenhuma pode ser
 * pré-renderizada no build. Declarar aqui, no portão único, e não página por
 * página: sem isso o `next build` tenta gerar as rotas que esqueceram de
 * declarar (era o caso de /admin) e falha ao montar o auth fora
 * de um request.
 */
export const dynamic = "force-dynamic";

/**
 * Portão único de todas as rotas autenticadas.
 *
 * `requireUser()` redireciona quem não está logado, quem ainda aguarda
 * aprovação e quem está suspenso — e revalida isso a cada request.
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const currentUser = await requireUser();

  // Verifica se o usuário precisa do popup de configuração inicial (onboarding)
  // Ativado para quem ainda está sem cargo, sem time ou sem BU vinculada
  const isMaster = isFullAccessMaster(currentUser);
  const isMissingCargo = !currentUser.jobTitleId;
  const isMissingTeam = currentUser.positions.length === 0;
  const isMissingBU = currentUser.scope.squadBusinessUnitIds.size === 0;
  const needsOnboarding =
    !isMaster && (isMissingCargo || isMissingTeam || isMissingBU);

  let onboardingData = null;
  if (needsOnboarding) {
    const db = await getDb();
    const [orgUnits, bus, activeJobTitles] = await Promise.all([
      listOrgUnits(),
      listBusinessUnits({ includeInactive: false }),
      db
        .select({
          id: jobTitle.id,
          name: jobTitle.name,
        })
        .from(jobTitle)
        .where(eq(jobTitle.isActive, true)),
    ]);

    onboardingData = {
      jobTitleName: currentUser.jobTitleName,
      initialJobTitleId: currentUser.jobTitleId,
      availableJobTitles: activeJobTitles.sort((a, b) =>
        a.name.localeCompare(b.name, "pt-BR"),
      ),
      availableTeams: orgUnits
        .filter((u) => u.isActive)
        .map((u) => ({
          id: u.id,
          name: u.name,
          path: u.path,
        })),
      businessUnits: bus.map((b) => ({
        id: b.id,
        label: b.label,
        code: b.code,
        slug: b.slug,
        divisionName: b.divisionName,
      })),
      initialTeamId: currentUser.positions[0]?.teamId ?? null,
      initialBuIds: Array.from(currentUser.scope.squadBusinessUnitIds),
      userName: currentUser.name,
    };
  }

  // A contagem da fila e notificações de menções/follow-ups é lida no menu:
  // o badge de destaque (vermelho vivo com contador) avisa a pessoa imediatamente
  // quando há tarefas atribuídas ou quando ela foi mencionada em uma thread.
  const { total: totalPendencias, notificacoesNaoLidas } = can(currentUser, "tasks")
    ? await countAllPendingForUser(currentUser)
    : { total: 0, notificacoesNaoLidas: 0 };

  const items: NavItem[] = [
    {
      href: "/painel",
      label: "Painel",
      description: "Visão geral",
      icon: "dashboard",
    },
    {
      href: "/panorama",
      label: "Panorama",
      description: "Cockpit Executivo & Vendas",
      icon: "panorama",
    },
  ];

  if (can(currentUser, "name_generator")) {
    items.push({
      href: "/gerador-de-nomes",
      label: "Gerador de Nomes",
      description: "Listas, tags e mais",
      icon: "generator",
    });
  }

  if (can(currentUser, "documentation")) {
    items.push({
      href: "/documentacao",
      label: "Documentação",
      description: "Processos e convenções",
      icon: "docs",
    });
  }

  // Personas saiu do menu: virou uma área dentro da Business Unit, junto com
  // calendário, produtos, metas e documentos. Quem trabalha numa BU trabalha nas
  // cinco coisas, e não "no módulo de personas".
  if (can(currentUser, "strategy")) {
    items.push({
      href: "/planejamento",
      label: "Planejamento",
      description: "O ano de cada BU",
      icon: "strategy",
    });
  }

  if (can(currentUser, "tasks")) {
    items.push({
      href: "/tarefas",
      label: "Tarefas",
      description:
        totalPendencias > 0
          ? `${totalPendencias} pendência${totalPendencias > 1 ? "s" : ""}${notificacoesNaoLidas > 0 ? ` (${notificacoesNaoLidas} nova${notificacoesNaoLidas > 1 ? "s" : ""})` : ""}`
          : "Sua fila",
      icon: "tasks",
      badge: totalPendencias > 0 ? totalPendencias : undefined,
    });
  }

  // Sem permissão de módulo: o organograma é a lista de quem é quem, a mesma
  // informação que já aparece no seletor de tarefas e no squad de cada BU.
  items.push({
    href: "/organograma",
    label: "Organograma",
    description: "Times, cargos e squads",
    icon: "org",
  });

  if (
    isPlatformAdmin(currentUser) ||
    can(currentUser, "admin") ||
    currentUser.role === "leader"
  ) {
    items.push({
      href: "/admin",
      label: "Administração",
      description:
        currentUser.role === "leader" && !isPlatformAdmin(currentUser)
          ? "Gestão de usuários"
          : "Acessos e auditoria",
      icon: "admin",
    });
  }

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <RouteLoadingIndicator />
      <TestModeBanner />
      <div className="flex min-h-full flex-1 flex-col lg:flex-row">
        <Nav
          items={items}
          user={{
            name: currentUser.name,
            email: currentUser.email,
            roleLabel: ROLE_LABELS[currentUser.role],
            jobTitle: describePositions(
              currentUser.positions,
              currentUser.jobTitleName,
            ),
          }}
        />
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
          <div className="mx-auto max-w-5xl">{children}</div>
        </main>
      </div>
      <CommandPalette />
      {onboardingData && (
        <OnboardingModal
          userName={onboardingData.userName}
          jobTitleName={onboardingData.jobTitleName}
          initialJobTitleId={onboardingData.initialJobTitleId}
          availableJobTitles={onboardingData.availableJobTitles}
          availableTeams={onboardingData.availableTeams}
          businessUnits={onboardingData.businessUnits}
          initialTeamId={onboardingData.initialTeamId}
          initialBuIds={onboardingData.initialBuIds}
        />
      )}
    </div>
  );
}
