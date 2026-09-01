"use client";

import { useState, type ReactNode } from "react";

import {
  addAccessGrant,
  addSquadMember,
  addTeamMembership,
  removeAccessGrant,
  removeSquadMember,
  removeTeamMembership,
  setPrimaryTeam,
  setUserJobTitle,
  toggleSuperAdmin,
} from "../../organizacao/actions";
import {
  approveUser,
  changeUserRole,
  reactivateUser,
  suspendUser,
} from "../actions";
import { Avatar } from "@/components/org/person-card";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, type SelectGroup } from "@/components/ui/select";
import { Input } from "@/components/ui/field";
import {
  ORG_UNIT_KIND_LABELS,
  ORG_UNIT_KIND_PLURALS,
  SCOPE_TYPE_LABELS,
  USER_ROLES,
  USER_ROLE_LABELS,
  type OrgUnitKind,
  type ScopeType,
  type UserRole,
  type UserStatus,
} from "@/lib/db/schema";
import type { ResolvedGrant } from "@/lib/modules/access/explain";
import { formatDate } from "@/lib/utils/format";

export type OrgUnitOption = {
  id: string;
  name: string;
  kind: OrgUnitKind;
  /** "Marketing › Conteúdo › Design" */
  path: string;
};

export type UserFileData = {
  id: string;
  name: string;
  email: string;
  status: UserStatus;
  role: UserRole;
  isSuperAdmin: boolean;
  jobTitleId: string | null;
  createdAt: string;
  approvedAt: string | null;
  teams: Array<{
    membershipId: string;
    teamId: string;
    teamName: string;
    kind: OrgUnitKind;
    path: string;
    isPrimary: boolean;
  }>;
  squads: Array<{
    membershipId: string;
    squadId: string;
    businessUnitLabel: string;
    isLead: boolean;
  }>;
  grants: ResolvedGrant[];
};

const DESCRICAO_DO_PAPEL: Record<UserRole, string> = {
  admin: "Configura a ferramenta: permissões, domínios, bases e auditoria.",
  leader: "Define os parâmetros que o time usa e delega tarefas.",
  editor: "Produz: documentação, personas, calendário e planejamento.",
  member: "Consulta e executa as próprias tarefas.",
};

/**
 * A ficha de uma pessoa, num cartão só.
 *
 * Eram seis cartões — identidade, organização, papel, escopos, squads e um
 * resumo — e cada um com cabeçalho, descrição e corpo. A ficha inteira cabe em
 * cinco linhas de rótulo e valor, que é o formato de uma ficha: uma coluna diz
 * o que é, a outra diz qual é.
 *
 * O "resumo de acesso" saiu. Era um parágrafo explicando o que as linhas acima
 * já mostram, e ninguém lê um resumo do que está logo ali.
 */
export function UserFile({
  person,
  jobTitles,
  orgUnits,
  divisions,
  businessUnits,
  squads,
  isSelf,
}: {
  person: UserFileData;
  jobTitles: Array<{ id: string; name: string }>;
  orgUnits: OrgUnitOption[];
  divisions: Array<{ id: string; name: string }>;
  businessUnits: Array<{ id: string; label: string }>;
  squads: Array<{ id: string; label: string }>;
  isSelf: boolean;
}) {
  return (
    <Card>
      <Cabecalho person={person} isSelf={isSelf} />
      <Cargo person={person} jobTitles={jobTitles} />
      <Times person={person} orgUnits={orgUnits} />
      <Papel person={person} isSelf={isSelf} />
      <Squads person={person} squads={squads} />
      <Escopos
        person={person}
        orgUnits={orgUnits}
        divisions={divisions}
        businessUnits={businessUnits}
        squads={squads}
      />
      <p className="border-t border-slate-200 px-5 py-3 text-xs text-slate-500">
        Cadastrada em {formatDate(new Date(person.createdAt))}
        {person.approvedAt
          ? ` · aprovada em ${formatDate(new Date(person.approvedAt))}`
          : ""}
      </p>
    </Card>
  );
}

