"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { createDocPage, updateDocPage } from "./actions";
import { INITIAL_DOC_FORM_STATE, type DocFormState } from "./form-state";
import { RichTextEditor } from "@/components/rich-text/editor";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import {
  DOC_VISIBILITIES,
  DOC_VISIBILITY_LABELS,
  type DocPageType,
  type DocScope,
  type DocVisibility,
} from "@/lib/db/schema";
import { toKebabCase } from "@/lib/modules/documentation/slug";

export type DocFormCategory = {
  id: string;
  name: string;
  slug: string;
  /** Esqueleto (documento estruturado) com que uma página nova daqui começa. */
  pageTemplate: string;
};

export type DocFormValues = {
  pageId?: string;
  title: string;
  categoryId: string;
  summary: string;
  /** Documento estruturado já gravado, quando houver. */
  content: string;
  /**
   * Corpo de uma página antiga, já convertido de Markdown para HTML, para o
   * editor visual conseguir abri-la. Ao salvar, ela passa a ser estruturada.
   */
  contentHtml?: string;
  visibility: DocVisibility;
  pageType: DocPageType;
  scope: DocScope;
};

/**
 * A BU a que a página pertence, quando ela é escrita de dentro de uma.
 *
 * Ausente = documento corporativo, que vai direto para a biblioteca geral e não
 * tem escolha de escopo a fazer.
 */
export type DocFormBusinessUnit = { id: string; label: string };

export function DocPageForm({
  categories,
  values,
  mode,
  cancelHref,
  businessUnit,
}: {
  categories: DocFormCategory[];
  values: DocFormValues;
  mode: "create" | "edit";
  cancelHref: string;
  businessUnit?: DocFormBusinessUnit;
}) {
  const action = mode === "create" ? createDocPage : updateDocPage;
  const [state, formAction, isPending] = useActionState<DocFormState, FormData>(
    action,
    INITIAL_DOC_FORM_STATE,
  );

  const [title, setTitle] = useState(values.title);
  const [categoryId, setCategoryId] = useState(values.categoryId);
  const [scope, setScope] = useState<DocScope>(values.scope);

  // Trocar a categoria pode trazer o modelo dela. Como o editor guarda o próprio
  // estado, isso é feito remontando-o (`key`) com o novo conteúdo inicial — e só
  // enquanto a pessoa não digitou nada, para nunca apagar o que ela escreveu.
  const [editorKey, setEditorKey] = useState(values.categoryId);
  const [hasTyped, setHasTyped] = useState(false);

  const slug = toKebabCase(title);
  const categorySlug =
    categories.find((category) => category.id === categoryId)?.slug ?? "";
  const isSystemPage = values.pageType !== "standard";

  function handleCategoryChange(nextCategoryId: string) {
    setCategoryId(nextCategoryId);

    // Só faz sentido em páginas novas: numa edição, o corpo já é o conteúdo real.
    if (mode !== "create" || hasTyped) return;
    setEditorKey(nextCategoryId);
  }

  const initialDoc =
    mode === "create"
      ? (categories.find((category) => category.id === editorKey)
          ?.pageTemplate ?? "")
      : values.content;

  return (
    <form action={formAction} className="space-y-5">
      {values.pageId ? (
        <input type="hidden" name="pageId" value={values.pageId} />
      ) : null}
      {businessUnit ? (
        <input type="hidden" name="businessUnitId" value={businessUnit.id} />
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
        label="Título"
        htmlFor="title"
        required
        hint={
          slug && categorySlug
            ? `Endereço da página: /documentacao/${categorySlug}/${slug}`
            : "O endereço da página é gerado a partir do título."
        }
      >
        <Input
          id="title"
          name="title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Ex.: Fluxo de aprovação de criativos"
          maxLength={120}
          required
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Categoria" htmlFor="categoryId" required>
          <Select
            id="categoryId"
            name="categoryId"
            value={categoryId}
            onValueChange={handleCategoryChange}
            required
            options={categories.map((category) => ({
              value: category.id,
              label: category.name,
            }))}
          />
        </Field>

        <Field
          label="Quem pode ver"
          htmlFor="visibility"
          hint="Controle de acesso desta página específica."
        >
          <Select
            id="visibility"
            name="visibility"
            defaultValue={values.visibility}
            options={DOC_VISIBILITIES.map((visibility) => ({
              value: visibility,
              label: DOC_VISIBILITY_LABELS[visibility],
            }))}
          />
        </Field>
      </div>

      {/* A escolha de onde o documento vive só existe dentro de uma BU: fora
          dela, "só a minha BU" não quer dizer nada. */}
      {businessUnit ? (
        <fieldset className="rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3.5">
          <legend className="px-1 text-sm font-medium text-slate-800">
            Onde este documento fica
          </legend>
          <div className="mt-1 space-y-2.5">
            <label className="flex cursor-pointer gap-2.5">
              <input
                type="radio"
                name="scope"
                value="business_unit"
                checked={scope === "business_unit"}
                onChange={() => setScope("business_unit")}
                className="mt-0.5 size-4 accent-brand-600"
              />
              <span className="text-sm">
                <span className="font-medium text-slate-900">
                  Apenas em {businessUnit.label}
                </span>
                <span className="mt-0.5 block text-xs text-slate-500">
                  Visível só para quem trabalha nesta BU. Continua aparecendo na
                  busca dessas pessoas.
                </span>
              </span>
            </label>
            <label className="flex cursor-pointer gap-2.5">
              <input
                type="radio"
                name="scope"
                value="general"
                checked={scope === "general"}
                onChange={() => setScope("general")}
                className="mt-0.5 size-4 accent-brand-600"
              />
              <span className="text-sm">
                <span className="font-medium text-slate-900">
                  Também na biblioteca geral
                </span>
                <span className="mt-0.5 block text-xs text-slate-500">
                  Para material que interessa ao time todo — pesquisa de mercado,
                  aprendizado de teste. O documento continua listado dentro de{" "}
                  {businessUnit.label}.
                </span>
              </span>
            </label>
          </div>
        </fieldset>
      ) : null}

      <Field
        label="Resumo"
        htmlFor="summary"
        hint="Uma frase curta que aparece na listagem. Opcional."
      >
        <Input
          id="summary"
          name="summary"
          defaultValue={values.summary}
          placeholder="Ex.: Passo a passo desde o briefing até a publicação."
          maxLength={200}
        />
      </Field>

      {isSystemPage ? (
        <div className="rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-900">
          O conteúdo desta página é gerado automaticamente pelo sistema (dados ao
          vivo do banco), por isso não há campo de texto. Você pode alterar
          título, categoria, resumo e visibilidade.
        </div>
      ) : (
        <Field
          label="Conteúdo"
          hint="Use a barra acima para formatar. O texto aparece já formatado enquanto você escreve."
        >
          <RichTextEditor
            key={editorKey}
            name="content"
            initialDoc={initialDoc}
            initialHtml={mode === "edit" ? values.contentHtml : undefined}
            placeholder="Escreva aqui…"
            onUserInput={() => setHasTyped(true)}
          />
        </Field>
      )}

      <div className="flex flex-wrap items-center gap-3 border-t border-slate-200 pt-5">
        <Button type="submit" disabled={isPending}>
          {isPending
            ? "Salvando…"
            : mode === "create"
              ? "Criar página"
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
