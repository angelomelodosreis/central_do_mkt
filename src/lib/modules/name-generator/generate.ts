import { toSnakeCase, validateListName } from "./slugify";
import { OFFICIAL_BASES, isBaseKey } from "@/lib/modules/bases/registry";
import {
  DATE_FORMAT_PLACEHOLDERS,
  type DateFormat,
  type FieldType,
  type NamingTemplateField,
  type SelectOption,
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
  /** Qual base oficial alimenta o campo, quando `fieldType = official_base`. */
  sourceKey: string | null;
  /** Formato da data, quando `fieldType = date`. */
  dateFormat: DateFormat | null;
};

/** Valores preenchidos no formulário, indexados pelo id do campo. */
export type FieldValues = Record<string, string>;

export type BuildResult =
  { ok: true; name: string } | { ok: false; error: string; fieldId?: string };

/**
 * Monta o bloco de data no formato escolhido.
 *
 * Sempre com dois dígitos nos componentes menores (`05_11_2026`, e não
 * `5_11_2026`): sem o zero à esquerda, uma listagem ordenada alfabeticamente
 * põe o dia 10 antes do dia 5.
 */
export function formatDateBlock(
  { day, month, year }: { day?: string; month: string; year: string },
  format: DateFormat = "month_year",
): string {
  const monthNumber = Number(month);
  const yearNumber = Number(year);
  if (!monthNumber || !yearNumber) return "";

  const mes = String(monthNumber).padStart(2, "0");

  if (format === "day_month_year") {
    const dayNumber = Number(day);
    if (!dayNumber) return "";
    return `${String(dayNumber).padStart(2, "0")}_${mes}_${yearNumber}`;
  }

  return `${mes}_${yearNumber}`;
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
    case "official_base":
    case "select":
      // Já vêm padronizados da origem (identificador da base ou valor da
      // opção fixa).
      return { ok: true, value: toSnakeCase(value) };

    case "date": {
      // Chega montado pelo formulário, no formato do próprio campo.
      const esperado =
        field.dateFormat === "day_month_year"
          ? /^\d{2}_\d{2}_\d{4}$/
          : /^\d{2}_\d{4}$/;

      if (esperado.test(value)) return { ok: true, value };

      return {
        ok: false,
        error:
          field.dateFormat === "day_month_year"
            ? `Escolha o dia, o mês e o ano em "${field.label}".`
            : `Escolha o mês e o ano em "${field.label}".`,
      };
    }

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
const FORMAT_PLACEHOLDERS: Partial<Record<FieldType, string>> = {};

/**
 * Descreve o formato do modelo em texto, para exibir como referência.
 * Ex.: `bu-tipo_de_lista-nome_da_lista`
 */
export function describeTemplateFormat(
  fields: Array<
    Pick<
      NamingTemplateField,
      "label" | "fieldType" | "position" | "sourceKey" | "dateFormat"
    >
  >,
  blockSeparator = "-",
): string {
  return [...fields]
    .sort((a, b) => a.position - b.position)
    .map((field) => {
      // A base oficial tem apelido próprio (`bu`, `produto`), para o formato
      // exibido bater com o que está escrito na documentação de convenções.
      if (field.fieldType === "official_base" && isBaseKey(field.sourceKey)) {
        return OFFICIAL_BASES[field.sourceKey].formatPlaceholder;
      }
      if (field.fieldType === "date") {
        return DATE_FORMAT_PLACEHOLDERS[field.dateFormat ?? "month_year"];
      }
      return FORMAT_PLACEHOLDERS[field.fieldType] ?? toSnakeCase(field.label);
    })
    .join(blockSeparator);
}
