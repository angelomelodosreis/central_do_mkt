"use client";

import { useState } from "react";

import { Field, Input } from "@/components/ui/field";
import { Select, type SelectGroup } from "@/components/ui/select";
import { formatDateBlock } from "@/lib/modules/name-generator/generate";
import {
  OFFICIAL_BASES,
  isBaseKey,
  type BaseOption,
} from "@/lib/modules/bases/registry";
import type { DateFormat, FieldType, SelectOption } from "@/lib/db/schema";

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
  dateFormat: DateFormat | null;
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
 * Quantos dias o mês escolhido tem.
 *
 * Oferecer sempre 31 deixaria escolher 31 de fevereiro — e o nome sairia com
 * uma data que não existe, sem nada reclamar, porque o gerador só confere o
 * formato.
 */
function diasDoMes(month: string, year: string): number {
  const mes = Number(month);
  const ano = Number(year);
  if (!mes) return 31;
  // Sem o ano ainda, 29 é o teto seguro para fevereiro: não inventa o dia 30.
  if (!ano) return mes === 2 ? 29 : [4, 6, 9, 11].includes(mes) ? 30 : 31;
  return new Date(ano, mes, 0).getDate();
}

/**
 * Data, em dois ou três seletores conforme o formato do bloco.
 *
 * A escolha parcial fica guardada aqui dentro, e não no valor do formulário.
 * Sem isso, escolher o mês primeiro não teria efeito algum — o valor combinado
 * só existe quando as partes estão preenchidas, e a escolha anterior se
 * perderia a cada seleção.
 */
function DateField({
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
  const formato: DateFormat = field.dateFormat ?? "month_year";
  const pedeDia = formato === "day_month_year";

  const [dia, setDia] = useState("");
  const [mes, setMes] = useState("");
  const [ano, setAno] = useState("");

  function update(nextDia: string, nextMes: string, nextAno: string) {
    // O dia escolhido pode deixar de existir ao trocar o mês (31 → fevereiro).
    // Limpar é mais honesto do que gravar uma data impossível em silêncio.
    const teto = diasDoMes(nextMes, nextAno);
    const diaValido = Number(nextDia) > teto ? "" : nextDia;

    setDia(diaValido);
    setMes(nextMes);
    setAno(nextAno);

    const completo = pedeDia
      ? diaValido && nextMes && nextAno
      : nextMes && nextAno;

    onChange(
      completo
        ? formatDateBlock(
            { day: diaValido, month: nextMes, year: nextAno },
            formato,
          )
        : "",
    );
  }

  const dias = Array.from({ length: diasDoMes(mes, ano) }, (_, indice) => ({
    value: String(indice + 1),
    label: String(indice + 1),
  }));

  return (
    <Field
      label={field.label}
      htmlFor={inputId}
      required={field.isRequired}
      hint={
        field.hint ??
        (pedeDia
          ? "Resulta no formato DD_MM_AAAA. Ex.: 05_11_2026"
          : "Resulta no formato MM_AAAA. Ex.: 11_2026")
      }
    >
      <div className="flex gap-2">
        {pedeDia ? (
          <div className="w-24 shrink-0">
            <Select
              id={inputId}
              value={dia}
              onValueChange={(next) => update(next, mes, ano)}
              ariaLabel={`Dia — ${field.label}`}
              placeholder="Dia…"
              options={dias}
            />
          </div>
        ) : null}
        <div className="min-w-0 flex-1">
          <Select
            id={pedeDia ? undefined : inputId}
            value={mes}
            onValueChange={(next) => update(dia, next, ano)}
            ariaLabel={`Mês — ${field.label}`}
            placeholder="Mês…"
            options={MONTHS}
          />
        </div>
        <div className="w-28 shrink-0">
          <Select
            value={ano}
            onValueChange={(next) => update(dia, mes, next)}
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
  parentLabel,
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
  /** Rótulo do item escolhido no campo pai, para nomear o grupo. */
  parentLabel: string | null;
  years: number[];
}) {
  const inputId = `campo-${field.id}`;

  switch (field.fieldType) {
    case "official_base": {
      const base = isBaseKey(field.sourceKey)
        ? OFFICIAL_BASES[field.sourceKey]
        : null;

      const paiEscolhido = parentValue !== null && parentValue !== "";

      const doPai = paiEscolhido
        ? baseOptions.filter((option) => option.parentValue === parentValue)
        : [];
      const osOutros = paiEscolhido
        ? baseOptions.filter((option) => option.parentValue !== parentValue)
        : baseOptions;

      const paraOpcao = (option: BaseOption) => ({
        value: option.value,
        label: option.label,
        hint: option.hint,
      });

      /**
       * A hierarquia FILTRA — mas não cria beco sem saída.
       *
       * Escolhida a BU, a lista mostra só os produtos dela: é o comportamento
       * correto, e o que impede alguém montar um nome com o produto de outra
       * BU. Mostrar todos os produtos seria oferecer o erro.
       *
       * A exceção é a BU que ainda não tem NENHUM produto vinculado. Aí filtrar
       * deixaria um campo obrigatório sem nenhuma opção e sem explicação — foi
       * o que travou o cadastro na primeira vez. Nesse caso a lista se abre
       * inteira e a dica diz por quê, para o trabalho não parar enquanto o
       * cadastro é completado.
       */
      const semVinculo = paiEscolhido && doPai.length === 0;

      const opcoesPlanas = paiEscolhido
        ? (semVinculo ? baseOptions : doPai).map(paraOpcao)
        : baseOptions.map(paraOpcao);

      const grupos: SelectGroup[] | undefined = undefined;

      const dica = (() => {
        if (field.hint) return field.hint;
        if (!paiEscolhido || !base?.parentKey) return undefined;
        if (doPai.length > 0) {
          return `${doPai.length} ${doPai.length === 1 ? "opção vinculada" : "opções vinculadas"} a ${parentLabel}.`;
        }
        return `Nenhum ${base.singular.toLowerCase()} vinculado a ${parentLabel} ainda — a lista mostra todos até o cadastro ser completado.`;
      })();

      return (
        <Field
          label={field.label}
          htmlFor={inputId}
          required={field.isRequired}
          hint={dica}
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
            // Só desabilita enquanto o campo pai está em branco: aí a ordem de
            // preenchimento é a informação útil. Uma vez escolhido, a lista
            // nunca fica vazia.
            disabled={parentValue !== null && !paiEscolhido}
            groups={grupos}
            options={opcoesPlanas}
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

    case "date":
      return (
        <DateField
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
