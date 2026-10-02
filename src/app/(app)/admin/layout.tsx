import type { ReactNode } from "react";

import { AdminTabs } from "./admin-tabs";
import {
  can,
  isPlatformAdmin,
  requireUserManagementAccess,
} from "@/lib/auth/session";

/**
 * Toda a área administrativa exige papel de administrador ou líder (para usuários).
 * O layout é o portão; cada página revalida por conta própria também.
 */
export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const currentUser = await requireUserManagementAccess();
  const isLeaderOnly =
    currentUser.role === "leader" &&
    !isPlatformAdmin(currentUser) &&
    !can(currentUser, "admin");

  return (
    <>
      <AdminTabs isLeaderOnly={isLeaderOnly} />
      {children}
    </>
  );
}
