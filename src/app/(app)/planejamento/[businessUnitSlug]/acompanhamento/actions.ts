"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, max } from "drizzle-orm";

import { getDb } from "@/lib/db/client";
import {
  buReview,
  buReviewAction,
  buReviewTopic,
  businessUnit,
  task,
  user,
  REVIEW_STATUSES,
  REVIEW_TOPICS,
  TOPIC_STATUSES,
  type ReviewStatus,
  type ReviewTopic,
  type TaskStatus,
  type TopicStatus,
} from "@/lib/db/schema";
import { writeAuditLog } from "@/lib/modules/audit/log";
import { assertCanEditBusinessUnit } from "@/lib/modules/strategy/access";
import { newId } from "@/lib/utils/id";

/**
 * Todas as ações desta tela gravam na hora.
 *
 * Não há botão "Salvar" em lugar nenhum: a reunião acontece ao vivo, e um
 * formulário que precisa ser submetido é um formulário que alguém esquece de
 * submeter enquanto conversa. Cada clique e cada campo que perde o foco já
 * está gravado.
 */

function field(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

/** Meia-noite de hoje. A data da reunião nunca é digitada. */
function hoje(): Date {
  const data = new Date();
  data.setHours(0, 0, 0, 0);
  return data;
}

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
}

/** Carrega a reunião e confere que quem chamou pode mexer nela. */
async function reuniaoEditavel(reviewId: string) {
  const db = await getDb();
  const review = await db
    .select()
    .from(buReview)
    .where(eq(buReview.id, reviewId))
    .get();
  if (!review) return null;

  const currentUser = await assertCanEditBusinessUnit(review.businessUnitId);
  return { review, currentUser, db };
}

/**
 * Abre a reunião de hoje — um clique, sem formulário.
 *
 * Se já existe uma de hoje, entra nela. Duas reuniões da mesma BU no mesmo dia
 * é sempre alguém clicando duas vezes, nunca uma segunda reunião.
 */
export async function openTodayReview(formData: FormData): Promise<void> {
  const businessUnitId = field(formData, "businessUnitId");
  if (!businessUnitId) return;

  const currentUser = await assertCanEditBusinessUnit(businessUnitId);
  const db = await getDb();
  const data = hoje();

  const existente = await db
    .select({ id: buReview.id })
    .from(buReview)
    .where(
      and(
        eq(buReview.businessUnitId, businessUnitId),
        eq(buReview.meetingDate, data),
      ),
    )
    .get();

  const slug = await slugDaBu(businessUnitId);

  if (existente) {
    redirect(`/planejamento/${slug}/acompanhamento/${existente.id}`);
  }

  const id = newId("rev");
  const agora = new Date();

  await db.insert(buReview).values({
    id,
    businessUnitId,
    meetingDate: data,
    status: null,
    createdBy: currentUser.id,
    updatedBy: currentUser.id,
    createdAt: agora,
    updatedAt: agora,
  });

  await writeAuditLog({
    actorUserId: currentUser.id,
    actorEmail: currentUser.email,
    action: "bu_review.create",
    entityType: "business_unit",
    entityId: businessUnitId,
    summary: "Abriu um acompanhamento",
  });

  revalidar(slug);
  redirect(`/planejamento/${slug}/acompanhamento/${id}`);
}

/**
 * Marca um tema como resolvido ou como ponto de atenção.
 *
 * Um clique. Clicar no status que já está marcado desmarca o tema — voltar
 * atrás precisa ser tão barato quanto marcar, senão a pessoa evita marcar.
 */
