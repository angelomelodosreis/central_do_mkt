"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  deactivatePerson,
  removeFromAllOrgUnits,
  setPersonJobTitle,
} from "./actions";
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
 * Seção de Cargo com feedback imediato, bloqueio contra múltiplos cliques
 * e atualização otimista na interface.
 */
function CargoSection({
  person,
  jobTitles,
  canEdit,
}: {
  person: OrgPerson;
  jobTitles: Array<{ id: string; name: string }>;
  canEdit: boolean;
}) {
  const [selectedJobTitleId, setSelectedJobTitleId] = useState(
    person.jobTitleId ?? "",
  );
  const [displayedJobTitleName, setDisplayedJobTitleName] = useState(
    person.jobTitleName ?? null,
  );
  const [isPending, startTransition] = useTransition();

  // Mantém sincronizado caso a pessoa ou os dados externos mudem
  useEffect(() => {
    setSelectedJobTitleId(person.jobTitleId ?? "");
    setDisplayedJobTitleName(person.jobTitleName ?? null);
  }, [person.jobTitleId, person.jobTitleName]);

  const hasChanged = selectedJobTitleId !== (person.jobTitleId ?? "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isPending || !hasChanged) return;

    const previousJobTitleId = person.jobTitleId ?? "";
    const previousJobTitleName = displayedJobTitleName;
    const targetTitle = jobTitles.find((t) => t.id === selectedJobTitleId);
    const newName = targetTitle
      ? targetTitle.name
      : selectedJobTitleId
        ? null
        : "Sem cargo definido";

    // Atualização otimista imediata para feedback instantâneo ao usuário
    setDisplayedJobTitleName(newName);

    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.append("userId", person.userId);
        fd.append("jobTitleId", selectedJobTitleId);

        const res = await setPersonJobTitle(fd);
        if (res && !res.ok) {
          // Reverte o estado visual em caso de falha do servidor
          setSelectedJobTitleId(previousJobTitleId);
          setDisplayedJobTitleName(previousJobTitleName);
          toast.error(res.message || "Erro ao atualizar cargo.");
        } else {
          toast.success(
            newName && newName !== "Sem cargo definido"
              ? `Cargo de ${person.name} atualizado para "${newName}"!`
              : `Cargo de ${person.name} removido com sucesso!`,
          );
        }
      } catch (err) {
        console.error(err);
        setSelectedJobTitleId(previousJobTitleId);
        setDisplayedJobTitleName(previousJobTitleName);
        toast.error("Erro ao salvar cargo. Tente novamente.");
      }
    });
  };

  return (
    <section>
      <div className="flex items-center justify-between">
        <SectionTitle>Cargo</SectionTitle>
        {isPending && (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-brand-600 animate-pulse">
            <Loader2 className="size-3.5 animate-spin" />
            Salvando cargo…
          </span>
        )}
      </div>

      {canEdit ? (
        <form onSubmit={handleSubmit} className="flex items-end gap-2">
          <input type="hidden" name="userId" value={person.userId} />
          <div className="min-w-0 flex-1">
            <Select
              name="jobTitleId"
              size="sm"
              value={selectedJobTitleId}
              onValueChange={setSelectedJobTitleId}
              disabled={isPending}
              ariaLabel="Cargo"
              placeholder="Sem cargo definido"
              options={[
                { value: "", label: "Sem cargo definido" },
                ...jobTitles.map((title) => ({
                  value: title.id,
                  label: title.name,
                })),
              ]}
            />
          </div>
          <Button
            type="submit"
            size="sm"
            variant={hasChanged ? "primary" : "secondary"}
            loading={isPending}
            disabled={isPending || !hasChanged}
          >
            {isPending ? "Salvando…" : "Salvar"}
          </Button>
        </form>
      ) : (
        <p className="text-sm text-slate-700">
          {displayedJobTitleName ?? "sem cargo definido"}
        </p>
      )}

      {displayedJobTitleName && canEdit && (
        <p className="mt-1.5 text-xs text-slate-500">
          Cargo atual:{" "}
          <span className="font-semibold text-slate-800">
            {displayedJobTitleName}
          </span>
        </p>
      )}
    </section>
  );
}

