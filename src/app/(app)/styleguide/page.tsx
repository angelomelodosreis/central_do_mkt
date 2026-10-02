import type { Metadata } from "next";

import { StyleGuideView } from "@/components/design-system/style-guide-view";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Design System & Style Guide | Central do Marketing",
};
export const dynamic = "force-dynamic";

export default async function StyleGuidePage() {
  await requireUser();

  return <StyleGuideView />;
}
