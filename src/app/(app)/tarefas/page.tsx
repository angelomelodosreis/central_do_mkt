import type { Metadata } from "next";
import { eq, sql } from "drizzle-orm";

import { TasksWorkspace } from "./tasks-workspace";
import type { TaskRowData } from "./task-row";
import { PageHeader } from "@/components/ui/card";
import { can, requirePermission } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { businessUnit, planningReviewItem } from "@/lib/db/schema";
import { seesEverything } from "@/lib/modules/access/scope";
import { listUserNotifications } from "@/lib/modules/notifications/queries";
import { listAccessibleBusinessUnits } from "@/lib/modules/org/scope";
import { listOrgUnits } from "@/lib/modules/org/queries";
import { materializeRecurrences } from "@/lib/modules/tasks/recurrence";
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

  // As ocorrências vencidas nascem ANTES da leitura das listas: sem isto, a
  // tarefa da semana só apareceria na segunda visita à tela.
  await materializeRecurrences();

  const [paraMim, deleguei, todas, historico, people, teams, units, notifications] =
    await Promise.all([
      listMyTasks(currentUser),
      // Com as encerradas: acompanhar o que foi delegado precisa mostrar o fim
      // da história, não só o que ainda está aberto.
      listTasksIDelegated(currentUser, { includeClosed: true }),
      podeVerTodas ? listAllTasks(currentUser) : Promise.resolve([]),
      listClosedTasks(currentUser),
      // Lista de pessoas sempre disponível para que o criador de uma tarefa possa gerir o destino
      listAssignableUsers(),
      listOrgUnits(),
      listAccessibleBusinessUnits(currentUser),
      listUserNotifications(currentUser.id, 40),
    ]);

  /**
   * Integra acompanhamentos e follow-ups de planejamento pendentes da pessoa
   * para que subam diretamente na visualização "Para mim".
   */
  const db = await getDb();
  const userEmail = currentUser.email?.trim().toLowerCase();
  const userName = currentUser.name?.trim().toLowerCase();

  const openFollowUps = await db
    .select({
      item: planningReviewItem,
      bu: {
        id: businessUnit.id,
        label: businessUnit.label,
        slug: businessUnit.slug,
      },
    })
    .from(planningReviewItem)
    .innerJoin(businessUnit, eq(planningReviewItem.businessUnitId, businessUnit.id))
    .where(sql`${planningReviewItem.status} != 'concluido'`);

  const myFollowUps = openFollowUps.filter((r) => {
    if (userEmail && r.item.assigneeEmail?.toLowerCase() === userEmail) return true;
    if (userName && r.item.assigneeName.toLowerCase() === userName) return true;
    return false;
  });

  const existingTitles = new Set(paraMim.map((p) => p.title.toLowerCase()));
  const followUpRows: TaskRowData[] = myFollowUps
    .filter(
      (f) =>
        !existingTitles.has(
          `follow-up ${f.bu.label.toLowerCase()}: ${f.item.details.slice(0, 40).toLowerCase()}`,
        ),
    )
    .map((f) => {
      const firstLine = f.item.details.split("\n")[0]?.replace(/^[-*•]\s*/, "").trim() || "Acompanhamento";
      return {
        id: f.item.id,
        title: `[Acompanhamento ${f.bu.label}] ${firstLine}`,
        description: f.item.details,
        status: (f.item.status === "em_andamento"
          ? "in_progress"
          : f.item.status === "pendente"
            ? "blocked"
            : "todo") as any,
        priority: f.item.priority === "alta" ? "high" : "normal",
        dueDate: f.item.followUpDate ? f.item.followUpDate.toISOString() : null,
        blockedReason: null,
        assigneeId: currentUser.id,
        assigneeName: f.item.assigneeName,
        assignedTeamName: null,
        businessUnitLabel: f.bu.label,
        businessUnitSlug: f.bu.slug,
        createdByName: f.item.coordinatorName,
        createdAt: f.item.createdAt.toISOString(),
        recorrente: false,
        relation: {
          isAssignee: true,
          isDelegator: f.item.createdBy === currentUser.id || podeDelegar,
          canClaim: false,
        },
      };
    });

  const toRow = (item: TaskListItem): TaskRowData => ({
    id: item.id,
    title: item.title,
    description: item.description,
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
    recorrente: item.recurrenceId !== null,
    relation: relationFor(currentUser, item, { canDelegate: podeDelegar }),
  });

  const allParaMim = [...paraMim.map(toRow), ...followUpRows];

  const times = currentUser.positions
    .map((position) => position.teamName)
    .join(", ");

  return (
    <>
      <PageHeader
        title="Tarefas"
        description={
          times
            ? `Sua fila, acompanhamentos e a de ${times}.`
            : "Sua fila de trabalho e acompanhamentos de planejamento."
        }
      />

      <TasksWorkspace
        paraMim={allParaMim}
        deleguei={deleguei.map(toRow)}
        todas={todas.map(toRow)}
        historico={historico.map(toRow)}
        notifications={notifications}
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
