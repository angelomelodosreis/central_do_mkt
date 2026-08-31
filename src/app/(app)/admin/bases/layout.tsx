import type { ReactNode } from "react";

import { BasesTabs } from "./bases-tabs";
import { PageHeader } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth/session";
import {
  listBusinessUnits,
  listDivisions,
  listProducts,
} from "@/lib/modules/bases/queries";

export const dynamic = "force-dynamic";

/**
 * Bases oficiais: Divisão → BU → Produto.
 *
 * Ficam sob Administração porque cadastrá-las é ato de governança — o que muda
 * aqui muda o Gerador de Nomes, a Documentação e o Planejamento ao mesmo tempo.
 * Consultá-las é aberto a todos, em Documentação → Bases e Regras de Negócio.
 */
export default async function BasesLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireAdmin();

  const [divisions, units, products] = await Promise.all([
    listDivisions(),
    listBusinessUnits(),
    listProducts(),
  ]);

  const semBu = products.filter((item) => !item.businessUnitId).length;

  return (
    <>
      <PageHeader
        title="Bases oficiais"
        description="Divisão de Negócio → Business Unit → Produto. A fonte que o resto da ferramenta lê."
      />
      <BasesTabs
        divisions={divisions.length}
        units={units.length}
        products={products.length}
        productsWithoutUnit={semBu}
      />
      {children}
    </>
  );
}