/** Uma linha da ficha: à esquerda o que é, à direita qual é. */
function Linha({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-2 border-t border-slate-200 px-5 py-4 sm:grid-cols-[11rem_1fr] sm:gap-5">
      <div>
        <p className="text-sm font-medium text-slate-800">{label}</p>
        {hint ? <p className="mt-0.5 text-xs text-slate-500">{hint}</p> : null}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/**
 * Um vínculo já existente, com o caminho embaixo e o botão de tirar ao lado.
 *
 * Em pílula e não em lista: são poucos por pessoa, e a pílula deixa os três ou
 * quatro caberem numa linha em vez de virarem quatro linhas de tabela.
 */
function Pastilha({
  titulo,
  detalhe,
  marca,
  acoes,
}: {
  titulo: string;
  detalhe?: string | null;
  marca?: ReactNode;
  acoes?: ReactNode;
}) {
  return (
    <span className="inline-flex max-w-full items-center gap-2 rounded-lg border border-slate-200 bg-white py-1.5 pl-3 pr-1.5">
      <span className="min-w-0">
        <span className="flex flex-wrap items-center gap-1.5">
          <span className="truncate text-sm text-slate-900">{titulo}</span>
          {marca}
        </span>
        {detalhe ? (
          <span className="block truncate text-xs text-slate-500">
            {detalhe}
          </span>
        ) : null}
      </span>
      {acoes ? (
        <span className="flex shrink-0 items-center">{acoes}</span>
      ) : null}
    </span>
  );
}

function Cabecalho({
  person,
  isSelf,
}: {
  person: UserFileData;
  isSelf: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
      <div className="flex min-w-0 items-center gap-3">
        <Avatar name={person.name} />
        <div className="min-w-0">
          <h1 className="flex flex-wrap items-center gap-2 font-display text-lg font-semibold text-slate-900">
            {person.name}
            <StatusBadge status={person.status} />
          </h1>
          <p className="truncate text-sm text-slate-500">{person.email}</p>
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap gap-2">
        {person.status === "pending" ? (
          <form action={approveUser}>
            <input type="hidden" name="userId" value={person.id} />
            <Button type="submit" variant="primary">
              Aprovar acesso
            </Button>
          </form>
        ) : null}
        {person.status === "suspended" ? (
          <form action={reactivateUser}>
            <input type="hidden" name="userId" value={person.id} />
            <Button type="submit">Reativar</Button>
          </form>
        ) : null}
        {/* Ninguém se suspende: com um administrador só, isso trancaria a
            plataforma para fora dela mesma. O servidor também recusa. */}
        {person.status === "active" && !isSelf ? (
          <form action={suspendUser}>
            <input type="hidden" name="userId" value={person.id} />
            <Button type="submit" variant="ghost">
              Suspender
            </Button>
          </form>
        ) : null}
      </div>
    </div>
  );
}

function Cargo({
  person,
  jobTitles,
}: {
  person: UserFileData;
  jobTitles: Array<{ id: string; name: string }>;
}) {
  return (
    <Linha label="Cargo" hint="Descreve. Não dá acesso.">
      <form action={setUserJobTitle} className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="userId" value={person.id} />
        <div className="min-w-56 flex-1">
          <Select
            name="jobTitleId"
            defaultValue={person.jobTitleId ?? ""}
            ariaLabel="Cargo"
            options={[
              { value: "", label: "Sem cargo definido" },
              ...jobTitles.map((title) => ({
                value: title.id,
                label: title.name,
              })),
            ]}
          />
        </div>
        <Button type="submit">Salvar</Button>
      </form>
    </Linha>
  );
}

/** Agrupa o seletor por nível, com o nome que as pessoas usam. */
function agruparPorNivel(unidades: OrgUnitOption[]): SelectGroup[] {
  const ordem: OrgUnitKind[] = ["team", "subsector", "sector"];
  return ordem
    .map((kind) => ({
      label: ORG_UNIT_KIND_PLURALS[kind],
      options: unidades
        .filter((unidade) => unidade.kind === kind)
        .map((unidade) => ({
          value: unidade.id,
          label: unidade.name,
          hint: unidade.path,
        })),
    }))
    .filter((grupo) => grupo.options.length > 0);
}

function Times({
  person,
  orgUnits,
}: {
  person: UserFileData;
  orgUnits: OrgUnitOption[];
}) {
  const [adicionando, setAdicionando] = useState(false);

  const disponiveis = orgUnits.filter(
    (unidade) => !person.teams.some((time) => time.teamId === unidade.id),
  );

  return (
    <Linha label="Time" hint="Setor e subsetor vêm junto.">
      <div className="flex flex-wrap items-center gap-2">
        {person.teams.map((time) => (
          <Pastilha
            key={time.membershipId}
            titulo={time.teamName}
            detalhe={time.path}
            marca={
              time.isPrimary && person.teams.length > 1 ? (
                <Badge tone="brand">principal</Badge>
              ) : (
                <Badge tone="neutral">{ORG_UNIT_KIND_LABELS[time.kind]}</Badge>
              )
            }
            acoes={
              <>
                {!time.isPrimary && person.teams.length > 1 ? (
                  <form action={setPrimaryTeam}>
                    <input
                      type="hidden"
                      name="membershipId"
                      value={time.membershipId}
                    />
                    <Button
                      type="submit"
                      size="sm"
                      variant="ghost"
                      title="Usar este como o time principal da pessoa"
                    >
                      principal
                    </Button>
                  </form>
                ) : null}
                <form action={removeTeamMembership}>
                  <input
                    type="hidden"
                    name="membershipId"
                    value={time.membershipId}
                  />
                  <Button
                    type="submit"
                    size="sm"
                    variant="ghost"
                    aria-label={`Tirar de ${time.teamName}`}
                  >
                    ✕
                  </Button>
                </form>
              </>
            }
          />
        ))}

        {person.teams.length === 0 && !adicionando ? (
          <span className="text-sm text-slate-500">
            Fora da estrutura — não recebe tarefa endereçada a time.
          </span>
        ) : null}

        {adicionando ? (
          <form
            action={addTeamMembership}
            className="flex w-full flex-wrap items-end gap-2"
          >
            <input type="hidden" name="userId" value={person.id} />
            <div className="min-w-56 flex-1">
              <Select
                name="teamId"
                ariaLabel="Time"
                placeholder="Escolha o time…"
                groups={agruparPorNivel(disponiveis)}
              />
            </div>
            <Button type="submit">Adicionar</Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setAdicionando(false)}
            >
              Cancelar
            </Button>
          </form>
        ) : disponiveis.length > 0 ? (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setAdicionando(true)}
          >
            + Adicionar
          </Button>
        ) : null}
      </div>
    </Linha>
  );
}

