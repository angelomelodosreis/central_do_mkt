"use client";

import { useState } from "react";

import {
  addTeamMembership,
  removeTeamMembership,
  setPrimaryTeam,
  setUserJobTitle,
  toggleTeamLead,
} from "../../organizacao/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { ORG_UNIT_KIND_LABELS, type OrgUnitKind } from "@/lib/db/schema";

type PositionRow = {
  membershipId: string;
  teamId: string;
  teamName: string;
  path: string;
  isLead: boolean;
  isPrimary: boolean;
};

/**
 * Onde a pessoa está na organização.
 *
 * CARGO no singular, UNIDADES no plural — e essa assimetria é o modelo. Quem
 * atende três frentes não tem três cargos; tem um cargo e três frentes de
 * trabalho. Enquanto o cargo morou no vínculo, a interface tinha de responder
 * "qual dos três é o cargo dela?" toda vez que havia uma linha só.
 */
export function OrgCard({
  userId,
  jobTitleId,
  jobTitles,
  positions,
  units,
}: {
  userId: string;
  jobTitleId: string | null;
  jobTitles: Array<{ id: string; name: string }>;
  positions: PositionRow[];
  units: Array<{ id: string; name: string; depth: number; kind: OrgUnitKind }>;
}) {
  const [adicionando, setAdicionando] = useState(false);

  const disponiveis = units.filter(
    (unit) => !positions.some((position) => position.teamId === unit.id),
  );

  return (
    <Card>
      <CardHeader
        title="Estrutura organizacional"
        description="Cargo descreve a pessoa; as unidades dizem onde ela trabalha. Nenhum concede permissão."
      />
      <CardBody className="space-y-5">
        <form
          action={setUserJobTitle}
          className="flex flex-wrap items-end gap-2"
        >
          <input type="hidden" name="userId" value={userId} />
          <div className="min-w-56 flex-1">
            <Field label="Cargo" htmlFor="cargo">
              <Select
                id="cargo"
                name="jobTitleId"
                defaultValue={jobTitleId ?? ""}
                placeholder="Sem cargo definido"
                options={[
                  { value: "", label: "Sem cargo definido" },
                  ...jobTitles.map((title) => ({
                    value: title.id,
                    label: title.name,
                  })),
                ]}
              />
            </Field>
          </div>
          <Button type="submit" variant="secondary">
            Salvar cargo
          </Button>
        </form>

        <div>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-medium text-slate-800">
              Unidades ({positions.length})
            </h3>
            {!adicionando && disponiveis.length > 0 ? (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setAdicionando(true)}
              >
                + Adicionar unidade
              </Button>
            ) : null}
          </div>

          {positions.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-300 px-3 py-4 text-center text-sm text-slate-500">
              Fora da estrutura. Sem unidade, ela não recebe as tarefas
              endereçadas a times.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
              {positions.map((position) => (
                <li
                  key={position.membershipId}
                  className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-medium text-slate-900">
                        {position.teamName}
                      </span>
                      {position.isPrimary ? (
                        <Badge tone="brand">Principal</Badge>
                      ) : null}
                      {position.isLead ? (
                        <Badge tone="neutral">Responde pela unidade</Badge>
                      ) : null}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {position.path}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-1.5">
                    {!position.isPrimary ? (
                      <form action={setPrimaryTeam}>
                        <input
                          type="hidden"
                          name="membershipId"
                          value={position.membershipId}
                        />
                        <Button type="submit" size="sm" variant="ghost">
                          Tornar principal
                        </Button>
                      </form>
                    ) : null}
                    <form action={toggleTeamLead}>
                      <input
                        type="hidden"
                        name="membershipId"
                        value={position.membershipId}
                      />
                      <Button type="submit" size="sm" variant="ghost">
                        {position.isLead ? "Não responde" : "Responde"}
                      </Button>
                    </form>
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
                </li>
              ))}
            </ul>
          )}

          {adicionando ? (
            <form
              action={addTeamMembership}
              className="mt-3 flex flex-wrap items-end gap-2"
            >
              <input type="hidden" name="userId" value={userId} />
              <div className="min-w-56 flex-1">
                <Field label="Unidade" htmlFor="nova-unidade">
                  <Select
                    id="nova-unidade"
                    name="teamId"
                    placeholder="Escolha a unidade…"
                    options={disponiveis.map((unit) => ({
                      value: unit.id,
                      label: `${"— ".repeat(unit.depth)}${unit.name}`,
                      triggerLabel: unit.name,
                      hint: ORG_UNIT_KIND_LABELS[unit.kind],
                    }))}
                  />
                </Field>
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
          ) : null}
        </div>
      </CardBody>
    </Card>
  );
}
