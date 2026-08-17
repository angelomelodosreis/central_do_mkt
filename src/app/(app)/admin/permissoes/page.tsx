import type { Metadata } from "next";

import { PermissionMatrixForm } from "./permission-matrix-form";
import { Card, CardBody, CardHeader, PageHeader } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { rolePermission } from "@/lib/db/schema";

export const metadata: Metadata = { title: "Permissões" };
export const dynamic = "force-dynamic";

export default async function AdminPermissionsPage() {
  await requireAdmin();
  const db = await getDb();

  const rows = await db.select().from(rolePermission);

  const current = Object.fromEntries(
    rows.map((row) => [
      `${row.role}:${row.moduleKey}`,
      { canView: row.canView, canEdit: row.canEdit },
    ]),
  );

  return (
    <>
      <PageHeader
        title="Permissões"
        description="Defina o que cada papel pode ver e editar em cada módulo. As mudanças valem imediatamente, sem precisar de deploy."
      />

      <Card>
        <CardHeader
          title="Matriz de permissões"
          description="Quem pode editar sempre pode ver, mesmo que a caixa 'Ver' esteja desmarcada."
        />
        <CardBody>
          <PermissionMatrixForm current={current} />
        </CardBody>
      </Card>
    </>
  );
}