function Papel({ person, isSelf }: { person: UserFileData; isSelf: boolean }) {
  return (
    <Linha
      label="Papel no sistema"
      hint={
        isSelf ? "Você não altera o próprio papel." : "O que ela pode fazer."
      }
    >
      <div className="space-y-3">
        <form
          action={changeUserRole}
          className="flex flex-wrap items-end gap-2"
        >
          <input type="hidden" name="userId" value={person.id} />
          <div className="min-w-56 flex-1">
            <Select
              name="role"
              defaultValue={person.role}
              disabled={isSelf}
              ariaLabel="Papel no sistema"
              options={USER_ROLES.map((role) => ({
                value: role,
                label: USER_ROLE_LABELS[role],
                hint: DESCRICAO_DO_PAPEL[role],
              }))}
            />
          </div>
          <Button type="submit" disabled={isSelf}>
            Salvar
          </Button>
        </form>

        <form action={toggleSuperAdmin} className="flex items-center gap-2">
          <input type="hidden" name="userId" value={person.id} />
          <Button
            type="submit"
            size="sm"
            variant={person.isSuperAdmin ? "ghost" : "secondary"}
            disabled={isSelf}
          >
            {person.isSuperAdmin
              ? "Remover administração da plataforma"
              : "Tornar administrador da plataforma"}
          </Button>
          {person.isSuperAdmin ? (
            <Badge tone="brand">Administra a plataforma</Badge>
          ) : null}
        </form>
      </div>
    </Linha>
  );
}

function Squads({
  person,
  squads,
}: {
  person: UserFileData;
  squads: Array<{ id: string; label: string }>;
}) {
  const [adicionando, setAdicionando] = useState(false);

  const disponiveis = squads.filter(
    (squad) => !person.squads.some((meu) => meu.squadId === squad.id),
  );

  return (
    <Linha label="Squads" hint="As BUs de que participa.">
      <div className="flex flex-wrap items-center gap-2">
        {person.squads.map((squad) => (
          <Pastilha
            key={squad.membershipId}
            titulo={squad.businessUnitLabel}
            marca={squad.isLead ? <Badge tone="brand">responde</Badge> : null}
            acoes={
              <form action={removeSquadMember}>
                <input
                  type="hidden"
                  name="membershipId"
                  value={squad.membershipId}
                />
                <Button
                  type="submit"
                  size="sm"
                  variant="ghost"
                  aria-label={`Tirar de ${squad.businessUnitLabel}`}
                >
                  ✕
                </Button>
              </form>
            }
          />
        ))}

        {person.squads.length === 0 && !adicionando ? (
          <span className="text-sm text-slate-500">
            Fora de todos os squads.
          </span>
        ) : null}

        {adicionando ? (
          <form
            action={addSquadMember}
            className="flex w-full flex-wrap items-end gap-2"
          >
            <input type="hidden" name="userId" value={person.id} />
            <div className="min-w-56 flex-1">
              <Select
                name="squadId"
                ariaLabel="Squad"
                placeholder="Escolha a BU…"
                options={disponiveis.map((squad) => ({
                  value: squad.id,
                  label: squad.label,
                }))}
              />
            </div>
            <Button type="submit">Adicionar</Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setAdicionando(false)}
            >
              Cancelar
            </Button>
          </form>
        ) : disponiveis.length > 0 ? (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setAdicionando(true)}
          >
            + Adicionar
          </Button>
        ) : null}
      </div>
    </Linha>
  );
}

