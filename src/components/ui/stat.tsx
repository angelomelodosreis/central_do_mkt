"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

/**
 * Um indicador: rótulo, valor e, quando há com o que comparar, a variação.
 *
 * Estava escrito duas vezes — no Panorama e na visão geral da BU — com a mesma
 * regra de cor copiada nos dois lugares. Regra de cor duplicada é regra de cor
 * que vai divergir: bastava alguém corrigir o verde de um lado.
 *
 * `sentido` é o que impede a variação ser pintada de verde só por ser
 * positiva. Um CPL que sobe 40% não é boa notícia, e quem sabe disso é a
 * métrica, não a aritmética.
 */
export function Stat({
  label,
  labelCompleto,
  value,
  variacao,
  sentido = "sobe",
  selecionado,
  onSelecionar,
  tamanho = "md",
}: {
  label: ReactNode;
  /** O nome por extenso, quando o rótulo é abreviado. Vai no `title`. */
  labelCompleto?: string;
  value: ReactNode;
  /** Variação percentual sobre o período anterior. `null` = sem comparação. */
  variacao?: number | null;
  sentido?: "sobe" | "desce";
  /** Presente = o indicador comanda o que o resto da tela mostra. */
  selecionado?: boolean;
  onSelecionar?: () => void;
  tamanho?: "sm" | "md";
}) {
  const bom =
    variacao === null || variacao === undefined || variacao === 0
      ? null
      : variacao > 0 === (sentido === "sobe");

  const conteudo = (
    <>
      <p
        title={labelCompleto}
        className="truncate text-xs uppercase tracking-wide text-slate-500"
      >
        {label}
      </p>
      <p
        className={cn(
          "mt-0.5 font-display font-semibold tabular-nums text-slate-900",
          tamanho === "sm" ? "text-lg" : "text-xl",
        )}
      >
        {value}
      </p>
      {variacao === undefined ? null : variacao === null ? (
        <p className="text-xs text-slate-400">sem comparação</p>
      ) : (
        <p
          className={cn(
            "text-xs tabular-nums",
            bom === null && "text-slate-500",
            bom === true && "text-emerald-700",
            bom === false && "text-danger-700",
          )}
        >
          {variacao > 0 ? "+" : ""}
          {variacao.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%
        </p>
      )}
    </>
  );

  if (!onSelecionar) return <div className="px-5 py-3">{conteudo}</div>;

  return (
    <button
      type="button"
      onClick={onSelecionar}
      aria-pressed={selecionado}
      className={cn(
        "px-5 py-3 text-left transition-colors",
        "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-600",
        selecionado ? "bg-brand-50/60" : "hover:bg-slate-50",
      )}
    >
      {conteudo}
    </button>
  );
}

/**
 * A faixa de indicadores.
 *
 * Quatro por linha em tela larga, dois no celular. A régua entre eles é a
 * exceção que confirma a regra das divisórias: aqui ela separa colunas de
 * números que seriam lidas em diagonal sem ela.
 */
export function StatGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-2 divide-x divide-y divide-slate-100 sm:grid-cols-4">
      {children}
    </div>
  );
}
