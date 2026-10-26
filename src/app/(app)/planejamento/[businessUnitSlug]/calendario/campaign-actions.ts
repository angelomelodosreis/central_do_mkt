"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { requirePermission } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { businessUnit, strategyCycle, timelineItem } from "@/lib/db/schema";
import { canSeeBusinessUnit } from "@/lib/modules/access/scope";
import { writeAuditLog } from "@/lib/modules/audit/log";
import { newId } from "@/lib/utils/id";
import type { MonthlyCampaign, MonthlyCampaignType } from "./campaign-types";

async function requireEditor(businessUnitSlug: string) {
  const currentUser = await requirePermission("strategy", "edit");
  const db = await getDb();
  const unit = await db
    .select({
      id: businessUnit.id,
      slug: businessUnit.slug,
      label: businessUnit.label,
    })
    .from(businessUnit)
    .where(eq(businessUnit.slug, businessUnitSlug))
    .get();

  if (!unit) return { erro: "Business Unit não encontrada." } as const;

  const noEscopo = canSeeBusinessUnit(currentUser.scope, unit.id);
  if (!noEscopo) {
    return {
      erro: `Você não tem permissão para editar campanhas de ${unit.label}.`,
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

    const details: Record<string, string> = {
      isMonthlyCampaign: "true",
      campaignType: data.type,
      monthYearKey: data.monthYearKey,
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

    if (campaignId) {
      await db
        .update(timelineItem)
        .set({
          title: data.title.trim(),
          startsAt,
          endsAt,
          productId: data.productId || null,
          details,
          updatedBy: gate.currentUser.id,
          updatedAt: now,
        })
        .where(eq(timelineItem.id, campaignId));

      await writeAuditLog({
        actorUserId: gate.currentUser.id,
        actorEmail: gate.currentUser.email,
        action: "timeline_item.update",
        entityType: "timeline_item",
        entityId: campaignId,
        summary: `Atualizou campanha de ${data.type} ("${data.title}") para ${data.monthYearKey} em ${gate.unit.label}`,
      });
    } else {
      campaignId = newId("camp");
      await db.insert(timelineItem).values({
        id: campaignId,
        cycleId: data.cycleId,
        kind,
        title: data.title.trim(),
        summary: `Campanha de ${data.type} para o mês ${data.monthYearKey}`,
        startsAt,
        endsAt,
        productId: data.productId || null,
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
        entityId: campaignId,
        summary: `Criou campanha de ${data.type} ("${data.title}") para ${data.monthYearKey} em ${gate.unit.label}`,
      });
    }

    revalidatePath(`/planejamento/${data.businessUnitSlug}/calendario`);

    return {
      ok: true,
      campaign: {
        id: campaignId,
        cycleId: data.cycleId,
        type: data.type,
        title: data.title.trim(),
        monthYearKey: data.monthYearKey,
        productId: data.productId || null,
        productName: data.productName || null,
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

    revalidatePath(`/planejamento/${businessUnitSlug}/calendario`);
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || "Erro ao excluir campanha." };
  }
}
