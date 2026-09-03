import Link from "next/link";

import { ButtonLink } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import {
  INDICADORES,
  SENTIDO,
  calcular,
  formatarIndicador,
  rotuloDaSemana,
  rotuloDoIndicador,
  variacao,
  type BaseNumbers,
  type Indicador,
} from "@/lib/modules/results/metrics";
import { cn } from "@/lib/utils/cn";

export type ResumoDeResultados = {
  /** Últimas semanas fechadas e as anteriores, para a variação. */
  recente: BaseNumbers;
  anterior: BaseNumbers;
  semanasComparadas: number;
  /** Somatório do ciclo inteiro, para comparar com a meta. */
  noCiclo: BaseNumbers;
  /** Série de faturamento por semana, da mais antiga para a mais recente. */
  serie: Array<{ weekStart: number; revenue: number | null }>;
  /** As metas do ciclo que dá para conferir com o que foi lançado. */
  metas: Array<{ metric: Indicador; alvo: number }>;
  /** Nenhuma semana lançada ainda. */
  vazio: boolean;
};

/**
 * O realizado da BU na visão geral.
 *
 * Fica ACIMA das metas de propósito: a pergunta que se faz ao abrir uma BU é
 * "como estamos?", e a meta é a régua dessa resposta, não a resposta. Enquanto
 * o realizado morava fora da plataforma, a visão geral abria com o compromisso
 * e nunca dizia se ele estava sendo cumprido.
 */
export function ResultsSummary({
  resumo,
  base,
  canEdit,
}: {
  resumo: ResumoDeResultados;
  base: string;
  canEdit: boolean;
}) {
  if (resumo.vazio) {
    return (
      <Card>
        <CardHeader
          title="Resultados"
          description="Nenhuma semana lançada ainda. O fechamento semanal é o que alimenta esta visão, a comparação com as metas e o Panorama."
          action={
            canEdit ? (
              <ButtonLink
                href={`${base}/resultados`}
                variant="primary"
                size="sm"
              >
                Lançar a primeira semana
              </ButtonLink>
            ) : null
          }
        />
      </Card>
    );
  }

  const recente = calcular(resumo.recente);
  const anterior = calcular(resumo.anterior);
  const noCiclo = calcular(resumo.noCiclo);

  /**
   * A miniatura escala entre o MENOR e o maior, não a partir do zero.
   *
   * Faturamentos semanais de uma mesma BU ficam todos na mesma ordem de
   * grandeza: escalando do zero, treze semanas entre 110 e 150 mil viram treze
   * barras quase idênticas — um bloco sólido que não mostra tendência
   * nenhuma, que é a única coisa que uma miniatura tem para dar.
   */
  const valores = resumo.serie
    .map((ponto) => ponto.revenue)
    .filter((valor): valor is number => valor !== null);
  const menor = valores.length > 0 ? Math.min(...valores) : 0;
  const maior = valores.length > 0 ? Math.max(...valores) : 1;
  const alturaDaBarra = (valor: number | null) => {
    if (valor === null) return 4;
    if (maior === menor) return 55;
    return 18 + ((valor - menor) / (maior - menor)) * 82;
  };

  return (
    <Card>
      <CardHeader
        title={`Resultados · últimas ${resumo.semanasComparadas} semanas`}
        description={`Comparado com as ${resumo.semanasComparadas} semanas anteriores.`}
        action={
          <ButtonLink href={`${base}/resultados`} variant="ghost" size="sm">
            {canEdit ? "Lançar semana" : "Ver série"}
          </ButtonLink>
        }
      />

      <div className="grid grid-cols-2 divide-x divide-y divide-slate-100 border-t border-slate-100 sm:grid-cols-4">
        {INDICADORES.map(({ metric }) => {
          const variou = variacao(recente[metric], anterior[metric]);
          const bom =
            variou === null || variou === 0
              ? null
              : variou > 0 === (SENTIDO[metric] === "sobe");

          return (
            <div key={metric} className="px-5 py-3">
              <p className="truncate text-[11px] uppercase tracking-wide text-slate-500">
                {rotuloDoIndicador(metric)}
              </p>
              <p className="mt-0.5 font-display text-lg font-semibold tabular-nums text-slate-900">
                {formatarIndicador(metric, recente[metric])}
              </p>
              {variou === null ? null : (
                <p
                  className={cn(
                    "text-xs tabular-nums",
                    bom === null && "text-slate-500",
                    bom === true && "text-emerald-700",
                    bom === false && "text-danger-700",
                  )}
                >
                  {variou > 0 ? "+" : ""}
                  {variou.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}
                  %
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* A série inteira em miniatura: a tendência é a informação, e para
          tendência não é preciso eixo nem valor em cada barra. */}
      {resumo.serie.length > 1 ? (
        <div className="border-t border-slate-100 px-5 py-3">
          <div className="flex h-10 items-end gap-1">
            {resumo.serie.map((ponto) => (
              <div
                key={ponto.weekStart}
                title={`${rotuloDaSemana(new Date(ponto.weekStart))}: ${formatarIndicador("revenue", ponto.revenue)}`}
                className={cn(
                  "min-w-0 flex-1 rounded-sm",
                  ponto.revenue === null ? "bg-slate-200" : "bg-brand-200",
                )}
                style={{ height: `${alturaDaBarra(ponto.revenue)}%` }}
              />
            ))}
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            Faturamento por semana · {resumo.serie.length} últimas
          </p>
        </div>
      ) : null}

      {/* Meta × realizado só aparece quando existe meta com número. Barra sem
          régua não diz nada, e inventar uma régua seria pior. */}
      {resumo.metas.length > 0 ? (
        <div className="border-t border-slate-100 px-5 py-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Meta do ciclo × realizado
          </p>
          <ul className="space-y-2.5">
            {resumo.metas.map(({ metric, alvo }) => {
              const feito = noCiclo[metric];
              const pct =
                feito === null || alvo === 0
                  ? null
                  : Math.max((feito / alvo) * 100, 0);

              return (
                <li key={metric}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate text-slate-700">
                      {rotuloDoIndicador(metric)}
                    </span>
                    <span className="shrink-0 tabular-nums text-slate-900">
                      {formatarIndicador(metric, feito)}
                      <span className="text-slate-400">
                        {" / "}
                        {formatarIndicador(metric, alvo)}
                      </span>
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={cn(
                          "h-full rounded-full",
                          pct !== null && pct >= 100
                            ? "bg-emerald-500"
                            : "bg-brand-500",
                        )}
                        style={{ width: `${Math.min(pct ?? 0, 100)}%` }}
                      />
                    </div>
                    <span className="shrink-0 text-[11px] tabular-nums text-slate-500">
                      {pct === null
                        ? "—"
                        : `${pct.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}%`}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="mt-2 text-[11px] text-slate-400">
            Realizado somado desde o início do ciclo.{" "}
            <Link
              href={`${base}/metas`}
              className="underline decoration-slate-300 underline-offset-2 hover:text-slate-600"
            >
              Ver as metas
            </Link>
          </p>
        </div>
      ) : null}
    </Card>
  );
}
