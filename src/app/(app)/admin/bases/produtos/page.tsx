import type { Metadata } from "next";

import { ProductsPanel } from "./products-panel";
import { listBusinessUnits, listProducts } from "@/lib/modules/bases/queries";

export const metadata: Metadata = { title: "Produtos" };
export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const [products, units] = await Promise.all([
    listProducts(),
    listBusinessUnits({ includeInactive: false }),
  ]);

  return (
    <ProductsPanel
      products={products.map((item) => ({
        id: item.id,
        slug: item.slug,
        name: item.name,
        isActive: item.isActive,
        businessUnitId: item.businessUnitId,
        businessUnitLabel: item.businessUnitLabel,
        divisionName: item.divisionName,
      }))}
      units={units.map((unit) => ({
        id: unit.id,
        label: unit.label,
        divisionName: unit.divisionName,
      }))}
    />
  );
}
