"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import {
  addSquadMember,
  removeSquadMember,
  toggleSquad,
  toggleSquadLead,
} from "../organizacao/actions";
import { Avatar } from "@/components/org/person-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { PillTabs } from "@/components/ui/tabs";
import { cn } from "@/lib/utils/cn";
import { matchesSearch } from "@/lib/utils/text";

type SquadMemberRow = {
  membershipId: string;
  userId: string;
  name: string;
  jobTitleName: string | null;
  isLead: boolean;
  teams: string[];
};

type SquadRow = {
  id: string;
  name: string;
  isActive: boolean;
  businessUnitLabel: string;
  businessUnitSlug: string;
  divisionName: string | null;
  members: SquadMemberRow[];
};

type PersonRef = { id: string; name: string; label: string | null };

type Filtro = "todos" | "vazios" | "sem_responsavel";

/**
 * Os squads, um cartão por BU.
 *
 * Os dois filtros não são conveniência: "sem ninguém" e "sem responsável" são
 * os dois defeitos que tornam um squad inútil na prática — o primeiro deixa a
 * BU invisível para todo mundo, o segundo deixa a equipe sem a quem perguntar.
 * Numa lista de 22, eles se escondem.
 */
export function SquadsPanel({
  squads,
  people,
}: {
  squads: SquadRow[];
  people: PersonRef[];
}) {
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todos");

  const vazios = squads.filter((item) => item.members.length === 0).length;
  const semResponsavel = squads.filter(
    (item) =>
      item.members.length > 0 && !item.members.some((member) => member.isLead),
  ).length;

  const visiveis = useMemo(() => {
    return squads.filter((item) => {
      if (filtro === "vazios" && item.members.length > 0) return false;
      if (
        filtro === "sem_responsavel" &&
        (item.members.length === 0 ||
          item.members.some((member) => member.isLead))
      ) {
        return false;
      }
      return matchesSearch(
        busca,
        item.businessUnitLabel,
        item.divisionName,
        ...item.members.map((member) => member.name),
      );
    });
  }, [squads, filtro, busca]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <PillTabs<Filtro>
          value={filtro}
          onChange={setFiltro}
          items={[
            { value: "todos", label: "Todos", count: squads.length },
            {
              value: "vazios",
              label: "Sem ninguém",
              count: vazios,
              alert: vazios > 0,
            },
            {
              value: "sem_responsavel",
              label: "Sem responsável",
              count: semResponsavel,
              alert: semResponsavel > 0,
            },
          ]}
        />
        <div className="min-w-48 flex-1">
          <Input
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            placeholder="Buscar por BU ou por pessoa…"
            aria-label="Buscar squad"
          />
        </div>
      </div>

      {visiveis.length === 0 ? (
        <Card>
          <CardBody className="py-10 text-center text-sm text-slate-500">
            Nenhum squad nesta lista.
          </CardBody>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {visiveis.map((item) => (
          <SquadCard key={item.id} squad={item} people={people} />
        ))}
      </div>
    </div>
  );
}

function SquadCard({
  squad,
  people,
}: {
  squad: SquadRow;
  people: PersonRef[];
}) {
  const [adicionando, setAdicionando] = useState(false);

  const disponiveis = people.filter(
    (person) => !squad.members.some((member) => member.userId === person.id),
  );

  const temResponsavel = squad.members.some((member) => member.isLead);

  return (
    <Card className={cn(!squad.isActive && "bg-slate-50/60")}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 px-5 py-3">
        <div className="min-w-0">
          <h2 className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-900">
            <Link
              href={`/planejamento/${squad.businessUnitSlug}`}
              className="hover:text-brand-700 hover:underline"
            >
              {squad.businessUnitLabel}
            </Link>
            {squad.isActive ? null : <Badge>Squad desativado</Badge>}
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            {squad.divisionName ?? "sem divisão"} · {squad.members.length}{" "}
            {squad.members.length === 1 ? "pessoa" : "pessoas"}
          </p>
        </div>

        <form action={toggleSquad}>
          <input type="hidden" name="squadId" value={squad.id} />
          <Button
            type="submit"
            size="sm"
            variant={squad.isActive ? "ghost" : "secondary"}
          >
            {squad.isActive ? "Desativar" : "Reativar"}
          </Button>
        </form>
      </div>

      <CardBody className="space-y-3">
        {squad.members.length === 0 ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Ninguém neste squad. Enquanto estiver assim, o planejamento desta BU
            só aparece para quem responde pela organização.
          </p>
        ) : (
          <>
            {!temResponsavel ? (
              <p className="text-xs text-amber-700">
                Sem responsável definido — a equipe não sabe a quem perguntar.
              </p>
            ) : null}

            <ul className="space-y-1.5">
              {squad.members.map((member) => (
                <li
                  key={member.membershipId}
                  className="flex items-center gap-2.5 rounded-lg px-1 py-1"
                >
                  <Avatar name={member.name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-1.5 text-sm">
                      <span className="font-medium text-slate-900">
                        {member.name}
                      </span>
                      {member.isLead ? (
                        <Badge tone="brand">responde</Badge>
                      ) : null}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {[member.jobTitleName, ...member.teams]
                        .filter(Boolean)
                        .join(" · ") || "sem cargo definido"}
                    </p>
                  </div>

                  <form action={toggleSquadLead}>
                    <input
                      type="hidden"
                      name="membershipId"
                      value={member.membershipId}
                    />
                    <Button type="submit" size="sm" variant="ghost">
                      {member.isLead ? "Tirar" : "Responsável"}
                    </Button>
                  </form>
                  <form action={removeSquadMember}>
                    <input
                      type="hidden"
                      name="membershipId"
                      value={member.membershipId}
                    />
                    <Button type="submit" size="sm" variant="ghost">
                      Remover
                    </Button>
                  </form>
                </li>
              ))}
            </ul>
          </>
        )}

        {adicionando ? (
          <form
            action={addSquadMember}
            className="flex flex-wrap items-end gap-2 border-t border-slate-100 pt-3"
          >
            <input type="hidden" name="squadId" value={squad.id} />
            <div className="min-w-48 flex-1">
              <Field label="Quem entra" htmlFor={`add-${squad.id}`}>
                <Select
                  id={`add-${squad.id}`}
                  name="userId"
                  size="sm"
                  placeholder="Escolha a pessoa…"
                  options={disponiveis.map((person) => ({
                    value: person.id,
                    label: person.name,
                    hint: person.label ?? undefined,
                  }))}
                />
              </Field>
            </div>
            <Button type="submit" size="sm">
              Adicionar
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setAdicionando(false)}
            >
              Cancelar
            </Button>
          </form>
        ) : (
          <div className="border-t border-slate-100 pt-3">
            <Button
              size="sm"
              variant="secondary"
              disabled={disponiveis.length === 0}
              onClick={() => setAdicionando(true)}
            >
              + Adicionar pessoa
            </Button>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
