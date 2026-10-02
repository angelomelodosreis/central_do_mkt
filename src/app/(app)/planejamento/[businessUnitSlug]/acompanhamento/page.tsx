import type { Metadata } from "next";
import Link from "next/link";

import { openTodayReview } from "./actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, EmptyState, PageHeader } from "@/components/ui/card";
import { REVIEW_STATUS_DOTS, REVIEW_STATUS_LABELS } from "@/lib/db/schema";
import { listReviews, loadPendingActions } from "@/lib/modules/review/queries";
import { listReviewFeedItems } from "@/lib/modules/review/feed-queries";
import { listBusinessUnits } from "@/lib/modules/bases/queries";
import { ReviewFeedView } from "../../revisoes/review-feed-view";
import { requireStrategyBusinessUnit } from "@/lib/modules/strategy/access";
import { cn } from "@/lib/utils/cn";
import { formatDate } from "@/lib/utils/format";
import { plural } from "@/lib/utils/text";

export const metadata: Metadata = { title: "Acompanhamento" };
export const dynamic = "force-dynamic";

/**
 * A porta de entrada da reunião.
 *
 * Um botão e um histórico. A data não se escolhe — a reunião é hoje —, e o
 * que ficou em aberto aparece antes da lista porque é a pergunta de quem chega
 * aqui entre duas reuniões.
 */
export default async function AcompanhamentoPage({
  params,
}: {
  params: Promise<{ businessUnitSlug: string }>;
}) {
  const { businessUnitSlug } = await params;
  const { unit, canEdit } = await requireStrategyBusinessUnit(businessUnitSlug);

  const base = `/planejamento/${unit.slug}/acompanhamento`;

  const [reunioes, pendentes, feedItems, allUnits] = await Promise.all([
    listReviews(unit.id),
    loadPendingActions(unit.id, ""),
    listReviewFeedItems({ businessUnitId: unit.id }),
    listBusinessUnits({ includeInactive: false }),
  ]);


  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const deHoje = reunioes.find(
    (reuniao) => reuniao.meetingDate.getTime() === hoje.getTime(),
  );

  const atrasadas = pendentes.filter(
    (acao) => acao.dueDate && acao.dueDate < new Date(),
  ).length;

  return (
    <>
      <PageHeader
        title="Acompanhamento"
        description="O roteiro da reunião da BU. Abra na hora da conversa: os números e as pendências já chegam prontos."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/planejamento/revisoes?bu=${unit.slug}`}
              className="inline-flex items-center gap-1.5 rounded-xl border border-purple-200 bg-purple-50 px-3.5 py-2 text-xs font-bold text-purple-800 shadow-2xs hover:bg-purple-100 transition"
            >
              <span>💬 Feed Slack ({unit.label})</span>
            </Link>
            {canEdit ? (
              <form action={openTodayReview}>
                <input type="hidden" name="businessUnitId" value={unit.id} />
                <Button type="submit" variant="primary">
                  {!deHoje
                    ? "Iniciar reunião"
                    : deHoje.closedAt
                      ? "Ver a reunião de hoje"
                      : "Continuar a reunião de hoje"}
                </Button>
              </form>
            ) : null}
          </div>
        }
      />


      <div className="space-y-4">
        {pendentes.length > 0 ? (
          <Card>
            <div className="flex flex-wrap items-baseline justify-between gap-2 px-5 pb-2 pt-4">
              <h2 className="text-base font-semibold text-slate-900">
                {plural(
                  pendentes.length,
                  "pendência em aberto",
                  "pendências em aberto",
                )}
              </h2>
              {atrasadas > 0 ? (
                <span className="text-xs text-amber-700">
                  {plural(atrasadas, "fora do prazo")}
                </span>
              ) : null}
            </div>
            <ul className="divide-y divide-slate-100 border-t border-slate-100">
              {pendentes.slice(0, 6).map((acao) => (
                <li key={acao.id} className="px-5 py-2.5">
                  <p className="text-sm text-slate-900">{acao.title}</p>
                  <p className="text-xs text-slate-500">
                    {acao.assigneeName ?? "sem responsável"}
                    {acao.dueDate ? ` · prazo ${formatDate(acao.dueDate)}` : ""}
                    {" · de "}
                    <Link
                      href={`${base}/${acao.fromReviewId}`}
                      className="underline decoration-slate-300 underline-offset-2 hover:text-slate-800"
                    >
                      {formatDate(acao.fromMeetingDate)}
                    </Link>
                  </p>
                </li>
              ))}
            </ul>
            {pendentes.length > 6 ? (
              <p className="border-t border-slate-100 px-5 py-2.5 text-xs text-slate-500">
                e mais {pendentes.length - 6}. Todas aparecem ao iniciar a
                reunião.
              </p>
            ) : null}
          </Card>
        ) : null}

        {reunioes.length === 0 ? (
          <EmptyState
            title="Nenhuma reunião registrada"
            description="A tela guia a conversa: mostra o que ficou pendente, os números que o Analista lançou e as perguntas a fazer sobre cada tema."
          />
        ) : (
          <Card>
            <div className="px-5 pb-2 pt-4">
              <h2 className="text-base font-semibold text-slate-900">
                Reuniões anteriores
              </h2>
            </div>
            <ul className="divide-y divide-slate-100 border-t border-slate-100">
              {reunioes.map((reuniao) => (
                <li key={reuniao.id}>
                  <Link
                    href={`${base}/${reuniao.id}`}
                    className="flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-3 transition-colors hover:bg-slate-50"
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "size-2 shrink-0 rounded-full",
                        reuniao.status
                          ? REVIEW_STATUS_DOTS[reuniao.status]
                          : "bg-slate-300",
                      )}
                    />
                    <span className="text-sm font-medium text-slate-900">
                      {formatDate(reuniao.meetingDate)}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm text-slate-500">
                      {reuniao.status
                        ? REVIEW_STATUS_LABELS[reuniao.status]
                        : "sem avaliação"}
                      {reuniao.statusNote ? ` — ${reuniao.statusNote}` : ""}
                    </span>
                    {reuniao.closedAt ? null : (
                      <Badge tone="warning">Em andamento</Badge>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>

      {/* Feed e Tabela de Acompanhamento desta BU (Slack Canvas) */}
      <section className="mt-10 pt-8 border-t border-slate-200 space-y-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-slate-900">
              Revisão de Planejamento & Follow-Up — {unit.label}
            </h2>
            <p className="text-xs text-slate-500">
              Observações, pendências e thread de alinhamento com analistas e coordenação.
            </p>
          </div>
          <Link
            href="/planejamento/revisoes"
            className="text-xs font-semibold text-purple-700 hover:text-purple-800 transition inline-flex items-center gap-1"
          >
            <span>Ver feed geral com todas as BUs</span>
            <span>→</span>
          </Link>
        </div>

        <ReviewFeedView
          initialItems={feedItems}
          businessUnits={allUnits.map((u) => ({ id: u.id, slug: u.slug, label: u.label }))}
          currentCoordinator="Ingrid Silva"
          preselectedBuSlug={unit.slug}
        />
      </section>
    </>
  );
}

