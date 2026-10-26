import type { Metadata } from "next";

import {
  CalculatorWorkspace,
  type ProductOption,
} from "./calculator-workspace";
import { requireUser } from "@/lib/auth/session";
import { listProducts } from "@/lib/modules/bases/queries";

export const metadata: Metadata = {
  title: "Calculadora de Parcelas",
};

export const dynamic = "force-dynamic";

export default async function CalculadoraDeParcelasPage() {
  await requireUser();

  const allProducts = await listProducts({ includeInactive: false });
  const suggestedProducts: ProductOption[] = allProducts.map((p) => ({
    id: p.id,
    name: p.name,
    businessUnitLabel: p.businessUnitLabel,
  }));

  return <CalculatorWorkspace suggestedProducts={suggestedProducts} />;
}
