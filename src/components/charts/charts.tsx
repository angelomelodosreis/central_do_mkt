import { cn } from "@/lib/utils/cn";

/**
 * Gráficos em SVG escrito à mão.
 *
 * Sem biblioteca de propósito. As três formas de que o Panorama precisa —
 * barras por semana, uma linha sobreposta e uma barra horizontal de
 * comparação — cabem em cem linhas de SVG, enquanto uma biblioteca de gráficos
 * traz 50–200 kB para o navegador, um tema próprio que não é o desta
 * ferramenta e um conjunto de comportamentos que teríamos de desligar um a um.
 *
 * O que se perde: interatividade rica (zoom, seleção de faixa). O que se
 * ganha: o gráfico usa as mesmas cores, a mesma tipografia e o mesmo
 * arredondamento do resto da tela, e o valor aparece no `title` de cada barra —
 * que é o que se lê ao passar o mouse.
 */

export type PontoDaSerie = {
  label: string;
  /** Barra. `null` = sem dado, e sem dado não é zero. */
  valor: number | null;
  /** Linha sobreposta, na escala do eixo direito. */
  linha?: number | null;
  /** O que aparece ao passar o mouse. */
  titulo?: string;
};

/**
 * Barras por período, com uma linha opcional por cima.
 *
 * As duas séries têm escalas independentes: faturamento em reais e CPL em
 * reais por lead não cabem no mesmo eixo, e forçar isso achata uma das duas
 * numa reta colada no chão.
 */
export function BarrasComLinha({
  pontos,
  altura = 180,
  corBarra = "fill-brand-500",
  corLinha = "stroke-slate-900",
  rotuloLinha,
}: {
  pontos: PontoDaSerie[];
  altura?: number;
  corBarra?: string;
  corLinha?: string;
  rotuloLinha?: string;
}) {
  if (pontos.length === 0) return null;

  const valores = pontos
    .map((ponto) => ponto.valor)
    .filter((valor): valor is number => valor !== null);
  const teto = Math.max(...valores, 0) || 1;

  const daLinha = pontos
    .map((ponto) => ponto.linha)
    .filter((valor): valor is number => valor !== null && valor !== undefined);
  const tetoLinha = daLinha.length > 0 ? Math.max(...daLinha) || 1 : null;

  const largura = 100 / pontos.length;

  // O caminho da linha é montado em percentuais do viewBox: o SVG estica junto
  // com o cartão, e coordenadas em pixel deixariam a linha fora das barras em
  // qualquer largura diferente da de projeto.
  const caminho =
    tetoLinha === null
      ? null
      : pontos
          .map((ponto, indice) => {
            if (ponto.linha === null || ponto.linha === undefined) return null;
            const x = largura * indice + largura / 2;
            const y = 100 - (ponto.linha / tetoLinha) * 90;
            return { x, y };
          })
          .filter((p): p is { x: number; y: number } => p !== null)
          .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
          .join(" ");

  return (
    <div>
      <div className="relative" style={{ height: altura }}>
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="size-full"
          aria-hidden
        >
          {/* Três linhas de referência. Sem elas, comparar a terceira barra com
              a nona vira estimativa a olho. */}
          {[25, 50, 75].map((y) => (
            <line
              key={y}
              x1="0"
              x2="100"
              y1={y}
              y2={y}
              className="stroke-slate-200"
              strokeWidth="0.3"
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {pontos.map((ponto, indice) => {
            if (ponto.valor === null) return null;
            const h = (ponto.valor / teto) * 90;
            return (
              <rect
                key={ponto.label}
                x={largura * indice + largura * 0.18}
                y={100 - h}
                width={largura * 0.64}
                height={h}
                rx="0.8"
                className={corBarra}
              />
            );
          })}

          {caminho ? (
            <path
              d={caminho}
              fill="none"
              className={corLinha}
              strokeWidth="1.5"
              vectorEffect="non-scaling-stroke"
              strokeLinejoin="round"
            />
          ) : null}
        </svg>

        {/* Área sensível ao mouse por cima do SVG: dá o valor de cada período
            sem depender de eventos no próprio desenho, que com
            `preserveAspectRatio="none"` teriam coordenadas distorcidas. */}
        <div className="absolute inset-0 flex">
          {pontos.map((ponto) => (
            <div
              key={ponto.label}
              title={ponto.titulo ?? `${ponto.label}: ${ponto.valor ?? "—"}`}
              className="flex-1"
            />
          ))}
        </div>
      </div>

      <div className="mt-1.5 flex gap-0.5 text-[10px] text-slate-400">
        {pontos.map((ponto, indice) => (
          <span
            key={ponto.label}
            className="flex-1 truncate text-center"
            // Uma a cada duas em telas estreitas: treze rótulos lado a lado
            // viram uma mancha ilegível.
            style={{ visibility: indice % 2 === 0 ? "visible" : "hidden" }}
          >
            {ponto.label}
          </span>
        ))}
      </div>

      {rotuloLinha ? (
        <p className="mt-1 text-xs text-slate-500">
          <span className="mr-1 inline-block h-px w-4 align-middle bg-slate-900" />
          {rotuloLinha}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Uma linha por BU, ordenada, com a barra proporcional ao maior.
 *
 * É a forma certa de comparar categorias: barra horizontal deixa o nome ao
 * lado do número, e não em pé embaixo de uma coluna estreita.
 */
export function BarrasHorizontais({
  itens,
  className,
}: {
  itens: Array<{
    id: string;
    label: string;
    valor: number | null;
    valorFormatado: string;
    /** Segunda linha do rótulo. Ex.: a variação sobre o período anterior. */
    detalhe?: string;
    href?: string;
  }>;
  className?: string;
}) {
  const teto = Math.max(
    ...itens.map((item) => item.valor ?? 0).filter((valor) => valor > 0),
    1,
  );

  return (
    <ul className={cn("divide-y divide-slate-100", className)}>
      {itens.map((item) => {
        const largura = item.valor === null ? 0 : (item.valor / teto) * 100;
        return (
          <li key={item.id} className="px-5 py-2.5">
            <div className="flex items-baseline justify-between gap-3">
              <span className="min-w-0 truncate text-sm text-slate-800">
                {item.label}
              </span>
              <span className="shrink-0 text-sm font-medium tabular-nums text-slate-900">
                {item.valorFormatado}
              </span>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-brand-500"
                  style={{ width: `${largura}%` }}
                />
              </div>
              {item.detalhe ? (
                <span className="shrink-0 text-xs tabular-nums text-slate-500">
                  {item.detalhe}
                </span>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
