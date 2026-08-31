import type { Metadata } from "next";
import { asc, eq } from "drizzle-orm";

import { OrganogramaView } from "./organograma-view";
import type { OrgSnapshot } from "./types";
import { ButtonLink } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/card";
import { isPlatformAdmin, requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import {
  businessDivision,
  businessUnit,
  jobTitle,
  squad,
  team,
} from "@/lib/db/schema";
import { listPeople } from "@/lib/modules/org/people";

export const metadata: Metadata = { title: "Organograma" };
export const dynamic = "force-dynamic";

/**
 * Quem vê o organograma: qualquer pessoa aprovada.
 *
 * Sem permissão de módulo própria, ao contrário do resto. O organograma é uma
 * lista de quem é quem — a mesma informação que está no seletor de destinatário
 * de tarefa e no squad de cada BU. Esconder isso de parte do time criaria a
 * situação em que alguém recebe tarefa de uma pessoa que não consegue localizar.
 *
 * Quem EDITA é administrador, pelo mesmo motivo de sempre: mexer em vínculo de
 * squad é conceder acesso ao planejamento daquela BU.
 */
export default async function OrganogramaPage() {
  const currentUser = await requireUser();
  const canEdit = isPlatformAdmin(currentUser);

  const db = await getDb();

  const [people, units, squads, cargos] = await Promise.all([
    listPeople(),
    db.select().from(team).orderBy(asc(team.sortOrder), asc(team.name)),
    db
      .select({
        id: squad.id,
        businessUnitId: squad.businessUnitId,
        label: businessUnit.label,
        divisionName: businessDivision.name,
        isActive: squad.isActive,
        sortOrder: businessUnit.sortOrder,
      })
      .from(squad)
      .innerJoin(businessUnit, eq(squad.businessUnitId, businessUnit.id))
      .leftJoin(
        businessDivision,
        eq(businessUnit.divisionId, businessDivision.id),
      )
      .orderBy(asc(businessUnit.sortOrder), asc(businessUnit.label)),
    db
      .select()
      .from(jobTitle)
      .where(eq(jobTitle.isActive, true))
      .orderBy(asc(jobTitle.sortOrder), asc(jobTitle.name)),
  ]);

  const snapshot: OrgSnapshot = {
    people: people.map((person) => ({
      userId: person.id,
      name: person.name,
      email: person.email,
      role: person.role,
      jobTitleId: person.jobTitleId,
      jobTitleName: person.jobTitleName,
      jobTitleOrder: person.jobTitleOrder,
      positions: person.positions,
      squadIds: person.squads.map((item) => item.squadId),
      leadOfSquadIds: person.squads
        .filter((item) => item.isLead)
        .map((item) => item.squadId),
      squadMembershipIds: Object.fromEntries(
        person.squads.map((item) => [item.squadId, item.membershipId]),
      ),
    })),
    units: units.map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description,
      kind: item.kind,
      parentOrgUnitId: item.parentOrgUnitId,
      isActive: item.isActive,
    })),
    squads: squads.map((item) => ({
      id: item.id,
      businessUnitId: item.businessUnitId,
      label: item.label,
      divisionName: item.divisionName,
      isActive: item.isActive,
    })),
    jobTitles: cargos.map((item) => ({
      id: item.id,
      name: item.name,
      sortOrder: item.sortOrder,
    })),
  };

  return (
    <>
      <PageHeader
        title="Organograma"
        description="A estrutura organizacional e os squads numa base só, vistos de três ângulos."
        action={
          canEdit ? (
            <ButtonLink href="/admin/organizacao" variant="secondary">
              Administrar estrutura
            </ButtonLink>
          ) : null
        }
      />
      <OrganogramaView snapshot={snapshot} canEdit={canEdit} />
    </>
  );
}
