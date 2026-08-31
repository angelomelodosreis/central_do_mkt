"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull } from "drizzle-orm";

import type { OrgFormState } from "./form-state";
import { requireAdmin } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import {
  accessGrant,
  businessDivision,
  businessUnit,
  jobTitle,
  squad,
  squadMember,
  team,
  teamMember,
  user,
  ORG_UNIT_KINDS,
  SCOPE_TYPES,
  type OrgUnitKind,
  type ScopeType,
} from "@/lib/db/schema";
import { loadOrgTree, wouldCreateCycle } from "@/lib/modules/access/org-tree";
import { writeAuditLog } from "@/lib/modules/audit/log";
import { toKebabCase } from "@/lib/modules/documentation/slug";
import { newId } from "@/lib/utils/id";

function field(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function isKind(value: string): value is OrgUnitKind {
  return (ORG_UNIT_KINDS as readonly string[]).includes(value);
}

function isScopeType(value: string): value is ScopeType {
  return (SCOPE_TYPES as readonly string[]).includes(value);
}

/**
 * Revalida onde a estrutura organizacional aparece.
 *
 * É mais lugar do que parece: o seletor de destinatário das tarefas, o squad de
 * cada BU e o rodapé de quem está logado todos mostram unidade e cargo.
 */
function revalidateOrgViews() {
  revalidatePath("/admin", "layout");
  revalidatePath("/organograma", "layout");
  revalidatePath("/planejamento", "layout");
  revalidatePath("/tarefas", "layout");
  revalidatePath("/documentacao", "layout");
}

// ---------------------------------------------------------------------------
// Unidades organizacionais (setor / subsetor / time)
// ---------------------------------------------------------------------------

export async function createOrgUnit(
  _previousState: OrgFormState,
  formData: FormData,
): Promise<OrgFormState> {
  const admin = await requireAdmin();

  const name = field(formData, "name");
  const description = field(formData, "description");
  const kindRaw = field(formData, "kind") || "team";
  const parentId = field(formData, "parentOrgUnitId") || null;

  if (!name) return { status: "error", message: "Informe o nome da unidade." };
  if (!isKind(kindRaw)) {
    return { status: "error", message: "Nível inválido." };
  }

  const slug = toKebabCase(name);
  if (!slug) {
    return {
      status: "error",
      message: "O nome precisa ter ao menos uma letra ou número.",
    };
  }

  const db = await getDb();
  const duplicate = await db
    .select({ id: team.id })
    .from(team)
    .where(eq(team.slug, slug))
    .get();

  if (duplicate) {
    return {
      status: "error",
      message: `Já existe uma unidade chamada "${name}".`,
    };
  }

  if (parentId) {
    const pai = await db
      .select({ id: team.id })
      .from(team)
      .where(eq(team.id, parentId))
      .get();
    if (!pai) {
      return { status: "error", message: "A unidade acima não existe mais." };
    }
  }

  const orgUnitId = newId("team");
  const now = new Date();

  await db.insert(team).values({
    id: orgUnitId,
    slug,
    name,
    description: description || null,
    kind: kindRaw,
    isActive: true,
    sortOrder: 100,
    parentOrgUnitId: parentId,
    createdBy: admin.id,
    createdAt: now,
    updatedAt: now,
  });

  await writeAuditLog({
    actorUserId: admin.id,
    actorEmail: admin.email,
    action: "org_unit.create",
    entityType: "team",
    entityId: orgUnitId,
    summary: `Criou a unidade "${name}"`,
    afterData: { name, slug, kind: kindRaw, parentOrgUnitId: parentId },
  });

  revalidateOrgViews();
  return { status: "success", message: `"${name}" criada.` };
}

/** Edita nome, descrição, nível e a unidade acima. O slug não muda. */
export async function updateOrgUnit(formData: FormData): Promise<void> {
  const admin = await requireAdmin();

  const orgUnitId = field(formData, "teamId");
  const name = field(formData, "name");
  if (!orgUnitId || !name) return;

  const db = await getDb();
  const before = await db
    .select()
    .from(team)
    .where(eq(team.id, orgUnitId))
    .get();
  if (!before) return;

  const description = field(formData, "description");
  const kindRaw = field(formData, "kind");
  const kind = isKind(kindRaw) ? kindRaw : before.kind;

  // "sem unidade acima" e "campo não enviado" são coisas diferentes: o primeiro
  // promove a unidade a raiz, o segundo não deveria mexer nela. O formulário
  // sempre envia o campo, então ausência é raiz.
  const parentRaw = formData.has("parentOrgUnitId")
    ? field(formData, "parentOrgUnitId") || null
    : before.parentOrgUnitId;

  const arvore = await loadOrgTree();
  if (wouldCreateCycle(arvore, orgUnitId, parentRaw)) return;

  await db
    .update(team)
    .set({
      name,
      description: description || null,
      kind,
      parentOrgUnitId: parentRaw,
      updatedAt: new Date(),
    })
    .where(eq(team.id, orgUnitId));

  await writeAuditLog({
    actorUserId: admin.id,
    actorEmail: admin.email,
    action: "org_unit.update",
    entityType: "team",
    entityId: orgUnitId,
    summary: `Editou a unidade "${before.name}"`,
    beforeData: {
      name: before.name,
      description: before.description,
      kind: before.kind,
      parentOrgUnitId: before.parentOrgUnitId,
    },
    afterData: {
      name,
      description: description || null,
      kind,
      parentOrgUnitId: parentRaw,
    },
  });

  revalidateOrgViews();
}

/**
 * Ativa ou desativa uma unidade.
 *
 * Sem exclusão: tarefas antigas apontam para ela, e apagá-la deixaria o
 * histórico sem dizer para quem aquele trabalho tinha ido.
 */
export async function toggleOrgUnit(formData: FormData): Promise<void> {
  const admin = await requireAdmin();

  const orgUnitId = field(formData, "teamId");
  if (!orgUnitId) return;

  const db = await getDb();
  const before = await db
    .select()
    .from(team)
    .where(eq(team.id, orgUnitId))
    .get();
  if (!before) return;

  const nextIsActive = !before.isActive;

  await db
    .update(team)
    .set({ isActive: nextIsActive, updatedAt: new Date() })
    .where(eq(team.id, orgUnitId));

  await writeAuditLog({
    actorUserId: admin.id,
    actorEmail: admin.email,
    action: "org_unit.toggle",
    entityType: "team",
    entityId: orgUnitId,
    summary: nextIsActive
      ? `Reativou a unidade "${before.name}"`
      : `Desativou a unidade "${before.name}"`,
    beforeData: { isActive: before.isActive },
    afterData: { isActive: nextIsActive },
  });

  revalidateOrgViews();
}

// ---------------------------------------------------------------------------
// Cargos — catálogo global
// ---------------------------------------------------------------------------

export async function createJobTitle(
  _previousState: OrgFormState,
  formData: FormData,
): Promise<OrgFormState> {
  const admin = await requireAdmin();

  const name = field(formData, "name");
  if (!name) return { status: "error", message: "Informe o nome do cargo." };

  const slug = toKebabCase(name);
  if (!slug) {
    return {
      status: "error",
      message: "O nome precisa ter ao menos uma letra ou número.",
    };
  }

  const db = await getDb();
  const duplicate = await db
    .select({ id: jobTitle.id })
    .from(jobTitle)
    .where(eq(jobTitle.slug, slug))
    .get();

  if (duplicate) {
    return { status: "error", message: `Já existe o cargo "${name}".` };
  }

  const suggestedTeamId = field(formData, "suggestedTeamId") || null;
  const sortOrderRaw = Number(field(formData, "sortOrder"));
  const jobTitleId = newId("job");
  const now = new Date();

  await db.insert(jobTitle).values({
    id: jobTitleId,
    slug,
    name,
    suggestedTeamId,
    sortOrder:
      Number.isFinite(sortOrderRaw) && sortOrderRaw > 0 ? sortOrderRaw : 50,
    isActive: true,
    createdBy: admin.id,
    createdAt: now,
    updatedAt: now,
  });

  await writeAuditLog({
    actorUserId: admin.id,
    actorEmail: admin.email,
    action: "job_title.create",
    entityType: "job_title",
    entityId: jobTitleId,
    summary: `Criou o cargo "${name}"`,
    afterData: { name, slug, suggestedTeamId },
  });

  revalidateOrgViews();
  return { status: "success", message: `Cargo "${name}" criado.` };
}

/** Edita nome, unidade sugerida e senioridade de um cargo. */
export async function updateJobTitle(formData: FormData): Promise<void> {
  const admin = await requireAdmin();

  const jobTitleId = field(formData, "jobTitleId");
  const name = field(formData, "name");
  if (!jobTitleId || !name) return;

  const db = await getDb();
  const before = await db
    .select()
    .from(jobTitle)
    .where(eq(jobTitle.id, jobTitleId))
    .get();
  if (!before) return;

  const suggestedTeamId = field(formData, "suggestedTeamId") || null;
  const sortOrderRaw = Number(field(formData, "sortOrder"));

  await db
    .update(jobTitle)
    .set({
      name,
      suggestedTeamId,
      sortOrder:
        Number.isFinite(sortOrderRaw) && sortOrderRaw > 0
          ? sortOrderRaw
          : before.sortOrder,
      updatedAt: new Date(),
    })
    .where(eq(jobTitle.id, jobTitleId));

  await writeAuditLog({
    actorUserId: admin.id,
    actorEmail: admin.email,
    action: "job_title.update",
    entityType: "job_title",
    entityId: jobTitleId,
    summary: `Editou o cargo "${before.name}"`,
    beforeData: before,
    afterData: { name, suggestedTeamId },
  });

  revalidateOrgViews();
}

/** Ativa ou desativa um cargo — some do seletor, permanece no histórico. */
export async function toggleJobTitle(formData: FormData): Promise<void> {
  const admin = await requireAdmin();

  const jobTitleId = field(formData, "jobTitleId");
  if (!jobTitleId) return;

  const db = await getDb();
  const before = await db
    .select()
    .from(jobTitle)
    .where(eq(jobTitle.id, jobTitleId))
    .get();
  if (!before) return;

  await db
    .update(jobTitle)
    .set({ isActive: !before.isActive, updatedAt: new Date() })
    .where(eq(jobTitle.id, jobTitleId));

  await writeAuditLog({
    actorUserId: admin.id,
    actorEmail: admin.email,
    action: "job_title.toggle",
    entityType: "job_title",
    entityId: jobTitleId,
    summary: before.isActive
      ? `Desativou o cargo "${before.name}"`
      : `Reativou o cargo "${before.name}"`,
    beforeData: { isActive: before.isActive },
    afterData: { isActive: !before.isActive },
  });

  revalidateOrgViews();
}

/**
 * Exclui um cargo.
 *
 * Só quando ninguém o ocupa. Apagar um cargo em uso deixaria pessoas apontando
 * para nada — e o cargo simplesmente desapareceria do perfil delas, sem ninguém
 * perceber. Ocupado, o caminho é desativar.
 */
export async function deleteJobTitle(formData: FormData): Promise<void> {
  const admin = await requireAdmin();

  const jobTitleId = field(formData, "jobTitleId");
  if (!jobTitleId) return;

  const db = await getDb();
  const before = await db
    .select()
    .from(jobTitle)
    .where(eq(jobTitle.id, jobTitleId))
    .get();

  if (!before) return;

  const inUse = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.jobTitleId, jobTitleId))
    .get();

  if (inUse) return;

  await db.delete(jobTitle).where(eq(jobTitle.id, jobTitleId));

  await writeAuditLog({
    actorUserId: admin.id,
    actorEmail: admin.email,
    action: "job_title.delete",
    entityType: "job_title",
    entityId: jobTitleId,
    summary: `Excluiu o cargo "${before.name}"`,
    beforeData: before,
  });

  revalidateOrgViews();
}

