"use client";

import { useState } from "react";

import { addAccessGrant, removeAccessGrant } from "../../organizacao/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { SCOPE_TYPE_LABELS, type ScopeType } from "@/lib/db/schema";
import type { ResolvedGrant } from "@/lib/modules/access/explain";

type Opcao = { value: string; label: string; hint?: string };

/**
 * Sobre O QUE a pessoa exerce o que o papel lhe permite.
 *
 * O escopo HERDA para baixo, e é isso que faz o modelo escalar: responder pelo
 * subsetor Conteúdo alcança Design, Copy, Videomakers, Social e Comunicação sem
 * cadastrar os cinco — e alcança o time que nascer amanhã, que é justamente o
 * que o cadastro folha a folha erra.
 */
export function ScopesCard({
  userId,
  grants,
  units,
  divisions,
  businessUnits,
  squads,
}: {
  userId: string;
  grants: ResolvedGrant[];
  units: Array<{ id: string; name: string; depth: number }>;
  divisions: Array<{ id: string; name: string }>;
  businessUnits: Array<{ id: string; label: string }>;
  squads: Array<{ id: string; label: string }>;
}) {
  const [concedendo, setConcedendo] = useState(false);
  const [tipo, setTipo] = useState<ScopeType>("org_unit");

  const alvos: Record<ScopeType, Opcao[]> = {
    organization: [],
    org_unit: units.map((unit) => ({
      value: unit.id,
      label: `${"— ".repeat(unit.depth)}${unit.name}`,
      triggerLabel: unit.name,
    })),
    division: divisions.map((division) => ({
      value: division.id,
      label: division.name,
    })),
    business_unit: businessUnits.map((unit) => ({
      value: unit.id,
      label: unit.label,
    })),
    squad: squads.map((item) => ({ value: item.id, label: item.label })),
  };

  return (
    <Card>
      <CardHeader
        title="Escopos de responsabilidade"
        description="Sobre o que ela responde. O escopo desce sozinho: um subsetor alcança os times dele; uma divisão alcança as BUs dela."
        action={
          !concedendo ? (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setConcedendo(true)}
            >
              + Conceder escopo
            </Button>
          ) : null
        }
      />
      <CardBody className="space-y-4">
        {grants.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-300 px-3 py-4 text-center text-sm text-slate-500">
            Nenhum escopo. Ela ainda pode enxergar as BUs dos squads de que
            participa — participar não é o mesmo que responder.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
            {grants.map((grant) => (
              <li
                key={grant.id}
                className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-medium text-slate-900">
                      {grant.targetName}
                    </span>
                    <Badge
                      tone={
                        grant.scopeType === "organization" ? "brand" : "neutral"
                      }
                    >
                      {SCOPE_TYPE_LABELS[grant.scopeType]}
                    </Badge>
                  </p>
                  <p className="text-xs text-slate-500">
                    {[grant.targetPath, grant.reach]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  {grant.note ? (
                    <p className="mt-0.5 text-xs italic text-slate-400">
                      {grant.note}
                    </p>
                  ) : null}
                </div>

                <form action={removeAccessGrant}>
                  <input type="hidden" name="grantId" value={grant.id} />
                  <Button type="submit" size="sm" variant="ghost">
                    Remover
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        )}

        {concedendo ? (
          <form
            action={addAccessGrant}
            className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/60 p-3"
          >
            <input type="hidden" name="userId" value={userId} />

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Tipo de escopo" htmlFor="scope-type">
                <Select
                  id="scope-type"
                  name="scopeType"
                  value={tipo}
                  onValueChange={(valor) => setTipo(valor as ScopeType)}
                  options={[
                    {
                      value: "org_unit",
                      label: SCOPE_TYPE_LABELS.org_unit,
                      hint: "Setor, subsetor ou time — alcança tudo abaixo",
                    },
                    {
                      value: "division",
                      label: SCOPE_TYPE_LABELS.division,
                      hint: "Alcança as BUs da divisão",
                    },
                    {
                      value: "business_unit",
                      label: SCOPE_TYPE_LABELS.business_unit,
                      hint: "Uma BU e o squad dela",
                    },
                    {
                      value: "squad",
                      label: SCOPE_TYPE_LABELS.squad,
                      hint: "Um squad e a BU que o originou",
                    },
                    {
                      value: "organization",
                      label: SCOPE_TYPE_LABELS.organization,
                      hint: "Tudo — use com parcimônia",
                    },
                  ]}
                />
              </Field>

              {tipo !== "organization" ? (
                <Field label="Sobre o quê" htmlFor="scope-target">
                  <Select
                    id="scope-target"
                    name="scopeId"
                    // Remontar ao trocar o tipo: sem isso, a lista mudaria de
                    // conteúdo mantendo selecionado um id do tipo anterior.
                    key={tipo}
                    placeholder="Escolha…"
                    options={alvos[tipo]}
                  />
                </Field>
              ) : null}
            </div>

            <Field
              label="Por quê"
              htmlFor="scope-note"
              hint="Opcional, mas é o que explica a concessão daqui a seis meses."
            >
              <Input
                id="scope-note"
                name="note"
                maxLength={200}
                placeholder="Ex.: responde pelo subsetor desde a reorganização de agosto."
              />
            </Field>

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
        ) : null}
      </CardBody>
    </Card>
  );
}
