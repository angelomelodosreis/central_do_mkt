"use server";

import { revalidatePath } from "next/cache";
import { eq, or } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import {
  businessUnit,
  strategyProduct,
  timelineItem,
} from "@/lib/db/schema";
import { canSeeBusinessUnit } from "@/lib/modules/access/scope";
import { writeAuditLog } from "@/lib/modules/audit/log";
import { newId } from "@/lib/utils/id";
import type { MonthlyCampaign, MonthlyCampaignType } from "./campaign-types";

async function requireEditor(businessUnitSlug: string) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { erro: "Sessão expirada. Faça login novamente." } as const;
  }

  const db = await getDb();
  const clean = businessUnitSlug.trim().toLowerCase();
  const under = clean.replace(/-/g, "_");
  const dash = clean.replace(/_/g, "-");

  const aliases: Record<string, string> = {
    "residencia-medica": "residencia",
    residencia_medica: "residencia",
    "cirurgia-geral": "cirurgia",
    cirurgia_geral: "cirurgia",
    lifehacks: "ps",
    "medcof-pronto-socorro": "ps",
    medcof_lifehacks: "ps",
    "pronto-socorro": "ps",
    otorrino: "otorrinolaringologia",
    concurso: "concursus",
    concursos: "concursus",
  };

  const target = aliases[clean] || aliases[dash] || aliases[under] || clean;

  const unit = await db
    .select({
      id: businessUnit.id,
      slug: businessUnit.slug,
      label: businessUnit.label,
    })
    .from(businessUnit)
    .where(
      or(
        eq(businessUnit.slug, clean),
        eq(businessUnit.slug, under),
        eq(businessUnit.slug, dash),
        eq(businessUnit.slug, target),
        eq(businessUnit.id, clean),
        eq(businessUnit.id, `bu_${under}`),
        eq(businessUnit.id, `bu_${target}`),
        eq(businessUnit.code, `MEDCOF_${under.toUpperCase()}`),
        eq(businessUnit.code, `MEDCOF_${target.toUpperCase()}`),
      ),
    )
    .get();

  if (!unit) return { erro: "Business Unit não encontrada." } as const;

  const noEscopo = canSeeBusinessUnit(currentUser.scope, unit.id);
  if (!noEscopo) {
    return {
      erro: `Você não tem permissão para editar campanhas de ${unit.label}.`,
    } as const;
  }

  const canEdit =
    Boolean(currentUser.permissions.strategy?.canEdit) ||
    currentUser.role === "member" ||
    currentUser.role === "editor" ||
    currentUser.role === "admin" ||
    currentUser.role === "leader" ||
    currentUser.isSuperAdmin ||
    currentUser.scope.isMasterFullAccess;

  if (!canEdit) {
    return {
      erro: `Você não tem permissão para editar o planejamento de ${unit.label}.`,
    } as const;
  }

  return { currentUser, unit } as const;
}

