"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";

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

export async function updateProfileNameAction(
  name: string,
): Promise<{ success: boolean; message: string }> {
  const currentUser = await requireUser();
  const trimmed = name.trim();

  if (!trimmed || trimmed.length < 2) {
    return {
      success: false,
      message: "O nome deve conter ao menos 2 caracteres.",
    };
  }

  const db = await getDb();
  const before = await db
    .select({ name: user.name })
    .from(user)
    .where(eq(user.id, currentUser.id))
    .get();

  await db
    .update(user)
    .set({
      name: trimmed,
      updatedAt: new Date(),
    })
    .where(eq(user.id, currentUser.id));

  await writeAuditLog({
    actorUserId: currentUser.id,
    actorEmail: currentUser.email,
    action: "user.org_change",
    entityType: "user",
    entityId: currentUser.id,
    summary: `Atualizou o nome do perfil de "${before?.name}" para "${trimmed}"`,
    beforeData: before,
    afterData: { name: trimmed },
  });

  revalidatePath("/perfil");
  revalidatePath("/organograma", "layout");
  revalidatePath("/admin/usuarios", "layout");
  revalidatePath("/planejamento", "layout");

  return {
    success: true,
    message: "Nome atualizado com sucesso!",
  };
}

/**
 * Atualiza o Time ou Área Principal do usuário no organograma.
 */
export async function updateUserPrimaryTeamAction(
  teamId: string | null,
): Promise<{ success: boolean; message: string }> {
  const currentUser = await requireUser();
  const db = await getDb();

  const targetTeamId = teamId?.trim() ? teamId.trim() : null;

  if (targetTeamId) {
    const targetTeam = await db
      .select({ id: team.id, name: team.name })
      .from(team)
      .where(and(eq(team.id, targetTeamId), eq(team.isActive, true)))
      .get();

    if (!targetTeam) {
      return {
        success: false,
        message: "Time ou área selecionada não encontrada ou inativa.",
      };
    }

    const currentMemberships = await db
      .select({
        id: teamMember.id,
        teamId: teamMember.teamId,
        isPrimary: teamMember.isPrimary,
        isLead: teamMember.isLead,
      })
      .from(teamMember)
      .where(eq(teamMember.userId, currentUser.id));

    const inTarget = currentMemberships.find((m) => m.teamId === targetTeamId);

    // Desmarca outros times como principal
    for (const m of currentMemberships) {
      if (m.teamId !== targetTeamId && m.isPrimary) {
        await db
          .update(teamMember)
          .set({ isPrimary: false })
          .where(eq(teamMember.id, m.id));
      }
    }

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
        teamId: targetTeamId,
        userId: currentUser.id,
        isLead: false,
        isPrimary: true,
        createdBy: currentUser.id,
        createdAt: new Date(),
      });
    }

    await writeAuditLog({
      actorUserId: currentUser.id,
      actorEmail: currentUser.email,
      action: "user.org_change",
      entityType: "user",
      entityId: currentUser.id,
      summary: `Atualizou seu time principal para "${targetTeam.name}"`,
      afterData: { teamId: targetTeamId, teamName: targetTeam.name },
    });

    revalidatePath("/perfil");
    revalidatePath("/organograma", "layout");
    revalidatePath("/admin/usuarios", "layout");
    revalidatePath("/planejamento", "layout");

    return {
      success: true,
      message: `Seu time foi definido como "${targetTeam.name}". Você já está posicionado no Organograma!`,
    };
  } else {
    // Desvincula do time principal
    const currentMemberships = await db
      .select({
        id: teamMember.id,
        teamId: teamMember.teamId,
        isLead: teamMember.isLead,
      })
      .from(teamMember)
      .where(eq(teamMember.userId, currentUser.id));

    for (const m of currentMemberships) {
      if (!m.isLead) {
        await db.delete(teamMember).where(eq(teamMember.id, m.id));
      } else {
        await db
          .update(teamMember)
          .set({ isPrimary: false })
          .where(eq(teamMember.id, m.id));
      }
    }

    await writeAuditLog({
      actorUserId: currentUser.id,
      actorEmail: currentUser.email,
      action: "user.org_change",
      entityType: "user",
      entityId: currentUser.id,
      summary: `Removeu o vínculo de time principal`,
    });

    revalidatePath("/perfil");
    revalidatePath("/organograma", "layout");
    revalidatePath("/admin/usuarios", "layout");

    return {
      success: true,
      message: "Time principal desvinculado com sucesso.",
    };
  }
}

/**
 * Auto-atribuição de Business Units como Leitor (Viewer) direto pelo usuário.
 * Cria vínculos em squad_member para leitura imediata sem requerer aprovação manual.
 */
