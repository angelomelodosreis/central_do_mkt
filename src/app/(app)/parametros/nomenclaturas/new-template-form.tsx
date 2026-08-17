"use client";

import { useActionState } from "react";

import { createTemplate } from "./actions";
import { INITIAL_TEMPLATE_STATE } from "./form-state";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

export function NewTemplateForm() {
  const [state, formAction, isPending] = useActionState(
    createTemplate,
    INITIAL_TEMPLATE_STATE,
  );

  return (
    <form action={formAction} className="space-y-4">
      {state.status === "error" && state.message ? (
        <div
          role="alert"
          className="rounded-lg border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-800"
        >
          {state.message}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Nome do modelo"
          htmlFor="name"
          required
          hint="Como aparece no seletor do gerador."
        >
          <Input
            id="name"
            name="name"
            placeholder="Ex.: Campanha do Meta Ads"
            maxLength={80}
            required
          />
        </Field>

        <Field
          label="Descrição"
          htmlFor="description"
          hint="Explica quando usar este modelo. Opcional."
        >
          <Input
            id="description"
            name="description"
            placeholder="Ex.: Campanhas de tráfego pago no Meta."
            maxLength={200}
          />
        </Field>
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending ? "Criando…" : "Criar e definir blocos"}
      </Button>
    </form>
  );
}
