"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";

import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import {
  businessUnit,
  buAccessRequest,
  jobTitle,
  squad,
  squadMember,
  team,
  teamMember,
  user,
} from "@/lib/db/schema";
import { writeAuditLog } from "@/lib/modules/audit/log";
import { newId } from "@/lib/utils/id";

export type OnboardingSetupInput = {
  teamId?: string | null;
  businessUnitIds: string[];
  jobTitleId?: string | null;
};

/**
 * Salva a configuração inicial do colaborador (Cargo, Time no Organograma e BUs como Leitor).
 */
export async function saveUserOnboardingSetupAction(
  input: OnboardingSetupInput,
): Promise<{ success: boolean; message: string }> {
  const currentUser = await requireUser();
  const db = await getDb();
  const now = new Date();

  // 1. Atualiza Cargo / Função se selecionado
  if (input.jobTitleId) {
    const cargo = await db
      .select({ id: jobTitle.id, name: jobTitle.name })
      .from(jobTitle)
      .where(and(eq(jobTitle.id, input.jobTitleId), eq(jobTitle.isActive, true)))
      .get();

    if (cargo) {
      await db
        .update(user)
        .set({ jobTitleId: cargo.id, updatedAt: now })
        .where(eq(user.id, currentUser.id));

      await writeAuditLog({
        actorUserId: currentUser.id,
        actorEmail: currentUser.email,
        action: "user.org_change",
        entityType: "user",
        entityId: currentUser.id,
        summary: `Definiu seu cargo inicial como "${cargo.name}" via onboarding`,
        afterData: { jobTitleId: cargo.id, jobTitleName: cargo.name },
      });
    }
  }

  // 2. Atualiza Time / Área Principal se selecionado
  if (input.teamId) {
    const time = await db
      .select({ id: team.id, name: team.name })
      .from(team)
      .where(and(eq(team.id, input.teamId), eq(team.isActive, true)))
      .get();

    if (time) {
      const existingMemberships = await db
        .select({
          id: teamMember.id,
          teamId: teamMember.teamId,
          isPrimary: teamMember.isPrimary,
        })
        .from(teamMember)
        .where(eq(teamMember.userId, currentUser.id));

      for (const m of existingMemberships) {
        if (m.teamId !== time.id && m.isPrimary) {
          await db
            .update(teamMember)
            .set({ isPrimary: false })
            .where(eq(teamMember.id, m.id));
        }
      }

      const inTarget = existingMemberships.find((m) => m.teamId === time.id);
      if (inTarget) {
        if (!inTarget.isPrimary) {
          await db
            .update(teamMember)
            .set({ isPrimary: true })
            .where(eq(teamMember.id, inTarget.id));
        }
      } else {
        await db.insert(teamMember).values({
          id: newId("tmb"),
          teamId: time.id,
          userId: currentUser.id,
          isLead: false,
          isPrimary: true,
          createdBy: currentUser.id,
          createdAt: now,
        });
      }

      await writeAuditLog({
        actorUserId: currentUser.id,
        actorEmail: currentUser.email,
        action: "user.org_change",
        entityType: "user",
        entityId: currentUser.id,
        summary: `Definiu seu time inicial como "${time.name}" via onboarding`,
        afterData: { teamId: time.id, teamName: time.name },
      });
    }
  }

  // 2. Atualiza Business Units e Squads de atuação como Leitor
  if (input.businessUnitIds && input.businessUnitIds.length > 0) {
    const activeBUs = await db
      .select({
        id: businessUnit.id,
        label: businessUnit.label,
        slug: businessUnit.slug,
      })
      .from(businessUnit)
      .where(eq(businessUnit.isActive, true));

    const validBuMap = new Map(activeBUs.map((b) => [b.id, b]));
    const targetBuIds = input.businessUnitIds.filter((id) => validBuMap.has(id));

    const currentSquadMemberships = await db
      .select({
        membershipId: squadMember.id,
        squadId: squadMember.squadId,
        isLead: squadMember.isLead,
        businessUnitId: squad.businessUnitId,
      })
      .from(squadMember)
      .innerJoin(squad, eq(squadMember.squadId, squad.id))
      .where(eq(squadMember.userId, currentUser.id));

    const currentBuMap = new Map(
      currentSquadMemberships.map((m) => [m.businessUnitId, m]),
    );

    let addedCount = 0;

    for (const buId of targetBuIds) {
      if (!currentBuMap.has(buId)) {
        let targetSquad = await db
          .select({ id: squad.id })
          .from(squad)
          .where(eq(squad.businessUnitId, buId))
          .get();

        if (!targetSquad) {
          const buInfo = validBuMap.get(buId);
          if (buInfo) {
            const squadId = newId("sqd");
            await db.insert(squad).values({
              id: squadId,
              businessUnitId: buId,
              slug: buInfo.slug,
              name: `Squad ${buInfo.label}`,
              isActive: true,
              createdBy: currentUser.id,
              createdAt: now,
              updatedAt: now,
            });
            targetSquad = { id: squadId };
          }
        }

        if (targetSquad) {
          await db.insert(squadMember).values({
            id: newId("sqm"),
            squadId: targetSquad.id,
            userId: currentUser.id,
            isLead: false,
            createdBy: currentUser.id,
            createdAt: now,
          });
          addedCount++;
        }

        // Converte qualquer solicitação pendente anterior dessa BU em aprovada
        await db
          .update(buAccessRequest)
          .set({
            status: "approved",
            reviewedAt: now,
            reviewedBy: currentUser.id,
          })
          .where(
            and(
              eq(buAccessRequest.userId, currentUser.id),
              eq(buAccessRequest.businessUnitId, buId),
              eq(buAccessRequest.status, "pending"),
            ),
          );
      }
    }

    await writeAuditLog({
      actorUserId: currentUser.id,
      actorEmail: currentUser.email,
      action: "user.org_change",
      entityType: "user",
      entityId: currentUser.id,
      summary: `Auto-atribuição inicial de ${targetBuIds.length} BUs como Leitor no onboarding (+${addedCount})`,
      afterData: { buIds: targetBuIds },
    });
  }

  revalidatePath("/", "layout");
  revalidatePath("/perfil");
  revalidatePath("/organograma", "layout");
  revalidatePath("/planejamento", "layout");
  revalidatePath("/painel");

  return {
    success: true,
    message: "Perfil configurado com sucesso! Bem-vindo(a) à Central do Marketing.",
  };
}
