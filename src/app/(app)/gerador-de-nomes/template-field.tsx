"use client";

import { useState } from "react";

import { Field, Input } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { formatMonthYear } from "@/lib/modules/name-generator/generate";
import {
  OFFICIAL_BASES,
  isBaseKey,
  type BaseOption,
} from "@/lib/modules/bases/registry";
import type { FieldType, SelectOption } from "@/lib/db/schema";

export type FormField = {
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

const MONTHS = [
  { value: "1", label: "Janeiro" },
  { value: "2", label: "Fevereiro" },
  { value: "3", label: "Março" },
  { value: "4", label: "Abril" },
  { value: "5", label: "Maio" },
  { value: "6", label: "Junho" },
  { value: "7", label: "Julho" },
  { value: "8", label: "Agosto" },
  { value: "9", label: "Setembro" },
  { value: "10", label: "Outubro" },
  { value: "11", label: "Novembro" },
  { value: "12", label: "Dezembro" },
];

/**
 * Mês e ano, em dois seletores.
 *
 * A escolha parcial (só o mês, ou só o ano) fica guardada aqui dentro, e não no
 * valor do formulário. Sem isso, escolher o mês primeiro não teria efeito algum
 * — o valor combinado só existe quando os dois estão preenchidos, e a escolha
 * anterior se perderia a cada seleção.
 */
function MonthYearField({
  field,
  inputId,
  onChange,
  years,
}: {
  field: FormField;
  inputId: string;
  onChange: (value: string) => void;
  years: number[];
}) {
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");

  function update(nextMonth: string, nextYear: string) {
    setMonth(nextMonth);
    setYear(nextYear);
    onChange(nextMonth && nextYear ? formatMonthYear(nextMonth, nextYear) : "");
  }

  return (
    <Field
      label={field.label}
      htmlFor={inputId}
      required={field.isRequired}
      hint={field.hint ?? "Resulta no formato MM_AAAA. Ex.: 11_2026"}
    >
      <div className="flex gap-2">
        <div className="min-w-0 flex-1">
          <Select
            id={inputId}
            value={month}
            onValueChange={(next) => update(next, year)}
            ariaLabel={`Mês — ${field.label}`}
            placeholder="Mês…"
            options={MONTHS}
          />
        </div>
        <div className="w-32 shrink-0">
          <Select
            value={year}
            onValueChange={(next) => update(month, next)}
            ariaLabel={`Ano — ${field.label}`}
            placeholder="Ano…"
            options={years.map((option) => ({
              value: String(option),
              label: String(option),
            }))}
          />
        </div>
      </div>
    </Field>
  );
}

/**
 * Renderiza um bloco do modelo conforme o tipo do campo.
 *
 * É esta função que faz o formulário ser dinâmico: cadastrar um modelo novo não
 * exige tocar em código de tela. E, desde que as bases viraram um registro, uma
 * base nova também não — ela chega aqui como `official_base` com outro
 * `sourceKey`.
 */
export function TemplateField({
  field,
  value,
  onChange,
  baseOptions,
  parentValue,
  years,
}: {
  field: FormField;
  value: string;
  onChange: (value: string) => void;
  /** Opções já carregadas da base deste campo. */
  baseOptions: BaseOption[];
  /**
   * Valor escolhido no campo da base PAI, quando o modelo tem um.
   *
   * `null` significa "o modelo não tem o campo pai" — e aí a lista não filtra.
   * Filtrar mesmo assim deixaria o campo vazio sem explicação: escolher produto
   * num modelo que não pede BU é legítimo.
   */
  parentValue: string | null;
  years: number[];
}) {
  const inputId = `campo-${field.id}`;

  switch (field.fieldType) {
    case "official_base": {
      const base = isBaseKey(field.sourceKey)
        ? OFFICIAL_BASES[field.sourceKey]
        : null;

      const opcoes =
        parentValue !== null
          ? baseOptions.filter((option) => option.parentValue === parentValue)
          : baseOptions;

      const paiEscolhido = parentValue !== null && parentValue !== "";

      return (
        <Field
          label={field.label}
          htmlFor={inputId}
          required={field.isRequired}
          hint={
            field.hint ??
            (base && parentValue !== null
              ? `Filtrado pelo campo acima. ${opcoes.length} ${opcoes.length === 1 ? "opção" : "opções"}.`
              : undefined)
          }
        >
          <Select
            id={inputId}
            value={value}
            onValueChange={onChange}
            placeholder={
              parentValue !== null && !paiEscolhido
                ? "Escolha o campo acima primeiro…"
                : "Selecione…"
            }
            // Quando a lista depende de outra escolha, ela é desabilitada em
            // vez de aparecer vazia: uma lista vazia parece defeito, um campo
            // desabilitado com essa frase explica o que fazer.
            disabled={parentValue !== null && !paiEscolhido}
            options={opcoes.map((option) => ({
              value: option.value,
              label: option.label,
              hint: option.hint,
            }))}
          />
        </Field>
      );
    }

    case "select":
      return (
        <Field
          label={field.label}
          htmlFor={inputId}
          required={field.isRequired}
          hint={field.hint ?? undefined}
        >
          <Select
            id={inputId}
            value={value}
            onValueChange={onChange}
            options={(field.options ?? []).map((option) => ({
              value: option.value,
              label: option.label,
            }))}
          />
        </Field>
      );

    case "month_year":
      return (
        <MonthYearField
          field={field}
          inputId={inputId}
          onChange={onChange}
          years={years}
        />
      );

    case "text":
    default:
      return (
        <Field
          label={field.label}
          htmlFor={inputId}
          required={field.isRequired}
          hint={field.hint ?? undefined}
        >
          <Input
            id={inputId}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={field.placeholder ?? undefined}
            maxLength={120}
            autoComplete="off"
          />
        </Field>
      );
  }
}
