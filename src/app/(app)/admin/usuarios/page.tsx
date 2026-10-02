import type { Metadata } from "next";

import { UsersGovernanceTabs } from "./users-governance-tabs";
import { PageHeader } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth/session";
import { loadGovernanceMatrix } from "@/lib/modules/access/cascade";
import { listGrantsForUser } from "@/lib/modules/access/explain";
import { getPendingBuRequestsSummary } from "@/lib/modules/access/bu-requests";
import { listPeople } from "@/lib/modules/org/people";
import { listOrgUnits } from "@/lib/modules/org/queries";

export const metadata: Metadata = { title: "Usuários e Governança" };
export const dynamic = "force-dynamic";

export default async function UsersPage() {
  await requireAdmin();

  const [people, units, matrixData, pendingBuMap] = await Promise.all([
    listPeople({ includeInactive: true }),
    listOrgUnits(),
    loadGovernanceMatrix(),
    getPendingBuRequestsSummary(),
  ]);

  const escopos = await Promise.all(
    people.map(async (person) => ({
      userId: person.id,
      grants: await listGrantsForUser(person.id),
    })),
  );
  const porUsuario = new Map(escopos.map((item) => [item.userId, item.grants]));

  const formattedPeople = people.map((person) => ({
    id: person.id,
    name: person.name,
    email: person.email,
    status: person.status,
    role: person.role,
    isSuperAdmin: person.isSuperAdmin,
    jobTitleName: person.jobTitleName,
    teams: person.positions.map((position) => ({
      id: position.teamId,
      name: position.teamName,
    })),
    squads: person.squads.map((item) => ({
      id: item.businessUnitId,
      label: item.businessUnitLabel,
      isLead: item.isLead,
    })),
    scopes: (porUsuario.get(person.id) ?? []).map((grant) => ({
      type: grant.scopeType,
      name: grant.targetName,
    })),
    requestedBUs: pendingBuMap.get(person.id)?.buLabels ?? [],
  }));

  const formattedUnits = units.map((unit) => ({
    id: unit.id,
    name: unit.name,
  }));

  return (
    <>
      <PageHeader
        title="Usuários e Governança de Acessos"
        description="Controle interativo da cascata de responsabilidades, alocações de squad e permissões de toda a organização."
      />
      <UsersGovernanceTabs
        matrixData={matrixData}
        people={formattedPeople}
        units={formattedUnits}
      />
    </>
  );
}