export async function saveMonthlyCampaignAction(data: {
  id?: string;
  cycleId: string;
  businessUnitSlug: string;
  type: MonthlyCampaignType;
  title: string;
  monthYearKey: string; // "2026-10"
  productId?: string | null;
  productName?: string | null;
  leadMagnet?: string | null;
  leadsCount?: string | null;
  personaId?: string | null;
  personaName?: string | null;
  offerDetails?: string | null;
  salesGoal?: string | null;
  channels?: string | null;
  notes?: string | null;
}): Promise<{ ok: boolean; campaign?: MonthlyCampaign; error?: string }> {
  try {
    const gate = await requireEditor(data.businessUnitSlug);
    if ("erro" in gate) return { ok: false, error: gate.erro };

    if (!data.title.trim()) {
      return { ok: false, error: "Informe o título da campanha." };
    }
    if (!data.monthYearKey) {
      return { ok: false, error: "Mês e ano da campanha são obrigatórios." };
    }

    const [yearStr, monthStr] = data.monthYearKey.split("-");
    const year = Number(yearStr);
    const month = Number(monthStr); // 1-12
    if (!year || !month) {
      return { ok: false, error: "Formato de mês/ano inválido." };
    }

    // Primeiro e último dia do mês
    const startsAt = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const endsAt = new Date(year, month, 0, 23, 59, 59, 999);

    const kind =
      data.type === "vendas"
        ? "launch"
        : data.type === "captacao"
          ? "event"
          : "communication";

    const db = await getDb();
    const now = new Date();

    // Valida se o produto informado realmente existe para evitar falha de FK no SQLite
    let validProductId: string | null = null;
    let resolvedProductName = data.productName?.trim() || null;

    if (data.productId) {
      const prodInDb = await db
        .select({ id: strategyProduct.id, name: strategyProduct.name })
        .from(strategyProduct)
        .where(eq(strategyProduct.id, data.productId))
        .get();
      if (prodInDb) {
        validProductId = prodInDb.id;
        if (!resolvedProductName) resolvedProductName = prodInDb.name;
      }
    }

    const details: Record<string, string> = {
      isMonthlyCampaign: "true",
      campaignType: data.type,
      monthYearKey: data.monthYearKey,
      productId: validProductId || data.productId || "",
      productName: resolvedProductName || "",
      leadMagnet: data.leadMagnet?.trim() || "",
      leadsCount: data.leadsCount?.trim() || "",
      personaId: data.personaId || "",
      personaName: data.personaName?.trim() || "",
      offerDetails: data.offerDetails?.trim() || "",
      salesGoal: data.salesGoal?.trim() || "",
      channels: data.channels?.trim() || "",
      notes: data.notes?.trim() || "",
    };

    let campaignId = data.id;
    let existing = null;
    if (campaignId) {
      existing = await db
        .select({ id: timelineItem.id })
        .from(timelineItem)
        .where(eq(timelineItem.id, campaignId))
        .get();
    }

    const finalCampaignId = campaignId || newId("camp");

    if (existing) {
      await db
        .update(timelineItem)
        .set({
          title: data.title.trim(),
          startsAt,
          endsAt,
          productId: validProductId,
          details,
          updatedBy: gate.currentUser.id,
          updatedAt: now,
        })
        .where(eq(timelineItem.id, finalCampaignId));

      await writeAuditLog({
        actorUserId: gate.currentUser.id,
        actorEmail: gate.currentUser.email,
        action: "timeline_item.update",
        entityType: "timeline_item",
        entityId: finalCampaignId,
        summary: `Atualizou campanha de ${data.type} ("${data.title}") para ${data.monthYearKey} em ${gate.unit.label}`,
      });
    } else {
      await db.insert(timelineItem).values({
        id: finalCampaignId,
        cycleId: data.cycleId,
        kind,
        title: data.title.trim(),
        summary: `Campanha de ${data.type} para o mês ${data.monthYearKey}`,
        startsAt,
        endsAt,
        productId: validProductId,
        owner: gate.currentUser.name || null,
        status: "confirmed",
        details,
        createdBy: gate.currentUser.id,
        updatedBy: gate.currentUser.id,
        createdAt: now,
        updatedAt: now,
      });

      await writeAuditLog({
        actorUserId: gate.currentUser.id,
        actorEmail: gate.currentUser.email,
        action: "timeline_item.create",
        entityType: "timeline_item",
        entityId: finalCampaignId,
        summary: `Criou campanha de ${data.type} ("${data.title}") para ${data.monthYearKey} em ${gate.unit.label}`,
      });
    }

    revalidatePath(`/planejamento/${gate.unit.slug}/calendario`);
    if (data.businessUnitSlug !== gate.unit.slug) {
      revalidatePath(`/planejamento/${data.businessUnitSlug}/calendario`);
    }
    revalidatePath(`/planejamento/${gate.unit.slug}`, "layout");
    revalidatePath("/planejamento");

    return {
      ok: true,
      campaign: {
        id: finalCampaignId,
        cycleId: data.cycleId,
        type: data.type,
        title: data.title.trim(),
        monthYearKey: data.monthYearKey,
        productId: validProductId || data.productId || null,
        productName: resolvedProductName,
        leadMagnet: data.leadMagnet?.trim() || null,
        leadsCount: data.leadsCount?.trim() || null,
        personaId: data.personaId || null,
        personaName: data.personaName?.trim() || null,
        offerDetails: data.offerDetails?.trim() || null,
        salesGoal: data.salesGoal?.trim() || null,
        channels: data.channels?.trim() || null,
        notes: data.notes?.trim() || null,
      },
    };
  } catch (err: any) {
    return { ok: false, error: err?.message || "Erro ao salvar campanha." };
  }
}

export async function deleteMonthlyCampaignAction(
  campaignId: string,
  businessUnitSlug: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const gate = await requireEditor(businessUnitSlug);
    if ("erro" in gate) return { ok: false, error: gate.erro };

    const db = await getDb();
    await db.delete(timelineItem).where(eq(timelineItem.id, campaignId));

    await writeAuditLog({
      actorUserId: gate.currentUser.id,
      actorEmail: gate.currentUser.email,
      action: "timeline_item.delete",
      entityType: "timeline_item",
      entityId: campaignId,
      summary: `Excluiu campanha de marketing em ${gate.unit.label}`,
    });

    revalidatePath(`/planejamento/${gate.unit.slug}/calendario`);
    if (businessUnitSlug !== gate.unit.slug) {
      revalidatePath(`/planejamento/${businessUnitSlug}/calendario`);
    }
    revalidatePath(`/planejamento/${gate.unit.slug}`, "layout");
    revalidatePath("/planejamento");
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || "Erro ao excluir campanha." };
  }
}
