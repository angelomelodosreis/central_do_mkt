"use client";

import { setPersonJobTitle } from "./actions";
import type { OrgPerson, OrgSnapshot } from "./types";
import {
  addSquadMember,
  addTeamMembership,
  removeSquadMember,
  removeTeamMembership,
} from "../admin/organizacao/actions";
import { changeUserRole } from "../admin/usuarios/actions";
import { SectionTitle } from "@/components/ui/card";
import { Badge, RoleBadge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import {
  ORG_UNIT_KIND_LABELS,
  USER_ROLES,
  USER_ROLE_LABELS,
} from "@/lib/db/schema";

/**
 * Edição da pessoa sem sair do organograma.
 *
 * Um painel lateral, e não um desvio para Administração: quem está olhando a
 * estrutura precisa corrigir o cargo ou a unidade ali, no contexto em que
 * percebeu o erro. Sair da tela e voltar faz perder o lugar na árvore — e, com
 * 40 pessoas, achar de novo onde se estava é o suficiente para não corrigir.
 *
 * As ações são as MESMAS da ficha em Administração. Nenhuma regra vive aqui: se
 * vivesse, as duas telas divergiriam na primeira mudança.
 */
export function PersonDrawer({
  person,
  snapshot,
  canEdit,
  onClose,
}: {
  person: OrgPerson;
  snapshot: OrgSnapshot;
  canEdit: boolean;
  onClose: () => void;
}) {
  const unidadesDisponiveis = snapshot.units.filter(
    (unit) =>
      unit.isActive &&
      !person.positions.some((position) => position.teamId === unit.id),
  );

  const squadsDisponiveis = snapshot.squads.filter(
    (item) => item.isActive && !person.squadIds.includes(item.id),
  );

  return (
    <Drawer
      open
      onClose={onClose}
      title={person.name}
      description={person.email}
    >
      <div className="space-y-5">
        {/* Cargo — um só, e da pessoa */}
        <section>
          <SectionTitle>Cargo</SectionTitle>
          {canEdit ? (
            <form action={setPersonJobTitle} className="flex items-end gap-2">
              <input type="hidden" name="userId" value={person.userId} />
              <div className="min-w-0 flex-1">
                <Select
                  name="jobTitleId"
                  size="sm"
                  defaultValue={person.jobTitleId ?? ""}
                  ariaLabel="Cargo"
                  placeholder="Sem cargo definido"
                  options={[
                    { value: "", label: "Sem cargo definido" },
                    ...snapshot.jobTitles.map((title) => ({
                      value: title.id,
                      label: title.name,
                    })),
                  ]}
                />
              </div>
              <Button type="submit" size="sm" variant="secondary">
                Salvar
              </Button>
            </form>
          ) : (
            <p className="text-sm text-slate-700">
              {person.jobTitleName ?? "sem cargo definido"}
            </p>
          )}
        </section>

        {/* Papel de acesso */}
        <section>
          <SectionTitle>Papel de acesso</SectionTitle>
          {canEdit ? (
            <form action={changeUserRole} className="flex items-end gap-2">
              <input type="hidden" name="userId" value={person.userId} />
              <div className="min-w-0 flex-1">
                <Select
                  name="role"
                  size="sm"
                  defaultValue={person.role}
                  ariaLabel="Papel de acesso"
                  options={USER_ROLES.map((role) => ({
                    value: role,
                    label: USER_ROLE_LABELS[role],
                  }))}
                />
              </div>
              <Button type="submit" size="sm" variant="secondary">
                Salvar
              </Button>
            </form>
          ) : (
            <RoleBadge role={person.role} />
          )}
          <p className="mt-1.5 text-xs text-slate-500">
            O papel diz o que ela pode fazer. Sobre o quê é escopo — e escopo se
            concede na ficha completa.
          </p>
        </section>

        {/* Onde a pessoa está na estrutura */}
        <section>
          <SectionTitle>
            Times e setores ({person.positions.length})
          </SectionTitle>

          {person.positions.length === 0 ? (
            <p className="text-sm text-slate-500">Fora da estrutura.</p>
          ) : (
            <ul className="space-y-1.5">
              {person.positions.map((position) => (
                <li
                  key={position.membershipId}
                  className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-2.5 py-2"
                >
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-1.5 text-sm">
                      <span className="font-medium text-slate-900">
                        {position.teamName}
                      </span>
                      <Badge tone="neutral">
                        {ORG_UNIT_KIND_LABELS[position.kind]}
                      </Badge>
                      {position.isPrimary ? (
                        <Badge tone="brand">Principal</Badge>
                      ) : null}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {position.path}
                    </p>
                  </div>

                  {canEdit ? (
                    <div className="flex shrink-0 gap-1">
                      <form action={removeTeamMembership}>
                        <input
                          type="hidden"
                          name="membershipId"
                          value={position.membershipId}
                        />
                        <Button type="submit" size="sm" variant="ghost">
                          Sair
                        </Button>
                      </form>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}

          {canEdit && unidadesDisponiveis.length > 0 ? (
            <form
              action={addTeamMembership}
              className="mt-2 flex items-end gap-2"
            >
              <input type="hidden" name="userId" value={person.userId} />
              <div className="min-w-0 flex-1">
                <Field label="Incluir em" htmlFor="drawer-unidade">
                  <Select
                    id="drawer-unidade"
                    name="teamId"
                    size="sm"
                    placeholder="Escolha…"
                    options={unidadesDisponiveis.map((unit) => ({
                      value: unit.id,
                      label: unit.name,
                      hint: ORG_UNIT_KIND_LABELS[unit.kind],
                    }))}
                  />
                </Field>
              </div>
              <Button type="submit" size="sm">
                Adicionar
              </Button>
            </form>
          ) : null}
        </section>

        {/* Squads */}
        <section>
          <SectionTitle>Squads ({person.squadIds.length})</SectionTitle>

          {person.squadIds.length === 0 ? (
            <p className="text-sm text-slate-500">
              Fora de todos os squads — não enxerga planejamento de BU nenhuma.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {snapshot.squads
                .filter((item) => person.squadIds.includes(item.id))
                .map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-2.5 py-2"
                  >
                    <p className="flex flex-wrap items-center gap-1.5 text-sm">
                      <span className="font-medium text-slate-900">
                        {item.label}
                      </span>
                      {person.leadOfSquadIds.includes(item.id) ? (
                        <Badge tone="brand">Responde</Badge>
                      ) : null}
                    </p>
                    {canEdit ? (
                      <form action={removeSquadMember}>
                        <input
                          type="hidden"
                          name="membershipId"
                          value={person.squadMembershipIds[item.id] ?? ""}
                        />
                        <Button type="submit" size="sm" variant="ghost">
                          Sair
                        </Button>
                      </form>
                    ) : null}
                  </li>
                ))}
            </ul>
          )}

          {canEdit && squadsDisponiveis.length > 0 ? (
            <form action={addSquadMember} className="mt-2 flex items-end gap-2">
              <input type="hidden" name="userId" value={person.userId} />
              <div className="min-w-0 flex-1">
                <Field label="Adicionar squad" htmlFor="drawer-squad">
                  <Select
                    id="drawer-squad"
                    name="squadId"
                    size="sm"
                    placeholder="Escolha a BU…"
                    options={squadsDisponiveis.map((item) => ({
                      value: item.id,
                      label: item.label,
                      hint: item.divisionName ?? undefined,
                    }))}
                  />
                </Field>
              </div>
              <Button type="submit" size="sm">
                Adicionar
              </Button>
            </form>
          ) : null}
        </section>

        {canEdit ? (
          <ButtonLink
            href={`/admin/usuarios/${person.userId}`}
            variant="secondary"
            className="w-full"
          >
            Abrir ficha completa
          </ButtonLink>
        ) : null}
      </div>
    </Drawer>
  );
}