export async function selfAssignReaderBUsAction(
  buIds: string[],
): Promise<{ success: boolean; message: string; count: number }> {
  const currentUser = await requireUser();
  const db = await getDb();
  const now = new Date();

  // BUs ativas no sistema
  const activeBUs = await db
    .select({
      id: businessUnit.id,
      label: businessUnit.label,
      slug: businessUnit.slug,
    })
    .from(businessUnit)
    .where(eq(businessUnit.isActive, true));

  const validBuMap = new Map(activeBUs.map((b) => [b.id, b]));
  const targetBuIds = buIds.filter((id) => validBuMap.has(id));
  const targetSet = new Set(targetBuIds);

  // Vínculos atuais de squad do usuário
  const currentMemberships = await db
    .select({
      membershipId: squadMember.id,
      squadId: squadMember.squadId,
      isLead: squadMember.isLead,
      businessUnitId: squad.businessUnitId,
    })
    .from(squadMember)
    .innerJoin(squad, eq(squadMember.squadId, squad.id))
    .where(eq(squadMember.userId, currentUser.id));

  const currentBuMembershipMap = new Map(
    currentMemberships.map((m) => [m.businessUnitId, m]),
  );

  let addedCount = 0;
  let removedCount = 0;

  // 1. Adiciona o usuário aos squads das BUs selecionadas
  for (const buId of targetBuIds) {
    if (!currentBuMembershipMap.has(buId)) {
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

  // 2. Remove o usuário dos squads das BUs desmarcadas (apenas se NÃO for líder)
  for (const [buId, membership] of currentBuMembershipMap.entries()) {
    if (!targetSet.has(buId) && !membership.isLead) {
      await db
        .delete(squadMember)
        .where(eq(squadMember.id, membership.membershipId));
      removedCount++;
    }
  }

  // 3. Auditoria
  await writeAuditLog({
    actorUserId: currentUser.id,
    actorEmail: currentUser.email,
    action: "user.org_change",
    entityType: "user",
    entityId: currentUser.id,
    summary: `Atualizou suas BUs como Leitor: ${targetSet.size} BUs (+${addedCount}, -${removedCount})`,
    afterData: { buIds: Array.from(targetSet) },
  });

  revalidatePath("/perfil");
  revalidatePath("/planejamento", "layout");
  revalidatePath("/organograma", "layout");
  revalidatePath("/admin", "layout");

  return {
    success: true,
    message: `Acessos de leitura salvos com sucesso! Você tem acesso a ${targetSet.size} Business Unit(s).`,
    count: targetSet.size,
  };
}

/**
 * Atualiza o Cargo / Função do usuário (ex: Analista de Tráfego, Designer, etc.).
 */
export async function updateUserJobTitleAction(
  jobTitleId: string | null,
): Promise<{ success: boolean; message: string }> {
  const currentUser = await requireUser();
  const db = await getDb();
  const targetId = jobTitleId?.trim() ? jobTitleId.trim() : null;

  if (targetId) {
    const targetTitle = await db
      .select({ id: jobTitle.id, name: jobTitle.name })
      .from(jobTitle)
      .where(and(eq(jobTitle.id, targetId), eq(jobTitle.isActive, true)))
      .get();

    if (!targetTitle) {
      return {
        success: false,
        message: "Cargo selecionado não encontrado ou inativo.",
      };
    }

    await db
      .update(user)
      .set({ jobTitleId: targetId, updatedAt: new Date() })
      .where(eq(user.id, currentUser.id));

    await writeAuditLog({
      actorUserId: currentUser.id,
      actorEmail: currentUser.email,
      action: "user.org_change",
      entityType: "user",
      entityId: currentUser.id,
      summary: `Atualizou seu cargo para "${targetTitle.name}"`,
      afterData: { jobTitleId: targetId, jobTitleName: targetTitle.name },
    });

    revalidatePath("/perfil");
    revalidatePath("/organograma", "layout");
    revalidatePath("/admin/usuarios", "layout");
    revalidatePath("/planejamento", "layout");

    return {
      success: true,
      message: `Seu cargo foi atualizado para "${targetTitle.name}".`,
    };
  } else {
    await db
      .update(user)
      .set({ jobTitleId: null, updatedAt: new Date() })
      .where(eq(user.id, currentUser.id));

    await writeAuditLog({
      actorUserId: currentUser.id,
      actorEmail: currentUser.email,
      action: "user.org_change",
      entityType: "user",
      entityId: currentUser.id,
      summary: "Removeu a definição de cargo do perfil",
    });

    revalidatePath("/perfil");
    revalidatePath("/organograma", "layout");
    revalidatePath("/admin/usuarios", "layout");

    return {
      success: true,
      message: "Cargo desvinculado com sucesso.",
    };
  }
}

