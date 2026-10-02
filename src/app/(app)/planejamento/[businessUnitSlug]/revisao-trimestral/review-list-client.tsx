"use client";

import { useState } from "react";

import { QuarterlyReviewForm } from "./review-form";
import { deleteQuarterlyReviewAction } from "./actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, EmptyState } from "@/components/ui/card";
import type { QuarterlyReview } from "@/lib/modules/strategy/quarterly-review";
import { formatDate } from "@/lib/utils/format";

export function ReviewListClient({
  businessUnitId,
  cycleId,
  reviews,
  canEdit,
}: {
  businessUnitId: string;
  cycleId?: string | null;
  reviews: QuarterlyReview[];
  canEdit: boolean;
}) {
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const reviewSendoEditada = reviews.find((r) => r.id === editingId) ?? null;

  return (
    <div className="space-y-6">
      {/* Barra de ação superior */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-lg font-semibold text-slate-900">
            Histórico de Revisões Trimestrais
          </h2>
          <p className="text-sm text-slate-500">
            Cadência de 3 meses: checar se o diagnóstico e as metas continuam
            aderentes à realidade.
          </p>
        </div>

        {canEdit && !isCreating && !editingId && (
          <Button
            type="button"
            variant="primary"
            onClick={() => setIsCreating(true)}
          >
            + Nova Revisão Trimestral
          </Button>
        )}
      </div>

      {/* Formulário de Criação ou Edição */}
      {(isCreating || editingId) && (
        <Card className="border-brand-200 ring-2 ring-brand-500/10">
          <CardHeader
            title={
              editingId
                ? `Editar Revisão · ${reviewSendoEditada?.quarter}`
                : "Nova Revisão Trimestral (Rito de 3 Meses)"
            }
            description="Responda às 7 perguntas estratégicas para validar o plano e orientar o próximo trimestre."
          />
          <CardBody>
            <QuarterlyReviewForm
              key={editingId ?? "novo"}
              businessUnitId={businessUnitId}
              cycleId={cycleId}
              initialData={reviewSendoEditada}
              onDone={() => {
                setIsCreating(false);
                setEditingId(null);
              }}
            />
          </CardBody>
        </Card>
      )}

      {/* Lista de Revisões */}
      {reviews.length === 0 && !isCreating ? (
        <EmptyState
          title="Nenhuma revisão trimestral registrada"
          description="A cada 3 meses, o time senta para responder às 7 perguntas e checar se o diagnóstico e as metas ainda estão certos."
          action={
            canEdit ? (
              <Button
                type="button"
                variant="primary"
                onClick={() => setIsCreating(true)}
              >
                Registrar primeira revisão
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-4">
          {reviews.map((rev) => {
            const ehValido = rev.diagnosticValid === "sim";
            const ehParcial = rev.diagnosticValid === "parcialmente";
            const precisaRevisarMetas = rev.needsGoalRevision === "sim";

            return (
              <Card key={rev.id} className="overflow-hidden">
                <CardHeader
                  title={
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-slate-900">
                        {rev.quarter}
                      </span>
                      <span className="text-xs font-normal text-slate-500">
                        · Realizada em {formatDate(new Date(rev.reviewDate))}
                      </span>
                      {ehValido ? (
                        <Badge tone="brand">Diagnóstico Válido</Badge>
                      ) : ehParcial ? (
                        <Badge tone="neutral">Diagnóstico Parcial</Badge>
                      ) : (
                        <Badge tone="danger">Diagnóstico Inválido</Badge>
                      )}
                      {precisaRevisarMetas ? (
                        <Badge tone="warning">
                          Revisão de Metas Solicitada
                        </Badge>
                      ) : (
                        <Badge tone="neutral">Metas Mantidas</Badge>
                      )}
                    </span>
                  }
                  description={`Registrado em ${formatDate(new Date(rev.createdAt))}`}
                  action={
                    canEdit ? (
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingId(rev.id);
                            setIsCreating(false);
                          }}
                        >
                          Editar
                        </Button>
                        <form action={deleteQuarterlyReviewAction}>
                          <input type="hidden" name="reviewId" value={rev.id} />
                          <input
                            type="hidden"
                            name="businessUnitId"
                            value={businessUnitId}
                          />
                          <Button
                            type="submit"
                            variant="ghost"
                            size="sm"
                            className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                            onClick={(e) => {
                              if (
                                !confirm("Excluir esta revisão trimestral?")
                              ) {
                                e.preventDefault();
                              }
                            }}
                          >
                            Excluir
                          </Button>
                        </form>
                      </div>
                    ) : null
                  }
                />
                <CardBody className="space-y-4 pt-2">
                  {/* Perguntas e Respostas */}
                  <div className="grid gap-3 sm:grid-cols-2">
                    {/* Pergunta 2 */}
                    {rev.marketChanges && (
                      <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3">
                        <p className="text-xs font-semibold text-slate-600">
                          2. O que mudou no mercado/concorrência?
                        </p>
                        <p className="mt-1 text-sm text-slate-800 whitespace-pre-line">
                          {rev.marketChanges}
                        </p>
                      </div>
                    )}

                    {/* Pergunta 3 */}
                    {rev.newProblems && (
                      <div className="rounded-lg border border-rose-100 bg-rose-50/30 p-3">
                        <p className="text-xs font-semibold text-rose-800">
                          3. Novos problemas que surgiram:
                        </p>
                        <p className="mt-1 text-sm text-slate-800 whitespace-pre-line">
                          {rev.newProblems}
                        </p>
                      </div>
                    )}

                    {/* Pergunta 4 */}
                    {rev.missedOpportunities && (
                      <div className="rounded-lg border border-amber-100 bg-amber-50/30 p-3">
                        <p className="text-xs font-semibold text-amber-800">
                          4. Oportunidades deixadas na mesa:
                        </p>
                        <p className="mt-1 text-sm text-slate-800 whitespace-pre-line">
                          {rev.missedOpportunities}
                        </p>
                      </div>
                    )}

                    {/* Pergunta 5 */}
                    {rev.objectiveAssumptions && (
                      <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3">
                        <p className="text-xs font-semibold text-slate-600">
                          5. Premissas do objetivo ainda se mantêm?
                        </p>
                        <p className="mt-1 text-sm text-slate-800 whitespace-pre-line">
                          {rev.objectiveAssumptions}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Pergunta 7: Foco do Próximo Trimestre */}
                  {rev.nextQuarterFocus && (
                    <div className="rounded-lg border border-brand-200 bg-brand-50/40 p-4">
                      <span className="text-xs font-bold uppercase tracking-wider text-brand-900">
                        7. Foco Principal dos Próximos 3 Meses
                      </span>
                      <p className="mt-1 text-base font-semibold text-slate-900 whitespace-pre-line">
                        {rev.nextQuarterFocus}
                      </p>
                    </div>
                  )}
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
