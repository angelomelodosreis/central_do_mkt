"use client";

import { useActionState, useEffect, useState } from "react";

import { deleteFinding, saveFinding } from "./actions";
import {
  INITIAL_STRATEGY_STATE,
  type StrategyFormState,
} from "../../form-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, Section } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/field";
import {
  DIAGNOSIS_LENS_LABELS,
  DIAGNOSIS_LENS_QUESTIONS,
  FINDING_KINDS,
  FINDING_KIND_HINTS,
  FINDING_KIND_LABELS,
  type DiagnosisLens,
  type FindingKind,
} from "@/lib/db/schema";
import type { EvidenceItem, Finding } from "@/lib/modules/strategy/diagnosis";
import { cn } from "@/lib/utils/cn";

/** A cor de cada classificação. Alavanca puxa, fragilidade alerta. */
const TOM: Record<FindingKind, "brand" | "danger" | "neutral"> = {
  lever: "brand",
  weakness: "danger",
  open_bet: "neutral",
};

export function LensBlock({
  lens,
  evidence,
  findings,
  roundId,
  canEdit,
}: {
  lens: DiagnosisLens;
  evidence: EvidenceItem[];
  findings: Finding[];
  roundId: string | null;
  canEdit: boolean;
}) {
  const [adding, setAdding] = useState(false);
  const [editando, setEditando] = useState<string | null>(null);

  return (
    // As cinco lentes são uma leitura só, feita de cinco ângulos — e cada
    // cartão trazia moldura e sombra próprias para separar o que se lê em
    // sequência. Agora a lente é um cabeçalho de trecho dentro da mesma
    // moldura.
    <Section
      title={DIAGNOSIS_LENS_LABELS[lens]}
      description={DIAGNOSIS_LENS_QUESTIONS[lens]}
      action={
        canEdit && roundId && !adding ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setAdding(true)}
          >
            Novo achado
          </Button>
        ) : null
      }
      divider
    >
      <div className="space-y-4 px-5 pb-4 pt-2">
        {/* O que a plataforma já sabe. Leitura, não digitação. */}
        {evidence.length > 0 ? (
          <div className="rounded-lg bg-slate-50 px-3 py-2.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              O que a plataforma já sabe
            </p>
            <ul className="mt-1.5 space-y-1">
              {evidence.map((item, index) => (
                <li key={index} className="text-sm">
                  <span
                    className={cn(
                      item.alert
                        ? "font-medium text-amber-800"
                        : "text-slate-700",
                    )}
                  >
                    {item.alert ? "⚠ " : ""}
                    {item.label}
                  </span>
                  {item.detail ? (
                    <span className="block text-xs text-slate-500">
                      {item.detail}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {/* Os achados. */}
        {findings.length === 0 && !adding ? (
          <p className="text-sm text-slate-500">
            Nenhum achado nesta lente.
            {canEdit && roundId
              ? " Leia a evidência acima e registre o que ela mostra."
              : ""}
          </p>
        ) : (
          <ul className="space-y-2">
            {findings.map((achado) =>
              editando === achado.id && roundId ? (
                <li key={achado.id}>
                  <FindingForm
                    roundId={roundId}
                    lens={lens}
                    finding={achado}
                    onDone={() => setEditando(null)}
                  />
                </li>
              ) : (
                <li
                  key={achado.id}
                  className="rounded-lg border border-slate-200 px-3 py-2.5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <span className="min-w-0">
                      <Badge tone={TOM[achado.kind]}>
                        {FINDING_KIND_LABELS[achado.kind]}
                      </Badge>
                      <span className="mt-1 block text-sm text-slate-800">
                        {achado.statement}
                      </span>
                      {achado.evidence ? (
                        <span className="mt-0.5 block text-xs text-slate-500">
                          Evidência: {achado.evidence}
                        </span>
                      ) : null}
                      {achado.goalIds.length === 0 ? (
                        <span className="mt-1 block text-xs text-amber-700">
                          Nenhuma meta responde a este achado
                        </span>
                      ) : (
                        <span className="mt-1 block text-xs text-slate-500">
                          Respondido por {achado.goalIds.length}{" "}
                          {achado.goalIds.length === 1 ? "meta" : "metas"}
                        </span>
                      )}
                    </span>

                    {canEdit && roundId ? (
                      <span className="flex shrink-0 gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditando(achado.id)}
                        >
                          Editar
                        </Button>
                        <form action={deleteFinding}>
                          <input
                            type="hidden"
                            name="findingId"
                            value={achado.id}
                          />
                          <Button type="submit" variant="ghost" size="sm">
                            Apagar
                          </Button>
                        </form>
                      </span>
                    ) : null}
                  </div>
                </li>
              ),
            )}
          </ul>
        )}

        {adding && roundId ? (
          <FindingForm
            roundId={roundId}
            lens={lens}
            finding={null}
            onDone={() => setAdding(false)}
          />
        ) : null}
      </div>
    </Section>
  );
}

function FindingForm({
  roundId,
  lens,
  finding,
  onDone,
}: {
  roundId: string;
  lens: DiagnosisLens;
  finding: Finding | null;
  onDone: () => void;
}) {
  const [state, formAction, isPending] = useActionState<
    StrategyFormState,
    FormData
  >(saveFinding, INITIAL_STRATEGY_STATE);

  useEffect(() => {
    if (state.status === "success") onDone();
  }, [state, onDone]);

  return (
    <form
      action={formAction}
      className="space-y-3 rounded-lg border border-brand-200 bg-brand-50/30 p-3"
    >
      <input type="hidden" name="roundId" value={roundId} />
      <input type="hidden" name="lens" value={lens} />
      {finding ? (
        <input type="hidden" name="findingId" value={finding.id} />
      ) : null}

      {state.status === "error" && state.message ? (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {state.message}
        </p>
      ) : null}

      <fieldset>
        <legend className="mb-1.5 text-sm font-medium text-slate-800">
          Classificação
        </legend>
        <div className="flex flex-wrap gap-2">
          {FINDING_KINDS.map((kind) => (
            <label
              key={kind}
              className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-2"
            >
              <input
                type="radio"
                name="kind"
                value={kind}
                required
                defaultChecked={finding?.kind === kind}
                className="mt-0.5 size-4 border-slate-300 text-brand-600 focus:ring-brand-200"
              />
              <span>
                <span className="block text-sm text-slate-800">
                  {FINDING_KIND_LABELS[kind]}
                </span>
                <span className="block text-xs text-slate-500">
                  {FINDING_KIND_HINTS[kind]}
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <Field
        label="O achado"
        hint="Uma frase. Achado longo é análise — o que sustenta vai em evidência."
        required
      >
        <Textarea
          name="statement"
          rows={2}
          required
          className="font-sans text-sm"
          defaultValue={finding?.statement ?? ""}
          placeholder="Ex.: o Boot Camp não tem janela de venda definida e perdeu a temporada de inscrições."
        />
      </Field>

      <Field
        label="Evidência"
        hint="De onde isso saiu: o dado, o relatório, a conversa."
      >
        <Input
          name="evidence"
          defaultValue={finding?.evidence ?? ""}
          placeholder="Ex.: calendário do ciclo, aba Esteira de produtos"
        />
      </Field>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" size="sm" variant="primary" disabled={isPending}>
          {isPending
            ? "Salvando…"
            : finding
              ? "Salvar achado"
              : "Registrar achado"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onDone}
          disabled={isPending}
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}
