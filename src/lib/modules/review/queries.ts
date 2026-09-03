import { and, asc, desc, eq, lt } from "drizzle-orm";

import { getDb } from "@/lib/db/client";
import {
  buReview,
  buReviewAction,
  buReviewTopic,
  task,
  user,
  TASK_CLOSED_STATUSES,
  type BuReview,
  type ReviewTopic,
  type TaskStatus,
  type TopicStatus,
} from "@/lib/db/schema";
import {
  calcular,
  somar,
  variacao,
  type Indicador,
  type INVESTIMENTO,
} from "@/lib/modules/results/metrics";
import { listWeeklyResultsOfPeriod } from "@/lib/modules/results/queries";
import { loadCycleGoals, scopeRange } from "@/lib/modules/strategy/goals";
import { listCycles, pickDefaultCycle } from "@/lib/modules/strategy/queries";

export type TemaRevisado = {
  topic: ReviewTopic;
  status: TopicStatus;
  note: string | null;
  decision: string | null;
};

export type Encaminhamento = {
  id: string;
  taskId: string;
  title: string;
  topic: ReviewTopic | null;
  followUpNote: string | null;
  status: TaskStatus;
  dueDate: Date | null;
  assigneeName: string | null;
  fromReviewId: string;
  fromMeetingDate: Date;
};

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

export async function loadTopics(reviewId: string): Promise<TemaRevisado[]> {
  const db = await getDb();
  const linhas = await db
    .select()
    .from(buReviewTopic)
    .where(eq(buReviewTopic.reviewId, reviewId));

  return linhas.map((linha) => ({
    topic: linha.topic,
    status: linha.status,
    note: linha.note,
    decision: linha.decision,
  }));
}

/** Os encaminhamentos criados numa reunião. */
export async function loadActions(reviewId: string): Promise<Encaminhamento[]> {
  const db = await getDb();
  return db
    .select({
      id: buReviewAction.id,
      taskId: buReviewAction.taskId,
      topic: buReviewAction.topic,
      followUpNote: buReviewAction.followUpNote,
      title: task.title,
      status: task.status,
      dueDate: task.dueDate,
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
}

/**
 * O que ficou em aberto das reuniões anteriores.
 *
 * É o primeiro bloco da tela. Antes de discutir qualquer coisa nova, a reunião
 * confere o que foi combinado — sem isso, combinar uma ação e nunca mais falar
 * dela é o comportamento padrão, que é o que o documento arquivado sempre
 * produziu.
 */
export async function loadPendingActions(
  businessUnitId: string,
  exceptoReviewId: string,
): Promise<Encaminhamento[]> {
  const db = await getDb();
  const linhas = await db
    .select({
      id: buReviewAction.id,
      taskId: buReviewAction.taskId,
      topic: buReviewAction.topic,
      followUpNote: buReviewAction.followUpNote,
      title: task.title,
      status: task.status,
      dueDate: task.dueDate,
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
      linha.fromReviewId !== exceptoReviewId &&
      !TASK_CLOSED_STATUSES.includes(linha.status),
  );
}

// ── Números do período ─────────────────────────────────────────────────────

export type NumeroDoPeriodo = {
  metric: Indicador | typeof INVESTIMENTO;
  realizado: number | null;
  /** Meta proporcional ao período, quando a BU definiu uma para o ciclo. */
  meta: number | null;
  /** Quanto o realizado está acima ou abaixo da meta, em %. */
  versusMeta: number | null;
  /** Variação sobre o período anterior de mesma duração, em %. */
  versusAnterior: number | null;
};

/**
 * Os números que o Analista já lançou, prontos para leitura.
 *
 * O Coordenador não digita nada aqui — nem deveria: o fechamento semanal é
 * trabalho do Analista, feito antes da reunião, e pedir o mesmo número duas
 * vezes cria duas versões da verdade.
 *
 * A META é PROPORCIONAL ao período. A BU se compromete com um número de ciclo;
 * comparar catorze dias com a meta do ano inteiro não diz nada. A conta é
 * simples e a tela avisa que é proporcional — esconder isso faria o
 * Coordenador ver "2% da meta" e entrar em pânico em toda reunião.
 */
export async function loadPeriodNumbers(
  businessUnitId: string,
  de: Date,
  ate: Date,
): Promise<{
  numeros: NumeroDoPeriodo[];
  secundarios: NumeroDoPeriodo[];
  dias: number;
}> {
  const dias = Math.max(
    1,
    Math.round((ate.getTime() - de.getTime()) / 86_400_000),
  );
  const inicioAnterior = new Date(de.getTime() - dias * 86_400_000);

  const [atuais, anteriores, ciclos] = await Promise.all([
    listWeeklyResultsOfPeriod([businessUnitId], de, ate),
    listWeeklyResultsOfPeriod([businessUnitId], inicioAnterior, de),
    listCycles(businessUnitId),
  ]);

  const agora = calcular(somar(atuais));
  const antes = calcular(somar(anteriores));

  const ciclo = pickDefaultCycle(ciclos);
  const metas = ciclo ? await loadCycleGoals(ciclo.id) : null;

  /** Que fatia do ciclo este período representa. */
  const fracao = (() => {
    if (!ciclo) return null;
    const { startsAt, endsAt } = scopeRange(ciclo, "cycle");
    const duracao = endsAt.getTime() - startsAt.getTime();
    if (duracao <= 0) return null;
    return (dias * 86_400_000) / duracao;
  })();

  const alvoDoCiclo = new Map(
    (metas?.cycle?.targets ?? []).map((alvo) => [alvo.metric, alvo.target]),
  );

  const montar = (metric: Indicador | typeof INVESTIMENTO): NumeroDoPeriodo => {
    const realizado = agora[metric];
    const alvo = alvoDoCiclo.get(metric);
    const meta = alvo !== undefined && fracao !== null ? alvo * fracao : null;

    return {
      metric,
      realizado,
      meta,
      versusMeta:
        realizado !== null && meta !== null && meta !== 0
          ? ((realizado - meta) / meta) * 100
          : null,
      versusAnterior: variacao(realizado, antes[metric]),
    };
  };

  /**
   * Quatro números respondem "estamos indo bem?", e não oito.
   *
   * Ticket médio, conversão, CAC e ROAS são a EXPLICAÇÃO do que aconteceu, não
   * a resposta — ficam numa linha secundária, para quando a conversa
   * aprofundar.
   */
  return {
    dias,
    numeros: (["revenue", "sales", "leads", "media_spend"] as const).map(
      montar,
    ),
    secundarios: (
      ["average_ticket", "sales_conversion", "cac", "roas"] as const
    ).map(montar),
  };
}
