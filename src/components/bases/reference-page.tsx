import {
  BusinessUnitsTable,
  DivisionsTable,
  ProductsTable,
} from "./reference-tables";
import type { DocPageType } from "@/lib/db/schema";

/**
 * O corpo de uma página de referência, escolhido pelo tipo dela.
 *
 * Um lugar só decide isso. Antes o `if` do tipo de página estava repetido em
 * três telas (a página, a listagem da categoria e o índice) — acrescentar o
 * segundo tipo de referência significaria acertar os três, e esquecer um
 * deixaria a página em branco sem erro nenhum.
 */
export function ReferencePageBody({
  pageType,
  canEdit,
}: {
  pageType: DocPageType;
  canEdit: boolean;
}) {
  switch (pageType) {
    case "divisions_reference":
      return <DivisionsTable canEdit={canEdit} />;
    case "products_reference":
      return <ProductsTable canEdit={canEdit} />;
    case "business_units_reference":
      return <BusinessUnitsTable canEdit={canEdit} />;
    default:
      return null;
  }
}

/** Etiqueta curta usada nas listagens. */
export const REFERENCE_PAGE_BADGE: Partial<Record<DocPageType, string>> = {
  business_units_reference: "Base oficial",
  divisions_reference: "Base oficial",
  products_reference: "Base oficial",
};
