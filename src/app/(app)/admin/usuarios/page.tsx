import type { Metadata } from "next";
import { asc, desc, eq } from "drizzle-orm";

import { UserRow } from "./user-row";
import { Card, CardBody, CardHeader, PageHeader } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { user } from "@/lib/db/schema";

export const metadata: Metadata = { title: "Usuários" };
export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const admin = await requireAdmin();
  const db = await getDb();

  const pending = await db
    .select()
    .from(user)
    .where(eq(user.status, "pending"))
    .orderBy(asc(user.createdAt));

  const others = await db
    .select()
    .from(user)
    .where(eq(user.status, "active"))
    .orderBy(asc(user.name));

  const suspended = await db
    .select()
    .from(user)
    .where(eq(user.status, "suspended"))
    .orderBy(desc(user.updatedAt));

  return (
    <>
      <PageHeader
        title="Usuários"
        description="Aprove cadastros, defina papéis e revogue acessos. Toda alteração fica registrada na auditoria."
      />

      <div className="space-y-6">
        <Card className={pending.length > 0 ? "border-amber-300" : undefined}>
          <CardHeader
            title="Aguardando aprovação"
            description={
              pending.length > 0
                ? "Estas pessoas já entraram com o Google, mas ainda não têm acesso a nada."
                : "Nenhum cadastro aguardando aprovação."
            }
          />
          <CardBody className="px-0 py-0">
            {pending.length === 0 ? (
              <p className="px-5 py-6 text-center text-sm text-slate-500">
                Tudo em ordem por aqui.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {pending.map((item) => (
                  <UserRow
                    key={item.id}
                    user={serialize(item)}
                    isSelf={item.id === admin.id}
                  />
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title={`Membros ativos (${others.length})`}
            description="Quem tem acesso à plataforma hoje."
          />
          <CardBody className="px-0 py-0">
            <ul className="divide-y divide-slate-100">
              {others.map((item) => (
                <UserRow
                  key={item.id}
                  user={serialize(item)}
                  isSelf={item.id === admin.id}
                />
              ))}
            </ul>
          </CardBody>
        </Card>

        {suspended.length > 0 ? (
          <Card>
            <CardHeader
              title={`Suspensos (${suspended.length})`}
              description="Contas sem acesso. As sessões ativas foram derrubadas no momento da suspensão."
            />
            <CardBody className="px-0 py-0">
              <ul className="divide-y divide-slate-100">
                {suspended.map((item) => (
                  <UserRow
                    key={item.id}
                    user={serialize(item)}
                    isSelf={item.id === admin.id}
                  />
                ))}
              </ul>
            </CardBody>
          </Card>
        ) : null}
      </div>
    </>
  );
}

/** Achata o registro para o componente cliente (datas viram texto). */
function serialize(item: typeof user.$inferSelect) {
  return {
    id: item.id,
    name: item.name,
    email: item.email,
    status: item.status,
    role: item.role,
    createdAt: item.createdAt.toISOString(),
  };
}
