import { and, asc, desc, eq, gte, inArray, lte } from "drizzle-orm";

import { getDb } from "@/lib/db/client";
import {
  businessUnit,
  initiativeResult,
  strategyCycle,
  timelineItem,
  weeklyResult,
  type TimelineKind,
  type TimelineStatus,
} from "@/lib/db/schema";
import { inicioDaSemana, somar, type BaseNumbers } from "./metrics";

export type LinhaSemanal = BaseNumbers & {
  id: string;
  businessUnitId: string;
  weekStart: Date;
  note: string | null;
};

/** O fechamento semanal de uma BU, da semana mais recente para a mais antiga. */
export async function listWeeklyResults(
  businessUnitId: string,
  { desde }: { desde?: Date } = {},
): Promise<LinhaSemanal[]> {
  const db = await getDb();
  const linhas = await db
    .select()
    .from(weeklyResult)
    .where(
      desde
        ? and(
            eq(weeklyResult.businessUnitId, businessUnitId),
            gte(weeklyResult.weekStart, inicioDaSemana(desde)),
          )
        : eq(weeklyResult.businessUnitId, businessUnitId),
    )
    .orderBy(desc(weeklyResult.weekStart));

  return linhas.map(paraLinha);
}

function paraLinha(linha: typeof weeklyResult.$inferSelect): LinhaSemanal {
  return {
    id: linha.id,
    businessUnitId: linha.businessUnitId,
    weekStart: linha.weekStart,
    revenue: linha.revenue,
    sales: linha.sales,
    leads: linha.leads,
    mediaSpend: linha.mediaSpend,
    note: linha.note,
  };
}

/**
 * O fechamento de várias BUs num intervalo.
 *
 * Uma consulta só para o painel inteiro: o Panorama cruza até 22 BUs, e uma
 * consulta por BU seriam 22 idas ao banco para desenhar uma tela.
 */
export async function listWeeklyResultsOfPeriod(
  businessUnitIds: string[],
  de: Date,
  ate: Date,
): Promise<LinhaSemanal[]> {
  if (businessUnitIds.length === 0) return [];

  const db = await getDb();
  const linhas = await db
    .select()
    .from(weeklyResult)
    .where(
      and(
        inArray(weeklyResult.businessUnitId, businessUnitIds),
        gte(weeklyResult.weekStart, inicioDaSemana(de)),
        lte(weeklyResult.weekStart, ate),
      ),
    )
    .orderBy(asc(weeklyResult.weekStart));

  return linhas.map(paraLinha);
}

/** Agrupa por BU e soma — o número de cada BU no período escolhido. */
export function somarPorBusinessUnit(
  linhas: LinhaSemanal[],
): Map<string, BaseNumbers> {
  const porBu = new Map<string, LinhaSemanal[]>();
  for (const linha of linhas) {
    const lista = porBu.get(linha.businessUnitId) ?? [];
    lista.push(linha);
    porBu.set(linha.businessUnitId, lista);
  }
  return new Map(
    [...porBu].map(([id, doGrupo]) => [id, somar(doGrupo)] as const),
  );
}

/** Agrupa por semana e soma — a série que o gráfico desenha. */
export function somarPorSemana(
  linhas: LinhaSemanal[],
): Array<{ weekStart: Date } & BaseNumbers> {
  const porSemana = new Map<number, LinhaSemanal[]>();
  for (const linha of linhas) {
    const chave = linha.weekStart.getTime();
    const lista = porSemana.get(chave) ?? [];
    lista.push(linha);
    porSemana.set(chave, lista);
  }

  return [...porSemana]
    .sort(([a], [b]) => a - b)
    .map(([chave, doGrupo]) => ({
      weekStart: new Date(chave),
      ...somar(doGrupo),
    }));
}

// ── Agenda ─────────────────────────────────────────────────────────────────

export type ItemDaAgenda = {
  id: string;
  title: string;
  kind: TimelineKind;
  status: TimelineStatus;
  startsAt: Date;
  endsAt: Date;
  owner: string | null;
  businessUnitId: string;
  businessUnitLabel: string;
  businessUnitSlug: string;
};