/** Define o cargo de uma pessoa. Cargo é descrição, nunca permissão. */
export async function setUserJobTitle(formData: FormData): Promise<void> {
  const admin = await requireAdmin();

  const userId = field(formData, "userId");
  if (!userId) return;

  const jobTitleId = field(formData, "jobTitleId") || null;

  const db = await getDb();
  const before = await db
    .select({ id: user.id, name: user.name, jobTitleId: user.jobTitleId })
    .from(user)
    .where(eq(user.id, userId))
    .get();
  if (!before) return;

  if (jobTitleId) {
    const cargo = await db
      .select({ id: jobTitle.id })
      .from(jobTitle)
      .where(eq(jobTitle.id, jobTitleId))
      .get();
    if (!cargo) return;
  }

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
    summary: `Alterou o cargo de ${before.name}`,
    beforeData: { jobTitleId: before.jobTitleId },
    afterData: { jobTitleId },
  });

  revalidateOrgViews();
}

// ---------------------------------------------------------------------------
// Vínculos com unidades organizacionais
// ---------------------------------------------------------------------------

/**
 * Coloca uma pessoa numa unidade.
 *
 * Acrescenta um vínculo — a pessoa pode estar em várias. O primeiro entra como
 * principal, que é o que a interface usa nos lugares de uma linha só.
 */
