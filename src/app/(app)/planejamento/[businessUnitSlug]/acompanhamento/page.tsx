import type { Metadata } from "next";
import Link from "next/link";

import { NovoAcompanhamento } from "./new-review-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, EmptyState, PageHeader } from "@/components/ui/card";
import { REVIEW_STATUS_DOTS, REVIEW_STATUS_LABELS } from "@/lib/db/schema";
import {
  listReviews,
  loadPendingActions,
  loadStandingNotes,
} from "@/lib/modules/review/queries";
import { requireStrategyBusinessUnit } from "@/lib/modules/strategy/access";
import { formatDate } from "@/lib/utils/format";
import { plural } from "@/lib/utils/text";
import { cn } from "@/lib/utils/cn";

export const metadata: Metadata = { title: "Acompanhamento" };
export const dynamic = "force-dynamic";

/**
 * A timeline de acompanhamentos da BU.
 *
 * Abre pelo que está em aberto, e não pela lista: a pergunta de quem chega
 * aqui entre duas reuniões é "o que ficou pendente?", e a lista de reuniões
 * passadas é consulta. Foi exatamente o que o documento arquivado nunca
 * respondeu.
 */
export default async function AcompanhamentoPage({
  params,
}: {
  params: Promise<{ businessUnitSlug: string }>;
}) {
  const { businessUnitSlug } = await params;
  const { unit, canEdit } = await requireStrategyBusinessUnit(businessUnitSlug);

  const base = `/planejamento/${unit.slug}/acompanhamento`;

  const [reunioes, pendentes, valendo] = await Promise.all([
    listReviews(unit.id),
    loadPendingActions(unit.id, ""),
    loadStandingNotes(unit.id, ""),
  ]);

  const atrasadas = pendentes.filter(
    (acao) => acao.dueDate && acao.dueDate < new Date(),
  ).length;
  const bloqueios = valendo.filter((nota) => nota.kind === "blocker");

  return (
    <>
      <PageHeader
        title="Acompanhamento"
        description="A reunião da BU, com continuidade. O que foi decidido continua aqui, e o que foi combinado vira tarefa de alguém."
        action={
          canEdit ? <NovoAcompanhamento businessUnitId={unit.id} /> : null
        }
      />

      {reunioes.length === 0 ? (
        <EmptyState
          title="Nenhum acompanhamento ainda"
          description="Cada reunião registra como a BU está, o que foi feito, o que se aprendeu, o que foi decidido e o que vem a seguir. A próxima reunião já abre sabendo o que ficou pendente."
        />
      ) : (
        <div className="space-y-4">
          {/* O que está em aberto vem antes do histórico: é o que se pergunta
              entre uma reunião e outra. */}
          {pendentes.length > 0 || bloqueios.length > 0 ? (
            <Card>
              <div className="flex flex-wrap items-baseline justify-between gap-2 px-5 pb-2 pt-4">
                <h2 className="text-base font-semibold text-slate-900">
                  Em aberto agora
                </h2>
                {atrasadas > 0 ? (
                  <span className="text-xs text-amber-700">
                    {plural(atrasadas, "ação atrasada", "ações atrasadas")}
                  </span>
                ) : null}
              </div>

              <ul className="divide-y divide-slate-100 border-t border-slate-100">
                {pendentes.map((acao) => (
                  <li key={acao.id} className="px-5 py-2.5">
                    <p className="flex flex-wrap items-center gap-2 text-sm text-slate-900">
                      {acao.title}
                      {acao.status === "blocked" ? (
                        <Badge tone="warning">Travada</Badge>
                      ) : null}
                    </p>
                    <p className="text-xs text-slate-500">
                      {acao.assigneeName ?? "sem responsável"}
                      {acao.dueDate
                        ? ` · prazo ${formatDate(acao.dueDate)}`
                        : ""}
                      {" · combinada em "}
                      <Link
                        href={`${base}/${acao.fromReviewId}`}
                        className="underline decoration-slate-300 underline-offset-2 hover:text-slate-800"
                      >
                        {formatDate(acao.fromMeetingDate)}
                      </Link>
                    </p>
                  </li>
                ))}
                {bloqueios.map((nota) => (
                  <li key={nota.id} className="px-5 py-2.5">
                    <p className="flex flex-wrap items-center gap-2 text-sm text-slate-900">
                      {nota.text}
                      <Badge tone="warning">Bloqueio</Badge>
                    </p>
                    <p className="text-xs text-slate-500">
                      {nota.dependsOn ? `depende de ${nota.dependsOn} · ` : ""}
                      desde {formatDate(nota.meetingDate)}
                    </p>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          <Card>
            <div className="px-5 pb-2 pt-4">
              <h2 className="text-base font-semibold text-slate-900">
                Histórico
              </h2>
            </div>
            <CardBody className="px-0 py-0">
              <ul className="divide-y divide-slate-100 border-t border-slate-100">
                {reunioes.map((reuniao) => (
                  <li key={reuniao.id}>
                    <Link
                      href={`${base}/${reuniao.id}`}
                      className="flex flex-wrap items-start justify-between gap-3 px-5 py-3 transition-colors hover:bg-slate-50"
                    >
                      <span className="flex min-w-0 items-start gap-2.5">
                        <span
                          aria-hidden
                          className={cn(
                            "mt-1.5 size-2 shrink-0 rounded-full",
                            REVIEW_STATUS_DOTS[reuniao.status],
                          )}
                        />
                        <span className="min-w-0">
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-medium text-slate-900">
                              {formatDate(reuniao.meetingDate)}
                            </span>
                            <span className="text-xs text-slate-500">
                              {REVIEW_STATUS_LABELS[reuniao.status]}
                            </span>
                            {reuniao.closedAt ? null : (
                              <Badge tone="neutral">Em preparação</Badge>
                            )}
                          </span>
                          {reuniao.statusNote ? (
                            <span className="mt-0.5 block text-sm text-slate-600">
                              {reuniao.statusNote}
                            </span>
                          ) : null}
                        </span>
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
