"use client";

import { useEffect, useMemo, useState } from "react";

import { TemplateField, type FormField } from "./template-field";
import { Button } from "@/components/ui/button";
import {
  OFFICIAL_BASES,
  isBaseKey,
  type BaseKey,
  type BaseOptions,
} from "@/lib/modules/bases/registry";
import {
  buildName,
  describeTemplateFormat,
  type FieldValues,
} from "@/lib/modules/name-generator/generate";
import {
  addRecentName,
  clearRecentNames,
  readRecentNames,
  type RecentName,
} from "@/lib/modules/name-generator/recent-names";

export type FormTemplate = {
  id: string;
  name: string;
  description: string | null;
  blockSeparator: string;
  fields: FormField[];
};

/** Anos oferecidos no seletor de mês/ano: do ano passado até daqui a 3 anos. */
function buildYearOptions(): number[] {
  const currentYear = new Date().getFullYear();
  return Array.from({ length: 5 }, (_, index) => currentYear - 1 + index);
}

/**
 * Monta um nome a partir de um modelo.
 *
 * Recebe UM modelo, não a lista: a escolha do modelo virou a tela anterior, com
 * os modelos em cartões. Enquanto era um dropdown no topo deste formulário, o
 * primeiro modelo da lista vinha escolhido por padrão — e quem entrava
 * preenchia o formulário errado sem notar que havia outros.
 */
