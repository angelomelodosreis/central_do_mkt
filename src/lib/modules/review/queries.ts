import { and, asc, desc, eq, inArray, isNull, lt, ne } from "drizzle-orm";

import { getDb } from "@/lib/db/client";
import {
  buReview,
  buReviewAction,
  buReviewLearning,
  buReviewNote,
  buReviewParticipant,
  task,
  user,
  TASK_CLOSED_STATUSES,
  type BuReview,
  type NoteKind,
  type TaskPriority,
  type TaskStatus,
} from "@/lib/db/schema";
import {
  INDICADORES,
  calcular,
  somar,
  variacao,
  type Indicador,
} from "@/lib/modules/results/metrics";
import { listWeeklyResultsOfPeriod } from "@/lib/modules/results/queries";

export type ParticipanteView = {
  id: string;
  userId: string | null;
  name: string;
};

export type AprendizadoView = {
  id: string;
  category: string;
  whatWeDid: string;
  whatHappened: string | null;
  whatWeLearned: string | null;
  nextStep: string | null;
};

export type AnotacaoView = {
  id: string;
  kind: NoteKind;
  text: string;
  dependsOn: string | null;
  resolvedAt: Date | null;
  /** A reunião em que foi registrada — o histórico precisa dizer quando. */
  meetingDate: Date;
};

export type AcaoView = {
  id: string;
  taskId: string;
  title: string;
  expectedResult: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: Date | null;
  assigneeName: string | null;
  blockedReason: string | null;
  /** Em que reunião a ação foi combinada. */
  fromReviewId: string;
  fromMeetingDate: Date;
};

/** A lista de acompanhamentos de uma BU, do mais recente para o mais antigo. */
export async function listReviews(businessUnitId: string) {
  const db = await getDb();
  return db
    .select()
    .from(buReview)
    .where(eq(buReview.businessUnitId, businessUnitId))
    .orderBy(desc(buReview.meetingDate));
}

export async function getReview(id: string): Promise<BuReview | undefined> {
  const db = await getDb();
  return db.select().from(buReview).where(eq(buReview.id, id)).get();
}

/** O acompanhamento imediatamente anterior a uma data. */
export async function previousReview(
  businessUnitId: string,
  antesDe: Date,
): Promise<BuReview | undefined> {
  const db = await getDb();
  return db
    .select()
    .from(buReview)
    .where(
      and(
        eq(buReview.businessUnitId, businessUnitId),
        lt(buReview.meetingDate, antesDe),
      ),
    )
    .orderBy(desc(buReview.meetingDate))
    .get();
}

export async function loadParticipants(
  reviewId: string,
): Promise<ParticipanteView[]> {
  const db = await getDb();
  const linhas = await db
    .select({
      id: buReviewParticipant.id,
      userId: buReviewParticipant.userId,
      nome: buReviewParticipant.name,
      nomeDaConta: user.name,
    })
    .from(buReviewParticipant)
    .leftJoin(user, eq(buReviewParticipant.userId, user.id))
    .where(eq(buReviewParticipant.reviewId, reviewId));

  return linhas.map((linha) => ({
    id: linha.id,
    userId: linha.userId,
    name: linha.nomeDaConta ?? linha.nome ?? "—",
  }));
}

export async function loadLearnings(
  reviewId: string,
): Promise<AprendizadoView[]> {
  const db = await getDb();
  const linhas = await db
    .select()
    .from(buReviewLearning)
    .where(eq(buReviewLearning.reviewId, reviewId))
    .orderBy(asc(buReviewLearning.sortOrder));

  return linhas.map((linha) => ({
    id: linha.id,
    category: linha.category,
    whatWeDid: linha.whatWeDid,
    whatHappened: linha.whatHappened,
    whatWeLearned: linha.whatWeLearned,
    nextStep: linha.nextStep,
  }));
}

export async function loadNotes(reviewId: string): Promise<AnotacaoView[]> {
  const db = await getDb();
  const linhas = await db
    .select({
      id: buReviewNote.id,
      kind: buReviewNote.kind,
      text: buReviewNote.text,
      dependsOn: buReviewNote.dependsOn,
      resolvedAt: buReviewNote.resolvedAt,
      meetingDate: buReview.meetingDate,
    })
    .from(buReviewNote)
    .innerJoin(buReview, eq(buReviewNote.reviewId, buReview.id))
    .where(eq(buReviewNote.reviewId, reviewId))
    .orderBy(asc(buReviewNote.sortOrder));

  return linhas;
}

/**
 * O que continua valendo de reuniões anteriores.
 *
 * Decisão e bloqueio atravessam a reunião em que nasceram: a decisão vale até
 * alguém revê-la, e o bloqueio bloqueia até ser resolvido. Problema, hipótese
 * e oportunidade ficam na reunião — são leitura daquele momento.
 *
 * É esta consulta que impede a reunião de recomeçar do zero toda vez.
 */
