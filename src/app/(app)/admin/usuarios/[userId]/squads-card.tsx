"use client";

import { useState } from "react";

import {
  addSquadMember,
  removeSquadMember,
  toggleSquadLead,
} from "../../organizacao/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";

/**
 * De que squads a pessoa participa.
 *
 * Squad NÃO é time: o time diz onde ela está organizacionalmente, o squad reúne
 * gente de várias unidades em torno de uma BU. Um designer participa de três
 * squads sem mudar de time nenhuma vez.
 *
 * Participar abre a leitura da BU. Responder por ela é o cartão de escopos —
 * são coisas diferentes, e é por isso que ficam em cartões diferentes.
 */
export function SquadsCard({
  userId,
  squads,
  allSquads,
}: {
  userId: string;
  squads: Array<{
    membershipId: string;
    squadId: string;
    businessUnitLabel: string;
    isLead: boolean;
  }>;
  allSquads: Array<{ id: string; label: string }>;
}) {
  const [adicionando, setAdicionando] = useState(false);

  const disponiveis = allSquads.filter(
    (item) => !squads.some((meu) => meu.squadId === item.id),
  );

  return (
    <Card>
      <CardHeader
        title="Squads"
        description="As BUs de que ela participa. Participar abre a leitura do planejamento delas."
        action={
          !adicionando && disponiveis.length > 0 ? (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setAdicionando(true)}
            >
              + Adicionar squad
            </Button>
          ) : null
        }
      />
      <CardBody className="space-y-4">
        {squads.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-300 px-3 py-4 text-center text-sm text-slate-500">
            Fora de todos os squads.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
            {squads.map((item) => (
              <li
                key={item.membershipId}
                className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5"
              >
                <p className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-medium text-slate-900">
                    {item.businessUnitLabel}
                  </span>
                  {item.isLead ? <Badge tone="brand">Responde</Badge> : null}
                </p>

                <div className="flex shrink-0 gap-1.5">
                  <form action={toggleSquadLead}>
                    <input
                      type="hidden"
                      name="membershipId"
                      value={item.membershipId}
                    />
                    <Button type="submit" size="sm" variant="ghost">
                      {item.isLead ? "Não responde" : "Responde"}
                    </Button>
                  </form>
                  <form action={removeSquadMember}>
                    <input
                      type="hidden"
                      name="membershipId"
                      value={item.membershipId}
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
            action={addSquadMember}
            className="flex flex-wrap items-end gap-2"
          >
            <input type="hidden" name="userId" value={userId} />
            <div className="min-w-56 flex-1">
              <Field label="Squad" htmlFor="novo-squad">
                <Select
                  id="novo-squad"
                  name="squadId"
                  placeholder="Escolha a BU…"
                  options={disponiveis.map((item) => ({
                    value: item.id,
                    label: item.label,
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
      </CardBody>
    </Card>
  );
}
