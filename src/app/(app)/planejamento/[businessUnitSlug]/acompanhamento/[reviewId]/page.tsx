import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  BlocoAcoes,
  BlocoAnotacoes,
  BlocoAprendizados,
  BlocoResultados,
  BlocoResumo,
  type PessoaView,
} from "./review-blocks";
import { Badge } from "@/components/ui/badge";
import { requireStrategyBusinessUnit } from "@/lib/modules/strategy/access";
import { REVIEW_STATUS_LABELS } from "@/lib/db/schema";
import { listBusinessUnitMembers } from "@/lib/modules/org/scope";
import {
  getReview,
  loadActions,
  loadLearnings,
  loadNotes,
  loadParticipants,
  loadPendingActions,
  loadPeriodResults,
  loadStandingNotes,
  previousReview,
} from "@/lib/modules/review/queries";
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
 * Uma reunião de acompanhamento.
 *
 * A ordem dos blocos é a ordem das cinco perguntas que a tela precisa
 * responder para alguém que não é de marketing: como estamos, o que aconteceu,
 * por quê, o que aprendemos e decidimos, e o que precisa acontecer agora.
 *
 * Não é um dashboard. O único bloco de números é curto, já vem calculado e não
 * pede digitação nenhuma.
 */
export default async function ReviewPage({ params }: { params: Params }) {
  const { businessUnitSlug, reviewId } = await params;
  const { unit, canEdit } = await requireStrategyBusinessUnit(businessUnitSlug);

  const review = await getReview(reviewId);
  if (!review || review.businessUnitId !== unit.id) notFound();

  const base = `/planejamento/${unit.slug}`;
  const baseDoAcompanhamento = `${base}/acompanhamento`;

  const anterior = await previousReview(unit.id, review.meetingDate);

  // O período é o intervalo desde a reunião anterior. Sem anterior, os 14 dias
  // que antecedem esta — que é a cadência combinada, e um chute honesto.
  const desde =
    anterior?.meetingDate ??
    new Date(review.meetingDate.getTime() - 14 * 86_400_000);

  const [
    participantes,
    aprendizados,
    anotacoes,
    valendo,
    acoes,
    pendentes,
    numeros,
    equipe,
    pessoasDaPlataforma,
  ] = await Promise.all([
    loadParticipants(reviewId),
    loadLearnings(reviewId),
    loadNotes(reviewId),
    loadStandingNotes(unit.id, reviewId),
    loadActions(reviewId),
    loadPendingActions(unit.id, reviewId),
    loadPeriodResults(unit.id, desde, review.meetingDate),
    listBusinessUnitMembers(unit.id),
    listAssignableUsers(),
  ]);

  /**
   * Quem aparece nos seletores: o squad da BU primeiro, o resto depois.
   *
   * A reunião é da BU, e quem está nela quase sempre é do squad — mas
   * coordenador médico e diretoria participam sem estar no squad, e limitar a
   * lista os deixaria de fora.
   */
  const doSquad = new Set(equipe.map((pessoa) => pessoa.userId));
  const pessoas: PessoaView[] = sortByName(
    pessoasDaPlataforma,
    (pessoa) => pessoa.name,
  )
    .map((pessoa) => ({
      id: pessoa.id,
      name: pessoa.name,
      hint: doSquad.has(pessoa.id)
        ? `squad de ${unit.label}`
        : (pessoa.label ?? undefined),
    }))
    .sort((a, b) => Number(doSquad.has(b.id)) - Number(doSquad.has(a.id)));

  const convidados = participantes
    .filter((pessoa) => !pessoa.userId)
    .map((pessoa) => pessoa.name)
    .join(", ");

  return (
    <>
      <nav className="mb-4 text-sm text-slate-500">
        <Link href={baseDoAcompanhamento} className="hover:text-slate-900">
          Acompanhamento
        </Link>
        <span aria-hidden className="mx-1.5">
          /
        </span>
        <span className="text-slate-700">{formatDate(review.meetingDate)}</span>
      </nav>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-slate-900">
          Reunião de {formatDate(review.meetingDate)}
        </h1>
        {review.closedAt ? (
          <Badge tone="neutral">Fechada</Badge>
        ) : (
          <Badge tone="warning">Em preparação</Badge>
        )}
        <span className="text-sm text-slate-500">
          {REVIEW_STATUS_LABELS[review.status]}
        </span>
      </div>

      <div className="space-y-4">
        <BlocoResumo
          review={{
            id: review.id,
            businessUnitId: review.businessUnitId,
            meetingDate: review.meetingDate.toISOString(),
            status: review.status,
            statusNote: review.statusNote,
            highlight: review.highlight,
            concern: review.concern,
            closedAt: review.closedAt?.toISOString() ?? null,
          }}
          participantes={participantes
            .filter((pessoa) => pessoa.userId)
            .map((pessoa) => pessoa.userId!)}
          convidados={convidados}
          pessoas={pessoas}
          canEdit={canEdit}
        />

        <BlocoResultados
          resultados={numeros.resultados}
          dias={numeros.dias}
          desde={desde.toISOString()}
          baseDaBu={base}
        />

        <BlocoAprendizados
          reviewId={review.id}
          itens={aprendizados}
          canEdit={canEdit}
        />

        <BlocoAnotacoes
          reviewId={review.id}
          itens={anotacoes}
          valendo={valendo}
          canEdit={canEdit}
        />

        <BlocoAcoes
          reviewId={review.id}
          acoes={acoes}
          pendentes={pendentes}
          pessoas={pessoas}
          canEdit={canEdit}
          baseDoAcompanhamento={baseDoAcompanhamento}
        />
      </div>
    </>
  );
}
