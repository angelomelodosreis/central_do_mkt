"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

import type { TaskFormState } from "./form-state";
import { can, requirePermission, type CurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import {
  businessUnit,
  task,
  team,
  user,
  TASK_PRIORITIES,
  TASK_STATUSES,
  type Task,
  type TaskPriority,
  type TaskStatus,
} from "@/lib/db/schema";
import { writeAuditLog } from "@/lib/modules/audit/log";
import { relationFor } from "@/lib/modules/tasks/queries";
import { canTransition, managementActionsFor } from "@/lib/modules/tasks/state";
import { normalizeRichInput } from "@/lib/modules/documentation/rich-text";
import { fromDateInput } from "@/lib/modules/strategy/dates";
import { newId } from "@/lib/utils/id";

function field(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function revalidateTaskViews() {
  revalidatePath("/tarefas", "layout");
  revalidatePath("/painel");
  revalidatePath("/planejamento", "layout");
}

function isStatus(value: string): value is TaskStatus {
  return (TASK_STATUSES as readonly string[]).includes(value);
}

function isPriority(value: string): value is TaskPriority {
  return (TASK_PRIORITIES as readonly string[]).includes(value);
}

/**
 * Duas capacidades diferentes, e a distinção é o coração do módulo:
 *
 * - DELEGAR (`tasks.canEdit`) é passar trabalho para outra pessoa ou para um
 *   time. É o que a coordenação faz.
 * - MEXER NA PRÓPRIA TAREFA é responder a ela: mudar situação, assumir uma
 *   tarefa do time, anexar o resultado. Não exige permissão de módulo, porque
 *   exigi-la deixaria o analista sem como dar andamento ao que recebeu.
 *
 * Sem essa separação, ou todo mundo poderia delegar tarefa para qualquer um, ou
 * ninguém poderia concluir a própria.
 */
function podeDelegar(currentUser: CurrentUser): boolean {
  return can(currentUser, "tasks", "edit");
}

/** Como a pessoa se relaciona com esta tarefa. Fonte única, com a tela. */
function relacao(currentUser: CurrentUser, item: Task) {
  return relationFor(currentUser, item, {
    canDelegate: podeDelegar(currentUser),
  });
}

async function loadTask(taskId: string): Promise<Task | undefined> {
  const db = await getDb();
  return db.select().from(task).where(eq(task.id, taskId)).get();
}

/** Cria uma tarefa. */
export async function createTask(
  _previousState: TaskFormState,
  formData: FormData,
): Promise<TaskFormState> {
  const currentUser = await requirePermission("tasks", "view");

  const title = field(formData, "title");
  if (!title)
    return { status: "error", message: "Informe o que precisa ser feito." };

  const description = normalizeRichInput(
    String(formData.get("description") ?? ""),
  );
  const priorityRaw = field(formData, "priority") || "normal";
  const priority: TaskPriority = isPriority(priorityRaw)
    ? priorityRaw
    : "normal";

  const dueRaw = field(formData, "dueDate");
  const dueDate = dueRaw ? fromDateInput(dueRaw) : null;

  const businessUnitId = field(formData, "businessUnitId") || null;

  // Quem não delega só cria tarefa para si. Forçar aqui, e não recusar, é o
  // comportamento útil: a tela nem mostra o seletor para essas pessoas.
  const delegando = podeDelegar(currentUser);
  const assigneeIdRaw = field(formData, "assigneeId") || null;
  const assignedTeamIdRaw = field(formData, "assignedTeamId") || null;

  let assigneeId = delegando ? assigneeIdRaw : currentUser.id;
  let assignedTeamId = delegando ? assignedTeamIdRaw : null;

  // Pessoa e time são exclusivos: uma tarefa com os dois não teria dono nem
  // fila definida. Nome informado ganha, porque é a escolha mais específica.
  if (assigneeId && assignedTeamId) assignedTeamId = null;
  if (!assigneeId && !assignedTeamId) assigneeId = currentUser.id;

  const db = await getDb();

  const [pessoa, timeDestino, unidade] = await Promise.all([
    assigneeId
      ? db
          .select({ id: user.id, name: user.name, status: user.status })
          .from(user)
          .where(eq(user.id, assigneeId))
          .get()
      : undefined,
    assignedTeamId
      ? db
          .select({ id: team.id, name: team.name })
          .from(team)
          .where(eq(team.id, assignedTeamId))
          .get()
      : undefined,
    businessUnitId
      ? db
          .select({ id: businessUnit.id, label: businessUnit.label })
          .from(businessUnit)
          .where(eq(businessUnit.id, businessUnitId))
          .get()
      : undefined,
  ]);

  if (assigneeId && (!pessoa || pessoa.status !== "active")) {
    return {
      status: "error",
      message: "Essa pessoa não está ativa na plataforma.",
    };
  }
  if (assignedTeamId && !timeDestino) {
    return { status: "error", message: "Esse time não existe mais." };
  }

  const taskId = newId("tsk");
  const now = new Date();

  await db.insert(task).values({
    id: taskId,
    title,
    description,
    status: "todo",
    priority,
    dueDate,
    assigneeId,
    assignedTeamId,
    businessUnitId: unidade?.id ?? null,
    blockedReason: null,
    createdBy: currentUser.id,
    completedAt: null,
    createdAt: now,
    updatedAt: now,
  });

  const destino = pessoa?.name ?? timeDestino?.name ?? "você";

  await writeAuditLog({
    actorUserId: currentUser.id,
    actorEmail: currentUser.email,
    action: "task.create",
    entityType: "task",
    entityId: taskId,
    summary: `Criou a tarefa "${title}" para ${destino}`,
    afterData: {
      title,
      priority,
      assigneeId,
      assignedTeamId,
      businessUnitId: unidade?.id ?? null,
      dueDate: dueDate?.toISOString() ?? null,
    },
  });

  revalidateTaskViews();
  return { status: "success", message: `Tarefa criada para ${destino}.` };
}

/**
 * Muda a situação da tarefa.
 *
 * A transição é validada contra a máquina de estados, e não contra "a pessoa
 * pode mexer": eram coisas diferentes tratadas como uma só, e por isso quem
 * delegou conseguia marcar como concluído um trabalho que não fez — bastava o
 * POST, porque a tela era o único lugar que escondia o botão.
 */
export async function updateTaskStatus(formData: FormData): Promise<void> {
  const currentUser = await requirePermission("tasks", "view");

  const taskId = field(formData, "taskId");
  const statusRaw = field(formData, "status");
  if (!taskId || !isStatus(statusRaw)) return;

  const before = await loadTask(taskId);
  if (!before) return;

  const rel = relacao(currentUser, before);
  if (!canTransition(before.status, statusRaw, rel)) return;

  const blockedReason =
    statusRaw === "blocked" ? field(formData, "blockedReason") || null : null;

  const db = await getDb();
  await db
    .update(task)
    .set({
      status: statusRaw,
      blockedReason,
      // Concluída guarda a data: é o que permite saber depois quanto tempo a
      // tarefa levou, sem precisar cruzar a auditoria.
      completedAt: statusRaw === "done" ? new Date() : null,
      // Assumir uma tarefa do time é sair de "a fazer": quem mexe passa a ser o
      // dono, senão a tarefa segue aparecendo na fila de toda a unidade. Só
      // quando quem age é o executor — reabrir uma tarefa alheia não transfere
      // a execução para quem delegou.
      assigneeId:
        before.assigneeId ??
        (rel.isAssignee || rel.canClaim ? currentUser.id : null),
      updatedAt: new Date(),
    })
    .where(eq(task.id, taskId));

  await writeAuditLog({
    actorUserId: currentUser.id,
    actorEmail: currentUser.email,
    action: "task.status_change",
    entityType: "task",
    entityId: taskId,
    summary: `Mudou a tarefa "${before.title}" para ${statusRaw}`,
    beforeData: { status: before.status, blockedReason: before.blockedReason },
    afterData: { status: statusRaw, blockedReason },
  });

  revalidateTaskViews();
}

/**
 * Troca o responsável sem abrir o formulário inteiro.
 *
 * Redistribuir é a ação mais frequente de quem acompanha — alguém entrou de
 * férias, alguém ficou sobrecarregado — e é gestão, não execução: só quem
 * delegou faz.
 */
export async function reassignTask(formData: FormData): Promise<void> {
  const currentUser = await requirePermission("tasks", "view");

  const taskId = field(formData, "taskId");
  if (!taskId) return;

  const before = await loadTask(taskId);
  if (!before) return;

  const rel = relacao(currentUser, before);
  if (!managementActionsFor(before.status, rel).includes("reassign")) return;

  const destino = field(formData, "destino");
  const [tipo, id] = destino.split(":");
  if (!id) return;

  const db = await getDb();

  let assigneeId: string | null = null;
  let assignedTeamId: string | null = null;
  let nomeDoDestino = "";

  if (tipo === "user") {
    const pessoa = await db
      .select({ id: user.id, name: user.name, status: user.status })
      .from(user)
      .where(eq(user.id, id))
      .get();
    if (!pessoa || pessoa.status !== "active") return;
    assigneeId = pessoa.id;
    nomeDoDestino = pessoa.name;
  } else if (tipo === "team") {
    const unidade = await db
      .select({ id: team.id, name: team.name })
      .from(team)
      .where(eq(team.id, id))
      .get();
    if (!unidade) return;
    assignedTeamId = unidade.id;
    nomeDoDestino = `time ${unidade.name}`;
  } else {
    return;
  }

  await db
    .update(task)
    .set({ assigneeId, assignedTeamId, updatedAt: new Date() })
    .where(eq(task.id, taskId));

  await writeAuditLog({
    actorUserId: currentUser.id,
    actorEmail: currentUser.email,
    action: "task.update",
    entityType: "task",
    entityId: taskId,
    summary: `Passou a tarefa "${before.title}" para ${nomeDoDestino}`,
    beforeData: {
      assigneeId: before.assigneeId,
      assignedTeamId: before.assignedTeamId,
    },
    afterData: { assigneeId, assignedTeamId },
  });

  revalidateTaskViews();
}

/** Assume uma tarefa endereçada ao time. */
export async function claimTask(formData: FormData): Promise<void> {
  const currentUser = await requirePermission("tasks", "view");

  const taskId = field(formData, "taskId");
  if (!taskId) return;

  const before = await loadTask(taskId);
  if (!before) return;

  // Só faz sentido em tarefa de unidade sem dono, e só para quem é da unidade.
  const rel = relacao(currentUser, before);
  if (!rel.canClaim) return;

  const db = await getDb();
  await db
    .update(task)
    .set({
      assigneeId: currentUser.id,
      status: before.status === "todo" ? "in_progress" : before.status,
      updatedAt: new Date(),
    })
    .where(eq(task.id, taskId));

  await writeAuditLog({
    actorUserId: currentUser.id,
    actorEmail: currentUser.email,
    action: "task.update",
    entityType: "task",
    entityId: taskId,
    summary: `Assumiu a tarefa "${before.title}"`,
    beforeData: { assigneeId: before.assigneeId },
    afterData: { assigneeId: currentUser.id },
  });

  revalidateTaskViews();
}

/** Edita título, prazo, prioridade e destinatário. Só quem delega. */
export async function updateTask(
  _previousState: TaskFormState,
  formData: FormData,
): Promise<TaskFormState> {
  const currentUser = await requirePermission("tasks", "view");

  const taskId = field(formData, "taskId");
  if (!taskId) return { status: "error", message: "Tarefa não identificada." };

  const before = await loadTask(taskId);
  if (!before)
    return { status: "error", message: "Essa tarefa não existe mais." };

  // Editar é ato de gestão; quem só recebe tarefas não redistribui.
  const rel = relacao(currentUser, before);
  if (!managementActionsFor(before.status, rel).includes("edit")) {
    return {
      status: "error",
      message:
        "Só quem passou a tarefa pode alterá-la. Você pode mudar a situação dela.",
    };
  }

  const title = field(formData, "title");
  if (!title)
    return { status: "error", message: "Informe o que precisa ser feito." };

  const priorityRaw = field(formData, "priority") || before.priority;
  const priority: TaskPriority = isPriority(priorityRaw)
    ? priorityRaw
    : before.priority;

  const dueRaw = field(formData, "dueDate");
  const dueDate = dueRaw ? fromDateInput(dueRaw) : null;

  // O DESTINO não muda aqui: quem redistribui usa `reassignTask`.
  //
  // Enquanto esta action também gravava responsável e unidade, um formulário
  // que não enviasse os dois campos zerava os dois — e a tarefa ficava sem
  // dono e sem fila, sem erro nenhum aparecer.

  // Campo AUSENTE e campo VAZIO são coisas diferentes.
  //
  // O painel de edição rápida não manda descrição nem BU — e, lidos como
  // string vazia, os dois seriam apagados a cada correção de prazo. Só o que
  // veio no formulário é alterado.
  const description = formData.has("description")
    ? normalizeRichInput(String(formData.get("description") ?? ""))
    : before.description;
  const businessUnitId = formData.has("businessUnitId")
    ? field(formData, "businessUnitId") || null
    : before.businessUnitId;

  const db = await getDb();
  await db
    .update(task)
    .set({
      title,
      description,
      priority,
      dueDate,
      businessUnitId,
      updatedAt: new Date(),
    })
    .where(eq(task.id, taskId));

  await writeAuditLog({
    actorUserId: currentUser.id,
    actorEmail: currentUser.email,
    action: "task.update",
    entityType: "task",
    entityId: taskId,
    summary: `Editou a tarefa "${before.title}"`,
    beforeData: {
      title: before.title,
      priority: before.priority,
      dueDate: before.dueDate?.toISOString() ?? null,
      assigneeId: before.assigneeId,
      assignedTeamId: before.assignedTeamId,
      businessUnitId: before.businessUnitId,
      description: before.description,
    },
    afterData: {
      title,
      priority,
      dueDate: dueDate?.toISOString() ?? null,
      assigneeId: before.assigneeId,
      assignedTeamId: before.assignedTeamId,
      businessUnitId,
      description,
    },
  });

  revalidateTaskViews();
  return { status: "success", message: "Tarefa atualizada." };
}

/**
 * Exclui a tarefa.
 *
 * Só quem a criou (ou a coordenação). O conteúdo completo fica em `beforeData`,
 * então a exclusão é rastreável — mas quem executa a tarefa não pode apagá-la
 * da própria fila, que é o que tornaria a delegação inútil.
 */
export async function deleteTask(formData: FormData): Promise<void> {
  const currentUser = await requirePermission("tasks", "view");

  const taskId = field(formData, "taskId");
  if (!taskId) return;

  const before = await loadTask(taskId);
  if (!before) return;

  const rel = relacao(currentUser, before);
  if (!managementActionsFor(before.status, rel).includes("delete")) return;

  const db = await getDb();
  await db.delete(task).where(eq(task.id, taskId));

  await writeAuditLog({
    actorUserId: currentUser.id,
    actorEmail: currentUser.email,
    action: "task.delete",
    entityType: "task",
    entityId: taskId,
    summary: `Excluiu a tarefa "${before.title}"`,
    beforeData: before,
  });

  revalidateTaskViews();
}
