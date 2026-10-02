import { and, desc, eq, inArray } from "drizzle-orm";

import { getDb } from "@/lib/db/client";
import {
  accessGrant,
  buAccessRequest,
  businessUnit,
  squad,
  squadMember,
  user,
} from "@/lib/db/schema";
import { newId } from "@/lib/utils/id";

export type BuRequestItem = {
  id: string;
  businessUnitId: string;
  businessUnitLabel: string;
  businessUnitCode: string | null;
  businessUnitSlug: string;
  status: "pending" | "approved" | "rejected";
  note: string | null;
  requestedAt: Date;
};

/**
 * Busca as solicitações de acesso a BUs de um usuário específico.
 */
export async function getUserBuRequests(
  userId: string,
): Promise<BuRequestItem[]> {
  const db = await getDb();

  const rows = await db
    .select({
      id: buAccessRequest.id,
      businessUnitId: buAccessRequest.businessUnitId,
      businessUnitLabel: businessUnit.label,
      businessUnitCode: businessUnit.code,
      businessUnitSlug: businessUnit.slug,
      status: buAccessRequest.status,
      note: buAccessRequest.note,
      requestedAt: buAccessRequest.requestedAt,
    })
    .from(buAccessRequest)
    .innerJoin(
      businessUnit,
      eq(buAccessRequest.businessUnitId, businessUnit.id),
    )
    .where(eq(buAccessRequest.userId, userId))
    .orderBy(desc(buAccessRequest.requestedAt));

  return rows;
}

/**
 * Salva as solicitações de BUs selecionadas por um usuário (substitui/atualiza as pendentes).
 */
export async function submitBuRequests(
  userId: string,
  businessUnitIds: string[],
  note?: string,
): Promise<{ success: boolean; count: number }> {
  if (!userId || businessUnitIds.length === 0) {
    return { success: false, count: 0 };
  }

  const db = await getDb();
  const now = new Date();

  // Remove solicitações pendentes anteriores para evitar duplicações
  await db
    .delete(buAccessRequest)
    .where(
      and(
        eq(buAccessRequest.userId, userId),
        eq(buAccessRequest.status, "pending"),
      ),
    );

  // Insere as novas solicitações pendentes
  for (const buId of businessUnitIds) {
    await db.insert(buAccessRequest).values({
      id: newId("bar"),
      userId,
      businessUnitId: buId,
      note: note || null,
      status: "pending",
      requestedAt: now,
    });
  }

  return { success: true, count: businessUnitIds.length };
}

/**
 * Aprova e concede acesso imediato às BUs solicitadas pelo usuário.
 * Cria vínculos em `squad_member` para cada BU aprovada.
 */
export async function grantRequestedBuAccess(
  userId: string,
  adminId: string,
  specificBuIds?: string[],
): Promise<number> {
  const db = await getDb();
  const now = new Date();

  // Localiza as solicitações pendentes
  const pendingRequests = await db
    .select({
      id: buAccessRequest.id,
      businessUnitId: buAccessRequest.businessUnitId,
    })
    .from(buAccessRequest)
    .where(
      and(
        eq(buAccessRequest.userId, userId),
        eq(buAccessRequest.status, "pending"),
        specificBuIds && specificBuIds.length > 0
          ? inArray(buAccessRequest.businessUnitId, specificBuIds)
          : undefined,
      ),
    );

  if (pendingRequests.length === 0) return 0;

  const buIds = pendingRequests.map((r) => r.businessUnitId);

  // Atualiza as solicitações para 'approved'
  await db
    .update(buAccessRequest)
    .set({
      status: "approved",
      reviewedAt: now,
      reviewedBy: adminId,
    })
    .where(
      inArray(
        buAccessRequest.id,
        pendingRequests.map((r) => r.id),
      ),
    );

  // Encontra ou assegura squads para cada BU
  for (const buId of buIds) {
    let targetSquad = await db
      .select({ id: squad.id })
      .from(squad)
      .where(eq(squad.businessUnitId, buId))
      .get();

    if (!targetSquad) {
      // Cria squad caso ainda não existisse
      const bu = await db
        .select({ slug: businessUnit.slug, label: businessUnit.label })
        .from(businessUnit)
        .where(eq(businessUnit.id, buId))
        .get();

      if (bu) {
        const squadId = newId("sqd");
        await db.insert(squad).values({
          id: squadId,
          businessUnitId: buId,
          slug: bu.slug,
          name: `Squad ${bu.label}`,
          isActive: true,
          createdBy: adminId,
          createdAt: now,
          updatedAt: now,
        });
        targetSquad = { id: squadId };
      }
    }

    if (targetSquad) {
      // Vincula o usuário ao squad da BU
      const existingMember = await db
        .select({ id: squadMember.id })
        .from(squadMember)
        .where(
          and(
            eq(squadMember.squadId, targetSquad.id),
            eq(squadMember.userId, userId),
          ),
        )
        .get();

      if (!existingMember) {
        await db.insert(squadMember).values({
          id: newId("sqm"),
          squadId: targetSquad.id,
          userId,
          isLead: false,
          createdBy: adminId,
          createdAt: now,
        });
      }
    } else {
      // Fallback: concede accessGrant direto
      const existingGrant = await db
        .select({ id: accessGrant.id })
        .from(accessGrant)
        .where(
          and(
            eq(accessGrant.userId, userId),
            eq(accessGrant.scopeType, "business_unit"),
            eq(accessGrant.scopeId, buId),
          ),
        )
        .get();

      if (!existingGrant) {
        await db.insert(accessGrant).values({
          id: newId("agr"),
          userId,
          scopeType: "business_unit",
          scopeId: buId,
          note: "Aprovado via solicitação de BU",
          grantedBy: adminId,
          createdAt: now,
        });
      }
    }
  }

  return buIds.length;
}

/**
 * Busca todas as solicitações pendentes agrupadas por usuário.
 */
export async function getPendingBuRequestsSummary(): Promise<
  Map<string, { count: number; buLabels: string[]; note: string | null }>
> {
  const db = await getDb();

  const rows = await db
    .select({
      userId: buAccessRequest.userId,
      buLabel: businessUnit.label,
      note: buAccessRequest.note,
    })
    .from(buAccessRequest)
    .innerJoin(
      businessUnit,
      eq(buAccessRequest.businessUnitId, businessUnit.id),
    )
    .where(eq(buAccessRequest.status, "pending"));

  const map = new Map<
    string,
    { count: number; buLabels: string[]; note: string | null }
  >();

  for (const row of rows) {
    const existing = map.get(row.userId) ?? {
      count: 0,
      buLabels: [],
      note: row.note,
    };
    existing.count += 1;
    existing.buLabels.push(row.buLabel);
    if (!existing.note && row.note) existing.note = row.note;
    map.set(row.userId, existing);
  }

  return map;
}
