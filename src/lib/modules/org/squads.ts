import { asc, eq } from "drizzle-orm";

import { getDb } from "@/lib/db/client";
import {
  businessDivision,
  businessUnit,
  jobTitle,
  squad,
  squadMember,
  user,
  type UserRole,
} from "@/lib/db/schema";
import { loadPositions, type Position } from "@/lib/modules/org/people";
import { sortByName } from "@/lib/utils/text";

export type SquadPerson = {
  membershipId: string;
  userId: string;
  name: string;
  email: string;
  role: UserRole;
  jobTitleName: string | null;
  jobTitleOrder: number;
  isLead: boolean;
  positions: Position[];
};

export type SquadOverview = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  isActive: boolean;
  businessUnitId: string;
  businessUnitSlug: string;
  businessUnitLabel: string;
  businessUnitIsActive: boolean;
  divisionId: string | null;
  divisionName: string | null;
  members: SquadPerson[];
};

/**
 * Todos os squads, com quem os compõe.
 *
 * Uma consulta para os squads e outra para os membros, cruzadas em memória: são
 * 22 squads e algumas dezenas de vínculos, e o `join` repetiria cada squad uma
 * vez por pessoa só para desfazer a repetição depois.
 *
 * Os membros trazem TODAS as unidades organizacionais de cada um, porque é
 * justamente a mistura que o squad existe para mostrar — designer, analista e
 * coordenador médico em torno da mesma BU.
 */
export async function listSquads(): Promise<SquadOverview[]> {
  const db = await getDb();

  const [squads, membros] = await Promise.all([
    db
      .select({
        id: squad.id,
        slug: squad.slug,
        name: squad.name,
        description: squad.description,
        isActive: squad.isActive,
        businessUnitId: businessUnit.id,
        businessUnitSlug: businessUnit.slug,
        businessUnitLabel: businessUnit.label,
        businessUnitIsActive: businessUnit.isActive,
        businessUnitOrder: businessUnit.sortOrder,
        divisionId: businessDivision.id,
        divisionName: businessDivision.name,
      })
      .from(squad)
      .innerJoin(businessUnit, eq(squad.businessUnitId, businessUnit.id))
      .leftJoin(
        businessDivision,
        eq(businessUnit.divisionId, businessDivision.id),
      )
      .orderBy(asc(businessUnit.sortOrder), asc(businessUnit.label)),
    db
      .select({
        membershipId: squadMember.id,
        squadId: squadMember.squadId,
        userId: squadMember.userId,
        isLead: squadMember.isLead,
        name: user.name,
        email: user.email,
        role: user.role,
        jobTitleName: jobTitle.name,
        jobTitleOrder: jobTitle.sortOrder,
      })
      .from(squadMember)
      .innerJoin(user, eq(squadMember.userId, user.id))
      .leftJoin(jobTitle, eq(user.jobTitleId, jobTitle.id))
      .orderBy(asc(user.name)),
  ]);

  const positions = await loadPositions(membros.map((linha) => linha.userId));

  const porSquad = new Map<string, SquadPerson[]>();
  for (const linha of membros) {
    const lista = porSquad.get(linha.squadId) ?? [];
    lista.push({
      membershipId: linha.membershipId,
      userId: linha.userId,
      name: linha.name,
      email: linha.email,
      role: linha.role,
      jobTitleName: linha.jobTitleName,
      jobTitleOrder: linha.jobTitleOrder ?? 999,
      isLead: linha.isLead,
      positions: positions.get(linha.userId) ?? [],
    });
    porSquad.set(linha.squadId, lista);
  }

  for (const lista of porSquad.values()) {
    lista.sort(
      (a, b) =>
        // Responsável primeiro: é a referência que se procura ao abrir o squad.
        Number(b.isLead) - Number(a.isLead) ||
        a.jobTitleOrder - b.jobTitleOrder ||
        a.name.localeCompare(b.name, "pt-BR"),
    );
  }

  return sortByName(squads, (linha) => linha.businessUnitLabel).map(
    (linha) => ({
      ...linha,
      members: porSquad.get(linha.id) ?? [],
    }),
  );
}
