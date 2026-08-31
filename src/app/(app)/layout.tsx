import type { ReactNode } from "react";

import { Nav, type NavItem } from "@/components/layout/nav";
import { TestModeBanner } from "@/components/layout/test-mode-banner";
import { ROLE_LABELS } from "@/components/ui/badge";
import { can, isPlatformAdmin, requireUser } from "@/lib/auth/session";
import { describePositions } from "@/lib/modules/org/people";
import { countMyOpenTasks } from "@/lib/modules/tasks/queries";

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

  // A contagem da fila é lida no menu porque é o aviso que faz a pessoa voltar:
  // sem número visível, a tarefa delegada depende de alguém lembrar de abrir a
  // tela.
  const { total: minhasTarefas } = can(currentUser, "tasks")
    ? await countMyOpenTasks(currentUser)
    : { total: 0 };

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
        minhasTarefas > 0 ? `${minhasTarefas} na sua fila` : "Sua fila",
      icon: "tasks",
      badge: minhasTarefas > 0 ? minhasTarefas : undefined,
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

  // Parâmetros deixou de existir como menu: tinha uma única área, e ela
  // pertence ao Gerador de Nomes — quem cria um modelo é quem acabou de
  // descobrir que falta um formato. A permissão continua separando quem USA o
  // gerador de quem DEFINE os modelos.

  if (isPlatformAdmin(currentUser) || can(currentUser, "admin")) {
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
    </div>
  );
}
