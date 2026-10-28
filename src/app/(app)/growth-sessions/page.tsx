import type { Metadata } from "next";

import { requireUser } from "@/lib/auth/session";
import { listGrowthSessions } from "@/lib/modules/growth-sessions/queries";
import { GrowthSessionsView } from "./growth-sessions-view";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Growth Sessions · Treinamentos e Playbooks MedCof",
  description:
    "Hub de capacitações práticas, atas, playbooks e gravações da equipe de Growth do Grupo MedCof.",
};

export default async function GrowthSessionsPage() {
  await requireUser();
  const sessions = await listGrowthSessions();

  return <GrowthSessionsView initialSessions={sessions} />;
}
