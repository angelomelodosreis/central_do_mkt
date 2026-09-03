"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, max } from "drizzle-orm";

import { getDb } from "@/lib/db/client";
import {
  buReview,
  buReviewAction,
  buReviewLearning,
  buReviewNote,
  buReviewParticipant,
  businessUnit,
  task,
  user,
  LEARNING_CATEGORIES,
  NOTE_KINDS,
  REVIEW_STATUSES,
  type LearningCategory,
  type NoteKind,
  type ReviewStatus,
} from "@/lib/db/schema";
import { writeAuditLog } from "@/lib/modules/audit/log";
import { assertCanEditBusinessUnit } from "@/lib/modules/strategy/access";
import { newId } from "@/lib/utils/id";

function field(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

/** "2026-09-04" vindo de um `<input type="date">` → meia-noite local. */
function dataDoFormulario(valor: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return null;
  const [ano, mes, dia] = valor.split("-").map(Number);
  return new Date(ano, mes - 1, dia);
}

async function slugDaBu(businessUnitId: string): Promise<string> {
  const db = await getDb();
  const unidade = await db
    .select({ slug: businessUnit.slug })
    .from(businessUnit)
    .where(eq(businessUnit.id, businessUnitId))
    .get();
  return unidade?.slug ?? "";
}

function revalidar(slug: string) {
  revalidatePath(`/planejamento/${slug}`, "layout");
  revalidatePath("/tarefas", "layout");
  revalidatePath("/panorama");
}

/**
 * Abre um acompanhamento.
 *
 * Não copia nada da reunião anterior. O que vem de lá — ações em aberto,
 * decisões que continuam valendo, bloqueios não resolvidos — é CONSULTADO em
 * tempo real, e não duplicado: copiar criaria uma segunda cópia da mesma ação,
 * e as duas divergiriam no instante em que alguém concluísse uma.
 */
export async function createReview(formData: FormData): Promise<void> {
  const businessUnitId = field(formData, "businessUnitId");
  if (!businessUnitId) return;

  const currentUser = await assertCanEditBusinessUnit(businessUnitId);
  const meetingDate = dataDoFormulario(field(formData, "meetingDate"));
  if (!meetingDate) return;

  const db = await getDb();

  const existente = await db
    .select({ id: buReview.id })
    .from(buReview)
    .where(
      and(
        eq(buReview.businessUnitId, businessUnitId),
        eq(buReview.meetingDate, meetingDate),
      ),
    )
    .get();

  const slug = await slugDaBu(businessUnitId);

  // Já existe reunião nesse dia: abre a que existe em vez de recusar. Duas
  // reuniões da mesma BU no mesmo dia é quase sempre alguém clicando duas
  // vezes, não uma segunda reunião de verdade.
  if (existente) {
    revalidar(slug);
    redirect(`/planejamento/${slug}/acompanhamento/${existente.id}`);
  }

  const id = newId("rev");
  const agora = new Date();

  await db.insert(buReview).values({
    id,
    businessUnitId,
    meetingDate,
    status: "on_track",
    createdBy: currentUser.id,
    updatedBy: currentUser.id,
    createdAt: agora,
    updatedAt: agora,
  });

  // Quem abre entra como participante: é o caso mais comum e poupa um clique
  // que ninguém dá.
  await db.insert(buReviewParticipant).values({
    id: newId("rvp"),
    reviewId: id,
    userId: currentUser.id,
    name: null,
  });

  await writeAuditLog({
    actorUserId: currentUser.id,
    actorEmail: currentUser.email,
    action: "bu_review.create",
    entityType: "business_unit",
    entityId: businessUnitId,
    summary: `Abriu um acompanhamento de ${meetingDate.toLocaleDateString("pt-BR")}`,
  });

  revalidar(slug);
  redirect(`/planejamento/${slug}/acompanhamento/${id}`);
}

/** Grava o bloco "como estamos". */
export async function saveReviewSummary(formData: FormData): Promise<void> {
  const reviewId = field(formData, "reviewId");
  if (!reviewId) return;

  const db = await getDb();
  const review = await db
    .select()
    .from(buReview)
    .where(eq(buReview.id, reviewId))
    .get();
  if (!review) return;

  const currentUser = await assertCanEditBusinessUnit(review.businessUnitId);

  const statusBruto = field(formData, "status");
  const status: ReviewStatus = (REVIEW_STATUSES as readonly string[]).includes(
    statusBruto,
  )
    ? (statusBruto as ReviewStatus)
    : review.status;

  await db
    .update(buReview)
    .set({
      status,
      statusNote: field(formData, "statusNote") || null,
      highlight: field(formData, "highlight") || null,
      concern: field(formData, "concern") || null,
      updatedBy: currentUser.id,
      updatedAt: new Date(),
    })
    .where(eq(buReview.id, reviewId));

  // Participantes: chega a lista inteira e a diferença é recalculada. São
  // poucos por reunião, e um formulário que manda o estado desejado é mais
  // simples de acertar do que um que manda incrementos.
  const userIds = formData.getAll("participantes").map(String).filter(Boolean);
  const convidados = field(formData, "convidados");

  await db
    .delete(buReviewParticipant)
    .where(eq(buReviewParticipant.reviewId, reviewId));

  for (const userId of userIds) {
    const existe = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.id, userId))
      .get();
    if (!existe) continue;
    await db.insert(buReviewParticipant).values({
      id: newId("rvp"),
      reviewId,
      userId,
      name: null,
    });
  }

  for (const nome of convidados
    .split(",")
    .map((parte) => parte.trim())
    .filter(Boolean)) {
    await db.insert(buReviewParticipant).values({
      id: newId("rvp"),
      reviewId,
      userId: null,
      name: nome,
    });
  }

  revalidar(await slugDaBu(review.businessUnitId));
}

