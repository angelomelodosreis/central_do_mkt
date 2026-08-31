"use client";

import { useActionState, useState } from "react";

import {
  addTemplateField,
  moveTemplateField,
  removeTemplateField,
  updateTemplate,
  updateTemplateField,
} from "../actions";
import { INITIAL_TEMPLATE_STATE } from "../form-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, PageHeader } from "@/components/ui/card";
import { Drawer } from "@/components/ui/drawer";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import {
  FIELD_TYPES,
  FIELD_TYPE_DESCRIPTIONS,
  FIELD_TYPE_LABELS,
  type FieldType,
  type SelectOption,
} from "@/lib/db/schema";
import {
  BASE_KEYS,
  OFFICIAL_BASES,
  isBaseKey,
  type BaseKey,
} from "@/lib/modules/bases/registry";
import { cn } from "@/lib/utils/cn";

type BuilderField = {
  id: string;
  position: number;
  fieldType: FieldType;
  label: string;
  hint: string | null;
  placeholder: string | null;
  isRequired: boolean;
  options: SelectOption[] | null;
  sourceKey: string | null;
};

type BuilderTemplate = {
  id: string;
  name: string;
  description: string | null;
  blockSeparator: string;
  isActive: boolean;
  fields: BuilderField[];
};

/** De onde o valor daquele bloco vem, em uma linha. */
function origemDoBloco(field: BuilderField): string {
  switch (field.fieldType) {
    case "official_base":
      return isBaseKey(field.sourceKey)
        ? `Base oficial · ${OFFICIAL_BASES[field.sourceKey].label}`
        : "Base oficial não definida";
    case "select":
      return `Lista fixa · ${field.options?.length ?? 0} opções`;
    case "month_year":
      return "Mês e ano · MM_AAAA";
    default:
      return "Texto livre · padronizado automaticamente";
  }
}

/** O pedaço que este bloco contribui para o nome final. */
function amostraDoBloco(
  field: BuilderField,
  baseSamples: Record<BaseKey, string>,
): string {
  switch (field.fieldType) {
    case "official_base":
      return isBaseKey(field.sourceKey) ? baseSamples[field.sourceKey] : "?";
    case "select":
      return field.options?.[0]?.value ?? "opcao";
    case "month_year":
      return "11_2026";
    default:
      return "texto_livre";
  }
}

/**
 * O construtor de um modelo.
 *
 * Três blocos, na ordem em que se pensa: a identidade do modelo, a sequência
 * de blocos que forma o nome, e o resultado. O resultado fica GRUDADO no topo
 * porque é ele que dá sentido a cada mudança — mexer na ordem sem ver o nome
 * mudar é montar às cegas.
 */
