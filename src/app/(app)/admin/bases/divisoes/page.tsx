import type { Metadata } from "next";

import { DivisionsPanel } from "./divisions-panel";
import { listBusinessUnits, listDivisions } from "@/lib/modules/bases/queries";

export const metadata: Metadata = { title: "Divisões de Negócio" };
export const dynamic = "force-dynamic";

export default async function DivisionsPage() {
  const [divisions, units] = await Promise.all([
    listDivisions(),
    listBusinessUnits(),
  ]);

  return (
    <DivisionsPanel
      divisions={divisions.map((division) => ({
        id: division.id,
        slug: division.slug,
        name: division.name,
        description: division.description,
        isActive: division.isActive,
        businessUnitCount: division.businessUnitCount,
        units: units
          .filter((unit) => unit.divisionId === division.id)
          .map((unit) => ({ id: unit.id, label: unit.label })),
      }))}
      orphanUnits={units
        .filter((unit) => !unit.divisionId)
        .map((unit) => ({ id: unit.id, label: unit.label }))}
    />
  );
}