/** Fecha ou reabre a reunião. */
export async function toggleReviewClosed(formData: FormData): Promise<void> {
  const reviewId = field(formData, "reviewId");
  if (!reviewId) return;

  const db = await getDb();
  const review = await db
    .select()
    .from(buReview)
    .where(eq(buReview.id, reviewId))
    .get();
  if (!review) return;

  const currentUser = await assertCanEditBusinessUnit(review.businessUnitId);

  await db
    .update(buReview)
    .set({
      closedAt: review.closedAt ? null : new Date(),
      updatedBy: currentUser.id,
      updatedAt: new Date(),
    })
    .where(eq(buReview.id, reviewId));

  await writeAuditLog({
    actorUserId: currentUser.id,
    actorEmail: currentUser.email,
    action: "bu_review.update",
    entityType: "business_unit",
    entityId: review.businessUnitId,
    summary: review.closedAt
      ? "Reabriu um acompanhamento"
      : "Fechou um acompanhamento",
  });

  revalidar(await slugDaBu(review.businessUnitId));
}

/** Acrescenta uma linha de "o que fizemos e o que aprendemos". */
export async function addLearning(formData: FormData): Promise<void> {
  const reviewId = field(formData, "reviewId");
  const whatWeDid = field(formData, "whatWeDid");
  if (!reviewId || !whatWeDid) return;

  const db = await getDb();
  const review = await db
    .select()
    .from(buReview)
    .where(eq(buReview.id, reviewId))
    .get();
  if (!review) return;

  await assertCanEditBusinessUnit(review.businessUnitId);

  const categoriaBruta = field(formData, "category");
  const category: LearningCategory = (
    LEARNING_CATEGORIES as readonly string[]
  ).includes(categoriaBruta)
    ? (categoriaBruta as LearningCategory)
    : "other";

  const ultimo = await db
    .select({ maior: max(buReviewLearning.sortOrder) })
    .from(buReviewLearning)
    .where(eq(buReviewLearning.reviewId, reviewId))
    .get();

  await db.insert(buReviewLearning).values({
    id: newId("rvl"),
    reviewId,
    category,
    whatWeDid,
    whatHappened: field(formData, "whatHappened") || null,
    whatWeLearned: field(formData, "whatWeLearned") || null,
    nextStep: field(formData, "nextStep") || null,
    sortOrder: (ultimo?.maior ?? 0) + 1,
  });

  revalidar(await slugDaBu(review.businessUnitId));
}

export async function deleteLearning(formData: FormData): Promise<void> {
  const id = field(formData, "learningId");
  if (!id) return;

  const db = await getDb();
  const linha = await db
    .select({ reviewId: buReviewLearning.reviewId })
    .from(buReviewLearning)
    .where(eq(buReviewLearning.id, id))
    .get();
  if (!linha) return;

  const review = await db
    .select({ businessUnitId: buReview.businessUnitId })
    .from(buReview)
    .where(eq(buReview.id, linha.reviewId))
    .get();
  if (!review) return;

  await assertCanEditBusinessUnit(review.businessUnitId);
  await db.delete(buReviewLearning).where(eq(buReviewLearning.id, id));

  revalidar(await slugDaBu(review.businessUnitId));
}

/** Registra um problema, oportunidade, hipótese, decisão ou bloqueio. */
export async function addNote(formData: FormData): Promise<void> {
  const reviewId = field(formData, "reviewId");
  const texto = field(formData, "text");
  if (!reviewId || !texto) return;

  const db = await getDb();
  const review = await db
    .select()
    .from(buReview)
    .where(eq(buReview.id, reviewId))
    .get();
  if (!review) return;

  await assertCanEditBusinessUnit(review.businessUnitId);

  const kindBruto = field(formData, "kind");
  const kind: NoteKind = (NOTE_KINDS as readonly string[]).includes(kindBruto)
    ? (kindBruto as NoteKind)
    : "problem";

  const ultimo = await db
    .select({ maior: max(buReviewNote.sortOrder) })
    .from(buReviewNote)
    .where(eq(buReviewNote.reviewId, reviewId))
    .get();

  await db.insert(buReviewNote).values({
    id: newId("rvn"),
    reviewId,
    kind,
    text: texto,
    dependsOn: field(formData, "dependsOn") || null,
    sortOrder: (ultimo?.maior ?? 0) + 1,
    createdAt: new Date(),
  });

  revalidar(await slugDaBu(review.businessUnitId));
}

