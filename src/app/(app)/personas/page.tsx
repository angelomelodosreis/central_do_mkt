import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import {
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  PageHeader,
} from "@/components/ui/card";
import { can, requirePermission } from "@/lib/auth/session";
import {
  listOpenPains,
  listPersonasByBusinessUnit,
} from "@/lib/modules/personas/queries";

export const metadata: Metadata = { title: "Personas" };
export const dynamic = "force-dynamic";

export default async function PersonasIndexPage() {
  const currentUser = await requirePermission("personas", "view");
  const canEdit = can(currentUser, "personas", "edit");

  const units = await listPersonasByBusinessUnit();
  const openPains = await listOpenPains();
  const total = units.reduce((sum, unit) => sum + unit.personas.length, 0);
  // BUs sem persona viram uma lista compacta no fim, e não um card vazio cada:
  // são mais de vinte, e a lista ficaria mais longa que o conteúdo de verdade.
  const pending = units.filter((unit) => unit.personas.length === 0);

  return (
    <>
      <PageHeader
        title="Personas"
        description="Quem é o público de cada Business Unit, no mesmo formato para todas."
        action={
          canEdit ? <ButtonLink href="/personas/nova">Nova persona</ButtonLink> : null
        }
      />

      {total === 0 ? (
        <EmptyState
          title="Nenhuma persona cadastrada ainda"
          description={
            canEdit
              ? "Comece pela BU que você conhece melhor."
              : "Assim que o time cadastrar as personas, elas aparecem aqui."
          }
          action={
            canEdit ? (
              <ButtonLink href="/personas/nova">Cadastrar persona</ButtonLink>
            ) : null
          }
        />
      ) : (
        <div className="space-y-6">
          {openPains.length > 0 ? (
            <Card className="border-amber-200">
              <CardHeader
                title={`${openPains.length} ${
                  openPains.length === 1
                    ? "dor mapeada ainda sem solução"
                    : "dores mapeadas ainda sem solução"
                }`}
                description="O que o público sente e para o que ainda não temos resposta. Pauta de produto."
              />
              <CardBody className="px-0 py-0">
                <ul className="divide-y divide-slate-100">
                  {openPains.map((entry) => (
                    <li key={entry.id} className="px-5 py-3">
                      <p className="text-sm text-slate-800">{entry.pain}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        <Link
                          href={`/personas/${entry.businessUnitSlug}/${entry.personaSlug}`}
                          className="font-medium text-brand-700 hover:underline"
                        >
                          {entry.personaName}
                        </Link>
                        {" · "}
                        {entry.businessUnitLabel}
                      </p>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          ) : null}

          {units
            .filter((unit) => unit.personas.length > 0)
            .map((unit) => (
              <Card key={unit.id}>
                <CardHeader
                  title={unit.label}
                  description={
                    unit.personas.length === 1
                      ? "1 persona"
                      : `${unit.personas.length} personas`
                  }
                />
                <CardBody className="px-0 py-0">
                  <ul className="divide-y divide-slate-100">
                      {unit.personas.map((item) => (
                        <li key={item.id}>
                          <Link
                            href={`/personas/${unit.slug}/${item.slug}`}
                            className="flex flex-wrap items-baseline justify-between gap-2 px-5 py-3.5 transition-colors hover:bg-slate-50"
                          >
                            <span className="min-w-0">
                              <span className="flex flex-wrap items-center gap-2">
                                <span className="font-medium text-slate-900">
                                  {item.name}
                                </span>
                                {item.isActive ? null : (
                                  <Badge tone="neutral">Inativa</Badge>
                                )}
                                {item.openPainCount > 0 ? (
                                  <Badge tone="warning">
                                    {item.openPainCount} sem solução
                                  </Badge>
                                ) : null}
                              </span>
                              {item.headline ? (
                                <span className="mt-0.5 block text-sm text-slate-500">
                                  {item.headline}
                                </span>
                              ) : null}
                            </span>
                            <span className="shrink-0 text-xs text-slate-400">
                              {item.painCount === 1
                                ? "1 dor mapeada"
                                : `${item.painCount} dores mapeadas`}
                            </span>
                          </Link>
                        </li>
                      ))}
                  </ul>
                </CardBody>
              </Card>
            ))}

          {canEdit && pending.length > 0 ? (
            <Card>
              <CardHeader
                title="BUs ainda sem persona"
                description="Clique numa delas para começar o cadastro já na BU certa."
              />
              <CardBody>
                <ul className="flex flex-wrap gap-1.5">
                  {pending.map((unit) => (
                    <li key={unit.id}>
                      <Link
                        href={`/personas/nova?bu=${unit.slug}`}
                        className="block rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-700 transition-colors hover:bg-brand-100 hover:text-brand-800"
                      >
                        {unit.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          ) : null}
        </div>
      )}
    </>
  );
}
