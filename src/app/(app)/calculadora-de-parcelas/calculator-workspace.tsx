"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Check,
  Copy,
  Lock,
  RotateCcw,
  Sparkles,
  Info,
} from "lucide-react";

import {
  calculateInstallments,
  DEFAULT_PARCELAS_EXAMPLE,
  DEFAULT_PARCELAS_RATE,
  fmtBRL,
  fmtPct,
  generatePieceCopy,
  PARCELAS_STORAGE_KEY,
  type ParcelasState,
} from "@/lib/modules/calculadora-parcelas/math";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

export interface ProductOption {
  id: string;
  name: string;
  businessUnitLabel?: string | null;
}

export function CalculatorWorkspace({
  suggestedProducts = [],
}: {
  suggestedProducts?: ProductOption[];
}) {
  const [mounted, setMounted] = useState(false);
  const [product, setProduct] = useState<string>(DEFAULT_PARCELAS_EXAMPLE.product);
  const [priceInput, setPriceInput] = useState<string>(
    String(DEFAULT_PARCELAS_EXAMPLE.price),
  );
  const [nInput, setNInput] = useState<string>(
    String(DEFAULT_PARCELAS_EXAMPLE.n),
  );
  const [maxDisplayN, setMaxDisplayN] = useState<number>(24);
  const [copied, setCopied] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Carrega estado persistido do localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(PARCELAS_STORAGE_KEY);
      if (stored) {
        const parsed: Partial<ParcelasState> = JSON.parse(stored);
        if (parsed.product !== undefined) setProduct(parsed.product);
        if (parsed.price !== undefined) setPriceInput(String(parsed.price));
        if (parsed.n !== undefined) setNInput(String(parsed.n));
      }
    } catch {
      // Falha silenciosa em caso de restrição do navegador
    }
    setMounted(true);
  }, []);

  // Salva no localStorage a cada alteração
  useEffect(() => {
    if (!mounted) return;
    try {
      const stateToSave: ParcelasState = {
        product,
        price: Number(priceInput) || 0,
        n: Math.max(1, Math.min(36, Math.round(Number(nInput) || 1))),
        rate: DEFAULT_PARCELAS_RATE,
      };
      localStorage.setItem(PARCELAS_STORAGE_KEY, JSON.stringify(stateToSave));
    } catch {
      // Ignora erro de cota de storage
    }
  }, [product, priceInput, nInput, mounted]);

  const price = useMemo(() => Math.max(0, Number(priceInput) || 0), [priceInput]);
  const n = useMemo(
    () => Math.max(1, Math.min(36, Math.round(Number(nInput) || 1))),
    [nInput],
  );

  const calc = useMemo(
    () => calculateInstallments(n, price, DEFAULT_PARCELAS_RATE),
    [n, price],
  );

  const isExample = useMemo(
    () =>
      price === DEFAULT_PARCELAS_EXAMPLE.price &&
      n === DEFAULT_PARCELAS_EXAMPLE.n &&
      product === DEFAULT_PARCELAS_EXAMPLE.product,
    [price, n, product],
  );

  const pieceCopyText = useMemo(
    () =>
      generatePieceCopy({
        product,
        n,
        inst: calc.inst,
        price,
        total: calc.total,
      }),
    [product, n, calc.inst, price, calc.total],
  );

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 2400);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(pieceCopyText);
      setCopied(true);
      showToast("Texto copiado para a área de transferência!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast("Selecione o texto manualmente para copiar.");
    }
  };

  const handleResetExample = () => {
    setProduct(DEFAULT_PARCELAS_EXAMPLE.product);
    setPriceInput(String(DEFAULT_PARCELAS_EXAMPLE.price));
    setNInput(String(DEFAULT_PARCELAS_EXAMPLE.n));
    showToast("Exemplo padrão restaurado!");
  };

  const tableRows = useMemo(() => {
    const limit = Math.max(maxDisplayN, n);
    const rows = [];
    for (let k = 1; k <= limit; k++) {
      const res = calculateInstallments(k, price, DEFAULT_PARCELAS_RATE);
      rows.push({
        k,
        res,
        isSelected: k === n,
      });
    }
    return rows;
  }, [price, n, maxDisplayN]);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 pb-16">
      {/* Header com identidade MedCof */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
              Calculadora de parcelas
            </h1>
            {isExample && (
              <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-950/60 dark:text-amber-200">
                <Sparkles className="h-3 w-3" />
                Valores de exemplo — substitua pelos seus
              </span>
            )}
          </div>
          <p className="mt-1 max-w-3xl text-sm text-slate-500 dark:text-slate-400">
            Juros simples, igual à planilha do time: cada parcela recebe o valor
            dividido mais um acréscimo fixo sobre o preço à vista.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleResetExample}
            className="text-xs"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Restaurar exemplo
          </Button>
        </div>
      </div>

      {/* Grid Principal: Entradas & Tabela à esquerda, Ficha à direita */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
        {/* Coluna Esquerda (Formulário + Tabela) */}
        <div className="space-y-6 lg:col-span-7 xl:col-span-8">
          {/* Bloco de Entradas e Cálculo Rápido */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Informações
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Preencha o preço à vista e o número de parcelas. A taxa por parcela é
              fixa pelo padrão corporativo.
            </p>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Produto (opcional) */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Produto (opcional)
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    list="product-suggestions"
                    value={product}
                    onChange={(e) => setProduct(e.target.value)}
                    placeholder="Ex.: Extensivo TED 2027"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                  {suggestedProducts.length > 0 && (
                    <datalist id="product-suggestions">
                      {suggestedProducts.map((p) => (
                        <option
                          key={p.id}
                          value={p.name}
                          label={p.businessUnitLabel ?? undefined}
                        />
                      ))}
                    </datalist>
                  )}
                </div>
              </div>

              {/* Valor à vista */}
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Valor à vista
                </label>
                <div className="relative mt-1">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={priceInput}
                    onChange={(e) => setPriceInput(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-3 pr-10 text-right font-mono text-sm font-semibold text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                  <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-xs font-bold text-slate-400">
                    R$
                  </span>
                </div>
              </div>

              {/* Número de parcelas */}
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Número de parcelas
                </label>
                <div className="relative mt-1">
                  <input
                    type="number"
                    min="1"
                    max="36"
                    step="1"
                    value={nInput}
                    onChange={(e) => setNInput(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-3 pr-8 text-right font-mono text-sm font-semibold text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                  <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-xs font-bold text-slate-400">
                    x
                  </span>
                </div>
              </div>

              {/* Taxa de juros padrão (fixa) */}
              <div className="sm:col-span-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                    Taxa de juros padrão (fixa MedCof)
                  </label>
                  <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                    <Lock className="h-3 w-3" />
                    Padrão corporativo Grupo MedCof
                  </span>
                </div>
                <div className="relative mt-1">
                  <input
                    type="text"
                    readOnly
                    disabled
                    value={fmtPct(DEFAULT_PARCELAS_RATE)}
                    className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 py-2 pl-3 pr-16 text-right font-mono text-sm font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400"
                  />
                  <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-xs font-medium text-slate-400">
                    /parc.
                  </span>
                </div>
              </div>
            </div>

            {/* Painel com os 3 cards de cálculos intermediários */}
            <div className="mt-5 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-900/60">
                <span className="block text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  Divisão base
                </span>
                <span className="mt-1 block font-mono text-base font-bold text-slate-900 dark:text-white">
                  {fmtBRL(calc.base)}
                </span>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-900/60">
                <span className="block text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  Acréscimo fixo por parcela
                </span>
                <span className="mt-1 block font-mono text-base font-bold text-slate-900 dark:text-white">
                  {fmtBRL(calc.add)}
                </span>
              </div>

              <div className="rounded-xl border border-brand-100 bg-brand-50/40 p-3 dark:border-brand-900/40 dark:bg-brand-950/20">
                <span className="block text-[11px] font-medium text-brand-700 dark:text-brand-300">
                  Valor final da parcela
                </span>
                <span className="mt-1 block font-mono text-base font-bold text-brand-900 dark:text-brand-100">
                  {fmtBRL(calc.inst)}
                </span>
              </div>
            </div>
          </div>

          {/* Bloco Tabela de Todas as Opções */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                  Todas as opções
                </h2>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  Clique numa linha para levar esse número de parcelas para a ficha.
                  Em 1x não há juros.
                </p>
              </div>

              {/* Botões de limite de visualização */}
              <div className="flex items-center gap-1">
                {[12, 24, 36].map((limit) => (
                  <button
                    key={limit}
                    type="button"
                    onClick={() => setMaxDisplayN(limit)}
                    className={cn(
                      "rounded-lg px-2.5 py-1 text-xs font-medium transition-colors",
                      maxDisplayN === limit
                        ? "bg-brand-600 text-white font-semibold"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300",
                    )}
                  >
                    Até {limit}x
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[480px] border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 dark:border-slate-800">
                    <th className="py-2.5 pl-2 font-semibold uppercase tracking-wider">
                      Parcelas
                    </th>
                    <th className="py-2.5 text-right font-semibold uppercase tracking-wider">
                      Valor da parcela
                    </th>
                    <th className="py-2.5 text-right font-semibold uppercase tracking-wider">
                      Total a prazo
                    </th>
                    <th className="py-2.5 pr-2 text-right font-semibold uppercase tracking-wider">
                      Juros totais
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
                  {tableRows.map(({ k, res, isSelected }) => (
                    <tr
                      key={k}
                      onClick={() => setNInput(String(k))}
                      className={cn(
                        "cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-900/60",
                        isSelected
                          ? "bg-brand-50/80 font-bold text-brand-950 dark:bg-brand-950/40 dark:text-brand-100"
                          : "text-slate-700 dark:text-slate-300",
                      )}
                    >
                      <td className="py-2.5 pl-2">
                        <span className="font-sans font-medium">{k}x</span>
                        {k === 1 ? (
                          <span className="ml-2 inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 font-sans text-[10px] font-semibold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                            sem juros
                          </span>
                        ) : isSelected ? (
                          <span className="ml-2 inline-flex items-center rounded-full bg-brand-200/80 px-2 py-0.5 font-sans text-[10px] font-bold text-brand-900 dark:bg-brand-900 dark:text-brand-200">
                            selecionada
                          </span>
                        ) : null}
                      </td>
                      <td className="py-2.5 text-right font-semibold">
                        {fmtBRL(res.inst)}
                      </td>
                      <td className="py-2.5 text-right text-slate-600 dark:text-slate-400">
                        {fmtBRL(res.total)}
                      </td>
                      <td className="py-2.5 pr-2 text-right">
                        {res.juros > 0 ? (
                          <span className="text-brand-600 dark:text-brand-400">
                            {fmtBRL(res.juros)}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Coluna Direita (Ficha da Oferta / Ticket) */}
        <div className="lg:col-span-5 xl:col-span-4">
          <div className="sticky top-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md dark:border-slate-800 dark:bg-slate-950">
            {/* Cabeçalho do Ticket em Vermelho MedCof */}
            <div className="bg-brand-600 p-5 text-white dark:bg-brand-700">
              <div className="truncate text-xs font-semibold uppercase tracking-wider text-brand-200">
                {product.trim() || "Oferta MedCof"}
              </div>
              <div className="mt-2 flex items-baseline gap-1.5 font-mono">
                <span className="text-2xl font-bold text-brand-100">{n}x</span>
                <span className="text-3xl font-black tracking-tight">
                  {fmtBRL(calc.inst)}
                </span>
              </div>
              <div className="mt-2 text-xs text-brand-100">
                {n === 1 ? (
                  <span className="font-bold underline decoration-brand-300">
                    sem juros
                  </span>
                ) : (
                  <>
                    taxa de{" "}
                    <b className="text-white">
                      {fmtPct(DEFAULT_PARCELAS_RATE)}
                    </b>{" "}
                    por parcela
                  </>
                )}{" "}
                · ou <b className="text-white">{fmtBRL(price)}</b> à vista
              </div>
            </div>

            {/* Linhas de Conferência dos Valores */}
            <div className="space-y-2.5 p-5 text-xs">
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                <span>Valor à vista</span>
                <span className="font-mono font-medium text-slate-900 dark:text-white">
                  {fmtBRL(price)}
                </span>
              </div>

              <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                <span>Taxa por parcela</span>
                <span className="font-mono font-medium text-slate-900 dark:text-white">
                  {n === 1 ? "—" : fmtPct(DEFAULT_PARCELAS_RATE)}
                </span>
              </div>

              <div className="border-t border-slate-100 pt-2.5 dark:border-slate-800">
                <div className="flex items-center justify-between font-semibold text-slate-900 dark:text-white">
                  <span>Valor total a prazo</span>
                  <span className="font-mono text-sm">{fmtBRL(calc.total)}</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-brand-600 dark:text-brand-400">
                <span className="font-medium">Juros totais pagos</span>
                <span className="font-mono font-bold">{fmtBRL(calc.juros)}</span>
              </div>
            </div>

            {/* Caixa de Texto para a Peça / Criativo */}
            <div className="border-t border-dashed border-slate-200 bg-slate-50/70 p-5 dark:border-slate-800 dark:bg-slate-900/40">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Texto para a peça
                </span>
                <span className="text-[10px] text-slate-400">
                  Pronto para anúncios e copies
                </span>
              </div>

              <div className="mt-2 rounded-xl border-l-4 border-brand-500 bg-white p-3 font-mono text-xs leading-relaxed text-slate-800 shadow-xs dark:bg-slate-950 dark:text-slate-200">
                <pre className="whitespace-pre-line font-sans">{pieceCopyText}</pre>
              </div>

              <div className="mt-3">
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleCopy}
                  className="w-full text-xs font-semibold"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4" />
                      Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copiar texto
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Explicação da fórmula no rodapé */}
      <div className="flex items-start gap-2 rounded-xl border border-slate-200/80 bg-slate-50 p-4 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-400">
        <Info className="h-4 w-4 shrink-0 text-slate-400 mt-0.5" />
        <p>
          <strong>Fórmula (juros simples):</strong> divisão base = valor à vista ÷
          parcelas; acréscimo fixo = valor à vista × taxa ({fmtPct(DEFAULT_PARCELAS_RATE)} só
          acima de 1x); parcela = divisão base + acréscimo. Total a prazo =
          parcela × parcelas. Valores arredondados para centavos.
        </p>
      </div>

      {/* Toast Flutuante de Confirmação */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-medium text-white shadow-lg dark:bg-white dark:text-slate-900">
            {toastMessage}
          </div>
        </div>
      )}
    </div>
  );
}
