"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";

import { getDb } from "@/lib/db/client";
import {
  initiativeResult,
  strategyCycle,
  timelineItem,
  weeklyResult,
} from "@/lib/db/schema";
import { writeAuditLog } from "@/lib/modules/audit/log";
import { assertCanEditBusinessUnit } from "@/lib/modules/strategy/access";
import { newId } from "@/lib/utils/id";

/**
 * Lê um número escrito por gente.
 *
 * Aceita "12.500,50", "12500.5" e "R$ 12.500" porque é isso que sai de um
 * relatório copiado e colado. Devolve `null` — e não zero — para vazio: zero é
 * uma afirmação ("não vendemos nada"), vazio é a ausência dela, e a diferença
 * decide se o número entra na média.
 */
function numero(formData: FormData, key: string): number | null {
  const bruto = String(formData.get(key) ?? "").trim();
  if (!bruto) return null;

  const limpo = bruto
    .replace(/[R$\s]/g, "")
    // "1.234,56" → "1234.56"; "1234.56" continua igual porque só há um ponto e
    // ele tem duas casas depois.
    .replace(/\.(?=\d{3}(\D|$))/g, "")
    .replace(",", ".");

  const valor = Number(limpo);
  return Number.isFinite(valor) ? valor : null;
}

function inteiro(formData: FormData, key: string): number | null {
  const valor = numero(formData, key);
  return valor === null ? null : Math.round(valor);
}

function texto(formData: FormData, key: string): string | null {
  const valor = String(formData.get(key) ?? "").trim();
  return valor || null;
}

/**
 * Grava o fechamento das semanas exibidas, todas de uma vez.
 *
 * Chega o quadro inteiro e o servidor calcula a diferença: semana com número
 * vira linha, semana esvaziada perde a linha. Apagar quando tudo fica em branco
 * é o que permite corrigir um lançamento errado sem uma ação de "excluir
 * semana" — limpar os campos É apagar.
 */
export async function saveWeeklyResults(formData: FormData): Promise<void> {
  const businessUnitId = String(formData.get("businessUnitId") ?? "");
  if (!businessUnitId) return;

  const currentUser = await assertCanEditBusinessUnit(businessUnitId);
  const db = await getDb();
  const agora = new Date();

  const semanas = formData
    .getAll("semanas")
    .map((valor) => Number(valor))
    .filter((valor) => Number.isFinite(valor));

  if (semanas.length === 0) return;

  const existentes = await db
    .select()
    .from(weeklyResult)
    .where(
      and(
        eq(weeklyResult.businessUnitId, businessUnitId),
        inArray(
          weeklyResult.weekStart,
          semanas.map((epoch) => new Date(epoch)),
        ),
      ),
    );

  const porSemana = new Map(
    existentes.map((linha) => [linha.weekStart.getTime(), linha]),
  );

  let gravadas = 0;
  let apagadas = 0;

  for (const epoch of semanas) {
    const campos = {
      revenue: numero(formData, `revenue_${epoch}`),
      sales: inteiro(formData, `sales_${epoch}`),
      leads: inteiro(formData, `leads_${epoch}`),
      mediaSpend: numero(formData, `mediaSpend_${epoch}`),
      note: texto(formData, `note_${epoch}`),
    };

    const vazia = Object.values(campos).every((valor) => valor === null);
    const existente = porSemana.get(epoch);

    if (vazia) {
      if (existente) {
        await db.delete(weeklyResult).where(eq(weeklyResult.id, existente.id));
        apagadas += 1;
      }
      continue;
    }

    const mudou =
      !existente ||
      existente.revenue !== campos.revenue ||
      existente.sales !== campos.sales ||
      existente.leads !== campos.leads ||
      existente.mediaSpend !== campos.mediaSpend ||
      existente.note !== campos.note;

    if (!mudou) continue;

    if (existente) {
      await db
        .update(weeklyResult)
        .set({ ...campos, updatedBy: currentUser.id, updatedAt: agora })
        .where(eq(weeklyResult.id, existente.id));
    } else {
      await db.insert(weeklyResult).values({
        id: newId("wkr"),
        businessUnitId,
        weekStart: new Date(epoch),
        ...campos,
        createdBy: currentUser.id,
        updatedBy: currentUser.id,
        createdAt: agora,
        updatedAt: agora,
      });
    }
    gravadas += 1;
  }

  if (gravadas === 0 && apagadas === 0) return;

  await writeAuditLog({
    actorUserId: currentUser.id,
    actorEmail: currentUser.email,
    action: "weekly_result.update",
    entityType: "business_unit",
    entityId: businessUnitId,
    summary:
      apagadas === 0
        ? `Lançou o resultado de ${gravadas} ${gravadas === 1 ? "semana" : "semanas"}`
        : `Atualizou ${gravadas} e limpou ${apagadas} ${apagadas === 1 ? "semana" : "semanas"}`,
  });

  revalidatePath("/planejamento", "layout");
  revalidatePath("/panorama", "layout");
  revalidatePath("/painel");
}

