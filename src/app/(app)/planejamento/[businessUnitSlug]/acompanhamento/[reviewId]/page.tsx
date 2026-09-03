import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Meeting, type PessoaView } from "./meeting";
import { Badge } from "@/components/ui/badge";
import { listBusinessUnitMembers } from "@/lib/modules/org/scope";
import {
  getReview,
  loadActions,
  loadPendingActions,
  loadPeriodNumbers,
  loadTopics,
  previousReview,
} from "@/lib/modules/review/queries";
import { requireStrategyBusinessUnit } from "@/lib/modules/strategy/access";
import { listAssignableUsers } from "@/lib/modules/tasks/queries";
import { formatDate } from "@/lib/utils/format";
import { sortByName } from "@/lib/utils/text";

export const dynamic = "force-dynamic";

type Params = Promise<{ businessUnitSlug: string; reviewId: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { reviewId } = await params;
  const review = await getReview(reviewId);
  return {
    title: review
      ? `Acompanhamento de ${formatDate(review.meetingDate)}`
      : "Acompanhamento",
  };
}

/**
 * A reunião, ao vivo.
 *
 * Tudo que a plataforma já sabe chega pronto: o período vem da reunião
 * anterior, os números do fechamento semanal do Analista, as pendências das
 * reuniões passadas. O Coordenador não prepara nada antes de abrir.
 */
export default async function ReviewPage({ params }: { params: Params }) {
  const { businessUnitSlug, reviewId } = await params;
  const { unit, canEdit } = await requireStrategyBusinessUnit(businessUnitSlug);

  const review = await getReview(reviewId);
  if (!review || review.businessUnitId !== unit.id) notFound();

  const anterior = await previousReview(unit.id, review.meetingDate);

  // Sem reunião anterior, catorze dias — a cadência quinzenal combinada, e um
  // chute honesto para a primeira vez.
  const desde =
    anterior?.meetingDate ??
    new Date(review.meetingDate.getTime() - 14 * 86_400_000);

  const [temas, pendencias, encaminhamentos, numeros, equipe, todos] =
    await Promise.all([
      loadTopics(reviewId),
      loadPendingActions(unit.id, reviewId),
      loadActions(reviewId),
      loadPeriodNumbers(unit.id, desde, review.meetingDate),
      listBusinessUnitMembers(unit.id),
      listAssignableUsers(),
    ]);

  // O squad da BU primeiro: é quem quase sempre recebe o encaminhamento. Os
  // demais continuam na lista porque coordenação e diretoria participam sem
  // estar no squad.
  const doSquad = new Set(equipe.map((pessoa) => pessoa.userId));
  const pessoas: PessoaView[] = sortByName(todos, (pessoa) => pessoa.name)
    .map((pessoa) => ({
      id: pessoa.id,
      name: pessoa.name,
      hint: doSquad.has(pessoa.id)
        ? `squad de ${unit.label}`
        : (pessoa.label ?? undefined),
    }))
    .sort((a, b) => Number(doSquad.has(b.id)) - Number(doSquad.has(a.id)));

  return (
    <>
      <nav className="mb-3 text-sm text-slate-500">
        <Link
          href={`/planejamento/${unit.slug}/acompanhamento`}
          className="hover:text-slate-900"
        >
          Acompanhamento
        </Link>
        <span aria-hidden className="mx-1.5">
          /
        </span>
        <span className="text-slate-700">{formatDate(review.meetingDate)}</span>
      </nav>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-slate-900">
          {unit.label} · {formatDate(review.meetingDate)}
        </h1>
        {review.closedAt ? <Badge tone="neutral">Finalizada</Badge> : null}
      </div>

      <Meeting
        reviewId={review.id}
        meetingDate={review.meetingDate.toISOString()}
        closedAt={review.closedAt?.toISOString() ?? null}
        status={review.status}
        statusNote={review.statusNote}
        periodoDias={numeros.dias}
        desde={desde.toISOString()}
        temas={temas}
        pendencias={pendencias.map((item) => ({
          id: item.id,
          title: item.title,
          status: item.status,
          dueDate: item.dueDate?.toISOString() ?? null,
          assigneeName: item.assigneeName,
          fromMeetingDate: item.fromMeetingDate.toISOString(),
          followUpNote: item.followUpNote,
        }))}
        encaminhamentos={encaminhamentos.map((item) => ({
          id: item.id,
          title: item.title,
          topic: item.topic,
          dueDate: item.dueDate?.toISOString() ?? null,
          assigneeName: item.assigneeName,
        }))}
        numeros={numeros.numeros}
        secundarios={numeros.secundarios}
        pessoas={pessoas}
        canEdit={canEdit && !review.closedAt}
      />
    </>
  );
}
