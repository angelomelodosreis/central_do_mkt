import type { Metadata } from "next";

import { PageHeader } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";
import { isFullAccessMaster } from "@/lib/modules/access/scope";
import { listAccessibleBusinessUnits } from "@/lib/modules/org/scope";
import { getLiveSalesAnalytics } from "@/lib/modules/sales/google-sheets-client";
import { SalesRealtimeView } from "./sales-realtime-view";

export const metadata: Metadata = {
  title: "Vendas em Tempo Real | Central do Marketing",
};
export const dynamic = "force-dynamic";

export default async function SalesRealtimePage() {
  const currentUser = await requireUser();

  const [accessibleBus, initialData] = await Promise.all([
    listAccessibleBusinessUnits(currentUser),
    getLiveSalesAnalytics(),
  ]);

  const isMaster = isFullAccessMaster({
    email: currentUser.email,
    name: currentUser.name,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vendas em Tempo Real"
        description="Monitoramento contínuo de receita, velocidade de vendas (dV/dt), aceleração e ticket médio sincronizados com o Google Sheets."
      />

      <SalesRealtimeView
        initialData={initialData}
        userAccessibleBus={accessibleBus.map((b) => ({
          id: b.id,
          label: b.label,
          slug: b.slug,
          code: `MEDCOF_${b.slug.toUpperCase()}`,
        }))}
        isMaster={isMaster}
      />
    </div>
  );
}