/**
 * Grava o resultado atribuído a cada iniciativa encerrada.
 *
 * Mesma regra do semanal: iniciativa sem nenhum número perde a linha, para que
 * limpar seja desfazer.
 */
export async function saveInitiativeResults(formData: FormData): Promise<void> {
  const businessUnitId = String(formData.get("businessUnitId") ?? "");
  if (!businessUnitId) return;

  const currentUser = await assertCanEditBusinessUnit(businessUnitId);
  const db = await getDb();
  const agora = new Date();

  const itens = formData.getAll("iniciativas").map(String).filter(Boolean);
  if (itens.length === 0) return;

  // Confere que os itens são mesmo desta BU: o id vem do formulário, e um id de
  // outra BU coleria um resultado onde quem enviou não pode escrever.
  const validos = await db
    .select({ id: timelineItem.id })
    .from(timelineItem)
    .innerJoin(strategyCycle, eq(timelineItem.cycleId, strategyCycle.id))
    .where(
      and(
        inArray(timelineItem.id, itens),
        eq(strategyCycle.businessUnitId, businessUnitId),
      ),
    );

  const permitidos = new Set(validos.map((linha) => linha.id));

  const existentes = await db
    .select()
    .from(initiativeResult)
    .where(inArray(initiativeResult.timelineItemId, [...permitidos]));

  const porItem = new Map(
    existentes.map((linha) => [linha.timelineItemId, linha]),
  );

  let mexidas = 0;

  for (const itemId of itens) {
    if (!permitidos.has(itemId)) continue;

    const campos = {
      revenue: numero(formData, `ini_revenue_${itemId}`),
      sales: inteiro(formData, `ini_sales_${itemId}`),
      leads: inteiro(formData, `ini_leads_${itemId}`),
      mediaSpend: numero(formData, `ini_mediaSpend_${itemId}`),
      attendance: inteiro(formData, `ini_attendance_${itemId}`),
      note: texto(formData, `ini_note_${itemId}`),
    };

    const vazia = Object.values(campos).every((valor) => valor === null);
    const existente = porItem.get(itemId);

    if (vazia) {
      if (existente) {
        await db
          .delete(initiativeResult)
          .where(eq(initiativeResult.id, existente.id));
        mexidas += 1;
      }
      continue;
    }

    if (existente) {
      await db
        .update(initiativeResult)
        .set({ ...campos, updatedBy: currentUser.id, updatedAt: agora })
        .where(eq(initiativeResult.id, existente.id));
    } else {
      await db.insert(initiativeResult).values({
        id: newId("inr"),
        timelineItemId: itemId,
        ...campos,
        createdBy: currentUser.id,
        updatedBy: currentUser.id,
        createdAt: agora,
        updatedAt: agora,
      });
    }
    mexidas += 1;
  }

  if (mexidas === 0) return;

  await writeAuditLog({
    actorUserId: currentUser.id,
    actorEmail: currentUser.email,
    action: "initiative_result.update",
    entityType: "business_unit",
    entityId: businessUnitId,
    summary: `Lançou o resultado de ${mexidas} ${mexidas === 1 ? "iniciativa" : "iniciativas"}`,
  });

  revalidatePath("/planejamento", "layout");
  revalidatePath("/panorama", "layout");
}
