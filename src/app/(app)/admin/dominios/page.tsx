import type { Metadata } from "next";
import { asc, count } from "drizzle-orm";

import { NewDomainForm } from "./new-domain-form";
import { toggleAllowedDomain } from "./actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, PageHeader } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { allowedDomain, user } from "@/lib/db/schema";
import { formatDate } from "@/lib/utils/format";
import { plural } from "@/lib/utils/text";

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

      <div className="mb-4">
        <NewDomainForm />
      </div>

      <Card>
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
                        : `${plural(userCount, "usuário")}`}{" "}
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
                      <Button type="submit" size="sm" variant="ghost">
                        {item.isActive ? "Desativar" : "Reativar"}
                      </Button>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
          {/* O aviso fica no pé da lista, ao lado do botão que ele descreve.
              No topo, em faixa âmbar, ele alertava sobre uma ação que ainda
              nem tinha sido cogitada — e era a primeira coisa da tela. */}
          <p className="border-t border-slate-200 px-5 py-3 text-xs text-slate-500">
            Desativar um domínio não bloqueia apenas cadastros novos: revoga na
            hora o acesso de quem já usa aquele domínio.
          </p>
        </CardBody>
      </Card>
    </>
  );
}
