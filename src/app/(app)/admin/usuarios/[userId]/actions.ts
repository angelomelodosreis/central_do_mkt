"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, inArray, isNull } from "drizzle-orm";

import { requireAdmin } from "@/lib/auth/session";
import { resetarSegundoFator } from "@/lib/auth/two-factor";
import { getDb } from "@/lib/db/client";
import {
  accessGrant,
  businessDivision,
  businessUnit,
  jobTitle,
  squad,
  squadMember,
  task,
  team,
  teamMember,
  user,
  SCOPE_TYPES,
  USER_ROLES,
  type ScopeType,
  type UserRole,
} from "@/lib/db/schema";
import { writeAuditLog } from "@/lib/modules/audit/log";
import { newId } from "@/lib/utils/id";

function field(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function lista(formData: FormData, key: string): string[] {
  return formData
    .getAll(key)
    .map((valor) => String(valor).trim())
    .filter(Boolean);
}

/**
 * Revalida onde a ficha de uma pessoa aparece.
 *
 * É mais lugar do que parece: o seletor de destinatário das tarefas, o squad de
 * cada BU e o rodapé de quem está logado mostram time, cargo e escopo.
 */
function revalidateTudo() {
  revalidatePath("/admin", "layout");
  revalidatePath("/organograma", "layout");
  revalidatePath("/planejamento", "layout");
  revalidatePath("/tarefas", "layout");
  revalidatePath("/documentacao", "layout");
}

/** "org_unit:tmb_123" — como um escopo viaja no formulário. */
function partirEscopo(
  chave: string,
): { scopeType: ScopeType; scopeId: string | null } | null {
  const corte = chave.indexOf(":");
  if (corte < 0) return null;

  const scopeType = chave.slice(0, corte);
  const scopeId = chave.slice(corte + 1) || null;

  if (!(SCOPE_TYPES as readonly string[]).includes(scopeType)) return null;
  if (scopeType === "organization") {
    return { scopeType: scopeType as ScopeType, scopeId: null };
  }
  return scopeId ? { scopeType: scopeType as ScopeType, scopeId } : null;
}

function chaveDoEscopo(scopeType: string, scopeId: string | null): string {
  return `${scopeType}:${scopeId ?? ""}`;
}

/**
 * Grava a ficha inteira de uma pessoa numa tacada.
 *
 * Antes cada atributo tinha o próprio "Salvar", e mudar cargo, papel, time e
 * squad de alguém eram quatro gravações, quatro recarregamentos e nenhuma
 * chance de desistir no meio. Aqui chega o estado desejado inteiro e o servidor
 * calcula a diferença — o que não mudou não é tocado, e o que saiu sai junto.
 *
 * O que NÃO passa por aqui: aprovar, suspender e excluir. São decisões sobre a
 * conta, não atributos dela, e cada uma tem a própria confirmação.
 */
export async function saveUserFile(formData: FormData): Promise<void> {
  const admin = await requireAdmin();

  const userId = field(formData, "userId");
  if (!userId) return;

  const db = await getDb();
  const pessoa = await db
    .select({
      id: user.id,
      name: user.name,
      role: user.role,
      status: user.status,
      jobTitleId: user.jobTitleId,
      isSuperAdmin: user.isSuperAdmin,
    })
    .from(user)
    .where(eq(user.id, userId))
    .get();

  if (!pessoa) return;

  const mudancas: string[] = [];
  const antes: Record<string, unknown> = {};
  const depois: Record<string, unknown> = {};

  // ── Cargo, papel e administração da plataforma ───────────────────────────
  const patch: Record<string, unknown> = {};

  const jobTitleId = field(formData, "jobTitleId") || null;
  if (jobTitleId !== pessoa.jobTitleId) {
    const existe = jobTitleId
      ? await db
          .select({ id: jobTitle.id })
          .from(jobTitle)
          .where(eq(jobTitle.id, jobTitleId))
          .get()
      : true;

    if (existe) {
      patch.jobTitleId = jobTitleId;
      antes.jobTitleId = pessoa.jobTitleId;
      depois.jobTitleId = jobTitleId;
      mudancas.push("cargo");
    }
  }

  // Ninguém muda o próprio papel nem tira a própria administração: com um
  // administrador só, isso trancaria a plataforma para fora dela mesma.
  const ehEuMesmo = userId === admin.id;

  const papel = field(formData, "role");
  if (
    !ehEuMesmo &&
    (USER_ROLES as readonly string[]).includes(papel) &&
    papel !== pessoa.role
  ) {
    patch.role = papel as UserRole;
    antes.role = pessoa.role;
    depois.role = papel;
    mudancas.push("papel");
  }

  const superAdmin = field(formData, "isSuperAdmin") === "1";
  if (!ehEuMesmo && superAdmin !== pessoa.isSuperAdmin) {
    patch.isSuperAdmin = superAdmin;
    antes.isSuperAdmin = pessoa.isSuperAdmin;
    depois.isSuperAdmin = superAdmin;
    mudancas.push(
      superAdmin
        ? "passou a administrar a plataforma"
        : "deixou de administrar a plataforma",
    );
  }

  if (Object.keys(patch).length > 0) {
    await db
      .update(user)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(user.id, userId));
  }

  // ── Times ────────────────────────────────────────────────────────────────
  const timesAtuais = await db
    .select({
      id: teamMember.id,
      teamId: teamMember.teamId,
      isPrimary: teamMember.isPrimary,
    })
    .from(teamMember)
    .where(eq(teamMember.userId, userId));

  const timesPedidos = lista(formData, "teamIds");
  const timesValidos =
    timesPedidos.length > 0
      ? (
          await db
            .select({ id: team.id })
            .from(team)
            .where(inArray(team.id, timesPedidos))
        ).map((linha) => linha.id)
      : [];

  const timesASair = timesAtuais.filter(
    (atual) => !timesValidos.includes(atual.teamId),
  );
  const timesAEntrar = timesValidos.filter(
    (id) => !timesAtuais.some((atual) => atual.teamId === id),
  );

  if (timesASair.length > 0) {
    await db.delete(teamMember).where(
      inArray(
        teamMember.id,
        timesASair.map((linha) => linha.id),
      ),
    );
  }

  for (const teamId of timesAEntrar) {
    await db.insert(teamMember).values({
      id: newId("tmb"),
      teamId,
      userId,
      isLead: false,
      isPrimary: false,
      createdBy: admin.id,
      createdAt: new Date(),
    });
  }

  if (timesASair.length > 0 || timesAEntrar.length > 0) {
    mudancas.push("times");
    antes.teamIds = timesAtuais.map((linha) => linha.teamId);
    depois.teamIds = timesValidos;

    // Exatamente um vínculo principal por pessoa: é o que aparece onde só cabe
    // uma linha. Sem isto, tirar o principal deixava a pessoa sem nenhum e a
    // interface escolhia por ordem de consulta.
    const restantes = await db
      .select({ id: teamMember.id, isPrimary: teamMember.isPrimary })
      .from(teamMember)
      .where(eq(teamMember.userId, userId));

    const principais = restantes.filter((linha) => linha.isPrimary);
    if (restantes.length > 0 && principais.length !== 1) {
      await db
        .update(teamMember)
        .set({ isPrimary: false })
        .where(eq(teamMember.userId, userId));
      await db
        .update(teamMember)
        .set({ isPrimary: true })
        .where(eq(teamMember.id, restantes[0].id));
    }
  }

  // ── Squads ───────────────────────────────────────────────────────────────
  const squadsAtuais = await db
    .select({ id: squadMember.id, squadId: squadMember.squadId })
    .from(squadMember)
    .where(eq(squadMember.userId, userId));

  const squadsPedidos = lista(formData, "squadIds");
  const squadsValidos =
    squadsPedidos.length > 0
      ? (
          await db
            .select({ id: squad.id })
            .from(squad)
            .where(inArray(squad.id, squadsPedidos))
        ).map((linha) => linha.id)
      : [];

  const squadsASair = squadsAtuais.filter(
    (atual) => !squadsValidos.includes(atual.squadId),
  );
  const squadsAEntrar = squadsValidos.filter(
    (id) => !squadsAtuais.some((atual) => atual.squadId === id),
  );

  if (squadsASair.length > 0) {
    await db.delete(squadMember).where(
      inArray(
        squadMember.id,
        squadsASair.map((linha) => linha.id),
      ),
    );
  }

  for (const squadId of squadsAEntrar) {
    await db.insert(squadMember).values({
      id: newId("sqm"),
      squadId,
      userId,
      isLead: false,
      createdBy: admin.id,
      createdAt: new Date(),
    });
  }

  if (squadsASair.length > 0 || squadsAEntrar.length > 0) {
    mudancas.push("squads");
    antes.squadIds = squadsAtuais.map((linha) => linha.squadId);
    depois.squadIds = squadsValidos;
  }

  // ── Escopo de responsabilidade ───────────────────────────────────────────
  const escoposAtuais = await db
    .select({
      id: accessGrant.id,
      scopeType: accessGrant.scopeType,
      scopeId: accessGrant.scopeId,
    })
    .from(accessGrant)
    .where(eq(accessGrant.userId, userId));

  const escoposPedidos = lista(formData, "escopos")
    .map(partirEscopo)
    .filter((item): item is NonNullable<typeof item> => item !== null);

  const escoposValidos: typeof escoposPedidos = [];
  for (const escopo of escoposPedidos) {
    if (await alvoExiste(escopo.scopeType, escopo.scopeId)) {
      escoposValidos.push(escopo);
    }
  }

  const chavesValidas = escoposValidos.map((escopo) =>
    chaveDoEscopo(escopo.scopeType, escopo.scopeId),
  );

  const escoposASair = escoposAtuais.filter(
    (atual) =>
      !chavesValidas.includes(chaveDoEscopo(atual.scopeType, atual.scopeId)),
  );
  const escoposAEntrar = escoposValidos.filter(
    (escopo) =>
      !escoposAtuais.some(
        (atual) =>
          chaveDoEscopo(atual.scopeType, atual.scopeId) ===
          chaveDoEscopo(escopo.scopeType, escopo.scopeId),
      ),
  );

  if (escoposASair.length > 0) {
    await db.delete(accessGrant).where(
      inArray(
        accessGrant.id,
        escoposASair.map((linha) => linha.id),
      ),
    );
  }

  for (const escopo of escoposAEntrar) {
    await db.insert(accessGrant).values({
      id: newId("agr"),
      userId,
      scopeType: escopo.scopeType,
      scopeId: escopo.scopeId,
      note: null,
      grantedBy: admin.id,
      createdAt: new Date(),
    });
  }

  if (escoposASair.length > 0 || escoposAEntrar.length > 0) {
    mudancas.push("escopo de responsabilidade");
    antes.escopos = escoposAtuais.map((linha) =>
      chaveDoEscopo(linha.scopeType, linha.scopeId),
    );
    depois.escopos = chavesValidas;
  }

  // ── Rastro ───────────────────────────────────────────────────────────────
  if (mudancas.length === 0) return;

  await writeAuditLog({
    actorUserId: admin.id,
    actorEmail: admin.email,
    action: "user.org_change",
    entityType: "user",
    entityId: userId,
    summary: `Editou a ficha de ${pessoa.name}: ${mudancas.join(", ")}`,
    beforeData: antes,
    afterData: depois,
  });

  revalidateTudo();
}

