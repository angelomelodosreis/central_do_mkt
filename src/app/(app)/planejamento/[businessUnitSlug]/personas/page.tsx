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
import { listPersonasOfBusinessUnit } from "@/lib/modules/personas/queries";
import { requireStrategyBusinessUnit } from "@/lib/modules/strategy/access";

export const metadata: Metadata = { title: "Personas" };
export const dynamic = "force-dynamic";

export default async function BusinessUnitPersonasPage({
  params,
}: {
  params: Promise<{ businessUnitSlug: string }>;
}) {
  const { businessUnitSlug } = await params;
  const { unit, canEditModule } =
    await requireStrategyBusinessUnit(businessUnitSlug);

  const canEdit = canEditModule("personas");
  const personas = await listPersonasOfBusinessUnit(unit.id);
  const base = `/planejamento/${unit.slug}/personas`;

  const ativas = personas.filter((item) => item.isActive);
  const inativas = personas.filter((item) => !item.isActive);
  const semSolucao = personas.reduce(
    (sum, item) => sum + item.openPainCount,
    0,
  );

  return (
    <>
      <PageHeader
        title="Personas"
        description={`Quem é o público de ${unit.label}. Os campos são os mesmos em toda a plataforma, o que permite comparar públicos entre BUs.`}
        action={
          canEdit ? (
            <ButtonLink href={`${base}/nova`}>Nova persona</ButtonLink>
          ) : null
        }
      />

      {personas.length === 0 ? (
        <EmptyState
          title="Nenhuma persona cadastrada nesta BU"
          description={
            canEdit
              ? "A persona é a base do resto do planejamento: é dela que saem as dores que os produtos respondem."
              : "Assim que a equipe da BU cadastrar as personas, elas aparecem aqui."
          }
          action={
            canEdit ? (
              <ButtonLink href={`${base}/nova`}>Cadastrar persona</ButtonLink>
            ) : null
          }
        />
      ) : (
        <div className="space-y-6">
          {/* Dores sem solução são a pauta de produto da BU — por isso vêm
              antes da lista, e não escondidas dentro de cada persona. */}
          {semSolucao > 0 ? (
            <Card className="border-amber-200">
              <CardBody>
                <p className="text-sm text-slate-800">
                  <strong className="font-semibold text-amber-800">
                    {semSolucao}{" "}
                    {semSolucao === 1
                      ? "dor mapeada ainda sem solução"
                      : "dores mapeadas ainda sem solução"}
                  </strong>{" "}
                  nesta BU. É a pauta de produto: dor conhecida sem resposta
                  ainda.
                </p>
              </CardBody>
            </Card>
          ) : null}

          <Card>
            <CardHeader
              title={
                ativas.length === 1 ? "1 persona ativa" : `${ativas.length} personas ativas`
              }
            />
            <CardBody className="px-0 py-0">
              <ul className="divide-y divide-slate-100">
                {[...ativas, ...inativas].map((item) => (
                  <li key={item.id}>
                    <Link
                      href={`${base}/${item.slug}`}
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
        </div>
      )}
    </>
  );
}
