"use client";

import { useState } from "react";

import { Field, Input, Select } from "@/components/ui/field";
import { formatMonthYear } from "@/lib/modules/name-generator/generate";
import type { BusinessUnitOption } from "@/lib/modules/name-generator/queries";
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
    onChange(
      nextMonth && nextYear ? formatMonthYear(nextMonth, nextYear) : "",
    );
  }

  return (
    <Field
      label={field.label}
      htmlFor={inputId}
      required={field.isRequired}
      hint={field.hint ?? "Resulta no formato MM_AAAA. Ex.: 11_2026"}
    >
      <div className="flex gap-2">
        <Select
          id={inputId}
          value={month}
          onChange={(event) => update(event.target.value, year)}
          aria-label={`Mês — ${field.label}`}
        >
          <option value="">Mês…</option>
          {MONTHS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
        <Select
          value={year}
          onChange={(event) => update(month, event.target.value)}
          aria-label={`Ano — ${field.label}`}
          className="max-w-32"
        >
          <option value="">Ano…</option>
          {years.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </Select>
      </div>
    </Field>
  );
}

/**
 * Renderiza um bloco do modelo conforme o tipo do campo.
 *
 * É esta função que faz o formulário ser dinâmico: cadastrar um modelo novo na
 * administração não exige tocar em código de tela.
 */
export function TemplateField({
  field,
  value,
  onChange,
  businessUnits,
  years,
}: {
  field: FormField;
  value: string;
  onChange: (value: string) => void;
  businessUnits: BusinessUnitOption[];
  years: number[];
}) {
  const inputId = `campo-${field.id}`;

  switch (field.fieldType) {
    case "business_unit":
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
            onChange={(event) => onChange(event.target.value)}
          >
            <option value="">Selecione…</option>
            {businessUnits.map((unit) => (
              <option key={unit.slug} value={unit.slug}>
                {unit.label}
              </option>
            ))}
          </Select>
        </Field>
      );

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
            onChange={(event) => onChange(event.target.value)}
          >
            <option value="">Selecione…</option>
            {(field.options ?? []).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
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
