"use client";

import { useActionState, useEffect, useState } from "react";

import {
  deleteTimelineItem,
  duplicateTimelineItem,
  saveTimelineItem,
} from "../actions";
import { INITIAL_STRATEGY_STATE, type StrategyFormState } from "../form-state";
import type { CalendarItem, ClientProduct } from "./calendar-types";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import {
  TIMELINE_KINDS,
  TIMELINE_STATUSES,
  type TimelineKind,
} from "@/lib/db/schema";
import { toDateInput } from "@/lib/modules/strategy/dates";
import {
  TIMELINE_STATUS_LABELS,
  kindConfig,
} from "@/lib/modules/strategy/timeline-kinds";
import { cn } from "@/lib/utils/cn";

/**
 * Painel lateral de um item.
 *
 * É aqui que mora o progressive disclosure: o calendário mostra só título e
 * cor, e o resto — inclusive os campos próprios da categoria — só aparece
 * quando a pessoa abre o item. Painel, e não página, para não perder o
 * calendário de vista.
 */
export function ItemPanel({
  cycleId,
  products,
  canEdit,
  item,
  createOn,
  onClose,
}: {
  cycleId: string;
  products: ClientProduct[];
  canEdit: boolean;
  item: CalendarItem | null;
  createOn: Date | null;
  onClose: () => void;
}) {
  const [state, formAction, isPending] = useActionState<
    StrategyFormState,
    FormData
  >(saveTimelineItem, INITIAL_STRATEGY_STATE);

  const [kind, setKind] = useState<TimelineKind>(item?.kind ?? "milestone");
  const config = kindConfig(kind);

  // Salvou: fecha o painel. A lista já foi revalidada pelo servidor.
  useEffect(() => {
    if (state.status === "success") onClose();
  }, [state, onClose]);

  // Esc fecha, como em qualquer painel.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const isNew = !item;
  const start = item?.startsAt ?? createOn ?? new Date();
  const end = item?.endsAt ?? createOn ?? new Date();

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Fechar painel"
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/20"
      />

      <div className="relative flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-slate-200 bg-white shadow-xl">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-slate-200 bg-white px-5 py-4">
          <div className="min-w-0">
            <p className="font-display text-base font-semibold text-slate-900">
              {isNew ? "Novo item" : item.title}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">{config.description}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            ✕
          </button>
        </div>

        <form action={formAction} className="flex-1 space-y-5 px-5 py-5">
          <input type="hidden" name="cycleId" value={cycleId} />
          {item ? <input type="hidden" name="itemId" value={item.id} /> : null}
          <input type="hidden" name="kind" value={kind} />

          {state.status === "error" && state.message ? (
            <div
              role="alert"
              className="rounded-lg border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-800"
            >
              {state.message}
            </div>
          ) : null}

          {/* A categoria é a primeira escolha: é ela que define os campos. */}
          <div>
            <p className="mb-1.5 text-sm font-medium text-slate-800">Categoria</p>
            <div className="flex flex-wrap gap-1.5">
              {TIMELINE_KINDS.map((option) => {
                const optionConfig = kindConfig(option);
                const active = kind === option;
                return (
                  <button
                    key={option}
                    type="button"
                    disabled={!canEdit}
                    onClick={() => setKind(option)}
                    aria-pressed={active}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset transition-all disabled:cursor-not-allowed",
                      active
                        ? optionConfig.chip
                        : "bg-white text-slate-500 ring-slate-200 hover:bg-slate-50",
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn("size-2 rounded-full", optionConfig.dot)}
                    />
                    {optionConfig.label}
                  </button>
                );
              })}
            </div>
          </div>

          <Field label="Título" htmlFor="title" required>
            <Input
              id="title"
              name="title"
              defaultValue={item?.title ?? ""}
              placeholder="Ex.: Prova teórica do concurso"
              maxLength={120}
              disabled={!canEdit}
              required
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Começa em" htmlFor="startsAt" required>
              <Input
                id="startsAt"
                name="startsAt"
                type="date"
                defaultValue={toDateInput(start)}
                disabled={!canEdit}
                required
              />
            </Field>
            <Field
              label="Termina em"
              htmlFor="endsAt"
              hint="Vazio = um dia só."
            >
              <Input
                id="endsAt"
                name="endsAt"
                type="date"
                defaultValue={toDateInput(end)}
                disabled={!canEdit}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Situação" htmlFor="status">
              <Select
                id="status"
                name="status"
                defaultValue={item?.status ?? "planned"}
                disabled={!canEdit}
              >
                {TIMELINE_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {TIMELINE_STATUS_LABELS[status]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Responsável" htmlFor="owner">
              <Input
                id="owner"
                name="owner"
                defaultValue={item?.owner ?? ""}
                placeholder="Ex.: Ângelo"
                maxLength={80}
                disabled={!canEdit}
              />
            </Field>
          </div>

          {config.linksToProduct && products.length > 0 ? (
            <Field
              label="Produto"
              htmlFor="productId"
              hint="Vincular põe o item na esteira do produto."
            >
              <Select
                id="productId"
                name="productId"
                defaultValue={item?.productId ?? ""}
                disabled={!canEdit}
              >
                <option value="">Nenhum</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}

          <Field label="Resumo" htmlFor="summary">
            <Textarea
              id="summary"
              name="summary"
              defaultValue={item?.summary ?? ""}
              rows={2}
              placeholder="Uma frase de contexto."
              disabled={!canEdit}
            />
          </Field>

          {/* Campos próprios da categoria — mudam conforme a escolha acima. */}
          {config.fields.length > 0 ? (
            <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-medium text-slate-500">
                Campos de {config.label.toLowerCase()}
              </p>
              {config.fields.map((spec) => (
                <Field
                  key={spec.key}
                  label={spec.label}
                  htmlFor={`detalhe_${spec.key}`}
                  hint={spec.hint}
                >
                  {spec.type === "long" ? (
                    <Textarea
                      id={`detalhe_${spec.key}`}
                      name={`detalhe_${spec.key}`}
                      rows={3}
                      defaultValue={item?.details?.[spec.key] ?? ""}
                      placeholder={spec.placeholder}
                      disabled={!canEdit}
                    />
                  ) : (
                    <Input
                      id={`detalhe_${spec.key}`}
                      name={`detalhe_${spec.key}`}
                      defaultValue={item?.details?.[spec.key] ?? ""}
                      placeholder={spec.placeholder}
                      maxLength={160}
                      disabled={!canEdit}
                    />
                  )}
                </Field>
              ))}
            </div>
          ) : null}

          {canEdit ? (
            <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 pt-5">
              <Button type="submit" disabled={isPending}>
                {isPending ? "Salvando…" : isNew ? "Criar item" : "Salvar"}
              </Button>
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancelar
              </Button>
            </div>
          ) : (
            <p className="border-t border-slate-200 pt-5 text-xs text-slate-500">
              Só quem responde por esta BU pode editar o planejamento.
            </p>
          )}
        </form>

        {/* Duplicar e excluir ficam fora do formulário principal: são outras
            ações, e aninhar formulários não é permitido em HTML. */}
        {canEdit && item ? (
          <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 px-5 py-4">
            <form action={duplicateTimelineItem}>
              <input type="hidden" name="itemId" value={item.id} />
              <Button type="submit" size="sm" variant="secondary">
                Duplicar
              </Button>
            </form>
            <DeleteItem itemId={item.id} title={item.title} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** Exclusão em duas etapas, como no resto da plataforma. */
function DeleteItem({ itemId, title }: { itemId: string; title: string }) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <Button
        type="button"
        size="sm"
        variant="danger"
        onClick={() => setConfirming(true)}
      >
        Excluir
      </Button>
    );
  }

  return (
    <form action={deleteTimelineItem} className="flex items-center gap-2">
      <input type="hidden" name="itemId" value={itemId} />
      <span className="text-xs text-slate-600">Excluir “{title}”?</span>
      <Button type="submit" size="sm" variant="danger">
        Sim
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={() => setConfirming(false)}
      >
        Não
      </Button>
    </form>
  );
}