/** Confere que o alvo de um escopo ainda existe. */
async function alvoExiste(
  scopeType: ScopeType,
  scopeId: string | null,
): Promise<boolean> {
  if (scopeType === "organization") return true;
  if (!scopeId) return false;

  const db = await getDb();
  switch (scopeType) {
    case "org_unit":
      return Boolean(
        await db
          .select({ id: team.id })
          .from(team)
          .where(eq(team.id, scopeId))
          .get(),
      );
    case "division":
      return Boolean(
        await db
          .select({ id: businessDivision.id })
          .from(businessDivision)
          .where(eq(businessDivision.id, scopeId))
          .get(),
      );
    case "business_unit":
      return Boolean(
        await db
          .select({ id: businessUnit.id })
          .from(businessUnit)
          .where(eq(businessUnit.id, scopeId))
          .get(),
      );
    case "squad":
      return Boolean(
        await db
          .select({ id: squad.id })
          .from(squad)
          .where(eq(squad.id, scopeId))
          .get(),
      );
    default:
      return false;
  }
}

/**
 * Apaga uma pessoa da plataforma.
 *
 * Suspender é quase sempre o certo — guarda o histórico e é reversível. Excluir
 * existe para o cadastro que nunca deveria ter entrado: o e-mail digitado
 * errado, a pessoa que saiu antes de começar, o teste.
 *
 * O que sai junto: os vínculos com times e squads, o escopo de
 * responsabilidade e as sessões abertas. O que fica: a auditoria, que guarda o
 * e-mail em texto e continua contando o que aconteceu, e as tarefas — as que
 * estavam com a pessoa voltam para a fila do time dela, porque trabalho
 * pendente não pode sumir junto com o crachá.
 */