/**
 * Seção de Papel com feedback visual imediato e trava anti-duplo clique.
 */
function RoleSection({
  person,
  canEdit,
}: {
  person: OrgPerson;
  canEdit: boolean;
}) {
  const [selectedRole, setSelectedRole] = useState(person.role);
  const [displayedRole, setDisplayedRole] = useState(person.role);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setSelectedRole(person.role);
    setDisplayedRole(person.role);
  }, [person.role]);

  const hasChanged = selectedRole !== person.role;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isPending || !hasChanged) return;

    const previousRole = displayedRole;
    setDisplayedRole(selectedRole);

    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.append("userId", person.userId);
        fd.append("role", selectedRole);

        await changeUserRole(fd);
        toast.success(
          `Papel de ${person.name} alterado para "${USER_ROLE_LABELS[selectedRole]}".`,
        );
      } catch (err) {
        console.error(err);
        setSelectedRole(previousRole);
        setDisplayedRole(previousRole);
        toast.error("Erro ao alterar papel de acesso.");
      }
    });
  };

  return (
    <section>
      <div className="flex items-center justify-between">
        <SectionTitle>Papel de acesso</SectionTitle>
        {isPending && (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-brand-600 animate-pulse">
            <Loader2 className="size-3.5 animate-spin" />
            Salvando papel…
          </span>
        )}
      </div>

      {canEdit ? (
        <form onSubmit={handleSubmit} className="flex items-end gap-2">
          <input type="hidden" name="userId" value={person.userId} />
          <div className="min-w-0 flex-1">
            <Select
              name="role"
              size="sm"
              value={selectedRole}
              onValueChange={(val) => setSelectedRole(val as any)}
              disabled={isPending}
              ariaLabel="Papel de acesso"
              options={USER_ROLES.map((role) => ({
                value: role,
                label: USER_ROLE_LABELS[role],
              }))}
            />
          </div>
          <Button
            type="submit"
            size="sm"
            variant={hasChanged ? "primary" : "secondary"}
            loading={isPending}
            disabled={isPending || !hasChanged}
          >
            {isPending ? "Salvando…" : "Salvar"}
          </Button>
        </form>
      ) : (
        <RoleBadge role={displayedRole} />
      )}
      <p className="mt-1.5 text-xs text-slate-500">
        O papel diz o que ela pode fazer. Sobre o quê é escopo — e escopo se
        concede na ficha completa.
      </p>
    </section>
  );
}

