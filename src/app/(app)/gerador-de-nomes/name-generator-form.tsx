"use client";

import { useEffect, useMemo, useState } from "react";

import { TemplateField, type FormField } from "./template-field";
import { Button } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/field";
import {
  buildName,
  describeTemplateFormat,
  type FieldValues,
} from "@/lib/modules/name-generator/generate";
import type { BusinessUnitOption } from "@/lib/modules/name-generator/queries";
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

export function NameGeneratorForm({
  templates,
  businessUnits,
}: {
  templates: FormTemplate[];
  businessUnits: BusinessUnitOption[];
}) {
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? "");
  const [values, setValues] = useState<FieldValues>({});
  const [recent, setRecent] = useState<RecentName[]>([]);
  const [copiedName, setCopiedName] = useState<string | null>(null);

  const template = useMemo(
    () => templates.find((item) => item.id === templateId) ?? templates[0],
    [templates, templateId],
  );

  const years = useMemo(buildYearOptions, []);

  // `sessionStorage` só existe no navegador: lemos depois da montagem para não
  // divergir do HTML renderizado no servidor.
  useEffect(() => {
    setRecent(readRecentNames());
  }, []);

  const result = useMemo(() => {
    if (!template) {
      return { ok: false as const, error: "Nenhum modelo disponível." };
    }
    return buildName(template.fields, values, template.blockSeparator);
  }, [template, values]);

  const formatHint = useMemo(
    () =>
      template
        ? describeTemplateFormat(template.fields, template.blockSeparator)
        : "",
    [template],
  );

  // A pessoa ainda não preencheu nada: mostramos orientação, não erro.
  const isUntouched = Object.values(values).every((value) => !value?.trim());

  function handleTemplateChange(nextId: string) {
    setTemplateId(nextId);
    // Campos de modelos diferentes não se correspondem — recomeçamos limpo.
    setValues({});
  }

  function setFieldValue(fieldId: string, value: string) {
    setValues((current) => ({ ...current, [fieldId]: value }));
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
    if (!result.ok || !template) return;
    await copyToClipboard(result.name);
    setRecent(
      addRecentName({ name: result.name, templateName: template.name }),
    );
  }

  function handleClearRecent() {
    clearRecentNames();
    setRecent([]);
  }

  if (!template) {
    return (
      <p className="text-sm text-slate-500">
        Nenhum modelo de nomenclatura disponível. Um administrador precisa
        cadastrar um em Parâmetros → Nomenclaturas.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {templates.length > 1 ? (
        <Field
          label="O que você quer nomear?"
          htmlFor="modelo"
          hint={template.description ?? undefined}
        >
          <Select
            id="modelo"
            value={templateId}
            onChange={(event) => handleTemplateChange(event.target.value)}
          >
            {templates.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </Select>
        </Field>
      ) : (
        <p className="text-sm text-slate-500">{template.description}</p>
      )}

      <div className="rounded-lg bg-slate-50 px-3 py-2">
        <span className="text-xs text-slate-500">Formato: </span>
        <code className="font-mono text-xs text-slate-700">{formatHint}</code>
      </div>

      <div className="space-y-5">
        {template.fields.map((field) => (
          <TemplateField
            key={field.id}
            field={field}
            value={values[field.id] ?? ""}
            onChange={(value) => setFieldValue(field.id, value)}
            businessUnits={businessUnits}
            years={years}
          />
        ))}
      </div>

      {/* Prévia ao vivo */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
        <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
          Resultado
        </p>

        {result.ok ? (
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <code className="min-w-0 flex-1 break-all font-mono text-sm font-medium text-slate-900">
              {result.name}
            </code>
            <Button type="button" onClick={handleCopyGenerated}>
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
                  <span className="text-xs text-slate-400">
                    {item.templateName}
                  </span>
                </span>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
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
