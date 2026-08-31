import type { Metadata } from "next";

import { StructurePanel } from "./structure-panel";
import { listOrgUnits } from "@/lib/modules/org/queries";
import { listPeople } from "@/lib/modules/org/people";

export const metadata: Metadata = { title: "Estrutura organizacional" };
export const dynamic = "force-dynamic";

export default async function OrganizacaoPage() {
  const [units, people] = await Promise.all([listOrgUnits(), listPeople()]);

  const membrosPorUnidade = new Map<string, string[]>();
  for (const person of people) {
    for (const position of person.positions) {
      const lista = membrosPorUnidade.get(position.teamId) ?? [];
      lista.push(position.isLead ? `${person.name} (responde)` : person.name);
      membrosPorUnidade.set(position.teamId, lista);
    }
  }

  return (
    <StructurePanel
      units={units.map((unit) => ({
        id: unit.id,
        slug: unit.slug,
        name: unit.name,
        description: unit.description,
        kind: unit.kind,
        isActive: unit.isActive,
        depth: unit.depth,
        parentOrgUnitId: unit.parentOrgUnitId,
        memberCount: unit.memberCount,
        totalMemberCount: unit.totalMemberCount,
        memberNames: membrosPorUnidade.get(unit.id) ?? [],
      }))}
    />
  );
}
