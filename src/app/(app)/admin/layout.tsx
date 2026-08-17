import type { ReactNode } from "react";

import { AdminTabs } from "./admin-tabs";
import { requireAdmin } from "@/lib/auth/session";

/**
 * Toda a área administrativa exige papel de administrador.
 * O layout é o portão; cada página revalida por conta própria também.
 */
export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireAdmin();

  return (
    <>
      <AdminTabs />
      {children}
    </>
  );
}