export async function addTeamMembership(formData: FormData): Promise<void> {
  const admin = await requireAdmin();

  const userId = field(formData, "userId");
  const teamId = field(formData, "teamId");
  if (!userId || !teamId) return;

  const db = await getDb();
  const [pessoa, unidade] = await Promise.all([
    db
      .select({ id: user.id, name: user.name, status: user.status })
      .from(user)
      .where(eq(user.id, userId))
      .get(),
    db
      .select({ id: team.id, name: team.name })
      .from(team)
      .where(eq(team.id, teamId))
      .get(),
  ]);

  if (!pessoa || pessoa.status !== "active" || !unidade) return;

  const existente = await db
    .select({ id: teamMember.id })
    .from(teamMember)
    .where(and(eq(teamMember.teamId, teamId), eq(teamMember.userId, userId)))
    .get();

  if (existente) return;

  const jaTemPrincipal = await db
    .select({ id: teamMember.id })
    .from(teamMember)
    .where(and(eq(teamMember.userId, userId), eq(teamMember.isPrimary, true)))
    .get();

  await db.insert(teamMember).values({
    id: newId("tmb"),
    teamId,
    userId,
    isLead: false,
    isPrimary: !jaTemPrincipal,
    createdBy: admin.id,
    createdAt: new Date(),
  });

  await writeAuditLog({
    actorUserId: admin.id,
    actorEmail: admin.email,
    action: "user.org_change",
    entityType: "user",
    entityId: userId,
    summary: `${pessoa.name} entrou em ${unidade.name}`,
    afterData: { teamId },
  });

  revalidateOrgViews();
}