/** Marca um bloqueio como resolvido — ou desfaz. */
export async function toggleNoteResolved(formData: FormData): Promise<void> {
  const id = field(formData, "noteId");
  if (!id) return;

  const db = await getDb();
  const nota = await db
    .select()
    .from(buReviewNote)
    .where(eq(buReviewNote.id, id))
    .get();
  if (!nota) return;

  const review = await db
    .select({ businessUnitId: buReview.businessUnitId })
    .from(buReview)
    .where(eq(buReview.id, nota.reviewId))
    .get();
  if (!review) return;

  await assertCanEditBusinessUnit(review.businessUnitId);

  await db
    .update(buReviewNote)
    .set({ resolvedAt: nota.resolvedAt ? null : new Date() })
    .where(eq(buReviewNote.id, id));

  revalidar(await slugDaBu(review.businessUnitId));
}

export async function deleteNote(formData: FormData): Promise<void> {
  const id = field(formData, "noteId");
  if (!id) return;

  const db = await getDb();
  const nota = await db
    .select({ reviewId: buReviewNote.reviewId })
    .from(buReviewNote)
    .where(eq(buReviewNote.id, id))
    .get();
  if (!nota) return;

  const review = await db
    .select({ businessUnitId: buReview.businessUnitId })
    .from(buReview)
    .where(eq(buReview.id, nota.reviewId))
    .get();
  if (!review) return;

  await assertCanEditBusinessUnit(review.businessUnitId);
  await db.delete(buReviewNote).where(eq(buReviewNote.id, id));

  revalidar(await slugDaBu(review.businessUnitId));
}

/**
 * Combina uma próxima ação — que nasce como TAREFA.
 *
 * A ação vai para o board de quem ficou com ela, com prazo e situação, e é a
 * mesma tarefa que a reunião seguinte vai encontrar em aberto. Uma lista de
 * ações própria do acompanhamento seria um segundo sistema de "coisas para
 * fazer", e o segundo é justamente o que ninguém abre entre duas reuniões.
 */
export async function addAction(formData: FormData): Promise<void> {
  const reviewId = field(formData, "reviewId");
  const titulo = field(formData, "title");
  if (!reviewId || !titulo) return;

  const db = await getDb();
  const review = await db
    .select()
    .from(buReview)
    .where(eq(buReview.id, reviewId))
    .get();
  if (!review) return;

  const currentUser = await assertCanEditBusinessUnit(review.businessUnitId);

  let assigneeId = field(formData, "assigneeId") || null;
  if (assigneeId) {
    const pessoa = await db
      .select({ status: user.status })
      .from(user)
      .where(eq(user.id, assigneeId))
      .get();
    if (!pessoa || pessoa.status !== "active") assigneeId = null;
  }
  // Sem responsável, a ação fica com quem a combinou. Ação sem dono é o que a
  // reunião anterior sempre produziu, e é o que estamos consertando.
  if (!assigneeId) assigneeId = currentUser.id;

  const dueDate = dataDoFormulario(field(formData, "dueDate"));
  const agora = new Date();
  const taskId = newId("tsk");

  await db.insert(task).values({
    id: taskId,
    title: titulo,
    status: "todo",
    priority: "normal",
    dueDate,
    assigneeId,
    assignedTeamId: null,
    businessUnitId: review.businessUnitId,
    createdBy: currentUser.id,
    createdAt: agora,
    updatedAt: agora,
  });

  const ultimo = await db
    .select({ maior: max(buReviewAction.sortOrder) })
    .from(buReviewAction)
    .where(eq(buReviewAction.reviewId, reviewId))
    .get();

  await db.insert(buReviewAction).values({
    id: newId("rva"),
    reviewId,
    taskId,
    expectedResult: field(formData, "expectedResult") || null,
    sortOrder: (ultimo?.maior ?? 0) + 1,
  });

  revalidar(await slugDaBu(review.businessUnitId));
}

/**
 * Tira a ação da reunião — e apaga a tarefa junto.
 *
 * As duas coisas juntas porque a tarefa só existia por causa desta ação. Deixar
 * a tarefa órfã no board de alguém, sem nada que explique de onde veio, é pior
 * do que apagar.
 */
export async function removeAction(formData: FormData): Promise<void> {
  const id = field(formData, "actionId");
  if (!id) return;

  const db = await getDb();
  const acao = await db
    .select()
    .from(buReviewAction)
    .where(eq(buReviewAction.id, id))
    .get();
  if (!acao) return;

  const review = await db
    .select({ businessUnitId: buReview.businessUnitId })
    .from(buReview)
    .where(eq(buReview.id, acao.reviewId))
    .get();
  if (!review) return;

  await assertCanEditBusinessUnit(review.businessUnitId);

  await db.delete(buReviewAction).where(eq(buReviewAction.id, id));
  await db.delete(task).where(eq(task.id, acao.taskId));

  revalidar(await slugDaBu(review.businessUnitId));
}
