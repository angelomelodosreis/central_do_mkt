"use client";

import { useActionState, useState } from "react";

import { addTemplateField } from "../actions";
import { INITIAL_TEMPLATE_STATE } from "../form-state";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import {
  FIELD_TYPE_DESCRIPTIONS,
  FIELD_TYPE_LABELS,
  FIELD_TYPES,
  type FieldType,
} from "@/lib/db/schema";

export function AddFieldForm({ templateId }: { templateId: string }) {
  const [state, formAction, isPending] = useActionState(
    addTemplateField,
    INITIAL_TEMPLATE_STATE,
  );
  const [fieldType, setFieldType] = useState<FieldType>("business_unit");

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="templateId" value={templateId} />

      {state.status === "error" && state.message ? (
        <div
          role="alert"
          className="rounded-lg border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-800"
        >
          {state.message}
        </div>
      ) : null}

      {state.status === "success" && state.message ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {state.message}
        </div>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Tipo do bloco"
          htmlFor="fieldType"
          required
          hint={FIELD_TYPE_DESCRIPTIONS[fieldType]}
        >
          <Select
            id="fieldType"
            name="fieldType"
            value={fieldType}
            onChange={(event) =>
              setFieldType(event.target.value as FieldType)
            }
          >
            {FIELD_TYPES.map((type) => (
              <option key={type} value={type}>
                {FIELD_TYPE_LABELS[type]}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Rótulo"
          htmlFor="label"
          required
          hint="O que a pessoa vê acima do campo."
        >
          <Input
            id="label"
            name="label"
            placeholder="Ex.: Nome da campanha"
            maxLength={60}
            required
          />
        </Field>
      </div>

      <Field
        label="Texto de ajuda"
        htmlFor="hint"
        hint="Aparece abaixo do campo, explicando o que preencher. Opcional."
      >
        <Input
          id="hint"
          name="hint"
          placeholder="Ex.: Use o nome interno da campanha."
          maxLength={200}
        />
      </Field>

      {fieldType === "text" ? (
        <Field
          label="Exemplo dentro do campo"
          htmlFor="placeholder"
          hint="Texto cinza que aparece no campo vazio. Opcional."
        >
          <Input
            id="placeholder"
            name="placeholder"
            placeholder="Ex.: Black Friday Novembro"
            maxLength={80}
          />
        </Field>
      ) : null}

      {fieldType === "select" ? (
        <Field
          label="Opções"
          htmlFor="options"
          required
          hint="Uma por linha. Use `valor | Rótulo` para exibir um texto diferente do valor gravado."
        >
          <Textarea
            id="options"
            name="options"
            rows={5}
            placeholder={"lead | Lead\naluno | Aluno"}
          />
        </Field>
      ) : null}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Adicionando…" : "Adicionar bloco"}
      </Button>
    </form>
  );
}