export function TemplateBuilder({
  template,
  baseCounts,
  baseSamples,
}: {
  template: BuilderTemplate;
  baseCounts: Record<BaseKey, number>;
  baseSamples: Record<BaseKey, string>;
}) {
  const [adicionando, setAdicionando] = useState(false);
  const [editando, setEditando] = useState<BuilderField | null>(null);
  const [editandoIdentidade, setEditandoIdentidade] = useState(false);

  const temBlocos = template.fields.length > 0;

  const exemplo = temBlocos
    ? template.fields
        .map((field) => amostraDoBloco(field, baseSamples))
        .join(template.blockSeparator)
    : null;

  return (
    <>
      <PageHeader
        title={template.name}
        description={template.description ?? "Sem descrição."}
        action={
          <Button
            variant="secondary"
            onClick={() => setEditandoIdentidade(true)}
          >
            Editar nome e separador
          </Button>
        }
      />

      {/* Resultado — a referência de tudo que vem abaixo */}
      <div className="sticky top-2 z-10 mb-6 rounded-xl border border-brand-200 bg-brand-50/80 px-4 py-3 backdrop-blur">
        <p className="text-xs font-medium uppercase tracking-wide text-brand-700">
          Exemplo do nome final
        </p>
        <code className="mt-1 block break-all font-mono text-sm font-medium text-slate-900">
          {exemplo ?? "— adicione blocos abaixo —"}
        </code>
        <p className="mt-1.5 text-xs text-slate-600">
          {template.isActive
            ? "Este modelo está ativo e aparece no gerador."
            : temBlocos
              ? "Inativo. Ative-o na listagem para o time poder usá-lo."
              : "Adicione ao menos um bloco para poder ativar este modelo."}
          {" Blocos unidos por "}
          <code className="font-mono">{template.blockSeparator}</code>.
        </p>
      </div>

      <Card>
        <CardHeader
          title={`Blocos do nome (${template.fields.length})`}
          description="Na ordem em que aparecem no nome. Cada bloco vira um campo no formulário do gerador."
          action={
            <Button size="sm" onClick={() => setAdicionando(true)}>
              + Adicionar bloco
            </Button>
          }
        />
        <CardBody className="px-0 py-0">
          {!temBlocos ? (
            <p className="px-5 py-10 text-center text-sm text-slate-400">
              Nenhum bloco ainda. O nome é montado a partir deles.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {template.fields.map((field, index) => (
                <li
                  key={field.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      aria-hidden
                      className="flex size-6 shrink-0 items-center justify-center rounded-full bg-slate-100 font-mono text-[11px] text-slate-500"
                    >
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-slate-900">
                          {field.label}
                        </span>
                        {field.fieldType === "official_base" &&
                        !isBaseKey(field.sourceKey) ? (
                          <Badge tone="warning">Base não definida</Badge>
                        ) : null}
                      </p>
                      <p className="text-xs text-slate-500">
                        {origemDoBloco(field)}
                      </p>
                      <code className="mt-0.5 block font-mono text-[11px] text-slate-400">
                        {amostraDoBloco(field, baseSamples)}
                      </code>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                    <form action={moveTemplateField}>
                      <input type="hidden" name="fieldId" value={field.id} />
                      <input type="hidden" name="direction" value="up" />
                      <Button
                        type="submit"
                        size="sm"
                        variant="ghost"
                        disabled={index === 0}
                        aria-label={`Mover ${field.label} para cima`}
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
                        disabled={index === template.fields.length - 1}
                        aria-label={`Mover ${field.label} para baixo`}
                      >
                        ↓
                      </Button>
                    </form>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setEditando(field)}
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
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <AddFieldDrawer
        open={adicionando}
        templateId={template.id}
        baseCounts={baseCounts}
        onClose={() => setAdicionando(false)}
      />
      <EditFieldDrawer field={editando} onClose={() => setEditando(null)} />
      <IdentityDrawer
        open={editandoIdentidade}
        template={template}
        onClose={() => setEditandoIdentidade(false)}
      />
    </>
  );
}

function Mensagem({ status, message }: { status: string; message?: string }) {
  if (!message) return null;
  return (
    <p
      role="status"
      className={cn(
        "rounded-lg border px-3 py-2 text-sm",
        status === "error"
          ? "border-danger-200 bg-danger-50 text-danger-800"
          : "border-emerald-200 bg-emerald-50 text-emerald-800",
      )}
    >
      {message}
    </p>
  );
}

function AddFieldDrawer({
  open,
  templateId,
  baseCounts,
  onClose,
}: {
  open: boolean;
  templateId: string;
  baseCounts: Record<BaseKey, number>;
  onClose: () => void;
}) {
  const [state, formAction, isPending] = useActionState(
    addTemplateField,
    INITIAL_TEMPLATE_STATE,
  );
  const [fieldType, setFieldType] = useState<FieldType>("official_base");
  const [baseKey, setBaseKey] = useState<BaseKey>("business_unit");

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Adicionar bloco"
      description="Cada bloco vira um campo no formulário do gerador e um pedaço do nome."
      width="lg"
    >
      <form action={formAction} className="space-y-5">
        <input type="hidden" name="templateId" value={templateId} />
        <Mensagem status={state.status} message={state.message} />

        <Field
          label="De onde vem o valor"
          htmlFor="fieldType"
          required
          hint={FIELD_TYPE_DESCRIPTIONS[fieldType]}
        >
          <Select
            id="fieldType"
            name="fieldType"
            value={fieldType}
            onValueChange={(next) => setFieldType(next as FieldType)}
            options={FIELD_TYPES.map((type) => ({
              value: type,
              label: FIELD_TYPE_LABELS[type],
              hint: FIELD_TYPE_DESCRIPTIONS[type],
            }))}
          />
        </Field>

        {fieldType === "official_base" ? (
          <Field
            label="Qual base"
            htmlFor="sourceKey"
            required
            hint={
              OFFICIAL_BASES[baseKey].parentKey
                ? `Depende de ${OFFICIAL_BASES[OFFICIAL_BASES[baseKey].parentKey!].singular}: se o modelo tiver esse bloco antes, a lista se filtra sozinha.`
                : "Não depende de nenhuma outra base."
            }
          >
            <Select
              id="sourceKey"
              name="sourceKey"
              value={baseKey}
              onValueChange={(next) => setBaseKey(next as BaseKey)}
              options={BASE_KEYS.map((key) => ({
                value: key,
                label: OFFICIAL_BASES[key].label,
                hint: `${baseCounts[key]} cadastrados · ${OFFICIAL_BASES[key].description}`,
              }))}
            />
          </Field>
        ) : null}

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
    </Drawer>
  );
}

function EditFieldDrawer({
  field,
  onClose,
}: {
  field: BuilderField | null;
  onClose: () => void;
}) {
  const [state, formAction, isPending] = useActionState(
    updateTemplateField,
    INITIAL_TEMPLATE_STATE,
  );

  return (
    <Drawer
      open={field !== null}
      onClose={onClose}
      title={field ? `Editar “${field.label}”` : ""}
      description="O tipo do bloco não muda: trocá-lo mudaria o significado do que já foi gerado. Para mudar o tipo, remova e adicione outro."
      width="lg"
    >
      {field ? (
        <form action={formAction} className="space-y-5" key={field.id}>
          <input type="hidden" name="fieldId" value={field.id} />
          <Mensagem status={state.status} message={state.message} />

          <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
            {origemDoBloco(field)}
          </div>

          <Field label="Rótulo" htmlFor="edit-label" required>
            <Input
              id="edit-label"
              name="label"
              maxLength={60}
              required
              defaultValue={field.label}
            />
          </Field>

          <Field label="Texto de ajuda" htmlFor="edit-hint">
            <Input
              id="edit-hint"
              name="hint"
              maxLength={200}
              defaultValue={field.hint ?? ""}
            />
          </Field>

          {field.fieldType === "text" ? (
            <Field label="Exemplo dentro do campo" htmlFor="edit-placeholder">
              <Input
                id="edit-placeholder"
                name="placeholder"
                maxLength={80}
                defaultValue={field.placeholder ?? ""}
              />
            </Field>
          ) : null}

          {field.fieldType === "select" ? (
            <Field
              label="Opções"
              htmlFor="edit-options"
              required
              hint="Uma por linha. Use `valor | Rótulo`."
            >
              <Textarea
                id="edit-options"
                name="options"
                rows={5}
                defaultValue={(field.options ?? [])
                  .map((option) =>
                    option.label && option.label !== option.value
                      ? `${option.value} | ${option.label}`
                      : option.value,
                  )
                  .join("\n")}
              />
            </Field>
          ) : null}

          <div className="flex gap-2">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Salvando…" : "Salvar bloco"}
            </Button>
            <Button type="button" variant="ghost" onClick={onClose}>
              Fechar
            </Button>
          </div>
        </form>
      ) : null}
    </Drawer>
  );
}

function IdentityDrawer({
  open,
  template,
  onClose,
}: {
  open: boolean;
  template: BuilderTemplate;
  onClose: () => void;
}) {
  const [state, formAction, isPending] = useActionState(
    updateTemplate,
    INITIAL_TEMPLATE_STATE,
  );

  return (
    <Drawer open={open} onClose={onClose} title="Nome, descrição e separador">
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="templateId" value={template.id} />
        <Mensagem status={state.status} message={state.message} />

        <Field label="Nome do modelo" htmlFor="identity-name" required>
          <Input
            id="identity-name"
            name="name"
            maxLength={80}
            required
            defaultValue={template.name}
          />
        </Field>

        <Field
          label="Descrição"
          htmlFor="identity-description"
          hint="É o que evita alguém escolher o modelo errado no gerador."
        >
          <Input
            id="identity-description"
            name="description"
            maxLength={200}
            defaultValue={template.description ?? ""}
          />
        </Field>

        <Field
          label="Separador entre os blocos"
          htmlFor="identity-separator"
          hint="Um caractere só. O padrão é o hífen."
        >
          <Input
            id="identity-separator"
            name="blockSeparator"
            maxLength={1}
            className="w-20 text-center font-mono"
            defaultValue={template.blockSeparator}
          />
        </Field>

        <Button type="submit" disabled={isPending}>
          {isPending ? "Salvando…" : "Salvar"}
        </Button>
      </form>
    </Drawer>
  );
}
