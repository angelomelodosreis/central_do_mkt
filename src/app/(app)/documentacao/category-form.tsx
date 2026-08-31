"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { createDocCategory, updateDocCategory } from "./actions";
import { INITIAL_DOC_FORM_STATE, type DocFormState } from "./form-state";
import { RichTextEditor } from "@/components/rich-text/editor";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { toKebabCase } from "@/lib/modules/documentation/slug";

export type CategoryFormValues = {
  categoryId?: string;
  name: string;
  description: string;
  /** Documento estruturado, no mesmo formato do corpo de uma página. */
  pageTemplate: string;
};

export function CategoryForm({
  values,
  mode,
  cancelHref,
}: {
  values: CategoryFormValues;
  mode: "create" | "edit";
  cancelHref: string;
}) {
  const action = mode === "create" ? createDocCategory : updateDocCategory;
  const [state, formAction, isPending] = useActionState<DocFormState, FormData>(
    action,
    INITIAL_DOC_FORM_STATE,
  );

  const [name, setName] = useState(values.name);
  const slug = toKebabCase(name);

  return (
    <form action={formAction} className="space-y-5">
      {values.categoryId ? (
        <input type="hidden" name="categoryId" value={values.categoryId} />
      ) : null}

      {state.status === "error" && state.message ? (
        <div
          role="alert"
          className="rounded-lg border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-800"
        >
          {state.message}
        </div>
      ) : null}

      <Field
        label="Nome da categoria"
        htmlFor="name"
        required
        hint={
          slug
            ? `Endereço: /documentacao/${slug}`
            : "Ex.: Processos, Convenções, Mídia Paga."
        }
      >
        <Input
          id="name"
          name="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Ex.: Mídia Paga"
          maxLength={60}
          required
        />
      </Field>

      <Field
        label="Descrição"
        htmlFor="description"
        hint="Uma frase explicando o que entra nessa categoria. Opcional."
      >
        <Input
          id="description"
          name="description"
          defaultValue={values.description}
          placeholder="Ex.: Convenções e processos de campanhas pagas."
          maxLength={200}
        />
      </Field>

      <Field
        label="Modelo de página"
        hint="Se preenchido, toda página nova criada nesta categoria já começa com este conteúdo. Serve para manter o mesmo formato sem engessar o texto — quem escreve pode apagar. Opcional."
      >
        <RichTextEditor
          name="pageTemplate"
          initialDoc={values.pageTemplate}
          placeholder="Ex.: Contexto, O que ficou decidido, Pendências…"
        />
      </Field>

      <div className="flex flex-wrap items-center gap-3 border-t border-slate-200 pt-5">
        <Button type="submit" variant="primary" disabled={isPending}>
          {isPending
            ? "Salvando…"
            : mode === "create"
              ? "Criar categoria"
              : "Salvar alterações"}
        </Button>
        <Link
          href={cancelHref}
          className="text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
