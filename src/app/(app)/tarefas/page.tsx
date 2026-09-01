import type { Metadata } from "next";

import { TasksWorkspace } from "./tasks-workspace";
import type { TaskRowData } from "./task-row";
import { PageHeader } from "@/components/ui/card";
import { can, requirePermission } from "@/lib/auth/session";
import { seesEverything } from "@/lib/modules/access/scope";
import { listAccessibleBusinessUnits } from "@/lib/modules/org/scope";
import { listOrgUnits } from "@/lib/modules/org/queries";
import {
  listAllTasks,
  listAssignableUsers,
  listClosedTasks,
  listMyTasks,
  listTasksIDelegated,
  relationFor,
  type TaskListItem,
} from "@/lib/modules/tasks/queries";

export const metadata: Metadata = { title: "Tarefas" };
export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const currentUser = await requirePermission("tasks", "view");
  const podeDelegar = can(currentUser, "tasks", "edit");
  // "Todas" aparece para quem tem alcance sobre outras pessoas — pela
  // organização inteira ou por responder por alguma unidade.
  const podeVerTodas =
    seesEverything(currentUser.scope) || currentUser.scope.orgUnitIds.size > 0;

  const [paraMim, deleguei, todas, historico, people, teams, units] =
    await Promise.all([
      listMyTasks(currentUser),
      // Com as encerradas: acompanhar o que foi delegado precisa mostrar o fim
      // da história, não só o que ainda está aberto.
      listTasksIDelegated(currentUser, { includeClosed: true }),
      podeVerTodas ? listAllTasks(currentUser) : Promise.resolve([]),
      listClosedTasks(currentUser),
      // Só quem delega precisa da lista de gente; para os demais seria um
      // seletor que eles não podem usar.
      podeDelegar ? listAssignableUsers() : Promise.resolve([]),
      podeDelegar ? listOrgUnits() : Promise.resolve([]),
      listAccessibleBusinessUnits(currentUser),
    ]);

  /**
   * O relacionamento com cada tarefa é resolvido no SERVIDOR.
   *
   * A tela só desenha o que essa resposta permite — e o servidor revalida antes
   * de gravar. Enquanto a tela decidia por conta própria, "quem vê o botão de
   * concluir" e "quem pode concluir" eram duas respostas diferentes.
   */
  const toRow = (item: TaskListItem): TaskRowData => ({
    id: item.id,
    title: item.title,
    status: item.status,
    priority: item.priority,
    dueDate: item.dueDate?.toISOString() ?? null,
    blockedReason: item.blockedReason,
    assigneeId: item.assigneeId,
    assigneeName: item.assigneeName,
    assignedTeamName: item.assignedTeamName
      ? `time ${item.assignedTeamName}`
      : null,
    businessUnitLabel: item.businessUnitLabel,
    businessUnitSlug: item.businessUnitSlug,
    createdByName: item.createdByName,
    createdAt: item.createdAt.toISOString(),
    relation: relationFor(currentUser, item, { canDelegate: podeDelegar }),
  });

  const times = currentUser.positions
    .map((position) => position.teamName)
    .join(", ");

  return (
    <>
      <PageHeader
        title="Tarefas"
        description={
          times
            ? `Sua fila e a de ${times}.`
            : "Sua fila de trabalho. Peça a um administrador para te colocar num time e você passa a receber também as tarefas endereçadas a ele."
        }
      />

      <TasksWorkspace
        paraMim={paraMim.map(toRow)}
        deleguei={deleguei.map(toRow)}
        todas={todas.map(toRow)}
        historico={historico.map(toRow)}
        people={people}
        teams={teams
          .filter((unit) => unit.isActive)
          .map((unit) => ({
            id: unit.id,
            name: unit.name,
            depth: unit.depth,
            path: unit.path,
            totalMemberCount: unit.totalMemberCount,
          }))}
        businessUnits={units.map((unit) => ({
          id: unit.id,
          label: unit.label,
        }))}
        podeDelegar={podeDelegar}
        podeVerTodas={podeVerTodas}
        currentUserId={currentUser.id}
      />
    </>
  );
}
