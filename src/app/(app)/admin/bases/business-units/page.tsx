import type { Metadata } from "next";

import { BusinessUnitsPanel } from "./business-units-panel";
import { listBusinessUnits, listDivisions } from "@/lib/modules/bases/queries";

export const metadata: Metadata = { title: "Business Units" };
export const dynamic = "force-dynamic";

export default async function BusinessUnitsPage() {
  const [units, divisions] = await Promise.all([
    listBusinessUnits(),
    listDivisions(),
  ]);

  return (
    <BusinessUnitsPanel
      units={units.map((unit) => ({
        id: unit.id,
        slug: unit.slug,
        label: unit.label,
        description: unit.description,
        isActive: unit.isActive,
        divisionId: unit.divisionId,
        divisionName: unit.divisionName,
        productCount: unit.productCount,
      }))}
      divisions={divisions
        .filter((division) => division.isActive)
        .map((division) => ({ id: division.id, name: division.name }))}
    />
  );
}