export async function deleteUser(formData: FormData): Promise<void> {
  const admin = await requireAdmin();

  const userId = field(formData, "userId");
  if (!userId || userId === admin.id) return;

  const db = await getDb();
  const pessoa = await db.select().from(user).where(eq(user.id, userId)).get();

  if (!pessoa) return;

  const principal = await db
    .select({ teamId: teamMember.teamId })
    .from(teamMember)
    .where(and(eq(teamMember.userId, userId), eq(teamMember.isPrimary, true)))
    .get();

  const qualquer =
    principal ??
    (await db
      .select({ teamId: teamMember.teamId })
      .from(teamMember)
      .where(eq(teamMember.userId, userId))
      .get());

  // As tarefas abertas voltam para a fila do time; as encerradas ficam como
  // estão, porque o histórico é de quem fez.
  await db
    .update(task)
    .set({
      assigneeId: null,
      assignedTeamId: qualquer?.teamId ?? null,
      updatedAt: new Date(),
    })
    .where(and(eq(task.assigneeId, userId), isNull(task.completedAt)));

  await db.delete(teamMember).where(eq(teamMember.userId, userId));
  await db.delete(squadMember).where(eq(squadMember.userId, userId));
  await db.delete(accessGrant).where(eq(accessGrant.userId, userId));
  // Sessões e contas de login saem em cascata pela própria chave estrangeira.
  await db.delete(user).where(eq(user.id, userId));

  await writeAuditLog({
    actorUserId: admin.id,
    actorEmail: admin.email,
    action: "user.delete",
    entityType: "user",
    entityId: userId,
    summary: `Excluiu ${pessoa.name} (${pessoa.email})`,
    beforeData: pessoa,
  });

  revalidateTudo();
  redirect("/admin/usuarios");
}