export async function loadStandingNotes(
  businessUnitId: string,
  exceptoReviewId: string,
): Promise<AnotacaoView[]> {
  const db = await getDb();
  return db
    .select({
      id: buReviewNote.id,
      kind: buReviewNote.kind,
      text: buReviewNote.text,
      dependsOn: buReviewNote.dependsOn,
      resolvedAt: buReviewNote.resolvedAt,
      meetingDate: buReview.meetingDate,
    })
    .from(buReviewNote)
    .innerJoin(buReview, eq(buReviewNote.reviewId, buReview.id))
    .where(
      and(
        eq(buReview.businessUnitId, businessUnitId),
        inArray(buReviewNote.kind, ["decision", "blocker"]),
        isNull(buReviewNote.resolvedAt),
        // A própria reunião fica de fora: o que foi escrito hoje já aparece na
        // seção acima, e repeti-lo no bloco de "o que continua valendo" faria
        // a tela dizer duas vezes a mesma coisa.
        ne(buReviewNote.reviewId, exceptoReviewId),
      ),
    )
    .orderBy(desc(buReview.meetingDate));
}

/** As ações combinadas numa reunião, com a situação atual de cada tarefa. */
export async function loadActions(reviewId: string): Promise<AcaoView[]> {
  const db = await getDb();
  const linhas = await db
    .select({
      id: buReviewAction.id,
      taskId: buReviewAction.taskId,
      expectedResult: buReviewAction.expectedResult,
      title: task.title,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate,
      blockedReason: task.blockedReason,
      assigneeName: user.name,
      fromReviewId: buReviewAction.reviewId,
      fromMeetingDate: buReview.meetingDate,
    })
    .from(buReviewAction)
    .innerJoin(task, eq(buReviewAction.taskId, task.id))
    .innerJoin(buReview, eq(buReviewAction.reviewId, buReview.id))
    .leftJoin(user, eq(task.assigneeId, user.id))
    .where(eq(buReviewAction.reviewId, reviewId))
    .orderBy(asc(buReviewAction.sortOrder));

  return linhas;
}

/**
 * O que ficou em aberto de reuniões anteriores.
 *
 * É a primeira coisa que a reunião seguinte precisa ver: sem isso, combinar
 * uma ação e nunca mais falar dela é o comportamento padrão — foi o que o
 * documento arquivado sempre produziu.
 */
export async function loadPendingActions(
  businessUnitId: string,
  ateAReuniao: string,
): Promise<AcaoView[]> {
  const db = await getDb();
  const linhas = await db
    .select({
      id: buReviewAction.id,
      taskId: buReviewAction.taskId,
      expectedResult: buReviewAction.expectedResult,
      title: task.title,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate,
      blockedReason: task.blockedReason,
      assigneeName: user.name,
      fromReviewId: buReviewAction.reviewId,
      fromMeetingDate: buReview.meetingDate,
    })
    .from(buReviewAction)
    .innerJoin(task, eq(buReviewAction.taskId, task.id))
    .innerJoin(buReview, eq(buReviewAction.reviewId, buReview.id))
    .leftJoin(user, eq(task.assigneeId, user.id))
    .where(eq(buReview.businessUnitId, businessUnitId))
    .orderBy(desc(buReview.meetingDate));

  return linhas.filter(
    (linha) =>
      linha.fromReviewId !== ateAReuniao &&
      !TASK_CLOSED_STATUSES.includes(linha.status),
  );
}

// ── Bloco de resultados ────────────────────────────────────────────────────

export type ResultadoDoPeriodo = {
  metric: Indicador;
  realizado: number | null;
  anterior: number | null;
  variacao: number | null;
};

/**
 * Os números do período entre duas reuniões.
 *
 * NÃO se digita nada aqui. Vem do fechamento semanal que a BU já lança em
 * Planejamento › Resultados — pedir os mesmos números de novo na reunião
 * criaria duas fontes para a mesma verdade, e a segunda seria preenchida com
 * pressa cinco minutos antes.
 *
 * O período anterior tem a mesma duração, e não "a semana passada": comparar
 * quinze dias com sete faria toda reunião quinzenal parecer um sucesso.
 */
export async function loadPeriodResults(
  businessUnitId: string,
  de: Date,
  ate: Date,
): Promise<{ resultados: ResultadoDoPeriodo[]; dias: number }> {
  const dias = Math.max(
    1,
    Math.round((ate.getTime() - de.getTime()) / 86_400_000),
  );
  const inicioAnterior = new Date(de.getTime() - dias * 86_400_000);

  const [atuais, anteriores] = await Promise.all([
    listWeeklyResultsOfPeriod([businessUnitId], de, ate),
    listWeeklyResultsOfPeriod([businessUnitId], inicioAnterior, de),
  ]);

  const agora = calcular(somar(atuais));
  const antes = calcular(somar(anteriores));

  return {
    dias,
    resultados: INDICADORES.map(({ metric }) => ({
      metric,
      realizado: agora[metric],
      anterior: antes[metric],
      variacao: variacao(agora[metric], antes[metric]),
    })),
  };
}
