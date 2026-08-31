"use client";

import { LinkTabs } from "@/components/ui/tabs";

/**
 * O ponto de alerta em Produtos não é decoração: o mapeamento produto → BU
 * ainda está incompleto, e essa é a pendência que a tela existe para resolver.
 */
export function BasesTabs({
  divisions,
  units,
  products,
  productsWithoutUnit,
}: {
  divisions: number;
  units: number;
  products: number;
  productsWithoutUnit: number;
}) {
  return (
    <LinkTabs
      items={[
        {
          href: "/admin/bases/divisoes",
          label: "Divisões",
          count: divisions,
        },
        {
          href: "/admin/bases/business-units",
          label: "Business Units",
          count: units,
        },
        {
          href: "/admin/bases/produtos",
          label: "Produtos",
          count: products,
          alert: productsWithoutUnit > 0,
        },
      ]}
    />
  );
}
