/**
 * Módulo de cálculos da Calculadora de Parcelas MedCof.
 *
 * Utiliza o modelo de juros simples idêntico à planilha oficial do time de Marketing:
 * - Em 1x (à vista): não há juros.
 * - Acima de 1x:
 *   - Divisão base = valor à vista ÷ parcelas
 *   - Acréscimo fixo por parcela = valor à vista × taxa de juros (taxa fixa MedCof de 1,67% por parcela)
 *   - Valor final da parcela = divisão base + acréscimo fixo
 *   - Valor total a prazo = valor final da parcela × número de parcelas
 *   - Juros totais pagos = valor total a prazo - valor à vista
 */

export const PARCELAS_STORAGE_KEY = "calc-parcelas-medcof-v1";
export const DEFAULT_PARCELAS_RATE = 1.67;

export interface ParcelasState {
  product: string;
  price: number;
  n: number;
  rate: number;
}

export const DEFAULT_PARCELAS_EXAMPLE: ParcelasState = {
  product: "",
  price: 15497,
  n: 24,
  rate: DEFAULT_PARCELAS_RATE,
};

export interface InstallmentCalculation {
  base: number;
  add: number;
  inst: number;
  total: number;
  juros: number;
}

/** Arredonda para 2 casas decimais (centavos exatos). */
export function round2(v: number): number {
  return Math.round((v + Number.EPSILON) * 100) / 100;
}

/** Formatação monetária BRL com 2 casas decimais (ex: "R$ 903,81"). */
export function fmtBRL(val: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val || 0);
}

/** Formatação percentual com até 2 casas (ex: "1,67%"). */
export function fmtPct(val: number): string {
  return (
    (val || 0).toLocaleString("pt-BR", {
      maximumFractionDigits: 2,
      minimumFractionDigits: Number.isInteger(val) ? 0 : 2,
    }) + "%"
  );
}

/**
 * Calcula os valores de uma parcela específica n.
 */
export function calculateInstallments(
  n: number,
  price: number,
  rate: number = DEFAULT_PARCELAS_RATE,
): InstallmentCalculation {
  const p = Math.max(0, Number(price) || 0);
  const t = Math.max(0, Number(rate) || 0) / 100;
  const parcelas = Math.max(1, Math.round(Number(n) || 1));

  const base = parcelas > 0 ? p / parcelas : 0;
  const add = parcelas > 1 ? p * t : 0;
  const inst = round2(base + add);
  const total = round2(inst * parcelas);
  const juros = Math.max(0, round2(total - p));

  return {
    base,
    add,
    inst,
    total,
    juros,
  };
}

/**
 * Gera o texto formatado para uso em criativos, peças e copies.
 */
export function generatePieceCopy(params: {
  product?: string;
  n: number;
  inst: number;
  price: number;
  total: number;
}): string {
  const { product, n, inst, price, total } = params;
  const nomeProduto = product?.trim();

  let txt = "";
  if (nomeProduto) {
    txt += `${nomeProduto}\n`;
  }
  txt += `${n}x de ${fmtBRL(inst)}\nou ${fmtBRL(price)} à vista`;

  if (n > 1) {
    txt += `\nTotal a prazo: ${fmtBRL(total)}`;
  }

  return txt;
}
