"use client";

import { approveUser, reactivateUser, suspendUser } from "../actions";
import { Avatar } from "@/components/org/person-card";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import type { UserStatus } from "@/lib/db/schema";
import { formatDateTime } from "@/lib/utils/format";

/**
 * Quem é a pessoa, e se ela pode entrar.
 *
 * Situação fica aqui, junto da identidade, e não numa aba de "acesso": entrar
 * na plataforma é anterior a tudo o mais. Suspender alguém derruba as sessões
 * na hora — nenhum escopo importa se a porta está fechada.
 */
export function IdentityCard({
  person,
  isSelf,
}: {
  person: {
    id: string;
    name: string;
    email: string;
    status: UserStatus;
    createdAt: string;
    approvedAt: string | null;
  };
  isSelf: boolean;
}) {
  return (
    <Card>
      <CardBody className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={person.name} />
          <div className="min-w-0">
            <h1 className="flex flex-wrap items-center gap-2 font-display text-lg font-semibold text-slate-900">
              {person.name}
              <StatusBadge status={person.status} />
            </h1>
            <p className="truncate text-sm text-slate-500">{person.email}</p>
            <p className="mt-0.5 text-xs text-slate-400">
              Cadastrada em {formatDateTime(new Date(person.createdAt))}
              {person.approvedAt
                ? ` · aprovada em ${formatDateTime(new Date(person.approvedAt))}`
                : ""}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          {person.status === "pending" ? (
            <form action={approveUser}>
              <input type="hidden" name="userId" value={person.id} />
              <Button type="submit">Aprovar acesso</Button>
            </form>
          ) : null}

          {person.status === "suspended" ? (
            <form action={reactivateUser}>
              <input type="hidden" name="userId" value={person.id} />
              <Button type="submit" variant="secondary">
                Reativar
              </Button>
            </form>
          ) : null}

          {/* Ninguém se suspende: com um administrador só, isso trancaria a
              plataforma para fora dela mesma. O servidor também recusa. */}
          {person.status === "active" && !isSelf ? (
            <form action={suspendUser}>
              <input type="hidden" name="userId" value={person.id} />
              <Button type="submit" variant="danger">
                Suspender
              </Button>
            </form>
          ) : null}
        </div>
      </CardBody>
    </Card>
  );
}