/**
 * Elege a unidade principal da pessoa.
 *
 * Uma por pessoa: é a que aparece onde só cabe uma linha. Marcar uma desmarca a
 * anterior na mesma gravação, senão a interface passaria a ter dois candidatos
 * e escolheria por ordem de consulta.
 */
export async function setPrimaryTeam(formData: FormData): Promise<void> {
  const admin = await requireAdmin();

  const membershipId = field(formData, "membershipId");
  if (!membershipId) return;

  const db = await getDb();
  const alvo = await db
    .select({ id: teamMember.id, userId: teamMember.userId })
    .from(teamMember)
    .where(eq(teamMember.id, membershipId))
    .get();

  if (!alvo) return;

  await db
    .update(teamMember)
    .set({ isPrimary: false })
    .where(eq(teamMember.userId, alvo.userId));
  await db
    .update(teamMember)
    .set({ isPrimary: true })
    .where(eq(teamMember.id, membershipId));

  await writeAuditLog({
    actorUserId: admin.id,
    actorEmail: admin.email,
    action: "user.org_change",
    entityType: "user",
    entityId: alvo.userId,
    summary: "Definiu a unidade principal de uma pessoa",
    afterData: { membershipId },
  });

  revalidateOrgViews();
}

/** Marca ou desmarca a pessoa como responsável pela unidade. */
export async function toggleTeamLead(formData: FormData): Promise<void> {
  const admin = await requireAdmin();

  const membershipId = field(formData, "membershipId");
  if (!membershipId) return;

  const db = await getDb();
  const alvo = await db
    .select({
      id: teamMember.id,
      userId: teamMember.userId,
      isLead: teamMember.isLead,
    })
    .from(teamMember)
    .where(eq(teamMember.id, membershipId))
    .get();

  if (!alvo) return;

  await db
    .update(teamMember)
    .set({ isLead: !alvo.isLead })
    .where(eq(teamMember.id, membershipId));

  await writeAuditLog({
    actorUserId: admin.id,
    actorEmail: admin.email,
    action: "user.org_change",
    entityType: "user",
    entityId: alvo.userId,
    summary: alvo.isLead
      ? "Deixou de responder por uma unidade"
      : "Passou a responder por uma unidade",
    beforeData: { isLead: alvo.isLead },
    afterData: { isLead: !alvo.isLead },
  });

  revalidateOrgViews();
}

