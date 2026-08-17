"use client";

import { useActionState } from "react";

import { updateTemplate } from "../actions";
import { INITIAL_TEMPLATE_STATE } from "../form-state";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

export function EditTemplateForm({
  templateId,
  name,
  description,
}: {
  templateId: string;
  name: string;
  description: string;
}) {
  const [state, formAction, isPending] = useActionState(
    updateTemplate,
    INITIAL_TEMPLATE_STATE,
  );

  return (
    <form action={formAction} className="space-y-4">
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

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome do modelo" htmlFor="edit-name" required>
          <Input
            id="edit-name"
            name="name"
            defaultValue={name}
            maxLength={80}
            required
          />
        </Field>

        <Field label="Descrição" htmlFor="edit-description">
          <Input
            id="edit-description"
            name="description"
            defaultValue={description}
            maxLength={200}
          />
        </Field>
      </div>

      <Button type="submit" variant="secondary" disabled={isPending}>
        {isPending ? "Salvando…" : "Salvar"}
      </Button>
    </form>
  );
}
