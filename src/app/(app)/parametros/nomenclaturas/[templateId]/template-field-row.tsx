"use client";

import { useActionState, useEffect, useState } from "react";

import {
  moveTemplateField,
  removeTemplateField,
  updateTemplateField,
} from "../actions";
import { INITIAL_TEMPLATE_STATE } from "../form-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import {
  FIELD_TYPE_LABELS,
  type NamingTemplateField,
} from "@/lib/db/schema";

export function TemplateFieldRow({
  field,
  index,
  total,
}: {
  field: NamingTemplateField;
  index: number;
  total: number;
}) {
  const [isEditing, setIsEditing] = useState(false);

  if (isEditing) {
    return (
      <li className="bg-slate-50 px-5 py-4">
        <EditFieldForm field={field} onDone={() => setIsEditing(false)} />
      </li>
    );
  }

  return (
    <li className="flex flex-wrap items-start justify-between gap-4 px-5 py-3.5">
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs text-slate-400">{index + 1}º</span>
          <span className="font-medium text-slate-900">{field.label}</span>
          <Badge tone="neutral">{FIELD_TYPE_LABELS[field.fieldType]}</Badge>
        </p>
        {field.hint ? (
          <p className="mt-0.5 text-sm text-slate-500">{field.hint}</p>
        ) : null}
        {field.fieldType === "select" && field.options ? (
          <p className="mt-1 text-xs text-slate-500">
            Opções: {field.options.map((option) => option.label).join(", ")}
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <form action={moveTemplateField}>
          <input type="hidden" name="fieldId" value={field.id} />
          <input type="hidden" name="direction" value="up" />
          <Button
            type="submit"
            size="sm"
            variant="ghost"
            disabled={index === 0}
            aria-label={`Mover "${field.label}" para cima`}
          >
            ↑
          </Button>
        </form>
        <form action={moveTemplateField}>
          <input type="hidden" name="fieldId" value={field.id} />
          <input type="hidden" name="direction" value="down" />
          <Button
            type="submit"
            size="sm"
            variant="ghost"
            disabled={index === total - 1}
            aria-label={`Mover "${field.label}" para baixo`}
          >
            ↓
          </Button>
        </form>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => setIsEditing(true)}
        >
          Editar
        </Button>
        <form action={removeTemplateField}>
          <input type="hidden" name="fieldId" value={field.id} />
          <Button type="submit" size="sm" variant="danger">
            Remover
          </Button>
        </form>
      </div>
    </li>
  );
}

/**
 * Formulário inline de edição. Vive em um componente separado para que o estado
 * da action recomece a cada abertura, em vez de guardar a mensagem da vez
 * anterior.
 */
function EditFieldForm({
  field,
  onDone,
}: {
  field: NamingTemplateField;
  onDone: () => void;
}) {
  const [state, formAction, isPending] = useActionState(
    updateTemplateField,
    INITIAL_TEMPLATE_STATE,
  );

  // Salvou: a lista já foi revalidada, então fechar o formulário mostra os
  // valores novos na linha.
  useEffect(() => {
    if (state.status === "success") onDone();
  }, [state, onDone]);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="fieldId" value={field.id} />

      {state.status === "error" && state.message ? (
        <div
          role="alert"
          className="rounded-lg border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-800"
        >
          {state.message}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Rótulo" htmlFor={`label-${field.id}`} required>
          <Input
            id={`label-${field.id}`}
            name="label"
            defaultValue={field.label}
            maxLength={60}
            required
          />
        </Field>

        <Field
          label="Texto de ajuda"
          htmlFor={`hint-${field.id}`}
          hint="Aparece abaixo do campo no gerador. Opcional."
        >
          <Input
            id={`hint-${field.id}`}
            name="hint"
            defaultValue={field.hint ?? ""}
            maxLength={200}
          />
        </Field>
      </div>

      {field.fieldType === "text" ? (
        <Field
          label="Exemplo dentro do campo"
          htmlFor={`placeholder-${field.id}`}
          hint="Texto cinza que aparece no campo vazio. Opcional."
        >
          <Input
            id={`placeholder-${field.id}`}
            name="placeholder"
            defaultValue={field.placeholder ?? ""}
            maxLength={80}
          />
        </Field>
      ) : null}

      {field.fieldType === "select" ? (
        <Field
          label="Opções"
          htmlFor={`options-${field.id}`}
          required
          hint="Uma por linha. Use `valor | Rótulo` para exibir um texto diferente do valor gravado."
        >
          <Textarea
            id={`options-${field.id}`}
            name="options"
            rows={5}
            defaultValue={optionsToText(field.options)}
          />
        </Field>
      ) : null}

      <p className="text-xs text-slate-500">
        O tipo{" "}
        <span className="text-slate-700">
          {FIELD_TYPE_LABELS[field.fieldType]}
        </span>{" "}
        não pode ser alterado: mudá-lo invalidaria o significado do bloco. Para
        trocar o tipo, remova este bloco e adicione outro.
      </p>

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? "Salvando…" : "Salvar"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onDone}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

/** Volta das opções gravadas para o texto que `parseOptions` sabe reinterpretar. */
function optionsToText(
  options: NamingTemplateField["options"],
): string {
  if (!options) return "";
  return options
    .map((option) =>
      option.label === option.value
        ? option.value
        : `${option.value} | ${option.label}`,
    )
    .join("\n");
}
