import type { Metadata } from "next";
import Link from "next/link";

import { openTodayReview } from "./actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, EmptyState, PageHeader } from "@/components/ui/card";
import { REVIEW_STATUS_DOTS, REVIEW_STATUS_LABELS } from "@/lib/db/schema";
import { listReviews, loadPendingActions } from "@/lib/modules/review/queries";
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

  const [reunioes, pendentes] = await Promise.all([
    listReviews(unit.id),
    loadPendingActions(unit.id, ""),
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
          canEdit ? (
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
          ) : null
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
    </>
  );
}
