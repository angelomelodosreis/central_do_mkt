"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";

import type { PersonaFormState } from "./form-state";
import { requirePermission, type CurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import {
  businessUnit,
  persona,
  personaPain,
  type UserRole,
} from "@/lib/db/schema";
import { writeAuditLog } from "@/lib/modules/audit/log";
import { normalizeRichInput } from "@/lib/modules/documentation/rich-text";
import { canSeeBusinessUnit } from "@/lib/modules/access/scope";
import { buildPersonaSearchText } from "@/lib/modules/personas/search-text";
import {
  findDuplicatePersona,
  getPersonaById,
} from "@/lib/modules/personas/queries";
import { toKebabCase } from "@/lib/modules/documentation/slug";
import { newId } from "@/lib/utils/id";

const SEM_ESCOPO = "Você não trabalha nesta Business Unit.";

/**
 * Vínculo com a BU (ou alcance de coordenação).
 *
 * Fica aqui, e não numa checagem só na tela, porque a server action é
 * endereçável: sem isto, um POST com outro `businessUnitId` gravaria numa BU
 * que a pessoa nem consegue abrir.
 */
async function podeEditarBu(
  currentUser: CurrentUser,
  businessUnitId: string,
): Promise<boolean> {
  // O escopo já resolveu herança e vínculo numa consulta só, na sessão.
  return canSeeBusinessUnit(currentUser.scope, businessUnitId);
}

function revalidatePersonaViews(businessUnitSlug?: string) {
  if (businessUnitSlug) {
    revalidatePath(`/planejamento/${businessUnitSlug}/personas`, "layout");
  }
  revalidatePath("/planejamento", "layout");
  revalidatePath("/painel");
}

/** Lê um campo de texto simples do formulário. */
function field(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

/** Uma entrada por linha, usada para interesses e canais. */
function parseList(raw: string): string[] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

/**
 * Lê os pares dor/solução do formulário.
 *
 * Os campos chegam como `pain[]` e `solution[]`, na mesma ordem. Uma dor em
 * branco descarta a linha inteira; uma solução em branco é gravada como `null`,
 * que é o que marca a dor como ainda sem resposta.
 */
function parsePains(formData: FormData): { pain: string; solution: string | null }[] {
  const pains = formData.getAll("pain").map((value) => String(value).trim());
  const solutions = formData
    .getAll("solution")
    .map((value) => String(value).trim());

  return pains
    .map((pain, index) => ({ pain, solution: solutions[index] || null }))
    .filter((entry) => entry.pain.length > 0);
}

type PersonaInput = ReturnType<typeof readPersonaInput>;

function readPersonaInput(formData: FormData) {
  return {
    businessUnitId: field(formData, "businessUnitId"),
    name: field(formData, "name"),
    headline: field(formData, "headline"),
    ageRange: field(formData, "ageRange"),
    gender: field(formData, "gender"),
    location: field(formData, "location"),
    income: field(formData, "income"),
    education: field(formData, "education"),
    careerStage: field(formData, "careerStage"),
    currentRole: field(formData, "currentRole"),
    workplace: field(formData, "workplace"),
    careerGoal: field(formData, "careerGoal"),
    interests: parseList(String(formData.get("interests") ?? "")),
    channels: parseList(String(formData.get("channels") ?? "")),
    notes: normalizeRichInput(String(formData.get("notes") ?? "")),
    pains: parsePains(formData),
  };
}

/** Regrava as dores de uma persona: é sempre a lista inteira que chega. */
async function replacePains(personaId: string, pains: PersonaInput["pains"]) {
  const db = await getDb();
  await db.delete(personaPain).where(eq(personaPain.personaId, personaId));

  for (const [position, entry] of pains.entries()) {
    await db.insert(personaPain).values({
      id: newId("pain"),
      personaId,
      position,
      pain: entry.pain,
      solution: entry.solution,
    });
  }
}

/** Cadastra uma persona. */
export async function createPersona(
  _previousState: PersonaFormState,
  formData: FormData,
): Promise<PersonaFormState> {
  const currentUser = await requirePermission("personas", "edit");
  const input = readPersonaInput(formData);

  if (!input.businessUnitId) {
    return { status: "error", message: "Business Unit não identificada." };
  }

  // Permissão de módulo não basta: a persona é conteúdo da BU, e só quem
  // trabalha nela (ou a coordenação) cadastra.
  if (!(await podeEditarBu(currentUser, input.businessUnitId))) {
    return { status: "error", message: SEM_ESCOPO };
  }
  if (!input.name) {
    return { status: "error", message: "Informe o nome da persona." };
  }

  const slug = toKebabCase(input.name);
  if (!slug) {
    return {
      status: "error",
      message: "O nome precisa ter ao menos uma letra ou número.",
    };
  }

  const db = await getDb();
  const unit = await db
    .select({ id: businessUnit.id, label: businessUnit.label, slug: businessUnit.slug })
    .from(businessUnit)
    .where(eq(businessUnit.id, input.businessUnitId))
    .get();

  if (!unit) {
    return { status: "error", message: "Essa Business Unit não existe mais." };
  }

  if (await findDuplicatePersona(input.businessUnitId, slug)) {
    return {
      status: "error",
      message: `Já existe uma persona com esse nome em ${unit.label}.`,
    };
  }

  const personaId = newId("prs");
  const now = new Date();

  await db.insert(persona).values({
    id: personaId,
    businessUnitId: input.businessUnitId,
    slug,
    name: input.name,
    headline: input.headline || null,
    ageRange: input.ageRange || null,
    gender: input.gender || null,
    location: input.location || null,
    income: input.income || null,
    education: input.education || null,
    careerStage: input.careerStage || null,
    currentRole: input.currentRole || null,
    workplace: input.workplace || null,
    careerGoal: input.careerGoal || null,
    interests: input.interests.length > 0 ? input.interests : null,
    channels: input.channels.length > 0 ? input.channels : null,
    notes: input.notes,
    searchText: buildPersonaSearchText(input),
    isActive: true,
    sortOrder: 100,
    createdBy: currentUser.id,
    updatedBy: currentUser.id,
    createdAt: now,
    updatedAt: now,
  });

  await replacePains(personaId, input.pains);

  await writeAuditLog({
    actorUserId: currentUser.id,
    actorEmail: currentUser.email,
    action: "persona.create",
    entityType: "persona",
    entityId: personaId,
    summary: `Cadastrou a persona "${input.name}" em ${unit.label}`,
    afterData: { name: input.name, slug, businessUnit: unit.slug },
  });

  revalidatePersonaViews(unit.slug);
  redirect(`/planejamento/${unit.slug}/personas/${slug}`);
}

/** Salva a edição de uma persona. */
export async function updatePersona(
  _previousState: PersonaFormState,
  formData: FormData,
): Promise<PersonaFormState> {
  const currentUser = await requirePermission("personas", "edit");

  const personaId = field(formData, "personaId");
  if (!personaId) {
    return { status: "error", message: "Persona não identificada." };
  }

  const input = readPersonaInput(formData);
  if (!input.name) {
    return { status: "error", message: "Informe o nome da persona." };
  }

  const existing = await getPersonaById(personaId);
  if (!existing) {
    return { status: "error", message: "Essa persona não existe mais." };
  }

  // A BU da persona não muda numa edição: quem edita está dentro dela. Ler do
  // registro, e não do formulário, fecha o caminho de mover uma persona para
  // uma BU alheia adulterando o campo escondido.
  const targetUnitId = existing.businessUnitId;

  if (!(await podeEditarBu(currentUser, targetUnitId))) {
    return { status: "error", message: SEM_ESCOPO };
  }
  const slug = toKebabCase(input.name) || existing.slug;

  const db = await getDb();
  const unit = await db
    .select({ label: businessUnit.label, slug: businessUnit.slug })
    .from(businessUnit)
    .where(eq(businessUnit.id, targetUnitId))
    .get();

  if (!unit) {
    return { status: "error", message: "Essa Business Unit não existe mais." };
  }

  if (await findDuplicatePersona(targetUnitId, slug, personaId)) {
    return {
      status: "error",
      message: `Já existe outra persona com esse nome em ${unit.label}.`,
    };
  }

  await db
    .update(persona)
    .set({
      businessUnitId: targetUnitId,
      slug,
      name: input.name,
      headline: input.headline || null,
      ageRange: input.ageRange || null,
      gender: input.gender || null,
      location: input.location || null,
      income: input.income || null,
      education: input.education || null,
      careerStage: input.careerStage || null,
      currentRole: input.currentRole || null,
      workplace: input.workplace || null,
      careerGoal: input.careerGoal || null,
      interests: input.interests.length > 0 ? input.interests : null,
      channels: input.channels.length > 0 ? input.channels : null,
      notes: input.notes,
      searchText: buildPersonaSearchText(input),
      updatedBy: currentUser.id,
      updatedAt: new Date(),
    })
    .where(eq(persona.id, personaId));

  await replacePains(personaId, input.pains);

  await writeAuditLog({
    actorUserId: currentUser.id,
    actorEmail: currentUser.email,
    action: "persona.update",
    entityType: "persona",
    entityId: personaId,
    summary: `Editou a persona "${existing.name}"`,
    beforeData: {
      name: existing.name,
      headline: existing.headline,
      businessUnitId: existing.businessUnitId,
      pains: existing.pains.map((entry) => ({
        pain: entry.pain,
        solution: entry.solution,
      })),
    },
    afterData: {
      name: input.name,
      headline: input.headline || null,
      businessUnitId: targetUnitId,
      pains: input.pains,
    },
  });

  revalidatePersonaViews(unit.slug);
  redirect(`/planejamento/${unit.slug}/personas/${slug}`);
}

/**
 * Ativa ou desativa uma persona.
 *
 * Como nas BUs, não há exclusão: uma persona desativada sai das listas mas
 * continua existindo para quem for reler uma campanha antiga que a usou.
 */
export async function togglePersona(formData: FormData): Promise<void> {
  const currentUser = await requirePermission("personas", "edit");

  const personaId = field(formData, "personaId");
  if (!personaId) return;

  const db = await getDb();
  const existing = await db
    .select()
    .from(persona)
    .where(eq(persona.id, personaId))
    .get();

  if (!existing) return;
  if (!(await podeEditarBu(currentUser, existing.businessUnitId))) return;

  const nextIsActive = !existing.isActive;

  await db
    .update(persona)
    .set({
      isActive: nextIsActive,
      updatedBy: currentUser.id,
      updatedAt: new Date(),
    })
    .where(eq(persona.id, personaId));

  await writeAuditLog({
    actorUserId: currentUser.id,
    actorEmail: currentUser.email,
    action: "persona.update",
    entityType: "persona",
    entityId: personaId,
    summary: nextIsActive
      ? `Reativou a persona "${existing.name}"`
      : `Desativou a persona "${existing.name}"`,
    beforeData: { isActive: existing.isActive },
    afterData: { isActive: nextIsActive },
  });

  revalidatePersonaViews();
}