/**
 * Apaga o cadastro do aplicativo autenticador de alguém.
 *
 * É o que se faz quando a pessoa perde o celular e não guardou os códigos de
 * recuperação — sem isso ela ficaria trancada para fora para sempre.
 *
 * Derrubar as sessões faz parte da operação, e não é zelo excessivo: uma
 * sessão já confirmada continuaria valendo, e o reset viraria uma forma
 * silenciosa de manter acesso sem passar por segundo fator nenhum. Quem for
 * redefinido volta pelo Google e cadastra o aplicativo de novo.
 */
export async function resetTwoFactor(formData: FormData): Promise<void> {
  const admin = await requireAdmin();

  const userId = field(formData, "userId");
  if (!userId) return;

  const db = await getDb();
  const pessoa = await db
    .select({ id: user.id, name: user.name, email: user.email })
    .from(user)
    .where(eq(user.id, userId))
    .get();

  if (!pessoa) return;

  await resetarSegundoFator(userId);

  await writeAuditLog({
    actorUserId: admin.id,
    actorEmail: admin.email,
    action: "user.two_factor_reset",
    entityType: "user",
    entityId: userId,
    summary: `Redefiniu a verificação em duas etapas de ${pessoa.name} (${pessoa.email})`,
  });

  revalidatePath(`/admin/usuarios/${userId}`);
}