export function NameGeneratorForm({
  template,
  baseOptions,
}: {
  template: FormTemplate;
  baseOptions: BaseOptions;
}) {
  const [values, setValues] = useState<FieldValues>({});
  const [recent, setRecent] = useState<RecentName[]>([]);
  const [copiedName, setCopiedName] = useState<string | null>(null);

  const years = useMemo(buildYearOptions, []);

  // `sessionStorage` só existe no navegador: lemos depois da montagem para não
  // divergir do HTML renderizado no servidor.
  useEffect(() => {
    setRecent(readRecentNames());
  }, []);

  const result = useMemo(
    () => buildName(template.fields, values, template.blockSeparator),
    [template, values],
  );

  const formatHint = useMemo(
    () => describeTemplateFormat(template.fields, template.blockSeparator),
    [template],
  );

  /**
   * Para cada campo de base, qual campo do modelo é o "pai" dele.
   *
   * A hierarquia (divisão → BU → produto) é declarada no registro de bases, não
   * aqui: este mapa só descobre se o modelo em questão TEM o campo pai. Um
   * modelo que pede produto sem pedir BU continua listando todos os produtos,
   * em vez de travar num filtro impossível de satisfazer.
   */
  const camposPorBase = useMemo(() => {
    const mapa = new Map<BaseKey, FormField>();
    for (const field of template.fields) {
      if (field.fieldType === "official_base" && isBaseKey(field.sourceKey)) {
        if (!mapa.has(field.sourceKey)) mapa.set(field.sourceKey, field);
      }
    }
    return mapa;
  }, [template]);

  function parentValueOf(field: FormField): string | null {
    if (field.fieldType !== "official_base" || !isBaseKey(field.sourceKey)) {
      return null;
    }
    const parentKey = OFFICIAL_BASES[field.sourceKey].parentKey;
    if (!parentKey) return null;

    const campoPai = camposPorBase.get(parentKey);
    if (!campoPai) return null;

    return values[campoPai.id] ?? "";
  }

  /** O nome do item escolhido no campo pai — usado para rotular o grupo. */
  function parentLabelOf(field: FormField): string | null {
    if (field.fieldType !== "official_base" || !isBaseKey(field.sourceKey)) {
      return null;
    }
    const parentKey = OFFICIAL_BASES[field.sourceKey].parentKey;
    if (!parentKey) return null;

    const escolhido = parentValueOf(field);
    if (!escolhido) return null;

    return (
      baseOptions[parentKey].find((option) => option.value === escolhido)
        ?.label ?? null
    );
  }

  const isUntouched = Object.values(values).every((value) => !value?.trim());

  function setFieldValue(fieldId: string, value: string) {
    setValues((current) => {
      const proximo = { ...current, [fieldId]: value };

      // Trocar a divisão invalida a BU escolhida, que invalida o produto. Sem
      // limpar em cascata, o nome sairia com uma BU que não pertence à divisão
      // selecionada — errado, e com cara de certo.
      const campo = template.fields.find((item) => item.id === fieldId);
      if (campo?.fieldType === "official_base" && isBaseKey(campo.sourceKey)) {
        for (const filho of template.fields) {
          if (
            filho.fieldType === "official_base" &&
            isBaseKey(filho.sourceKey) &&
            OFFICIAL_BASES[filho.sourceKey].parentKey === campo.sourceKey
          ) {
            proximo[filho.id] = "";
          }
        }
      }

      return proximo;
    });
  }

  async function copyToClipboard(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedName(value);
      window.setTimeout(
        () => setCopiedName((current) => (current === value ? null : current)),
        2000,
      );
      return true;
    } catch {
      return false;
    }
  }

  /** Copiar é o gesto que significa "usei este nome" — por isso guarda na lista. */
  async function handleCopyGenerated() {
    if (!result.ok) return;
    await copyToClipboard(result.name);
    setRecent(
      addRecentName({ name: result.name, templateName: template.name }),
    );
  }

  function handleClearRecent() {
    clearRecentNames();
    setRecent([]);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-slate-50 px-3 py-2">
        <span className="text-xs text-slate-500">Formato: </span>
        <code className="font-mono text-xs text-slate-700">{formatHint}</code>
      </div>

      <div className="space-y-4">
        {template.fields.map((field) => (
          <TemplateField
            key={field.id}
            field={field}
            value={values[field.id] ?? ""}
            onChange={(value) => setFieldValue(field.id, value)}
            baseOptions={
              field.fieldType === "official_base" && isBaseKey(field.sourceKey)
                ? baseOptions[field.sourceKey]
                : []
            }
            parentValue={parentValueOf(field)}
            parentLabel={parentLabelOf(field)}
            years={years}
          />
        ))}
      </div>

      {/* Prévia ao vivo */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          Resultado
        </p>

        {result.ok ? (
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <code className="min-w-0 flex-1 break-all font-mono text-sm font-medium text-slate-900">
              {result.name}
            </code>
            <Button
              type="button"
              variant="primary"
              onClick={handleCopyGenerated}
            >
              {copiedName === result.name ? "Copiado ✓" : "Copiar"}
            </Button>
          </div>
        ) : (
          <p className="mt-2 text-sm text-slate-500">
            {isUntouched
              ? "Preencha os campos acima para ver o nome padronizado."
              : result.error}
          </p>
        )}
      </div>

      {/* Nomes recentes — só no navegador, some ao sair */}
      {recent.length > 0 ? (
        <div className="border-t border-slate-200 pt-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-sm font-medium text-slate-800">
              Copiados nesta sessão
            </h3>
            <button
              type="button"
              onClick={handleClearRecent}
              className="text-xs font-medium text-slate-500 hover:text-slate-900"
            >
              Limpar lista
            </button>
          </div>
          <p className="mt-0.5 text-xs text-slate-500">
            Ficam só no seu navegador e somem quando você sai da plataforma.
          </p>

          <ul className="mt-3 space-y-1.5">
            {recent.map((item) => (
              <li
                key={item.name}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2"
              >
                <span className="min-w-0">
                  <code className="block break-all font-mono text-sm text-slate-800">
                    {item.name}
                  </code>
                  <span className="text-xs text-slate-500">
                    {item.templateName}
                  </span>
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => copyToClipboard(item.name)}
                >
                  {copiedName === item.name ? "Copiado ✓" : "Copiar"}
                </Button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