/**
 * O que vem por aí, em todas as BUs de uma vez.
 *
 * Item que já começou e ainda não terminou entra: uma janela de venda aberta é
 * exatamente o que está em jogo agora, e um "próximos 7 dias" que a esconde
 * mente sobre a semana.
 */
export async function listAgenda(
  businessUnitIds: string[],
  de: Date,
  ate: Date,
  kinds?: TimelineKind[],
): Promise<ItemDaAgenda[]> {
  if (businessUnitIds.length === 0) return [];

  const db = await getDb();
  const linhas = await db
    .select({
      id: timelineItem.id,
      title: timelineItem.title,
      kind: timelineItem.kind,
      status: timelineItem.status,
      startsAt: timelineItem.startsAt,
      endsAt: timelineItem.endsAt,
      owner: timelineItem.owner,
      businessUnitId: strategyCycle.businessUnitId,
      businessUnitLabel: businessUnit.label,
      businessUnitSlug: businessUnit.slug,
    })
    .from(timelineItem)
    .innerJoin(strategyCycle, eq(timelineItem.cycleId, strategyCycle.id))
    .innerJoin(businessUnit, eq(strategyCycle.businessUnitId, businessUnit.id))
    .where(
      and(
        inArray(strategyCycle.businessUnitId, businessUnitIds),
        gte(timelineItem.endsAt, de),
        lte(timelineItem.startsAt, ate),
        kinds && kinds.length > 0
          ? inArray(timelineItem.kind, kinds)
          : undefined,
      ),
    )
    .orderBy(asc(timelineItem.startsAt));

  return linhas;
}

// ── Resultado por iniciativa ───────────────────────────────────────────────

export type IniciativaComResultado = {
  itemId: string;
  title: string;
  kind: TimelineKind;
  startsAt: Date;
  endsAt: Date;
  resultado:
    (BaseNumbers & { attendance: number | null; note: string | null }) | null;
};

/**
 * As iniciativas de uma BU que já terminaram, com o resultado quando existe.
 *
 * Só as encerradas: pedir o resultado de um lançamento que ainda está em
 * campo é pedir um chute. As que ainda não terminaram aparecem no calendário,
 * que é onde elas estão sendo tocadas.
 */
export async function listInitiativesToReport(
  cycleId: string,
  ate: Date,
): Promise<IniciativaComResultado[]> {
  const db = await getDb();

  const linhas = await db
    .select({
      itemId: timelineItem.id,
      title: timelineItem.title,
      kind: timelineItem.kind,
      startsAt: timelineItem.startsAt,
      endsAt: timelineItem.endsAt,
      revenue: initiativeResult.revenue,
      sales: initiativeResult.sales,
      leads: initiativeResult.leads,
      mediaSpend: initiativeResult.mediaSpend,
      attendance: initiativeResult.attendance,
      note: initiativeResult.note,
      resultId: initiativeResult.id,
    })
    .from(timelineItem)
    .leftJoin(
      initiativeResult,
      eq(initiativeResult.timelineItemId, timelineItem.id),
    )
    .where(
      and(
        eq(timelineItem.cycleId, cycleId),
        // Lançamento e evento são o que rende número. Marco e sazonalidade são
        // contexto do mundo, não ação nossa; janela de produto e comunicação
        // correm o ciclo inteiro e não fecham numa data.
        inArray(timelineItem.kind, ["launch", "event"]),
        lte(timelineItem.endsAt, ate),
      ),
    )
    .orderBy(desc(timelineItem.endsAt));

  return linhas.map((linha) => ({
    itemId: linha.itemId,
    title: linha.title,
    kind: linha.kind,
    startsAt: linha.startsAt,
    endsAt: linha.endsAt,
    resultado: linha.resultId
      ? {
          revenue: linha.revenue,
          sales: linha.sales,
          leads: linha.leads,
          mediaSpend: linha.mediaSpend,
          attendance: linha.attendance,
          note: linha.note,
        }
      : null,
  }));
}