/**
 * Edição da pessoa sem sair do organograma.
 *
 * Um painel lateral, e não um desvio para Administração: quem está olhando a
 * estrutura precisa corrigir o cargo ou a unidade ali, no contexto em que
 * percebeu o erro. Sair da tela e voltar faz perder o lugar na árvore — e, com
 * 40 pessoas, achar de novo onde se estava é o suficiente para não corrigir.
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
  const [confirmandoTirar, setConfirmandoTirar] = useState(false);
  const [confirmandoDesativar, setConfirmandoDesativar] = useState(false);
  const [teamSelectId, setTeamSelectId] = useState("");
  const [squadSelectId, setSquadSelectId] = useState("");

  const [isTeamPending, startTeamTransition] = useTransition();
  const [isSquadPending, startSquadTransition] = useTransition();
  const [isDangerPending, startDangerTransition] = useTransition();

  const unidadesDisponiveis = snapshot.units.filter(
    (unit) =>
      unit.isActive &&
      !person.positions.some((position) => position.teamId === unit.id),
  );

  const squadsDisponiveis = snapshot.squads.filter(
    (item) => item.isActive && !person.squadIds.includes(item.id),
  );

  const handleAddTeam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamSelectId || isTeamPending) return;

    startTeamTransition(async () => {
      try {
        const fd = new FormData();
        fd.append("userId", person.userId);
        fd.append("teamId", teamSelectId);
        await addTeamMembership(fd);
        setTeamSelectId("");
        toast.success(`Adicionado ao time com sucesso!`);
      } catch (err) {
        console.error(err);
        toast.error("Erro ao incluir no time.");
      }
    });
  };

  const handleRemoveTeam = (membershipId: string, teamName: string) => {
    if (isTeamPending) return;
    startTeamTransition(async () => {
      try {
        const fd = new FormData();
        fd.append("membershipId", membershipId);
        await removeTeamMembership(fd);
        toast.success(`Removido de "${teamName}".`);
      } catch (err) {
        console.error(err);
        toast.error("Erro ao remover do time.");
      }
    });
  };

  const handleAddSquad = (e: React.FormEvent) => {
    e.preventDefault();
    if (!squadSelectId || isSquadPending) return;

    startSquadTransition(async () => {
      try {
        const fd = new FormData();
        fd.append("userId", person.userId);
        fd.append("squadId", squadSelectId);
        await addSquadMember(fd);
        setSquadSelectId("");
        toast.success(`Adicionado ao squad com sucesso!`);
      } catch (err) {
        console.error(err);
        toast.error("Erro ao adicionar ao squad.");
      }
    });
  };

  const handleRemoveSquad = (membershipId: string, squadLabel: string) => {
    if (isSquadPending) return;
    startSquadTransition(async () => {
      try {
        const fd = new FormData();
        fd.append("membershipId", membershipId);
        await removeSquadMember(fd);
        toast.success(`Removido do squad "${squadLabel}".`);
      } catch (err) {
        console.error(err);
        toast.error("Erro ao remover do squad.");
      }
    });
  };

  return (
    <Drawer
      open
      onClose={onClose}
      title={person.name}
      description={person.email}
    >
      <div className="space-y-4">
        {/* Cargo — Seção reativa com feedback de carregamento e trava anti-duplo clique */}
        <CargoSection
          person={person}
          jobTitles={snapshot.jobTitles}
          canEdit={canEdit}
        />

        {/* Papel de acesso */}
        <RoleSection person={person} canEdit={canEdit} />

        {/* Onde a pessoa está na estrutura */}
        <section>
          <SectionTitle>Times e áreas ({person.positions.length})</SectionTitle>

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
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={isTeamPending}
                        onClick={() =>
                          handleRemoveTeam(
                            position.membershipId,
                            position.teamName,
                          )
                        }
                        className="text-red-600 hover:bg-red-50 hover:text-red-700"
                      >
                        Tirar do time
                      </Button>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}

          {canEdit && unidadesDisponiveis.length > 0 ? (
            <form onSubmit={handleAddTeam} className="mt-2 flex items-end gap-2">
              <input type="hidden" name="userId" value={person.userId} />
              <div className="min-w-0 flex-1">
                <Field label="Incluir em" htmlFor="drawer-unidade">
                  <Select
                    id="drawer-unidade"
                    name="teamId"
                    size="sm"
                    value={teamSelectId}
                    onValueChange={setTeamSelectId}
                    disabled={isTeamPending}
                    placeholder="Escolha…"
                    options={unidadesDisponiveis.map((unit) => ({
                      value: unit.id,
                      label: unit.name,
                      hint: ORG_UNIT_KIND_LABELS[unit.kind],
                    }))}
                  />
                </Field>
              </div>
              <Button
                type="submit"
                size="sm"
                loading={isTeamPending}
                disabled={isTeamPending || !teamSelectId}
              >
                {isTeamPending ? "Adicionando…" : "Adicionar"}
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
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={isSquadPending}
                        onClick={() =>
                          handleRemoveSquad(
                            person.squadMembershipIds[item.id] ?? "",
                            item.label,
                          )
                        }
                        className="text-red-600 hover:bg-red-50 hover:text-red-700"
                      >
                        Tirar do squad
                      </Button>
                    ) : null}
                  </li>
                ))}
            </ul>
          )}

          {canEdit && squadsDisponiveis.length > 0 ? (
            <form onSubmit={handleAddSquad} className="mt-2 flex items-end gap-2">
              <input type="hidden" name="userId" value={person.userId} />
              <div className="min-w-0 flex-1">
                <Field label="Adicionar squad" htmlFor="drawer-squad">
                  <Select
                    id="drawer-squad"
                    name="squadId"
                    size="sm"
                    value={squadSelectId}
                    onValueChange={setSquadSelectId}
                    disabled={isSquadPending}
                    placeholder="Escolha a BU…"
                    options={squadsDisponiveis.map((item) => ({
                      value: item.id,
                      label: item.label,
                      hint: item.divisionName ?? undefined,
                    }))}
                  />
                </Field>
              </div>
              <Button
                type="submit"
                size="sm"
                loading={isSquadPending}
                disabled={isSquadPending || !squadSelectId}
              >
                {isSquadPending ? "Adicionando…" : "Adicionar"}
              </Button>
            </form>
          ) : null}
        </section>

        {/* Zona de perigo: Tirar da organização / desativar */}
        {canEdit ? (
          <section className="mt-6 rounded-2xl border border-red-200/90 bg-red-50/50 p-4 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-red-900">
              Tirar do organograma
            </h4>
            <p className="text-xs text-red-700">
              Desvincule {person.name} de toda a estrutura ou suspenda o acesso à
              Central.
            </p>

            <div className="space-y-2 pt-1">
              {confirmandoTirar ? (
                <div className="rounded-xl border border-red-200 bg-white p-3 space-y-2">
                  <p className="text-xs font-medium text-slate-800">
                    Tem certeza? {person.name} será desvinculado(a) de todos os
                    times e squads, ficando &quot;fora da estrutura&quot;.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      loading={isDangerPending}
                      disabled={isDangerPending}
                      className="border-red-300 text-red-700 hover:bg-red-50"
                      onClick={() => {
                        startDangerTransition(async () => {
                          try {
                            const fd = new FormData();
                            fd.append("userId", person.userId);
                            await removeFromAllOrgUnits(fd);
                            setConfirmandoTirar(false);
                            toast.success(
                              `${person.name} foi removido(a) de todos os times e squads.`,
                            );
                            onClose();
                          } catch (err) {
                            console.error(err);
                            toast.error("Erro ao remover usuário.");
                          }
                        });
                      }}
                    >
                      Confirmar remoção
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={isDangerPending}
                      onClick={() => setConfirmandoTirar(false)}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="w-full border-red-200 text-red-700 hover:bg-red-100/70"
                  onClick={() => setConfirmandoTirar(true)}
                >
                  Tirar de todos os times e squads
                </Button>
              )}

              {confirmandoDesativar ? (
                <div className="rounded-xl border border-red-200 bg-white p-3 space-y-2">
                  <p className="text-xs font-medium text-slate-800">
                    Suspender {person.name}? A pessoa perderá acesso imediato à
                    Central e sumirá do organograma.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="danger"
                      loading={isDangerPending}
                      disabled={isDangerPending}
                      onClick={() => {
                        startDangerTransition(async () => {
                          try {
                            const fd = new FormData();
                            fd.append("userId", person.userId);
                            await deactivatePerson(fd);
                            setConfirmandoDesativar(false);
                            toast.success(
                              `${person.name} foi suspenso(a) da plataforma.`,
                            );
                            onClose();
                          } catch (err) {
                            console.error(err);
                            toast.error("Erro ao suspender usuário.");
                          }
                        });
                      }}
                    >
                      Confirmar suspensão
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={isDangerPending}
                      onClick={() => setConfirmandoDesativar(false)}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="w-full text-red-600 hover:bg-red-100/60 hover:text-red-800"
                  onClick={() => setConfirmandoDesativar(true)}
                >
                  Desativar usuário (suspender da Central)
                </Button>
              )}
            </div>
          </section>
        ) : null}

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