function Escopos({
  person,
  orgUnits,
  divisions,
  businessUnits,
  squads,
}: {
  person: UserFileData;
  orgUnits: OrgUnitOption[];
  divisions: Array<{ id: string; name: string }>;
  businessUnits: Array<{ id: string; label: string }>;
  squads: Array<{ id: string; label: string }>;
}) {
  const [concedendo, setConcedendo] = useState(false);
  const [tipo, setTipo] = useState<ScopeType>("org_unit");

  const alvos: Record<
    ScopeType,
    Array<{ value: string; label: string; hint?: string }>
  > = {
    organization: [],
    org_unit: orgUnits.map((unidade) => ({
      value: unidade.id,
      label: unidade.name,
      hint: unidade.path,
    })),
    division: divisions.map((division) => ({
      value: division.id,
      label: division.name,
    })),
    business_unit: businessUnits.map((unit) => ({
      value: unit.id,
      label: unit.label,
    })),
    squad: squads.map((squad) => ({ value: squad.id, label: squad.label })),
  };

  return (
    <Linha
      label="Responde por"
      hint="Time, setor, BU, divisão ou squad. Alcança o que está abaixo."
    >
      <div className="flex flex-wrap items-center gap-2">
        {person.grants.map((grant) => (
          <Pastilha
            key={grant.id}
            titulo={grant.targetName}
            detalhe={grant.targetPath ?? grant.reach}
            marca={
              <Badge
                tone={grant.scopeType === "organization" ? "brand" : "neutral"}
              >
                {SCOPE_TYPE_LABELS[grant.scopeType]}
              </Badge>
            }
            acoes={
              <form action={removeAccessGrant}>
                <input type="hidden" name="grantId" value={grant.id} />
                <Button
                  type="submit"
                  size="sm"
                  variant="ghost"
                  aria-label={`Tirar responsabilidade sobre ${grant.targetName}`}
                >
                  ✕
                </Button>
              </form>
            }
          />
        ))}

        {person.grants.length === 0 && !concedendo ? (
          <span className="text-sm text-slate-500">
            Não responde por nada — vê apenas os squads de que participa.
          </span>
        ) : null}

        {concedendo ? (
          <form
            action={addAccessGrant}
            className="w-full space-y-3 rounded-lg border border-slate-200 bg-slate-50/60 p-3"
          >
            <input type="hidden" name="userId" value={person.id} />
            <div className="grid gap-3 sm:grid-cols-2">
              <Select
                name="scopeType"
                value={tipo}
                onValueChange={(valor) => setTipo(valor as ScopeType)}
                ariaLabel="Responde por"
                options={[
                  { value: "org_unit", label: "Um time, subsetor ou setor" },
                  { value: "division", label: "Uma divisão de negócio" },
                  { value: "business_unit", label: "Uma Business Unit" },
                  { value: "squad", label: "Um squad" },
                  { value: "organization", label: "Toda a organização" },
                ]}
              />
              {tipo !== "organization" ? (
                <Select
                  name="scopeId"
                  // Remontar ao trocar o tipo: sem isso a lista muda de
                  // conteúdo mantendo selecionado um id do tipo anterior.
                  key={tipo}
                  ariaLabel="Sobre o quê"
                  placeholder="Escolha…"
                  options={alvos[tipo]}
                />
              ) : null}
            </div>
            <Input
              name="note"
              maxLength={200}
              placeholder="Por quê? Opcional — é o que explica a escolha daqui a seis meses."
            />
            <div className="flex gap-2">
              <Button type="submit">Conceder</Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setConcedendo(false)}
              >
                Cancelar
              </Button>
            </div>
          </form>
        ) : (
          <Button size="sm" variant="ghost" onClick={() => setConcedendo(true)}>
            + Adicionar
          </Button>
        )}
      </div>
    </Linha>
  );
}