export async function setTopicStatus(formData: FormData): Promise<void> {
  const reviewId = field(formData, "reviewId");
  const topicBruto = field(formData, "topic");
  const statusBruto = field(formData, "status");

  if (!(REVIEW_TOPICS as readonly string[]).includes(topicBruto)) return;
  if (!(TOPIC_STATUSES as readonly string[]).includes(statusBruto)) return;

  const contexto = await reuniaoEditavel(reviewId);
  if (!contexto) return;
  const { review, db } = contexto;

  const topic = topicBruto as ReviewTopic;
  const status = statusBruto as TopicStatus;

  const existente = await db
    .select()
    .from(buReviewTopic)
    .where(
      and(eq(buReviewTopic.reviewId, reviewId), eq(buReviewTopic.topic, topic)),
    )
    .get();

  if (existente?.status === status) {
    // Clicou de novo no mesmo: desmarca o tema. Sem linha = "não falamos
    // disso", que é diferente de "está tudo bem".
    await db.delete(buReviewTopic).where(eq(buReviewTopic.id, existente.id));
  } else if (existente) {
    await db
      .update(buReviewTopic)
      .set({
        status,
        // Sair da atenção limpa a observação: ela descrevia um problema que
        // deixou de existir, e mantê-la faria o histórico mentir.
        note: status === "ok" ? null : existente.note,
        updatedAt: new Date(),
      })
      .where(eq(buReviewTopic.id, existente.id));
  } else {
    await db.insert(buReviewTopic).values({
      id: newId("rvt"),
      reviewId,
      topic,
      status,
      updatedAt: new Date(),
    });
  }

  revalidar(await slugDaBu(review.businessUnitId));
}

/** Grava a observação ou a decisão de um tema. Chamado quando o campo sai do foco. */
export async function setTopicText(formData: FormData): Promise<void> {
  const reviewId = field(formData, "reviewId");
  const topicBruto = field(formData, "topic");
  const campo = field(formData, "campo");

  if (!(REVIEW_TOPICS as readonly string[]).includes(topicBruto)) return;
  if (campo !== "note" && campo !== "decision") return;

  const contexto = await reuniaoEditavel(reviewId);
  if (!contexto) return;
  const { review, db } = contexto;

  const topic = topicBruto as ReviewTopic;
  const valor = field(formData, "valor") || null;

  const existente = await db
    .select()
    .from(buReviewTopic)
    .where(
      and(eq(buReviewTopic.reviewId, reviewId), eq(buReviewTopic.topic, topic)),
    )
    .get();

  if (existente) {
    await db
      .update(buReviewTopic)
      .set({ [campo]: valor, updatedAt: new Date() })
      .where(eq(buReviewTopic.id, existente.id));
  } else if (valor) {
    // Escrever uma decisão num tema ainda não marcado marca o tema: quem
    // registrou algo evidentemente revisou o assunto.
    await db.insert(buReviewTopic).values({
      id: newId("rvt"),
      reviewId,
      topic,
      status: campo === "note" ? "attention" : "ok",
      [campo]: valor,
      updatedAt: new Date(),
    });
  }

  revalidar(await slugDaBu(review.businessUnitId));
}

/**
 * Cria um encaminhamento — que é uma tarefa.
 *
 * Três campos: o que, quem e quando. Um quarto campo numa reunião ao vivo é o
 * campo que fica em branco.
 */
export async function addEncaminhamento(formData: FormData): Promise<void> {
  const reviewId = field(formData, "reviewId");
  const titulo = field(formData, "title");
  if (!titulo) return;

  const contexto = await reuniaoEditavel(reviewId);
  if (!contexto) return;
  const { review, currentUser, db } = contexto;

  let assigneeId = field(formData, "assigneeId") || null;
  if (assigneeId) {
    const pessoa = await db
      .select({ status: user.status })
      .from(user)
      .where(eq(user.id, assigneeId))
      .get();
    if (!pessoa || pessoa.status !== "active") assigneeId = null;
  }
  if (!assigneeId) assigneeId = currentUser.id;

  const topicBruto = field(formData, "topic");
  const topic = (REVIEW_TOPICS as readonly string[]).includes(topicBruto)
    ? (topicBruto as ReviewTopic)
    : null;

  const agora = new Date();
  const taskId = newId("tsk");

  await db.insert(task).values({
    id: taskId,
    title: titulo,
    status: "todo",
    priority: "normal",
    dueDate: dataDoFormulario(field(formData, "dueDate")),
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
    topic,
    sortOrder: (ultimo?.maior ?? 0) + 1,
  });

  revalidar(await slugDaBu(review.businessUnitId));
}

