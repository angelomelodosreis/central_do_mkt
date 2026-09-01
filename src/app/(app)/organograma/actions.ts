"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";

import { requireAdmin } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import {
  businessUnit,
  squad,
  squadMember,
  team,
  teamMember,
  user,
} from "@/lib/db/schema";
import { loadOrgTree, wouldCreateCycle } from "@/lib/modules/access/org-tree";
import { writeAuditLog } from "@/lib/modules/audit/log";
import { newId } from "@/lib/utils/id";

function field(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function revalidateOrganograma() {
  revalidatePath("/organograma", "layout");
  revalidatePath("/admin", "layout");
  revalidatePath("/planejamento", "layout");
}

/**
 * Move uma pessoa de um squad para outro.
 *
 * É o arrastar do organograma. MOVER, e não copiar: arrastar de Dermatologia
 * para Ortopedia significa que ela deixou a primeira — se a intenção fosse
 * atender as duas, o caminho é "Adicionar squad" na ficha, que não tira nada.
 *
 * A liderança viaja com a pessoa: quem respondia por Dermatologia passa a
 * responder por Ortopedia. Descartar isso silenciosamente deixaria o squad de
 * origem sem responsável e o de destino com um vínculo raso, sem ninguém
 * perceber.
 */
export async function moveSquadMember(formData: FormData): Promise<void> {
  const admin = await requireAdmin();

  const userId = field(formData, "userId");
  const fromId = field(formData, "fromSquadId");
  const toId = field(formData, "toSquadId");

  if (!userId || !toId || fromId === toId) return;

  const db = await getDb();

  const [pessoa, destino] = await Promise.all([
    db
      .select({ id: user.id, name: user.name, status: user.status })
      .from(user)
      .where(eq(user.id, userId))
      .get(),
    db
      .select({ id: squad.id, name: squad.name })
      .from(squad)
      .where(eq(squad.id, toId))
      .get(),
  ]);

  if (!pessoa || pessoa.status !== "active" || !destino) return;

  const origem = fromId
    ? await db
        .select({
          id: squadMember.id,
          isLead: squadMember.isLead,
          name: squad.name,
        })
        .from(squadMember)
        .innerJoin(squad, eq(squadMember.squadId, squad.id))
        .where(
          and(eq(squadMember.userId, userId), eq(squadMember.squadId, fromId)),
        )
        .get()
    : undefined;

  const jaNoDestino = await db
    .select({ id: squadMember.id })
    .from(squadMember)
    .where(and(eq(squadMember.userId, userId), eq(squadMember.squadId, toId)))
    .get();

  if (!jaNoDestino) {
    await db.insert(squadMember).values({
      id: newId("sqm"),
      squadId: toId,
      userId,
      isLead: origem?.isLead ?? false,
      createdBy: admin.id,
      createdAt: new Date(),
    });
  }

  if (origem) {
    await db.delete(squadMember).where(eq(squadMember.id, origem.id));
  }

  await writeAuditLog({
    actorUserId: admin.id,
    actorEmail: admin.email,
    action: origem ? "squad.member_move" : "squad.member_add",
    entityType: "squad",
    entityId: toId,
    summary: origem
      ? `Moveu ${pessoa.name} de ${origem.name} para ${destino.name}`
      : `Adicionou ${pessoa.name} ao ${destino.name}`,
    beforeData: origem ? { squadId: fromId, isLead: origem.isLead } : undefined,
    afterData: { squadId: toId, userId },
  });

  revalidateOrganograma();
}

/**
 * Move uma pessoa de uma unidade organizacional para outra.
 *
 * O CARGO acompanha a pessoa e não é tocado aqui: quem muda de time continua
 * Designer. Era diferente quando o cargo morava no vínculo, e aquele desenho
 * obrigava a decidir, a cada arrastar, se o cargo viajava — pergunta que não
 * deveria existir.
 */
export async function moveTeamMember(formData: FormData): Promise<void> {
  const admin = await requireAdmin();

  const userId = field(formData, "userId");
  const fromId = field(formData, "fromTeamId");
  const toId = field(formData, "toTeamId");

  if (!userId || !toId || fromId === toId) return;

  const db = await getDb();

  const [pessoa, destino] = await Promise.all([
    db
      .select({ id: user.id, name: user.name, status: user.status })
      .from(user)
      .where(eq(user.id, userId))
      .get(),
    db
      .select({ id: team.id, name: team.name })
      .from(team)
      .where(eq(team.id, toId))
      .get(),
  ]);

  if (!pessoa || pessoa.status !== "active" || !destino) return;

  const origem = fromId
    ? await db
        .select({
          id: teamMember.id,
          isLead: teamMember.isLead,
          isPrimary: teamMember.isPrimary,
          name: team.name,
        })
        .from(teamMember)
        .innerJoin(team, eq(teamMember.teamId, team.id))
        .where(
          and(eq(teamMember.userId, userId), eq(teamMember.teamId, fromId)),
        )
        .get()
    : undefined;

  const jaNoDestino = await db
    .select({ id: teamMember.id })
    .from(teamMember)
    .where(and(eq(teamMember.userId, userId), eq(teamMember.teamId, toId)))
    .get();

  if (!jaNoDestino) {
    await db.insert(teamMember).values({
      id: newId("tmb"),
      teamId: toId,
      userId,
      isLead: origem?.isLead ?? false,
      isPrimary: origem?.isPrimary ?? false,
      createdBy: admin.id,
      createdAt: new Date(),
    });
  }

  if (origem) {
    await db.delete(teamMember).where(eq(teamMember.id, origem.id));
  }

  await writeAuditLog({
    actorUserId: admin.id,
    actorEmail: admin.email,
    action: "user.org_change",
    entityType: "user",
    entityId: userId,
    summary: origem
      ? `Moveu ${pessoa.name} de ${origem.name} para ${destino.name}`
      : `Colocou ${pessoa.name} em ${destino.name}`,
    beforeData: origem ? { teamId: fromId } : undefined,
    afterData: { teamId: toId },
  });

  revalidateOrganograma();
}

/**
 * Define a unidade acima de outra na estrutura.
 *
 * É o que dá forma à visão do marketing inteiro. Recusa criar ciclo: pôr
 * Conteúdo abaixo de Design, que já está abaixo de Conteúdo, faria a árvore
 * recorrer para sempre ao ser desenhada.
 */
export async function setParentOrgUnit(formData: FormData): Promise<void> {
  const admin = await requireAdmin();

  const teamId = field(formData, "teamId");
  if (!teamId) return;

  const parentId = field(formData, "parentOrgUnitId") || null;

  const arvore = await loadOrgTree();
  const alvo = arvore.byId.get(teamId);
  if (!alvo) return;
  if (wouldCreateCycle(arvore, teamId, parentId)) return;

  const db = await getDb();
  await db
    .update(team)
    .set({ parentOrgUnitId: parentId, updatedAt: new Date() })
    .where(eq(team.id, teamId));

  await writeAuditLog({
    actorUserId: admin.id,
    actorEmail: admin.email,
    action: "org_unit.update",
    entityType: "team",
    entityId: teamId,
    summary: parentId
      ? `${alvo.name} passou a responder a ${arvore.byId.get(parentId)?.name ?? "outro lugar"}`
      : `${alvo.name} passou a ser de primeiro nível`,
    beforeData: { parentOrgUnitId: alvo.parentOrgUnitId },
    afterData: { parentOrgUnitId: parentId },
  });

  revalidateOrganograma();
}

/** Cargo de uma pessoa, editado direto do organograma. */
export async function setPersonJobTitle(formData: FormData): Promise<void> {
  const admin = await requireAdmin();

  const userId = field(formData, "userId");
  if (!userId) return;

  const jobTitleId = field(formData, "jobTitleId") || null;

  const db = await getDb();
  const antes = await db
    .select({ id: user.id, name: user.name, jobTitleId: user.jobTitleId })
    .from(user)
    .where(eq(user.id, userId))
    .get();

  if (!antes) return;

  await db
    .update(user)
    .set({ jobTitleId, updatedAt: new Date() })
    .where(eq(user.id, userId));

  await writeAuditLog({
    actorUserId: admin.id,
    actorEmail: admin.email,
    action: "user.org_change",
    entityType: "user",
    entityId: userId,
    summary: `Alterou o cargo de ${antes.name} pelo organograma`,
    beforeData: { jobTitleId: antes.jobTitleId },
    afterData: { jobTitleId },
  });

  revalidateOrganograma();
}

/** Usado pelos seletores do painel lateral do organograma. */
export async function listSquadsForPicker(): Promise<
  Array<{ id: string; label: string }>
> {
  await requireAdmin();
  const db = await getDb();
  const rows = await db
    .select({ id: squad.id, label: businessUnit.label })
    .from(squad)
    .innerJoin(businessUnit, eq(squad.businessUnitId, businessUnit.id));
  return rows;
}
