"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

import { requirePermission } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import {
  taskRecurrence,
  team,
  user,
  RECURRENCE_FREQUENCIES,
  TASK_PRIORITIES,
  type RecurrenceFrequency,
  type TaskPriority,
} from "@/lib/db/schema";
import { writeAuditLog } from "@/lib/modules/audit/log";
import { materializeRecurrences } from "@/lib/modules/tasks/recurrence";
import { newId } from "@/lib/utils/id";

function field(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function inteiro(formData: FormData, key: string, padrao: number): number {
  const valor = Number(field(formData, key));
  return Number.isFinite(valor) ? valor : padrao;
}

/**
 * Criar e editar recorrência exige poder delegar.
 *
 * Uma recorrência endereça trabalho ao futuro de outra pessoa, o que é
 * delegação com prazo indeterminado — mais, e não menos, do que passar uma
 * tarefa avulsa.
 */
async function exigirDelegador() {
  return requirePermission("tasks", "edit");
}

/**
 * Grava um molde de tarefa recorrente.
 *
 * Sem id, cria; com id, edita. A mesma ação nos dois casos porque os campos
 * são os mesmos e o formulário é o mesmo — duas ações significariam duas
 * validações que precisam concordar para sempre.
 */
export async function saveRecurrence(formData: FormData): Promise<void> {
  const currentUser = await exigirDelegador();

  const title = field(formData, "title");
  if (!title) return;

  const frequenciaBruta = field(formData, "frequency");
  const frequency: RecurrenceFrequency = (
    RECURRENCE_FREQUENCIES as readonly string[]
  ).includes(frequenciaBruta)
    ? (frequenciaBruta as RecurrenceFrequency)
    : "weekly";

  const prioridadeBruta = field(formData, "priority");
  const priority: TaskPriority = (
    TASK_PRIORITIES as readonly string[]
  ).includes(prioridadeBruta)
    ? (prioridadeBruta as TaskPriority)
    : "normal";

  const db = await getDb();

  // Pessoa e time são exclusivos, como na tarefa avulsa: com os dois, a
  // ocorrência não teria dono nem fila definida.
  let assigneeId = field(formData, "assigneeId") || null;
  let assignedTeamId = field(formData, "assignedTeamId") || null;
  if (assigneeId && assignedTeamId) assignedTeamId = null;

  if (assigneeId) {
    const pessoa = await db
      .select({ status: user.status })
      .from(user)
      .where(eq(user.id, assigneeId))
      .get();
    if (!pessoa || pessoa.status !== "active") assigneeId = null;
  }
  if (assignedTeamId) {
    const time = await db
      .select({ id: team.id })
      .from(team)
      .where(eq(team.id, assignedTeamId))
      .get();
    if (!time) assignedTeamId = null;
  }

  // Sem destino, a recorrência cai para quem a criou. É melhor do que recusar:
  // "toda sexta, fechar os números" endereçada a ninguém não faria nada.
  if (!assigneeId && !assignedTeamId) assigneeId = currentUser.id;

  const campos = {
    title,
    description: field(formData, "description") || null,
    priority,
    assigneeId,
    assignedTeamId,
    businessUnitId: field(formData, "businessUnitId") || null,
    frequency,
    weekday: Math.min(Math.max(inteiro(formData, "weekday", 1), 0), 6),
    dayOfMonth: Math.min(Math.max(inteiro(formData, "dayOfMonth", 1), 1), 31),
    dueInDays: Math.min(Math.max(inteiro(formData, "dueInDays", 0), 0), 30),
    updatedAt: new Date(),
  };

  const id = field(formData, "recurrenceId");

  if (id) {
    const antes = await db
      .select()
      .from(taskRecurrence)
      .where(eq(taskRecurrence.id, id))
      .get();
    if (!antes) return;

    await db
      .update(taskRecurrence)
      .set(campos)
      .where(eq(taskRecurrence.id, id));

    await writeAuditLog({
      actorUserId: currentUser.id,
      actorEmail: currentUser.email,
      action: "task_recurrence.update",
      entityType: "task",
      entityId: id,
      summary: `Editou a tarefa recorrente "${title}"`,
      beforeData: antes,
      afterData: campos,
    });
  } else {
    const novoId = newId("rec");
    await db.insert(taskRecurrence).values({
      id: novoId,
      ...campos,
      isActive: true,
      createdBy: currentUser.id,
      createdAt: new Date(),
    });

    await writeAuditLog({
      actorUserId: currentUser.id,
      actorEmail: currentUser.email,
      action: "task_recurrence.create",
      entityType: "task",
      entityId: novoId,
      summary: `Criou a tarefa recorrente "${title}"`,
      afterData: campos,
    });
  }

  // Materializa na hora: criar uma recorrência de sexta numa sexta e não ver
  // nada aparecer no board pareceria que não funcionou.
  await materializeRecurrences();

  revalidatePath("/tarefas", "layout");
  revalidatePath("/painel");
}

/** Liga ou desliga um molde. Desligar não apaga o que ele já gerou. */
export async function toggleRecurrence(formData: FormData): Promise<void> {
  const currentUser = await exigirDelegador();

  const id = field(formData, "recurrenceId");
  if (!id) return;

  const db = await getDb();
  const antes = await db
    .select()
    .from(taskRecurrence)
    .where(eq(taskRecurrence.id, id))
    .get();
  if (!antes) return;

  await db
    .update(taskRecurrence)
    .set({ isActive: !antes.isActive, updatedAt: new Date() })
    .where(eq(taskRecurrence.id, id));

  await writeAuditLog({
    actorUserId: currentUser.id,
    actorEmail: currentUser.email,
    action: "task_recurrence.update",
    entityType: "task",
    entityId: id,
    summary: antes.isActive
      ? `Pausou a tarefa recorrente "${antes.title}"`
      : `Retomou a tarefa recorrente "${antes.title}"`,
    beforeData: { isActive: antes.isActive },
    afterData: { isActive: !antes.isActive },
  });

  revalidatePath("/tarefas", "layout");
}

/**
 * Apaga o molde.
 *
 * As tarefas já criadas por ele FICAM: são trabalho que aconteceu, e apagar o
 * histórico junto com a regra seria apagar o que o time fez. Elas só deixam de
 * ganhar irmãs novas.
 */
export async function deleteRecurrence(formData: FormData): Promise<void> {
  const currentUser = await exigirDelegador();

  const id = field(formData, "recurrenceId");
  if (!id) return;

  const db = await getDb();
  const antes = await db
    .select()
    .from(taskRecurrence)
    .where(eq(taskRecurrence.id, id))
    .get();
  if (!antes) return;

  await db.delete(taskRecurrence).where(eq(taskRecurrence.id, id));

  await writeAuditLog({
    actorUserId: currentUser.id,
    actorEmail: currentUser.email,
    action: "task_recurrence.delete",
    entityType: "task",
    entityId: id,
    summary: `Excluiu a tarefa recorrente "${antes.title}"`,
    beforeData: antes,
  });

  revalidatePath("/tarefas", "layout");
}
