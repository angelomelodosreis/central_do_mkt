import type { Metadata } from "next";
import { and, asc, count, eq, inArray } from "drizzle-orm";

import { ProductList, type ProductRow } from "./product-list";
import { EmptyState, PageHeader } from "@/components/ui/card";
import { getDb } from "@/lib/db/client";
import { strategyProduct, timelineItem } from "@/lib/db/schema";
import { requireStrategyBusinessUnit } from "@/lib/modules/strategy/access";
import {
  listCycles,
  pickDefaultCycle,
} from "@/lib/modules/strategy/queries";

export const metadata: Metadata = { title: "Esteira de produtos" };
export const dynamic = "force-dynamic";

export default async function ProductsPage({
  params,
}: {
  params: Promise<{ businessUnitSlug: string }>;
}) {
  const { businessUnitSlug } = await params;
  const { unit, canEdit } = await requireStrategyBusinessUnit(businessUnitSlug);

  const db = await getDb();

  const products = await db
    .select()
    .from(strategyProduct)
    .where(eq(strategyProduct.businessUnitId, unit.id))
    .orderBy(asc(strategyProduct.sortOrder), asc(strategyProduct.name));

  // Quantas datas cada produto ocupa no ciclo aberto: é o que mostra, sem abrir
  // o calendário, quais produtos da esteira ainda não foram posicionados no ano.
  const cycles = await listCycles(unit.id);
  const cycle = pickDefaultCycle(cycles);

  const janelas = new Map<string, number>();
  if (cycle && products.length > 0) {
    const rows = await db
      .select({ productId: timelineItem.productId, total: count() })
      .from(timelineItem)
      .where(
        and(
          eq(timelineItem.cycleId, cycle.id),
          inArray(
            timelineItem.productId,
            products.map((product) => product.id),
          ),
        ),
      )
      .groupBy(timelineItem.productId);

    for (const row of rows) {
      if (row.productId) janelas.set(row.productId, row.total);
    }
  }

  const rows: ProductRow[] = products.map((product) => ({
    id: product.id,
    name: product.name,
    cadence: product.cadence,
    family: product.family,
    isActive: product.isActive,
    janelas: janelas.get(product.id) ?? 0,
  }));

  return (
    <>
      <PageHeader
        title="Esteira de produtos"
        description={`O que ${unit.label} vende ao longo do ciclo. É esta lista que o calendário usa para agrupar e colorir as janelas de venda.`}
      />

      {rows.length === 0 && !canEdit ? (
        <EmptyState
          title="Nenhum produto cadastrado"
          description="Quem trabalha nesta BU precisa cadastrar a esteira antes de montar as janelas no calendário."
        />
      ) : (
        <ProductList
          businessUnitId={unit.id}
          products={rows}
          canEdit={canEdit}
        />
      )}
    </>
  );
}
