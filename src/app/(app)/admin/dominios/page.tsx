import type { Metadata } from "next";
import { asc, count } from "drizzle-orm";

import { NewDomainForm } from "./new-domain-form";
import { toggleAllowedDomain } from "./actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, PageHeader } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { allowedDomain, user } from "@/lib/db/schema";
import { formatDate } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Domínios de e-mail" };
export const dynamic = "force-dynamic";

export default async function AdminDomainsPage() {
  const admin = await requireAdmin();
  const db = await getDb();

  const domains = await db
    .select()
    .from(allowedDomain)
    .orderBy(asc(allowedDomain.domain));

  const usersPerDomain = await db
    .select({ emailDomain: user.emailDomain, total: count() })
    .from(user)
    .groupBy(user.emailDomain);

  const countByDomain = new Map(
    usersPerDomain.map((row) => [row.emailDomain, row.total]),
  );

  return (
    <>
      <PageHeader
        title="Domínios de e-mail"
        description="Só e-mails destes domínios conseguem se cadastrar na plataforma. Este é o primeiro filtro de segurança do acesso."
      />

      <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <strong className="font-semibold">Atenção:</strong> desativar um domínio
        não bloqueia apenas cadastros novos — revoga imediatamente o acesso de
        todos os usuários que já usam aquele domínio.
      </div>

      <Card>
        <CardHeader
          title="Autorizar novo domínio"
          description="Escreva apenas o que vem depois do @."
        />
        <CardBody>
          <NewDomainForm />
        </CardBody>
      </Card>

      <div className="mt-6">
        <Card>
          <CardHeader title={`Domínios cadastrados (${domains.length})`} />
          <CardBody className="px-0 py-0">
            <ul className="divide-y divide-slate-100">
              {domains.map((item) => {
                const userCount = countByDomain.get(item.domain) ?? 0;
                const isOwnDomain = item.domain === admin.emailDomain;

                return (
                  <li
                    key={item.id}
                    className="flex flex-wrap items-start justify-between gap-4 px-5 py-3.5"
                  >
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2">
                        <code className="font-mono text-sm font-medium text-slate-900">
                          @{item.domain}
                        </code>
                        {item.isActive ? (
                          <Badge tone="success">Autorizado</Badge>
                        ) : (
                          <Badge tone="danger">Desativado</Badge>
                        )}
                        {isOwnDomain ? (
                          <span className="text-xs text-slate-500">
                            (seu domínio)
                          </span>
                        ) : null}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {userCount === 0
                          ? "Nenhum usuário cadastrado"
                          : `${userCount} ${userCount === 1 ? "usuário" : "usuários"}`}{" "}
                        · adicionado em {formatDate(item.createdAt)}
                      </p>
                    </div>

                    {/* O admin não pode desativar o próprio domínio e se
                        trancar fora da plataforma. */}
                    {item.isActive && isOwnDomain ? (
                      <span className="text-xs text-slate-500">
                        Não é possível desativar o domínio da sua própria conta
                      </span>
                    ) : (
                      <form action={toggleAllowedDomain}>
                        <input type="hidden" name="domainId" value={item.id} />
                        <Button
                          type="submit"
                          size="sm"
                          variant={item.isActive ? "danger" : "secondary"}
                        >
                          {item.isActive ? "Desativar" : "Reativar"}
                        </Button>
                      </form>
                    )}
                  </li>
                );
              })}
            </ul>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