export async function removeEncaminhamento(formData: FormData): Promise<void> {
  const id = field(formData, "actionId");
  if (!id) return;

  const db = await getDb();
  const acao = await db
    .select()
    .from(buReviewAction)
    .where(eq(buReviewAction.id, id))
    .get();
  if (!acao) return;

  const contexto = await reuniaoEditavel(acao.reviewId);
  if (!contexto) return;

  await db.delete(buReviewAction).where(eq(buReviewAction.id, id));
  // A tarefa some junto: ela só existia por causa deste encaminhamento, e uma
  // tarefa órfã no board de alguém, sem nada que explique de onde veio, é pior
  // do que nenhuma.
  await db.delete(task).where(eq(task.id, acao.taskId));

  revalidar(await slugDaBu(contexto.review.businessUnitId));
}

/**
 * Atualiza uma pendência da reunião anterior em um clique.
 *
 * Concluído, Em andamento e Não feito são os três estados que o Coordenador
 * consegue afirmar olhando para o Analista. "Não feito" mantém a tarefa aberta
 * de propósito: ela volta na próxima reunião, que é o ponto.
 */
export async function updatePendencia(formData: FormData): Promise<void> {
  const actionId = field(formData, "actionId");
  const escolha = field(formData, "escolha");
  if (!actionId) return;

  const db = await getDb();
  const acao = await db
    .select()
    .from(buReviewAction)
    .where(eq(buReviewAction.id, actionId))
    .get();
  if (!acao) return;

  const contexto = await reuniaoEditavel(acao.reviewId);
  if (!contexto) return;
  const { currentUser } = contexto;

  const novoStatus: Record<string, TaskStatus> = {
    concluido: "done",
    andamento: "in_progress",
    nao_feito: "todo",
  };

  if (escolha in novoStatus) {
    const status = novoStatus[escolha];
    await db
      .update(task)
      .set({
        status,
        completedAt: status === "done" ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(task.id, acao.taskId));
  }

  if (formData.has("valor")) {
    await db
      .update(buReviewAction)
      .set({ followUpNote: field(formData, "valor") || null })
      .where(eq(buReviewAction.id, actionId));
  }

  await writeAuditLog({
    actorUserId: currentUser.id,
    actorEmail: currentUser.email,
    action: "task.status_change",
    entityType: "task",
    entityId: acao.taskId,
    summary: "Atualizou uma pendência no acompanhamento",
  });

  revalidar(await slugDaBu(contexto.review.businessUnitId));
}

/** A avaliação final da BU. Um clique, e a justificativa é opcional. */
export async function setReviewStatus(formData: FormData): Promise<void> {
  const reviewId = field(formData, "reviewId");
  const statusBruto = field(formData, "status");

  const contexto = await reuniaoEditavel(reviewId);
  if (!contexto) return;
  const { review, currentUser, db } = contexto;

  const patch: Record<string, unknown> = {
    updatedBy: currentUser.id,
    updatedAt: new Date(),
  };

  if ((REVIEW_STATUSES as readonly string[]).includes(statusBruto)) {
    patch.status = statusBruto as ReviewStatus;
  }
  if (formData.has("statusNote")) {
    patch.statusNote = field(formData, "statusNote") || null;
  }

  await db.update(buReview).set(patch).where(eq(buReview.id, reviewId));

  revalidar(await slugDaBu(review.businessUnitId));
}

/**
 * Finaliza — o único botão principal da tela.
 *
 * Não grava nada de novo: tudo já foi gravado quando aconteceu. O que muda é o
 * estado da reunião, que passa de "acontecendo" para "aconteceu" — e é isso
 * que faz o histórico e a próxima reunião a enxergarem.
 */
export async function finishReview(formData: FormData): Promise<void> {
  const reviewId = field(formData, "reviewId");

  const contexto = await reuniaoEditavel(reviewId);
  if (!contexto) return;
  const { review, currentUser, db } = contexto;

  const fechando = !review.closedAt;

  await db
    .update(buReview)
    .set({
      closedAt: fechando ? new Date() : null,
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
    summary: fechando
      ? "Finalizou um acompanhamento"
      : "Reabriu um acompanhamento",
  });

  const slug = await slugDaBu(review.businessUnitId);
  revalidar(slug);

  if (fechando) redirect(`/planejamento/${slug}/acompanhamento`);
}
