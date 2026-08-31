import { and, asc, eq, inArray, isNull, ne, or } from "drizzle-orm";

import { getDb } from "@/lib/db/client";
import {
  businessUnit,
  persona,
  personaPain,
  type Persona,
  type PersonaPain,
} from "@/lib/db/schema";

export type PersonaListItem = Pick<
  Persona,
  "id" | "slug" | "name" | "headline" | "isActive" | "updatedAt"
> & {
  businessUnitId: string;
  painCount: number;
  /** Quantas dores ainda não têm solução — o gancho de oportunidade. */
  openPainCount: number;
};

export type BusinessUnitWithPersonas = {
  id: string;
  slug: string;
  label: string;
  personas: PersonaListItem[];
};

/** Personas agrupadas por BU, na ordem em que as BUs aparecem no resto do app. */
export async function listPersonasByBusinessUnit(): Promise<
  BusinessUnitWithPersonas[]
> {
  const db = await getDb();

  const units = await db
    .select({
      id: businessUnit.id,
      slug: businessUnit.slug,
      label: businessUnit.label,
    })
    .from(businessUnit)
    .where(eq(businessUnit.isActive, true))
    .orderBy(asc(businessUnit.sortOrder), asc(businessUnit.label));

  const rows = await db
    .select({
      id: persona.id,
      slug: persona.slug,
      name: persona.name,
      headline: persona.headline,
      isActive: persona.isActive,
      updatedAt: persona.updatedAt,
      businessUnitId: persona.businessUnitId,
    })
    .from(persona)
    .orderBy(asc(persona.sortOrder), asc(persona.name));

  const counts = await painCountsFor(rows.map((row) => row.id));

  const personas: PersonaListItem[] = rows.map((row) => ({
    ...row,
    painCount: counts.get(row.id)?.total ?? 0,
    openPainCount: counts.get(row.id)?.open ?? 0,
  }));

  return units.map((unit) => ({
    ...unit,
    personas: personas.filter((item) => item.businessUnitId === unit.id),
  }));
}

/**
 * Personas de uma BU só.
 *
 * Substitui, no dia a dia, a consulta que trazia todas as BUs: agora que as
 * personas vivem dentro do espaço de trabalho da BU, carregar as 22 BUs para
 * mostrar uma era desperdício — e vazamento, para quem não vê as outras.
 */
export async function listPersonasOfBusinessUnit(
  businessUnitId: string,
): Promise<PersonaListItem[]> {
  const db = await getDb();

  const rows = await db
    .select({
      id: persona.id,
      slug: persona.slug,
      name: persona.name,
      headline: persona.headline,
      isActive: persona.isActive,
      updatedAt: persona.updatedAt,
      businessUnitId: persona.businessUnitId,
    })
    .from(persona)
    .where(eq(persona.businessUnitId, businessUnitId))
    .orderBy(asc(persona.sortOrder), asc(persona.name));

  const counts = await painCountsFor(rows.map((row) => row.id));

  return rows.map((row) => ({
    ...row,
    painCount: counts.get(row.id)?.total ?? 0,
    openPainCount: counts.get(row.id)?.open ?? 0,
  }));
}

/** Total de dores e quantas estão sem solução, por persona. */
async function painCountsFor(
  personaIds: string[],
): Promise<Map<string, { total: number; open: number }>> {
  const result = new Map<string, { total: number; open: number }>();
  if (personaIds.length === 0) return result;

  const db = await getDb();
  const pains = await db
    .select({
      personaId: personaPain.personaId,
      solution: personaPain.solution,
    })
    .from(personaPain)
    .where(inArray(personaPain.personaId, personaIds));

  for (const pain of pains) {
    const entry = result.get(pain.personaId) ?? { total: 0, open: 0 };
    entry.total += 1;
    if (!pain.solution?.trim()) entry.open += 1;
    result.set(pain.personaId, entry);
  }

  return result;
}

export type PersonaDetail = Persona & {
  pains: PersonaPain[];
  businessUnitLabel: string;
  businessUnitSlug: string;
};