/** Tira a pessoa de uma unidade. */
export async function removeTeamMembership(formData: FormData): Promise<void> {
  const admin = await requireAdmin();

  const membershipId = field(formData, "membershipId");
  if (!membershipId) return;

  const db = await getDb();
  const alvo = await db
    .select({
      id: teamMember.id,
      userId: teamMember.userId,
      isPrimary: teamMember.isPrimary,
      teamId: teamMember.teamId,
    })
    .from(teamMember)
    .where(eq(teamMember.id, membershipId))
    .get();

  if (!alvo) return;

  await db.delete(teamMember).where(eq(teamMember.id, membershipId));

  // Se a unidade removida era a principal, outra assume — senão a pessoa fica
  // com vínculos e sem nenhum representando-a nas telas de uma linha.
  if (alvo.isPrimary) {
    const proximo = await db
      .select({ id: teamMember.id })
      .from(teamMember)
      .where(eq(teamMember.userId, alvo.userId))
      .get();
    if (proximo) {
      await db
        .update(teamMember)
        .set({ isPrimary: true })
        .where(eq(teamMember.id, proximo.id));
    }
  }

  await writeAuditLog({
    actorUserId: admin.id,
    actorEmail: admin.email,
    action: "user.org_change",
    entityType: "user",
    entityId: alvo.userId,
    summary: "Removeu uma pessoa de uma unidade",
    beforeData: { teamId: alvo.teamId, isPrimary: alvo.isPrimary },
  });

  revalidateOrgViews();
}

// ---------------------------------------------------------------------------
// Squads
// ---------------------------------------------------------------------------

/** Coloca uma pessoa no squad de uma BU. */
export async function addSquadMember(formData: FormData): Promise<void> {
  const admin = await requireAdmin();

  const userId = field(formData, "userId");
  const squadId = field(formData, "squadId");
  if (!userId || !squadId) return;

  const db = await getDb();
  const [pessoa, alvo] = await Promise.all([
    db
      .select({ id: user.id, name: user.name, status: user.status })
      .from(user)
      .where(eq(user.id, userId))
      .get(),
    db
      .select({ id: squad.id, name: squad.name })
      .from(squad)
      .where(eq(squad.id, squadId))
      .get(),
  ]);

  if (!pessoa || pessoa.status !== "active" || !alvo) return;

  const existente = await db
    .select({ id: squadMember.id })
    .from(squadMember)
    .where(
      and(eq(squadMember.squadId, squadId), eq(squadMember.userId, userId)),
    )
    .get();

  if (existente) return;

  await db.insert(squadMember).values({
    id: newId("sqm"),
    squadId,
    userId,
    isLead: false,
    createdBy: admin.id,
    createdAt: new Date(),
  });

  await writeAuditLog({
    actorUserId: admin.id,
    actorEmail: admin.email,
    action: "squad.member_add",
    entityType: "squad",
    entityId: squadId,
    summary: `${pessoa.name} entrou no ${alvo.name}`,
    afterData: { squadId, userId },
  });

  revalidateOrgViews();
}

