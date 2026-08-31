import type { Metadata } from "next";

import { JobTitlesPanel } from "./job-titles-panel";
import { listJobTitles, listOrgUnits } from "@/lib/modules/org/queries";

export const metadata: Metadata = { title: "Cargos" };
export const dynamic = "force-dynamic";

export default async function CargosPage() {
  const [titles, units] = await Promise.all([listJobTitles(), listOrgUnits()]);

  return (
    <JobTitlesPanel
      titles={titles.map((title) => ({
        id: title.id,
        slug: title.slug,
        name: title.name,
        sortOrder: title.sortOrder,
        isActive: title.isActive,
        suggestedTeamId: title.suggestedTeamId,
        suggestedTeamName: title.suggestedTeamName,
        peopleCount: title.peopleCount,
      }))}
      units={units
        .filter((unit) => unit.isActive)
        .map((unit) => ({
          id: unit.id,
          name: unit.name,
          depth: unit.depth,
        }))}
    />
  );
}
