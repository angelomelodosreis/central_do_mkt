"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { Avatar } from "@/components/org/person-card";
import { Badge, RoleBadge, StatusBadge } from "@/components/ui/badge";
import { Card, CardBody } from "@/components/ui/card";
import { Input, FIELD_WIDTHS } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { PillTabs } from "@/components/ui/tabs";
import {
  USER_ROLES,
  USER_ROLE_LABELS,
  type ScopeType,
  type UserRole,
  type UserStatus,
} from "@/lib/db/schema";
import { cn } from "@/lib/utils/cn";
import { matchesSearch } from "@/lib/utils/text";

type PersonRow = {
  id: string;
  name: string;
  email: string;
  status: UserStatus;
  role: UserRole;
  isSuperAdmin: boolean;
  jobTitleName: string | null;
  teams: Array<{ id: string; name: string; isLead: boolean }>;
  squads: Array<{ id: string; label: string; isLead: boolean }>;
  scopes: Array<{ type: ScopeType; name: string }>;
};

type Aba = "todos" | "pending" | "sem_escopo";

/**
 * A lista de pessoas, com o alcance de cada uma à vista.
 *
 * A coluna de escopo é o motivo da tela existir assim: papel sozinho não
 * explica acesso — dois "Líder" podem alcançar coisas completamente
 * diferentes — e sem ver o alcance na listagem, descobrir quem responde por
 * quê exigiria abrir as 40 fichas uma a uma.
 */
export function UsersPanel({
  people,
  units,
}: {
  people: PersonRow[];
  units: Array<{ id: string; name: string }>;
}) {
  const [busca, setBusca] = useState("");
  const [aba, setAba] = useState<Aba>("todos");
  const [papel, setPapel] = useState("");
  const [unidade, setUnidade] = useState("");

  const pendentes = people.filter(
    (person) => person.status === "pending",
  ).length;

  const semEscopo = people.filter(
    (person) =>
      person.status === "active" &&
      !person.isSuperAdmin &&
      person.scopes.length === 0 &&
      person.squads.length === 0,
  ).length;

  const visiveis = useMemo(() => {
    return people.filter((person) => {
      if (aba === "pending" && person.status !== "pending") return false;
      if (
        aba === "sem_escopo" &&
        !(
          person.status === "active" &&
          !person.isSuperAdmin &&
          person.scopes.length === 0 &&
          person.squads.length === 0
        )
      ) {
        return false;
      }
      if (papel && person.role !== papel) return false;
      if (unidade && !person.teams.some((team) => team.id === unidade)) {
        return false;
      }
      return matchesSearch(
        busca,
        person.name,
        person.email,
        person.jobTitleName,
        ...person.teams.map((team) => team.name),
        ...person.squads.map((squad) => squad.label),
        ...person.scopes.map((scope) => scope.name),
      );
    });
  }, [people, aba, papel, unidade, busca]);

  return (
    <div className="space-y-5">
      {pendentes > 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {pendentes}{" "}
          {pendentes === 1
            ? "pessoa aguarda aprovação"
            : "pessoas aguardam aprovação"}
          . Sem aprovar, elas não acessam nada.
        </div>
      ) : null}

      <div className="space-y-3">
        <PillTabs<Aba>
          value={aba}
          onChange={setAba}
          items={[
            { value: "todos", label: "Todos", count: people.length },
            {
              value: "pending",
              label: "Aguardando aprovação",
              count: pendentes,
              alert: pendentes > 0,
            },
            {
              value: "sem_escopo",
              label: "Sem escopo",
              count: semEscopo,
              alert: semEscopo > 0,
            },
          ]}
        />

        <div className="flex flex-wrap gap-3">
          <div className="min-w-56 flex-1">
            <Input
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Buscar por nome, e-mail, cargo, time, squad…"
              aria-label="Buscar pessoa"
            />
          </div>
          <div className={FIELD_WIDTHS.md}>
            <Select
              value={papel}
              onValueChange={setPapel}
              ariaLabel="Filtrar por papel"
              placeholder="Papel"
              options={[
                { value: "", label: "Todos os papéis" },
                ...USER_ROLES.map((role) => ({
                  value: role,
                  label: USER_ROLE_LABELS[role],
                })),
              ]}
            />
          </div>
          <div className={FIELD_WIDTHS.lg}>
            <Select
              value={unidade}
              onValueChange={setUnidade}
              ariaLabel="Filtrar por unidade"
              placeholder="Unidade"
              options={[
                { value: "", label: "Todas as unidades" },
                ...units.map((unit) => ({ value: unit.id, label: unit.name })),
              ]}
            />
          </div>
        </div>
      </div>

      <Card>
        <CardBody className="px-0 py-0">
          {visiveis.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-slate-500">
              Ninguém encontrado com esses filtros.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {visiveis.map((person) => (
                <li key={person.id}>
                  <Link
                    href={`/admin/usuarios/${person.id}`}
                    className={cn(
                      "flex items-center gap-3 px-5 py-3 transition-colors hover:bg-slate-50",
                      "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-600",
                      person.status !== "active" && "bg-slate-50/60",
                    )}
                  >
                    <Avatar name={person.name} />

                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-slate-900">
                          {person.name}
                        </span>
                        {person.isSuperAdmin ? (
                          <Badge tone="brand">Administra a plataforma</Badge>
                        ) : null}
                        {person.status === "active" ? null : (
                          <StatusBadge status={person.status} />
                        )}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {person.jobTitleName ?? "sem cargo"}
                        {person.teams.length > 0
                          ? ` · ${person.teams.map((team) => team.name).join(", ")}`
                          : ""}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-slate-500">
                        {resumoDeAlcance(person)}
                      </p>
                    </div>

                    <div className="hidden shrink-0 sm:block">
                      <RoleBadge role={person.role} />
                    </div>
                    <span aria-hidden className="shrink-0 text-slate-300">
                      →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

/** Uma linha dizendo o alcance — responsabilidade primeiro, participação depois. */
function resumoDeAlcance(person: PersonRow): string {
  const partes: string[] = [];

  if (person.scopes.some((scope) => scope.type === "organization")) {
    partes.push("responde pela organização");
  } else if (person.scopes.length > 0) {
    partes.push(
      `responde por ${person.scopes.map((scope) => scope.name).join(", ")}`,
    );
  }

  if (person.squads.length > 0) {
    partes.push(
      `${person.squads.length} ${person.squads.length === 1 ? "squad" : "squads"}`,
    );
  }

  return partes.length > 0
    ? partes.join(" · ")
    : "sem escopo de responsabilidade";
}