/** Marca ou desmarca quem responde pelo squad. */
export async function toggleSquadLead(formData: FormData): Promise<void> {
  const admin = await requireAdmin();

  const membershipId = field(formData, "membershipId");
  if (!membershipId) return;

  const db = await getDb();
  const alvo = await db
    .select({
      id: squadMember.id,
      userId: squadMember.userId,
      squadId: squadMember.squadId,
      isLead: squadMember.isLead,
    })
    .from(squadMember)
    .where(eq(squadMember.id, membershipId))
    .get();

  if (!alvo) return;

  await db
    .update(squadMember)
    .set({ isLead: !alvo.isLead })
    .where(eq(squadMember.id, membershipId));

  await writeAuditLog({
    actorUserId: admin.id,
    actorEmail: admin.email,
    action: "squad.member_update",
    entityType: "squad",
    entityId: alvo.squadId,
    summary: alvo.isLead
      ? "Deixou de responder por um squad"
      : "Passou a responder por um squad",
    beforeData: { isLead: alvo.isLead },
    afterData: { isLead: !alvo.isLead },
  });

  revalidateOrgViews();
}

/** Tira a pessoa de um squad. */
export async function removeSquadMember(formData: FormData): Promise<void> {
  const admin = await requireAdmin();

  const membershipId = field(formData, "membershipId");
  if (!membershipId) return;

  const db = await getDb();
  const alvo = await db
    .select({
      id: squadMember.id,
      userId: squadMember.userId,
      squadId: squadMember.squadId,
    })
    .from(squadMember)
    .where(eq(squadMember.id, membershipId))
    .get();

  if (!alvo) return;

  await db.delete(squadMember).where(eq(squadMember.id, membershipId));

  await writeAuditLog({
    actorUserId: admin.id,
    actorEmail: admin.email,
    action: "squad.member_remove",
    entityType: "squad",
    entityId: alvo.squadId,
    summary: "Removeu uma pessoa de um squad",
    beforeData: alvo,
  });

  revalidateOrgViews();
}

/**
 * Ativa ou desativa o squad de uma BU.
 *
 * "BU sem equipe montada" é um estado real e diferente de "BU desativada": a
 * primeira segue no planejamento, a segunda não. Sem isso, os dois casos
 * ficariam indistinguíveis.
 */
export async function toggleSquad(formData: FormData): Promise<void> {
  const admin = await requireAdmin();

  const squadId = field(formData, "squadId");
  if (!squadId) return;

  const db = await getDb();
  const before = await db
    .select()
    .from(squad)
    .where(eq(squad.id, squadId))
    .get();
  if (!before) return;

  await db
    .update(squad)
    .set({ isActive: !before.isActive, updatedAt: new Date() })
    .where(eq(squad.id, squadId));

  await writeAuditLog({
    actorUserId: admin.id,
    actorEmail: admin.email,
    action: "squad.toggle",
    entityType: "squad",
    entityId: squadId,
    summary: before.isActive
      ? `Desativou o ${before.name}`
      : `Reativou o ${before.name}`,
    beforeData: { isActive: before.isActive },
    afterData: { isActive: !before.isActive },
  });

  revalidateOrgViews();
}

// ---------------------------------------------------------------------------
// Escopos de responsabilidade
// ---------------------------------------------------------------------------

/**
 * Concede um escopo a alguém.
 *
 * O alvo é validado contra a tabela do tipo escolhido: sem isso, um POST
 * adulterado gravaria um escopo apontando para um id que não existe, e o
 * resumo de acesso passaria a mentir sem erro nenhum aparecer.
 */
