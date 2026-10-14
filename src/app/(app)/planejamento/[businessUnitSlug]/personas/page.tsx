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
import { PersonaAvatar } from "@/components/personas/persona-avatar-picker";
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
        <div className="space-y-4">
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
                ativas.length === 1
                  ? "1 persona ativa"
                  : `${ativas.length} personas ativas`
              }
            />
            <CardBody className="px-0 py-0">
              {ativas.length === 0 ? (
                <div className="px-5 py-6 text-center text-sm text-slate-500">
                  Nenhuma persona ativa nesta BU.
                </div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {ativas.map((item) => (
                    <li key={item.id}>
                      <Link
                        href={`${base}/${item.slug}`}
                        className="flex items-center gap-3.5 px-5 py-3.5 transition-colors hover:bg-slate-50"
                      >
                        <PersonaAvatar
                          avatar={item.avatar}
                          name={item.name}
                          className="size-11 shrink-0 shadow-2xs"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-slate-900 text-sm sm:text-base">
                              {item.name}
                            </span>
                            {item.status === "in_review" ? (
                              <Badge tone="warning">Em revisão</Badge>
                            ) : (
                              <Badge tone="success">Ativa</Badge>
                            )}
                            {item.targetExam ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                                {item.targetExam}
                              </span>
                            ) : null}
                            {item.openPainCount > 0 ? (
                              <Badge tone="warning">
                                {item.openPainCount} sem solução
                              </Badge>
                            ) : null}
                          </div>
                          {item.headline ? (
                            <p className="mt-0.5 text-xs text-slate-500 line-clamp-1">
                              {item.headline}
                            </p>
                          ) : null}
                          {item.tags && item.tags.length > 0 ? (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {item.tags.slice(0, 4).map((tag) => (
                                <span
                                  key={tag}
                                  className="inline-flex text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600 font-medium"
                                >
                                  #{tag}
                                </span>
                              ))}
                              {item.tags.length > 4 ? (
                                <span className="text-[10px] text-slate-400">
                                  +{item.tags.length - 4}
                                </span>
                              ) : null}
                            </div>
                          ) : null}
                        </div>

                        <div className="shrink-0 text-right">
                          <span className="block text-xs font-medium text-slate-700">
                            {item.painCount === 1
                              ? "1 dor mapeada"
                              : `${item.painCount} dores`}
                          </span>
                          {item.owner ? (
                            <span className="block text-[11px] text-slate-400 mt-0.5">
                              {item.owner}
                            </span>
                          ) : null}
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          {inativas.length > 0 ? (
            <details className="rounded-xl border border-slate-200 bg-white shadow-xs group">
              <summary className="px-5 py-3 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer list-none flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className="text-slate-400 group-open:rotate-90 transition-transform">▸</span>
                  Personas arquivadas ({inativas.length})
                </span>
                <span className="text-[11px] text-slate-400 font-normal">recolhidas</span>
              </summary>
              <div className="border-t border-slate-100">
                <ul className="divide-y divide-slate-100">
                  {inativas.map((item) => (
                    <li key={item.id}>
                      <Link
                        href={`${base}/${item.slug}`}
                        className="flex items-center gap-3.5 px-5 py-3 transition-colors hover:bg-slate-50 opacity-75 hover:opacity-100"
                      >
                        <PersonaAvatar
                          avatar={item.avatar}
                          name={item.name}
                          className="size-9 shrink-0 grayscale"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium text-slate-800 text-sm">
                              {item.name}
                            </span>
                            <Badge tone="neutral">Arquivada</Badge>
                            {item.targetExam ? (
                              <span className="text-[11px] text-slate-500">
                                {item.targetExam}
                              </span>
                            ) : null}
                          </div>
                        </div>
                        <span className="text-xs text-slate-400">Ver detalhes →</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </details>
          ) : null}
        </div>
      )}
    </>
  );
}
