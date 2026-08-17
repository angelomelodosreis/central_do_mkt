import { toSnakeCase, validateListName } from "./slugify";
import type {
  FieldType,
  NamingTemplateField,
  SelectOption,
} from "@/lib/db/schema";

/**
 * Um campo do formulário, no formato mínimo de que a montagem do nome precisa.
 * Serve tanto para os campos vindos do banco quanto para a prévia no navegador.
 */
export type TemplateFieldInput = {
  id: string;
  position: number;
  fieldType: FieldType;
  label: string;
  isRequired: boolean;
  options: SelectOption[] | null;
};

/** Valores preenchidos no formulário, indexados pelo id do campo. */
export type FieldValues = Record<string, string>;

export type BuildResult =
  | { ok: true; name: string }
  | { ok: false; error: string; fieldId?: string };

/** Mês/ano é gravado como MM_AAAA (ex.: 11_2026), que ordena corretamente. */
export function formatMonthYear(month: string, year: string): string {
  const monthNumber = Number(month);
  const yearNumber = Number(year);
  if (!monthNumber || !yearNumber) return "";
  return `${String(monthNumber).padStart(2, "0")}_${yearNumber}`;
}

/**
 * Converte o valor cru de um campo no bloco correspondente do nome final.
 * Retorna `null` quando o valor não é utilizável.
 */
function normalizeFieldValue(
  field: TemplateFieldInput,
  rawValue: string,
): { ok: true; value: string } | { ok: false; error: string } {
  const value = (rawValue ?? "").trim();

  if (!value) {
    return {
      ok: false,
      error: `Preencha o campo "${field.label}".`,
    };
  }

  switch (field.fieldType) {
    case "business_unit":
    case "select":
      // Já vêm padronizados da origem (slug da BU ou valor da opção).
      return { ok: true, value: toSnakeCase(value) };

    case "month_year":
      // Chega no formato "MM_AAAA", montado pelo formulário.
      return /^\d{2}_\d{4}$/.test(value)
        ? { ok: true, value }
        : { ok: false, error: `Escolha o mês e o ano em "${field.label}".` };

    case "text": {
      const validation = validateListName(value);
      return validation.ok
        ? { ok: true, value: validation.value }
        : { ok: false, error: validation.error };
    }

    default:
      return { ok: false, error: "Tipo de campo desconhecido." };
  }
}

/**
 * Monta o nome final a partir do modelo e dos valores preenchidos.
 *
 * É uma função pura, usada tanto no navegador (prévia ao vivo) quanto na
 * validação — assim as duas nunca divergem.
 */
export function buildName(
  fields: TemplateFieldInput[],
  values: FieldValues,
  blockSeparator = "-",
): BuildResult {
  if (fields.length === 0) {
    return { ok: false, error: "Este modelo ainda não tem campos definidos." };
  }

  const blocks: string[] = [];
  const ordered = [...fields].sort((a, b) => a.position - b.position);

  for (const field of ordered) {
    const rawValue = values[field.id] ?? "";

    // Campo opcional em branco simplesmente não vira bloco.
    if (!field.isRequired && !rawValue.trim()) continue;

    const normalized = normalizeFieldValue(field, rawValue);
    if (!normalized.ok) {
      return { ok: false, error: normalized.error, fieldId: field.id };
    }
    blocks.push(normalized.value);
  }

  if (blocks.length === 0) {
    return { ok: false, error: "Preencha ao menos um campo." };
  }

  return { ok: true, name: blocks.join(blockSeparator) };
}

/**
 * Como cada tipo de bloco é representado no texto do formato.
 * Os tipos com forma fixa usam sempre o mesmo apelido, para o formato exibido
 * bater com o que está escrito na documentação de convenções.
 */
const FORMAT_PLACEHOLDERS: Partial<Record<FieldType, string>> = {
  business_unit: "bu",
  month_year: "mm_aaaa",
};

/**
 * Descreve o formato do modelo em texto, para exibir como referência.
 * Ex.: `bu-tipo_de_lista-nome_da_lista`
 */
export function describeTemplateFormat(
  fields: Array<Pick<NamingTemplateField, "label" | "fieldType" | "position">>,
  blockSeparator = "-",
): string {
  return [...fields]
    .sort((a, b) => a.position - b.position)
    .map(
      (field) =>
        FORMAT_PLACEHOLDERS[field.fieldType] ?? toSnakeCase(field.label),
    )
    .join(blockSeparator);
}
