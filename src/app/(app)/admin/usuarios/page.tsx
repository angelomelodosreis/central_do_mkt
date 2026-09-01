import type { Metadata } from "next";

import { UsersPanel } from "./users-panel";
import { PageHeader } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth/session";
import { listGrantsForUser } from "@/lib/modules/access/explain";
import { listPeople } from "@/lib/modules/org/people";
import { listOrgUnits } from "@/lib/modules/org/queries";

export const metadata: Metadata = { title: "Usuários e acessos" };
export const dynamic = "force-dynamic";

export default async function UsersPage() {
  await requireAdmin();

  const [people, units] = await Promise.all([
    listPeople({ includeInactive: true }),
    listOrgUnits(),
  ]);

  // Os escopos entram na listagem porque a pergunta que se faz aqui é "quem
  // alcança o quê?" — e uma lista que só mostra papel não responde isso: dois
  // "Líder" podem ter alcances completamente diferentes.
  const escopos = await Promise.all(
    people.map(async (person) => ({
      userId: person.id,
      grants: await listGrantsForUser(person.id),
    })),
  );
  const porUsuario = new Map(escopos.map((item) => [item.userId, item.grants]));

  return (
    <>
      <PageHeader
        title="Usuários e acessos"
        description="Quem é a pessoa, onde ela está na organização e sobre o que ela responde."
      />
      <UsersPanel
        people={people.map((person) => ({
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
        }))}
        units={units.map((unit) => ({ id: unit.id, name: unit.name }))}
      />
    </>
  );
}
