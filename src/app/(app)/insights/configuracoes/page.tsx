import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { listAllInsightPages } from "@/lib/modules/insights/queries";
import { listBusinessUnits } from "@/lib/modules/bases/queries";
import { InsightsSettingsView } from "./insights-settings-view";

export const metadata: Metadata = {
  title: "Configurações de LPs | Insights MedCof",
};

export const dynamic = "force-dynamic";

export default async function InsightsSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ cadastrar?: string }>;
}) {
  await requireUser();
  const { cadastrar } = await searchParams;

  const [rawPages, rawBus] = await Promise.all([
    listAllInsightPages(),
    listBusinessUnits({ includeInactive: false }),
  ]);

  const businessUnits = rawBus.map((b) => ({
    id: b.id,
    label: b.label,
    code: b.code || "",
  }));

  return (
    <div className="pb-16">
      <InsightsSettingsView
        initialPages={rawPages}
        businessUnits={businessUnits}
        startWithModalOpen={cadastrar === "1"}
      />
    </div>
  );
}
