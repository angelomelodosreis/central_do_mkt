import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { getInsightsOverview } from "@/lib/modules/insights/queries";
import { listBusinessUnits } from "@/lib/modules/bases/queries";
import { InsightsOverviewView } from "./insights-overview-view";

export const metadata: Metadata = {
  title: "Insights & Heatmap | Central do Marketing",
  description: "Monitoramento de conversão, cliques em CTAs e mapas de calor das Landing Pages MedCof",
};

export const dynamic = "force-dynamic";

export default async function InsightsPage() {
  await requireUser();

  const [initialData, rawBus] = await Promise.all([
    getInsightsOverview({ periodDays: 30 }),
    listBusinessUnits({ includeInactive: false }),
  ]);

  const businessUnits = rawBus.map((b) => ({
    id: b.id,
    label: b.label,
    code: b.code || "",
  }));

  return (
    <div className="pb-12">
      <InsightsOverviewView
        initialData={initialData}
        businessUnits={businessUnits}
      />
    </div>
  );
}
