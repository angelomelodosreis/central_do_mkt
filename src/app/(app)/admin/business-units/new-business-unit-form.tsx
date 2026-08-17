"use client";

import { useActionState, useState } from "react";

import { createBusinessUnit } from "./actions";
import { INITIAL_BU_STATE } from "./form-state";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { toSnakeCase } from "@/lib/modules/name-generator/slugify";

export function NewBusinessUnitForm() {
  const [state, formAction, isPending] = useActionState(
    createBusinessUnit,
    INITIAL_BU_STATE,
  );
  const [label, setLabel] = useState("");
  const [slug, setSlug] = useState("");

  // Enquanto o admin não digitar um slug próprio, mostramos o derivado do nome.
  const effectiveSlug = toSnakeCase(slug || label);

  return (
    <form action={formAction} className="space-y-5">
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
          label="Nome de exibição"
          htmlFor="label"
          required
          hint="Como aparece nas telas. Ex.: Clínica Médica"
        >
          <Input
            id="label"
            name="label"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder="Ex.: Clínica Médica"
            maxLength={60}
            required
          />
        </Field>

        <Field
          label="Slug"
          htmlFor="slug"
          hint={
            effectiveSlug
              ? `Será usado como: ${effectiveSlug}`
              : "Deixe em branco para gerar a partir do nome."
          }
        >
          <Input
            id="slug"
            name="slug"
            value={slug}
            onChange={(event) => setSlug(event.target.value)}
            placeholder="Gerado automaticamente"
            maxLength={60}
            className="font-mono text-[13px]"
          />
        </Field>
      </div>

      <Field
        label="Descrição"
        htmlFor="description"
        hint="Contexto opcional, exibido na página de referência."
      >
        <Input
          id="description"
          name="description"
          placeholder="Ex.: Cursos e campanhas de Clínica Médica."
          maxLength={200}
        />
      </Field>

      <Button type="submit" disabled={isPending}>
        {isPending ? "Cadastrando…" : "Cadastrar BU"}
      </Button>
    </form>
  );
}
