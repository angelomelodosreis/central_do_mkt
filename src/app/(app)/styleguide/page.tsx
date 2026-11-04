import type { Metadata } from "next";
import { StyleGuideView } from "@/components/design-system/style-guide-view";

export const metadata: Metadata = {
  title: "Design System & Style Guide | Central do Marketing",
  description:
    "Catálogo oficial de componentes, tokens visuais, degradês de ação e padrões de interface do MedCof UI para a Central do Marketing.",
};

export default function StyleGuidePage() {
  return <StyleGuideView />;
}
