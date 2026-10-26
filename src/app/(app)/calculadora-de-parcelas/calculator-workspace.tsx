"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Check, Copy, RotateCcw } from "lucide-react";

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
      // Ignora erro de acesso ao storage
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
      // Ignora erro de cota
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
    }, 2200);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(pieceCopyText);
      setCopied(true);
      showToast("Texto copiado para a área de transferência!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast("Texto selecionado — use Ctrl+C");
    }
  };

  const handleResetExample = () => {
    setProduct(DEFAULT_PARCELAS_EXAMPLE.product);
    setPriceInput(String(DEFAULT_PARCELAS_EXAMPLE.price));
    setNInput(String(DEFAULT_PARCELAS_EXAMPLE.n));
    showToast("Exemplo restaurado");
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
    <div className="calc-container">
      {/* Estilos fiéis e escopados à calculadora do Claude Artifact */}
      <style jsx>{`
        .calc-container {
          max-width: 1120px;
          margin: 0 auto;
          color: #1d1d22;
          font-size: 15px;
          line-height: 1.5;
        }

        .calc-header {
          display: flex;
          flex-wrap: wrap;
          align-items: flex-end;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 24px;
        }

        .calc-brand {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          background: #ffffff;
          border: 1px solid #e6e4e6;
          border-radius: 10px;
          padding: 8px 14px;
          margin-bottom: 14px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
        }

        .calc-brand-text {
          font-weight: 700;
          font-size: 14px;
          letter-spacing: -0.01em;
          color: #1d1d22;
        }

        .calc-brand-sub {
          font-size: 11px;
          color: #5c5a62;
          margin-left: 2px;
        }

        .calc-tag {
          display: inline-block;
          font-size: 11px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          background: #fbefdf;
          color: #a2560b;
          padding: 3px 8px;
          border-radius: 4px;
          font-weight: 600;
          margin-bottom: 8px;
        }

        .calc-title {
          font-weight: 700;
          letter-spacing: -0.02em;
          font-size: clamp(26px, 4vw, 36px);
          line-height: 1.15;
          margin: 0;
          color: #1d1d22;
        }

        .calc-lede {
          color: #5c5a62;
          margin: 6px 0 0;
          max-width: 60ch;
          font-size: 14px;
          line-height: 1.5;
        }

        .calc-btn {
          border: 1px solid #e6e4e6;
          background: #ffffff;
          color: #1d1d22;
          padding: 8px 14px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          transition: all 0.15s ease;
        }
        .calc-btn:hover {
          border-color: #5c5a62;
          background: #f6f6f7;
        }

        .calc-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 360px;
          gap: 24px;
          align-items: start;
        }
        @media (max-width: 920px) {
          .calc-grid {
            grid-template-columns: minmax(0, 1fr);
          }
        }

        .calc-col {
          display: flex;
          flex-direction: column;
          gap: 20px;
          min-width: 0;
        }

        .calc-block {
          background: #ffffff;
          border: 1px solid #e6e4e6;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
        }
        .calc-block h2 {
          font-weight: 600;
          letter-spacing: -0.01em;
          font-size: 18px;
          margin: 0 0 4px;
          color: #1d1d22;
        }
        .calc-block .hint {
          color: #5c5a62;
          font-size: 13px;
          margin: 0 0 14px;
        }

        .calc-fields {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
          gap: 12px;
        }

        .calc-label {
          display: flex;
          flex-direction: column;
          gap: 4px;
          font-size: 13px;
          color: #5c5a62;
          font-weight: 500;
        }

        .calc-input {
          font: inherit;
          color: #1d1d22 !important;
          background: #f6f6f7 !important;
          border: 1px solid #e6e4e6 !important;
          border-radius: 8px;
          padding: 8px 10px;
          width: 100%;
          min-width: 0;
          font-size: 15px;
          transition: border-color 0.15s ease;
        }
        .calc-input:focus {
          border-color: #e5283a !important;
          outline: none;
          background: #ffffff !important;
        }
        .calc-input-number {
          font-size: 15px;
          text-align: right;
          font-variant-numeric: tabular-nums;
          font-family: inherit;
          font-weight: 600;
        }

        .calc-suffix {
          position: relative;
        }
        .calc-suffix input {
          padding-right: 68px !important;
        }
        .calc-suffix span {
          position: absolute;
          right: 10px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 13px;
          color: #5c5a62;
          font-weight: 600;
          pointer-events: none;
        }

        .calc-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 10px;
          margin-top: 16px;
        }
        .calc-cards div {
          background: #f6f6f7;
          border-radius: 8px;
          padding: 10px 12px;
          font-size: 12px;
          color: #5c5a62;
        }
        .calc-cards b {
          display: block;
          font-size: 16px;
          color: #1d1d22;
          font-weight: 600;
          font-variant-numeric: tabular-nums;
          margin-top: 2px;
        }

        .calc-tablewrap {
          overflow-x: auto;
        }
        .calc-table {
          border-collapse: collapse;
          width: 100%;
          min-width: 480px;
        }
        .calc-table th {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.07em;
          color: #5c5a62;
          font-weight: 600;
          text-align: left;
          padding: 8px 6px;
          border-bottom: 1px solid #e6e4e6;
        }
        .calc-table th.num,
        .calc-table td.num {
          text-align: right;
        }
        .calc-table td {
          padding: 7px 6px;
          border-bottom: 1px solid #e6e4e6;
          font-variant-numeric: tabular-nums;
          font-size: 14px;
          color: #1d1d22;
        }
        .calc-table tbody tr {
          cursor: pointer;
        }
        .calc-table tbody tr:hover td {
          background: #f6f6f7;
        }
        .calc-table tr.sel td {
          background: #fdebed !important;
          font-weight: 600;
        }
        .calc-pill {
          display: inline-block;
          font-size: 11px;
          font-weight: 600;
          padding: 2px 8px;
          border-radius: 999px;
          margin-left: 6px;
        }
        .calc-pill-free {
          background: #e5f4ec;
          color: #1d7a4f;
        }
        .calc-pill-sel {
          background: #e5283a;
          color: #ffffff;
        }

        .calc-ticket {
          position: sticky;
          top: 24px;
          background: #ffffff;
          border: 1px solid #e6e4e6;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.05);
        }
        @media (max-width: 920px) {
          .calc-ticket {
            position: static;
          }
        }
        .calc-ticket-head {
          padding: 22px 20px;
          background: #e5283a;
          color: #ffffff;
        }
        .calc-ticket-head .proc {
          font-size: 13px;
          color: #ffd6da;
          margin-bottom: 6px;
          overflow-wrap: anywhere;
          font-weight: 600;
        }
        .calc-ticket-head .price {
          font-weight: 800;
          letter-spacing: -0.02em;
          font-size: 40px;
          line-height: 1;
          font-variant-numeric: tabular-nums;
          color: #ffffff;
        }
        .calc-ticket-head .price small {
          font-size: 22px;
          font-weight: 700;
          margin-right: 6px;
        }
        .calc-ticket-head .price-sub {
          font-size: 13px;
          color: #ffd6da;
          margin-top: 10px;
        }
        .calc-ticket-head .price-sub b {
          color: #ffffff;
          font-weight: 600;
        }
        .calc-rows {
          padding: 16px 20px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .calc-row {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          font-size: 14px;
          color: #5c5a62;
        }
        .calc-row .v {
          font-variant-numeric: tabular-nums;
          white-space: nowrap;
          color: #1d1d22;
          font-weight: 500;
        }
        .calc-row.total {
          border-top: 1px solid #e6e4e6;
          padding-top: 8px;
          font-weight: 600;
          color: #1d1d22;
        }
        .calc-row.int .v {
          color: #e5283a;
          font-weight: 700;
        }
        .calc-copybox {
          border-top: 1px dashed #e6e4e6;
          padding: 16px 20px 20px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .calc-copybox h3 {
          margin: 0;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.07em;
          color: #5c5a62;
          font-weight: 600;
        }
        .calc-copytext {
          background: #f6f6f7;
          border-left: 3px solid #e5283a;
          border-radius: 6px;
          padding: 12px;
          font-size: 14px;
          line-height: 1.5;
          white-space: pre-line;
          color: #1d1d22;
          font-family: inherit;
        }
        .calc-btn-copy {
          background: #e5283a;
          border: 1px solid #e5283a;
          color: #ffffff;
          font-weight: 600;
          width: 100%;
          justify-content: center;
          padding: 10px 14px;
          border-radius: 8px;
          font-size: 14px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          transition: background-color 0.15s ease;
        }
        .calc-btn-copy:hover {
          background: #c41b2c;
          border-color: #c41b2c;
        }
        .calc-foot {
          color: #5c5a62;
          font-size: 12px;
          margin-top: 20px;
          max-width: 75ch;
          line-height: 1.5;
        }
        .calc-toast {
          position: fixed;
          left: 50%;
          bottom: calc(env(safe-area-inset-bottom, 0px) + 20px);
          transform: translateX(-50%);
          background: #1d1d22;
          color: #ffffff;
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 500;
          z-index: 9999;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
      `}</style>

      {/* Header com Logo e Restaurar Exemplo */}
      <header className="calc-header">
        <div>
          <div className="calc-brand">
            <Image
              src="/brand/medcof-mark.svg"
              alt="Grupo MedCof"
              width={26}
              height={30}
              className="h-6 w-auto"
            />
            <div>
              <span className="calc-brand-text">Grupo MedCof</span>
              <span className="calc-brand-sub">· Central do Marketing</span>
            </div>
          </div>

          <div>
            {isExample && (
              <span className="calc-tag">
                Valores de exemplo — substitua pelos seus
              </span>
            )}
            <h1 className="calc-title">Calculadora de parcelas</h1>
            <p className="calc-lede">
              Juros simples, igual à planilha do time: cada parcela recebe o valor
              dividido mais um acréscimo fixo sobre o preço à vista.
            </p>
          </div>
        </div>

        <button
          className="calc-btn"
          type="button"
          onClick={handleResetExample}
        >
          <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
          Restaurar exemplo
        </button>
      </header>

      {/* Grid: Formulário + Tabela à esquerda, Ticket à direita */}
      <div className="calc-grid">
        <div className="calc-col">
          {/* Seção de Informações */}
          <section className="calc-block">
            <h2>Informações</h2>
            <p className="hint">
              Preencha o preço à vista e o número de parcelas. A taxa por parcela é fixa.
            </p>

            <div className="calc-fields">
              {/* Produto (opcional) */}
              <label className="calc-label" style={{ gridColumn: "1 / -1" }}>
                Produto (opcional)
                <input
                  type="text"
                  list="product-suggestions"
                  value={product}
                  onChange={(e) => setProduct(e.target.value)}
                  placeholder="Ex.: Extensivo TED 2027"
                  className="calc-input"
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
              </label>

              {/* Valor à vista */}
              <label className="calc-label">
                Valor à vista
                <div className="calc-suffix">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={priceInput}
                    onChange={(e) => setPriceInput(e.target.value)}
                    className="calc-input calc-input-number"
                  />
                  <span>R$</span>
                </div>
              </label>

              {/* Número de parcelas */}
              <label className="calc-label">
                Número de parcelas
                <div className="calc-suffix">
                  <input
                    type="number"
                    min="1"
                    max="36"
                    step="1"
                    value={nInput}
                    onChange={(e) => setNInput(e.target.value)}
                    className="calc-input calc-input-number"
                  />
                  <span>x</span>
                </div>
              </label>

              {/* Taxa de juros padrão (fixa) */}
              <label className="calc-label">
                Taxa de juros padrão (fixa)
                <div className="calc-suffix">
                  <input
                    type="text"
                    readOnly
                    disabled
                    aria-readonly="true"
                    title="Taxa fixa definida pelo Grupo MedCof"
                    value={fmtPct(DEFAULT_PARCELAS_RATE)}
                    className="calc-input calc-input-number"
                    style={{ cursor: "not-allowed", opacity: 0.8 }}
                  />
                  <span>% /parc.</span>
                </div>
              </label>
            </div>

            {/* Métricas Intermediárias */}
            <div className="calc-cards">
              <div>
                Divisão base
                <b>{fmtBRL(calc.base)}</b>
              </div>
              <div>
                Acréscimo fixo por parcela
                <b>{fmtBRL(calc.add)}</b>
              </div>
              <div style={{ background: "#fdebed", border: "1px solid #fbccd2" }}>
                <span style={{ color: "#c41b2c", fontWeight: 600 }}>
                  Valor final da parcela
                </span>
                <b style={{ color: "#e5283a" }}>{fmtBRL(calc.inst)}</b>
              </div>
            </div>
          </section>

          {/* Seção Todas as Opções */}
          <section className="calc-block">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
              <h2>Todas as opções</h2>
              <div style={{ display: "flex", gap: "4px" }}>
                {[12, 24, 36].map((limit) => (
                  <button
                    key={limit}
                    type="button"
                    onClick={() => setMaxDisplayN(limit)}
                    style={{
                      fontSize: "11px",
                      fontWeight: 600,
                      padding: "3px 8px",
                      borderRadius: "6px",
                      border: "1px solid " + (maxDisplayN === limit ? "#e5283a" : "#e6e4e6"),
                      background: maxDisplayN === limit ? "#e5283a" : "#ffffff",
                      color: maxDisplayN === limit ? "#ffffff" : "#5c5a62",
                      cursor: "pointer",
                    }}
                  >
                    Até {limit}x
                  </button>
                ))}
              </div>
            </div>
            <p className="hint">
              Clique numa linha para levar esse número de parcelas para a ficha. Em 1x não há juros.
            </p>

            <div className="calc-tablewrap">
              <table className="calc-table">
                <thead>
                  <tr>
                    <th>Parcelas</th>
                    <th className="num">Valor da parcela</th>
                    <th className="num">Total a prazo</th>
                    <th className="num">Juros totais</th>
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map(({ k, res, isSelected }) => (
                    <tr
                      key={k}
                      onClick={() => setNInput(String(k))}
                      className={isSelected ? "sel" : ""}
                    >
                      <td>
                        {k}x
                        {k === 1 ? (
                          <span className="calc-pill calc-pill-free">sem juros</span>
                        ) : isSelected ? (
                          <span className="calc-pill calc-pill-sel">selecionada</span>
                        ) : null}
                      </td>
                      <td className="num font-semibold">{fmtBRL(res.inst)}</td>
                      <td className="num">{fmtBRL(res.total)}</td>
                      <td className="num" style={{ color: res.juros > 0 ? "#e5283a" : undefined }}>
                        {res.juros > 0 ? fmtBRL(res.juros) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {/* Coluna da Ficha Lateral (Ticket) */}
        <aside className="calc-ticket" aria-live="polite">
          <div className="calc-ticket-head">
            <div className="proc">{product.trim() || "Oferta MedCof"}</div>
            <div className="price">
              <small>{n}x</small>
              <span>{fmtBRL(calc.inst)}</span>
            </div>
            <div className="price-sub">
              {n === 1 ? (
                <b>sem juros</b>
              ) : (
                <>
                  taxa de <b>{fmtPct(DEFAULT_PARCELAS_RATE)}</b> por parcela
                </>
              )}{" "}
              · ou <b>{fmtBRL(price)}</b> à vista
            </div>
          </div>

          <div className="calc-rows">
            <div className="calc-row">
              <span>Valor à vista</span>
              <span className="v">{fmtBRL(price)}</span>
            </div>
            <div className="calc-row">
              <span>Taxa por parcela</span>
              <span className="v">
                {n === 1 ? "—" : fmtPct(DEFAULT_PARCELAS_RATE)}
              </span>
            </div>
            <div className="calc-row total">
              <span>Valor total a prazo</span>
              <span className="v">{fmtBRL(calc.total)}</span>
            </div>
            <div className="calc-row int">
              <span>Juros totais pagos</span>
              <span className="v">{fmtBRL(calc.juros)}</span>
            </div>
          </div>

          <div className="calc-copybox">
            <h3>Texto para a peça</h3>
            <div className="calc-copytext">{pieceCopyText}</div>
            <button
              className="calc-btn-copy"
              type="button"
              onClick={handleCopy}
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  Texto copiado!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copiar texto
                </>
              )}
            </button>
          </div>
        </aside>
      </div>

      <p className="calc-foot">
        Fórmula (juros simples): divisão base = valor à vista ÷ parcelas; acréscimo fixo = valor
        à vista × taxa (só acima de 1x); parcela = divisão base + acréscimo. Total a prazo = parcela
        × parcelas. Valores arredondados para centavos.
      </p>

      {/* Toast Notificação */}
      {toastMessage && (
        <div className="calc-toast animate-in fade-in duration-150">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
