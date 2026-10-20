import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { RichTextContent } from "@/components/rich-text/renderer";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardHeader, EmptyState } from "@/components/ui/card";
import { PersonaAvatar } from "@/components/personas/persona-avatar-picker";
import { requireStrategyBusinessUnit } from "@/lib/modules/strategy/access";
import {
  isRichDocEmpty,
  parseRichDoc,
} from "@/lib/modules/documentation/rich-text";
import { getPersonaBySlug } from "@/lib/modules/personas/queries";
import { formatDateTime } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

type Params = Promise<{ businessUnitSlug: string; personaSlug: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { businessUnitSlug, personaSlug } = await params;
  await requireStrategyBusinessUnit(businessUnitSlug);
  const found = await getPersonaBySlug(businessUnitSlug, personaSlug);
  return { title: found?.name ?? "Personas" };
}

export default async function PersonaDetailPage({
  params,
}: {
  params: Params;
}) {
  const { businessUnitSlug, personaSlug } = await params;
  const { unit, canEditModule } =
    await requireStrategyBusinessUnit(businessUnitSlug);

  const found = await getPersonaBySlug(businessUnitSlug, personaSlug);
  if (!found) notFound();

  const base = `/planejamento/${unit.slug}/personas`;
  const canEdit = canEditModule("personas");
  const notes = parseRichDoc(found.notes);
  const openPains = found.pains.filter((entry) => !entry.solution?.trim());

  return (
    <>
      <nav className="mb-4 flex flex-wrap items-center gap-1.5 text-sm text-slate-500">
        <Link href={base} className="hover:text-slate-900">
          Personas
        </Link>
        <span aria-hidden>/</span>
        <span className="text-slate-700">{found.name}</span>
      </nav>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4 min-w-0">
          <PersonaAvatar
            avatar={found.avatar}
            name={found.name}
            className="size-16 sm:size-20 shrink-0 shadow-xs border-2 border-slate-200"
          />
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              {found.name}
            </h1>
            {found.headline ? (
              <p className="mt-1 max-w-2xl text-sm text-slate-500">
                {found.headline}
              </p>
            ) : null}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {found.status === "in_review" ? (
                <Badge tone="warning">Em revisão</Badge>
              ) : found.status === "archived" || !found.isActive ? (
                <Badge tone="neutral">Arquivada</Badge>
              ) : (
                <Badge tone="success">Ativa</Badge>
              )}
              {found.targetExam ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                  {found.targetExam}
                </span>
              ) : null}
              {found.specialtyTitle ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                  Título: {found.specialtyTitle}
                </span>
              ) : null}
              {openPains.length > 0 ? (
                <Badge tone="warning">
                  {openPains.length}{" "}
                  {openPains.length === 1
                    ? "dor sem solução"
                    : "dores sem solução"}
                </Badge>
              ) : null}
              {found.owner ? (
                <span className="text-xs text-slate-500">
                  Responsável: <strong>{found.owner}</strong>
                </span>
              ) : null}
              <span className="text-xs text-slate-400">
                · Atualizada em {formatDateTime(found.updatedAt)}
              </span>
            </div>

            {found.tags && found.tags.length > 0 ? (
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {found.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200/60"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        {canEdit ? (
          <ButtonLink href={`${base}/${found.slug}/editar`} variant="secondary">
            Editar
          </ButtonLink>
        ) : null}
      </div>

      {found.quote ? (
        <div className="mb-6 rounded-xl border border-rose-100 bg-rose-50/40 p-4 sm:p-5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#e2263c]">
            Uma frase dela
          </span>
          <p className="mt-1 text-base sm:text-lg font-medium text-slate-800 italic">
            “{found.quote}”
          </p>
        </div>
      ) : null}

      <div className="space-y-4">
        <div className="grid gap-6 sm:grid-cols-2">
          <Card>
            <CardHeader title="Perfil demográfico" />
            <CardBody className="px-0 py-0">
              <DataList
                items={[
                  ["Faixa etária", found.ageRange],
                  ["Gênero", found.gender],
                  ["Localização", found.location],
                  ["Renda", found.income],
                  ["Escolaridade", found.education],
                ]}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Carreira e Jornada" />
            <CardBody className="px-0 py-0">
              <DataList
                items={[
                  ["Prova-alvo", found.targetExam ?? null],
                  [
                    "Momento de carreira",
                    found.careerStage === "Titulado" && found.specialtyTitle
                      ? `${found.careerStage} (${found.specialtyTitle})`
                      : (found.careerStage ?? null),
                  ],
                  ...(found.specialtyTitle
                    ? ([["Título de especialista", found.specialtyTitle]] as [string, string | null][])
                    : []),
                  ["Tentativa", found.attempt ?? null],
                  ["Rotina de estudo", found.studyRoutine ?? null],
                  ["Onde trabalha", found.workplace ?? null],
                  ["Cargo ou ocupação", found.currentRole ?? null],
                  ["Objetivo profissional", found.careerGoal ?? null],
                ]}
              />
            </CardBody>
          </Card>
        </div>

        {found.interests?.length || found.channels?.length ? (
          <div className="grid gap-6 sm:grid-cols-2">
            {found.interests?.length ? (
              <Card>
                <CardHeader title="Interesses" />
                <CardBody>
                  <TagList items={found.interests} />
                </CardBody>
              </Card>
            ) : null}
            {found.channels?.length ? (
              <Card>
                <CardHeader title="Onde ela está" />
                <CardBody>
                  <TagList items={found.channels} />
                </CardBody>
              </Card>
            ) : null}
          </div>
        ) : null}

        <Card>
          <CardHeader
            title="Dores e o que oferecemos"
            description={
              found.pains.length === 0
                ? undefined
                : "Cada dor com a resposta que temos hoje — ou a marca de que ainda não temos."
            }
          />
          <CardBody className="px-0 py-0">
            {found.pains.length === 0 ? (
              <EmptyState variant="inline" title="Nenhuma dor mapeada ainda." />
            ) : (
              <ul className="divide-y divide-slate-100">
                {found.pains.map((entry) => (
                  <li key={entry.id} className="px-5 py-4">
                    <p className="text-sm font-medium text-slate-900">
                      {entry.pain}
                    </p>
                    {entry.solution?.trim() ? (
                      <p className="mt-1.5 text-sm text-slate-600">
                        <span className="font-medium text-emerald-700">
                          Oferecemos:{" "}
                        </span>
                        {entry.solution}
                      </p>
                    ) : (
                      <p className="mt-1.5 text-sm text-amber-700">
                        Ainda não temos uma solução para esta dor.
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        {notes && !isRichDocEmpty(notes) ? (
          <Card>
            <CardHeader title="Anotações" />
            <CardBody className="sm:px-6 sm:py-5">
              <RichTextContent doc={notes} />
            </CardBody>
          </Card>
        ) : null}
      </div>
    </>
  );
}

/** Lista rótulo/valor. Campos não preenchidos aparecem como "—". */
function DataList({ items }: { items: [string, string | null][] }) {
  return (
    <dl className="divide-y divide-slate-100">
      {items.map(([label, value]) => (
        <div
          key={label}
          className="flex flex-wrap items-baseline justify-between gap-2 px-5 py-2.5"
        >
          <dt className="text-sm text-slate-500">{label}</dt>
          <dd
            className={
              value
                ? "text-sm font-medium text-slate-900"
                : "text-sm text-slate-300"
            }
          >
            {value || "—"}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function TagList({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <li
          key={item}
          className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-700"
        >
          {item}
        </li>
      ))}
    </ul>
  );
}
