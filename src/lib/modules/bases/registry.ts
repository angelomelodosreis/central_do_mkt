/**
 * Registro das BASES OFICIAIS do sistema.
 *
 * Uma base oficial é uma lista administrada centralmente que outras partes da
 * ferramenta consomem em vez de manter cópia própria: Divisões, BUs e Produtos.
 *
 * Este arquivo é o único lugar que precisa mudar para acrescentar uma base
 * nova ao Gerador de Nomes. Antes, cada base era um TIPO de campo, o que
 * significava um `case` no formulário, outro na validação e outro na descrição
 * do formato — três lugares para esquecer um.
 */
export const BASE_KEYS = [
  "business_division",
  "business_unit",
  "product",
] as const;
export type BaseKey = (typeof BASE_KEYS)[number];

export type BaseDefinition = {
  key: BaseKey;
  label: string;
  /** Singular, para rótulos de campo. */
  singular: string;
  description: string;
  /**
   * Base da qual esta depende. Escolher a divisão filtra as BUs; escolher a BU
   * filtra os produtos.
   *
   * A dependência é declarada aqui, e não escrita em cada tela, porque é
   * propriedade do dado — quem monta o formulário não deveria precisar saber
   * que produto pertence a BU.
   */
  parentKey: BaseKey | null;
  /** Abreviação usada ao descrever o formato de um modelo. Ex.: `bu`. */
  formatPlaceholder: string;
};

export const OFFICIAL_BASES: Record<BaseKey, BaseDefinition> = {
  business_division: {
    key: "business_division",
    label: "Divisões de Negócio",
    singular: "Divisão de Negócio",
    description: "MedCof Especialidades, Formação Médica e Revalidação.",
    parentKey: null,
    formatPlaceholder: "divisao",
  },
  business_unit: {
    key: "business_unit",
    label: "Business Units",
    singular: "Business Unit",
    description: "As BUs cadastradas, sempre em dia com a base oficial.",
    parentKey: "business_division",
    formatPlaceholder: "bu",
  },
  product: {
    key: "product",
    label: "Produtos",
    singular: "Produto",
    description: "A base oficial de produtos, filtrada pela BU quando houver.",
    parentKey: "business_unit",
    formatPlaceholder: "produto",
  },
};

export function isBaseKey(value: string | null | undefined): value is BaseKey {
  return Boolean(value) && (BASE_KEYS as readonly string[]).includes(value!);
}

/** Uma opção de base, no formato que os seletores usam. */
export type BaseOption = {
  /** Identificador estável — é ele que entra no nome gerado. */
  value: string;
  label: string;
  /**
   * Slug do item PAI, quando a base depende de outra.
   *
   * Vai junto de cada opção (em vez de num mapa à parte) para o filtro
   * hierárquico ser uma comparação local no navegador, sem ida ao servidor a
   * cada escolha.
   */
  parentValue: string | null;
  /** Contexto exibido abaixo do rótulo. Ex.: a BU de um produto. */
  hint?: string;
};

export type BaseOptions = Record<BaseKey, BaseOption[]>;