export async function addAccessGrant(formData: FormData): Promise<void> {
  const admin = await requireAdmin();

  const userId = field(formData, "userId");
  const scopeTypeRaw = field(formData, "scopeType");
  if (!userId || !isScopeType(scopeTypeRaw)) return;

  const scopeId =
    scopeTypeRaw === "organization" ? null : field(formData, "scopeId") || null;

  if (scopeTypeRaw !== "organization" && !scopeId) return;

  const db = await getDb();
  const pessoa = await db
    .select({ id: user.id, name: user.name })
    .from(user)
    .where(eq(user.id, userId))
    .get();
  if (!pessoa) return;

  let rotulo = "toda a organização";
  if (scopeId) {
    const alvo = await resolveScopeTarget(scopeTypeRaw, scopeId);
    if (!alvo) return;
    rotulo = alvo;
  }

  // `scope_id` nulo não casa com `=` em SQL, então o escopo da organização
  // precisa de `IS NULL` — sem isso a checagem nunca encontrava a linha
  // existente e a inserção batia na restrição de unicidade.
  const existente = await db
    .select({ id: accessGrant.id })
    .from(accessGrant)
    .where(
      and(
        eq(accessGrant.userId, userId),
        eq(accessGrant.scopeType, scopeTypeRaw),
        scopeId
          ? eq(accessGrant.scopeId, scopeId)
          : isNull(accessGrant.scopeId),
      ),
    )
    .get();

  if (existente) return;

  await db.insert(accessGrant).values({
    id: newId("agr"),
    userId,
    scopeType: scopeTypeRaw,
    scopeId,
    note: field(formData, "note") || null,
    grantedBy: admin.id,
    createdAt: new Date(),
  });

  await writeAuditLog({
    actorUserId: admin.id,
    actorEmail: admin.email,
    action: "access_grant.create",
    entityType: "user",
    entityId: userId,
    summary: `${pessoa.name} passou a responder por ${rotulo}`,
    afterData: { scopeType: scopeTypeRaw, scopeId },
  });

  revalidateOrgViews();
}

export async function removeAccessGrant(formData: FormData): Promise<void> {
  const admin = await requireAdmin();

  const grantId = field(formData, "grantId");
  if (!grantId) return;

  const db = await getDb();
  const before = await db
    .select()
    .from(accessGrant)
    .where(eq(accessGrant.id, grantId))
    .get();
  if (!before) return;

  await db.delete(accessGrant).where(eq(accessGrant.id, grantId));

  await writeAuditLog({
    actorUserId: admin.id,
    actorEmail: admin.email,
    action: "access_grant.delete",
    entityType: "user",
    entityId: before.userId,
    summary: "Removeu um escopo de responsabilidade",
    beforeData: before,
  });

  revalidateOrgViews();
}

/**
 * Liga ou desliga a administração da plataforma.
 *
 * Ninguém tira a própria: com um administrador só, isso trancaria a plataforma
 * para fora dela mesma, sem caminho de volta pela interface.
 */
export async function toggleSuperAdmin(formData: FormData): Promise<void> {
  const admin = await requireAdmin();

  const userId = field(formData, "userId");
  if (!userId || userId === admin.id) return;

  const db = await getDb();
  const before = await db
    .select({ id: user.id, name: user.name, isSuperAdmin: user.isSuperAdmin })
    .from(user)
    .where(eq(user.id, userId))
    .get();
  if (!before) return;

  await db
    .update(user)
    .set({ isSuperAdmin: !before.isSuperAdmin, updatedAt: new Date() })
    .where(eq(user.id, userId));

  await writeAuditLog({
    actorUserId: admin.id,
    actorEmail: admin.email,
    action: "user.super_admin_change",
    entityType: "user",
    entityId: userId,
    summary: before.isSuperAdmin
      ? `${before.name} deixou de administrar a plataforma`
      : `${before.name} passou a administrar a plataforma`,
    beforeData: { isSuperAdmin: before.isSuperAdmin },
    afterData: { isSuperAdmin: !before.isSuperAdmin },
  });

  revalidateOrgViews();
}

/** Confere que o alvo do escopo existe e devolve um rótulo para a auditoria. */
async function resolveScopeTarget(
  scopeType: ScopeType,
  scopeId: string,
): Promise<string | null> {
  const db = await getDb();

  switch (scopeType) {
    case "org_unit": {
      const linha = await db
        .select({ name: team.name })
        .from(team)
        .where(eq(team.id, scopeId))
        .get();
      return linha?.name ?? null;
    }
    case "division": {
      const linha = await db
        .select({ name: businessDivision.name })
        .from(businessDivision)
        .where(eq(businessDivision.id, scopeId))
        .get();
      return linha?.name ?? null;
    }
    case "business_unit": {
      const linha = await db
        .select({ label: businessUnit.label })
        .from(businessUnit)
        .where(eq(businessUnit.id, scopeId))
        .get();
      return linha?.label ?? null;
    }
    case "squad": {
      const linha = await db
        .select({ name: squad.name })
        .from(squad)
        .where(eq(squad.id, scopeId))
        .get();
      return linha?.name ?? null;
    }
    default:
      return null;
  }
}