export async function getPersonaBySlug(
  businessUnitSlug: string,
  personaSlug: string,
): Promise<PersonaDetail | undefined> {
  const db = await getDb();

  const row = await db
    .select({
      persona,
      businessUnitLabel: businessUnit.label,
      businessUnitSlug: businessUnit.slug,
    })
    .from(persona)
    .innerJoin(businessUnit, eq(persona.businessUnitId, businessUnit.id))
    .where(
      and(
        eq(businessUnit.slug, businessUnitSlug),
        eq(persona.slug, personaSlug),
      ),
    )
    .get();

  if (!row) return undefined;

  return {
    ...row.persona,
    businessUnitLabel: row.businessUnitLabel,
    businessUnitSlug: row.businessUnitSlug,
    pains: await listPainsFor(row.persona.id),
  };
}

export async function getPersonaById(
  id: string,
): Promise<(Persona & { pains: PersonaPain[] }) | undefined> {
  const db = await getDb();
  const row = await db.select().from(persona).where(eq(persona.id, id)).get();
  if (!row) return undefined;
  return { ...row, pains: await listPainsFor(row.id) };
}

async function listPainsFor(personaId: string): Promise<PersonaPain[]> {
  const db = await getDb();
  return db
    .select()
    .from(personaPain)
    .where(eq(personaPain.personaId, personaId))
    .orderBy(asc(personaPain.position));
}

export type OpenPain = {
  id: string;
  pain: string;
  personaName: string;
  personaSlug: string;
  businessUnitLabel: string;
  businessUnitSlug: string;
};

/**
 * Dores mapeadas que ainda não têm solução, de todas as personas.
 *
 * É o outro lado de deixar a solução opcional: em vez de ficarem escondidas
 * dentro de cada ficha, as lacunas viram uma lista — pauta de produto pronta.
 */
export async function listOpenPains(): Promise<OpenPain[]> {
  const db = await getDb();

  return db
    .select({
      id: personaPain.id,
      pain: personaPain.pain,
      personaName: persona.name,
      personaSlug: persona.slug,
      businessUnitLabel: businessUnit.label,
      businessUnitSlug: businessUnit.slug,
    })
    .from(personaPain)
    .innerJoin(persona, eq(personaPain.personaId, persona.id))
    .innerJoin(businessUnit, eq(persona.businessUnitId, businessUnit.id))
    .where(
      and(
        eq(persona.isActive, true),
        // Sem solução é tanto o campo nulo quanto o preenchido em branco.
        or(isNull(personaPain.solution), eq(personaPain.solution, "")),
      ),
    )
    .orderBy(asc(businessUnit.sortOrder), asc(persona.name));
}

/**
 * Dores sem solução de uma BU só.
 *
 * Mesma regra da consulta geral, recortada pela BU — a visão geral de uma BU não
 * deve carregar (nem exibir) a pauta de produto das outras.
 */
export async function listOpenPainsOfBusinessUnit(
  businessUnitId: string,
): Promise<OpenPain[]> {
  const db = await getDb();

  return db
    .select({
      id: personaPain.id,
      pain: personaPain.pain,
      personaName: persona.name,
      personaSlug: persona.slug,
      businessUnitLabel: businessUnit.label,
      businessUnitSlug: businessUnit.slug,
    })
    .from(personaPain)
    .innerJoin(persona, eq(personaPain.personaId, persona.id))
    .innerJoin(businessUnit, eq(persona.businessUnitId, businessUnit.id))
    .where(
      and(
        eq(persona.businessUnitId, businessUnitId),
        eq(persona.isActive, true),
        or(isNull(personaPain.solution), eq(personaPain.solution, "")),
      ),
    )
    .orderBy(asc(persona.name));
}

/** BUs ativas, para o seletor do formulário. */
export async function listActiveBusinessUnits() {
  const db = await getDb();
  return db
    .select({
      id: businessUnit.id,
      slug: businessUnit.slug,
      label: businessUnit.label,
    })
    .from(businessUnit)
    .where(eq(businessUnit.isActive, true))
    .orderBy(asc(businessUnit.sortOrder), asc(businessUnit.label));
}

/** Verifica se já existe outra persona com o mesmo slug na mesma BU. */
export async function findDuplicatePersona(
  businessUnitId: string,
  slug: string,
  exceptId?: string,
): Promise<boolean> {
  const db = await getDb();
  const found = await db
    .select({ id: persona.id })
    .from(persona)
    .where(
      and(
        eq(persona.businessUnitId, businessUnitId),
        eq(persona.slug, slug),
        exceptId ? ne(persona.id, exceptId) : undefined,
      ),
    )
    .get();

  return Boolean(found);
}
