import type { ReactNode } from "react";

import { Nav, type NavItem } from "@/components/layout/nav";
import { TestModeBanner } from "@/components/layout/test-mode-banner";
import { ROLE_LABELS } from "@/components/ui/badge";
import { can, requireUser } from "@/lib/auth/session";

/**
 * Toda rota deste grupo lê a sessão do request, então nenhuma pode ser
 * pré-renderizada no build. Declarar aqui, no portão único, e não página por
 * página: sem isso o `next build` tenta gerar as rotas que esqueceram de
 * declarar (era o caso de /admin e /parametros) e falha ao montar o auth fora
 * de um request.
 */
export const dynamic = "force-dynamic";

/**
 * Portão único de todas as rotas autenticadas.
 *
 * `requireUser()` redireciona quem não está logado, quem ainda aguarda
 * aprovação e quem está suspenso — e revalida isso a cada request.
 */
export default async function AppLayout({
  children,
}: {
  children: ReactNode;
}) {
  const currentUser = await requireUser();

  const items: NavItem[] = [
    {
      href: "/painel",
      label: "Painel",
      description: "Visão geral",
      icon: "dashboard",
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

  if (can(currentUser, "personas")) {
    items.push({
      href: "/personas",
      label: "Personas",
      description: "Quem são nossos públicos",
      icon: "personas",
    });
  }

  if (can(currentUser, "strategy")) {
    items.push({
      href: "/planejamento",
      label: "Planejamento",
      description: "Calendário e estratégia",
      icon: "strategy",
    });
  }

  if (can(currentUser, "parameters", "edit")) {
    items.push({
      href: "/parametros",
      label: "Parâmetros",
      description: "Modelos e regras",
      icon: "parameters",
    });
  }

  if (currentUser.role === "admin" || can(currentUser, "admin")) {
    items.push({
      href: "/admin",
      label: "Administração",
      description: "Acessos e auditoria",
      icon: "admin",
    });
  }

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <TestModeBanner />
      <div className="flex min-h-full flex-1 flex-col lg:flex-row">
        <Nav
          items={items}
          user={{
            name: currentUser.name,
            email: currentUser.email,
            roleLabel: ROLE_LABELS[currentUser.role],
          }}
        />
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
          <div className="mx-auto max-w-5xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
