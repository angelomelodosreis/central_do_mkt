import type { Metadata } from "next";

import { SquadsPanel } from "./squads-panel";
import { PageHeader } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth/session";
import { listPeople } from "@/lib/modules/org/people";
import { listSquads } from "@/lib/modules/org/squads";

export const metadata: Metadata = { title: "Squads" };
export const dynamic = "force-dynamic";

export default async function SquadsPage() {
  await requireAdmin();

  const [squads, people] = await Promise.all([listSquads(), listPeople()]);

  return (
    <>
      <PageHeader
        title="Squads"
        description="A equipe multidisciplinar de cada Business Unit. Diferente de time: o squad reúne gente de várias unidades — inclusive de fora do marketing — em torno de uma BU."
      />
      <SquadsPanel
        squads={squads.map((item) => ({
          id: item.id,
          name: item.name,
          isActive: item.isActive,
          businessUnitLabel: item.businessUnitLabel,
          businessUnitSlug: item.businessUnitSlug,
          divisionName: item.divisionName,
          members: item.members.map((member) => ({
            membershipId: member.membershipId,
            userId: member.userId,
            name: member.name,
            jobTitleName: member.jobTitleName,
            isLead: member.isLead,
            teams: member.positions.map((position) => position.teamName),
          })),
        }))}
        people={people.map((person) => ({
          id: person.id,
          name: person.name,
          label: person.jobTitleName,
        }))}
      />
    </>
  );
}
