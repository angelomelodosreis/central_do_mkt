"use client";

import { LinkTabs } from "@/components/ui/tabs";

export function OrgTabs({
  units,
  jobTitles,
}: {
  units: number;
  jobTitles: number;
}) {
  return (
    <LinkTabs
      items={[
        { href: "/admin/organizacao", label: "Estrutura", count: units },
        {
          href: "/admin/organizacao/cargos",
          label: "Cargos",
          count: jobTitles,
        },
      ]}
    />
  );
}
