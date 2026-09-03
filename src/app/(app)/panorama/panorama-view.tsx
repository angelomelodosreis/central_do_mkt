"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { BarrasComLinha, BarrasHorizontais } from "@/components/charts/charts";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, EmptyState, PageHeader } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { PillTabs } from "@/components/ui/tabs";
import type { TimelineKind, TimelineStatus } from "@/lib/db/schema";
import {
  INDICADORES,
  SENTIDO,
  calcular,
  formatarIndicador,
  rotuloDaSemana,
  rotuloDoIndicador,
  somar,
  variacao,
  type BaseNumbers,
  type Indicador,
} from "@/lib/modules/results/metrics";
import { TIMELINE_KIND_CONFIG } from "@/lib/modules/strategy/timeline-kinds";
import { cn } from "@/lib/utils/cn";
import { formatDate } from "@/lib/utils/format";

type Unidade = {
  id: string;
  slug: string;
  label: string;
  divisionName: string | null;
  isMine: boolean;
};

type LinhaSemanal = BaseNumbers & {
  businessUnitId: string;
  weekStart: number;
};

type ItemDaAgenda = {
  id: string;
  title: string;
  kind: TimelineKind;
  status: TimelineStatus;
  startsAt: number;
  endsAt: number;
  owner: string | null;
  businessUnitId: string;
  businessUnitLabel: string;
  businessUnitSlug: string;
};

const JANELAS = [
  { value: "4", label: "4 semanas" },
  { value: "13", label: "13 semanas" },
  { value: "26", label: "26 semanas" },
] as const;

const HORIZONTES = [
  { value: "7", label: "7 dias" },
  { value: "30", label: "30 dias" },
  { value: "90", label: "90 dias" },
] as const;

const DIA = 86_400_000;
const SEMANA = 7 * DIA;

/**
 * O Panorama: os números de todas as BUs e o que vem por aí, numa tela.
 *
 * Tudo filtra no cliente. Os dados de meio ano chegam de uma vez porque são
 * poucas centenas de linhas, e trocar de 30 para 90 dias precisa ser
 * instantâneo — um recorte que demora deixa de ser usado, e o valor desta tela
 * está em experimentar recortes.
 */
export function PanoramaView({
  hoje,
  unidades,
  semanais,
  agenda,
  kinds,
}: {
  hoje: string;
  unidades: Unidade[];
  semanais: LinhaSemanal[];
  agenda: ItemDaAgenda[];
  kinds: TimelineKind[];
}) {
  const agora = useMemo(() => new Date(hoje), [hoje]);

  const [janela, setJanela] = useState<"4" | "13" | "26">("13");
  const [horizonte, setHorizonte] = useState<"7" | "30" | "90">("30");
  const [indicador, setIndicador] = useState<Indicador>("revenue");
  const [busSelecionadas, setBusSelecionadas] = useState<string[]>([]);
  const [tiposSelecionados, setTiposSelecionados] = useState<TimelineKind[]>(
    [],
  );

  const idsVisiveis =
    busSelecionadas.length > 0
      ? busSelecionadas
      : unidades.map((unidade) => unidade.id);

  // ── Recorte do período ───────────────────────────────────────────────────
  const semanasNaJanela = Number(janela);
  const fim = inicioDaSemanaLocal(agora);
  // A semana em curso fica de fora das duas pontas: ela está pela metade, e
  // meia semana comparada com semanas inteiras derruba qualquer tendência.
  const inicioAtual = fim.getTime() - semanasNaJanela * SEMANA;
  const inicioAnterior = inicioAtual - semanasNaJanela * SEMANA;

  const noPeriodo = useMemo(
    () =>
      semanais.filter(
        (linha) =>
          idsVisiveis.includes(linha.businessUnitId) &&
          linha.weekStart >= inicioAtual &&
          linha.weekStart < fim.getTime(),
      ),
    [semanais, idsVisiveis, inicioAtual, fim],
  );

  const noAnterior = useMemo(
    () =>
      semanais.filter(
        (linha) =>
          idsVisiveis.includes(linha.businessUnitId) &&
          linha.weekStart >= inicioAnterior &&
          linha.weekStart < inicioAtual,
      ),
    [semanais, idsVisiveis, inicioAnterior, inicioAtual],
  );

  const atual = calcular(somar(noPeriodo));
  const anterior = calcular(somar(noAnterior));

  // ── Série semanal ────────────────────────────────────────────────────────
  const serie = useMemo(() => {
    const porSemana = new Map<number, LinhaSemanal[]>();
    for (const linha of noPeriodo) {
      const lista = porSemana.get(linha.weekStart) ?? [];
      lista.push(linha);
      porSemana.set(linha.weekStart, lista);
    }

    const pontos = [];
    for (let i = 0; i < semanasNaJanela; i += 1) {
      const inicio = inicioAtual + i * SEMANA;
      const doGrupo = porSemana.get(inicio) ?? [];
      const valores = calcular(somar(doGrupo));
      pontos.push({
        label: rotuloDaSemana(new Date(inicio)),
        valor: valores[indicador],
        titulo: `${rotuloDaSemana(new Date(inicio))}: ${formatarIndicador(indicador, valores[indicador])}`,
      });
    }
    return pontos;
  }, [noPeriodo, semanasNaJanela, inicioAtual, indicador]);

  // ── Ranking por BU ───────────────────────────────────────────────────────
  const porBu = useMemo(() => {
    const agrupado = new Map<string, LinhaSemanal[]>();
    for (const linha of noPeriodo) {
      const lista = agrupado.get(linha.businessUnitId) ?? [];
      lista.push(linha);
      agrupado.set(linha.businessUnitId, lista);
    }
    const anteriorPorBu = new Map<string, LinhaSemanal[]>();
    for (const linha of noAnterior) {
      const lista = anteriorPorBu.get(linha.businessUnitId) ?? [];
      lista.push(linha);
      anteriorPorBu.set(linha.businessUnitId, lista);
    }

    return unidades
      .filter((unidade) => idsVisiveis.includes(unidade.id))
      .map((unidade) => {
        const valores = calcular(somar(agrupado.get(unidade.id) ?? []));
        const antes = calcular(somar(anteriorPorBu.get(unidade.id) ?? []));
        const variou = variacao(valores[indicador], antes[indicador]);
        return {
          id: unidade.id,
          label: unidade.label,
          valor: valores[indicador],
          valorFormatado: formatarIndicador(indicador, valores[indicador]),
          detalhe: variou === null ? undefined : formatarVariacao(variou),
        };
      })
      .sort((a, b) => (b.valor ?? -1) - (a.valor ?? -1));
  }, [noPeriodo, noAnterior, unidades, idsVisiveis, indicador]);

  // Separadas de propósito: com 22 BUs e 4 lançando, uma lista única deixaria
  // 18 traços empurrando o ranking para fora da tela. Quem não lançou é uma
  // informação de cobrança, não de comparação.
  const comNumero = porBu.filter((linha) => linha.valor !== null);
  const semNumero = porBu.filter((linha) => linha.valor === null);

  // ── O que vem por aí ─────────────────────────────────────────────────────
  const limiteAgenda = agora.getTime() + Number(horizonte) * DIA;

  const proximos = useMemo(
    () =>
      agenda
        .filter(
          (item) =>
            idsVisiveis.includes(item.businessUnitId) &&
            item.startsAt <= limiteAgenda &&
            (tiposSelecionados.length === 0 ||
              tiposSelecionados.includes(item.kind)),
        )
        .sort((a, b) => a.startsAt - b.startsAt),
    [agenda, idsVisiveis, limiteAgenda, tiposSelecionados],
  );

  return (
    <>
      <PageHeader
        title="Panorama"
        description="Como as BUs estão indo e o que vem por aí. Os números vêm do fechamento semanal que cada BU lança em Planejamento › Resultados."
      />

      {/* Os filtros valem para a tela inteira e por isso ficam acima de tudo,
          numa faixa só — repetir um seletor de BU por cartão faria a mesma
          pergunta quatro vezes. */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <div className="w-48">
          <Select
            value={janela}
            onValueChange={(valor) => setJanela(valor as typeof janela)}
            ariaLabel="Período dos números"
            size="sm"
            options={[...JANELAS]}
          />
        </div>
        <div className="w-56">
          <Select
            trigger="field"
            size="sm"
            placeholder="Todas as BUs"
            ariaLabel="Business Units"
            values={busSelecionadas}
            onToggleValue={(id) =>
              setBusSelecionadas((atuais) =>
                atuais.includes(id)
                  ? atuais.filter((item) => item !== id)
                  : [...atuais, id],
              )
            }
            options={unidades.map((unidade) => ({
              value: unidade.id,
              label: unidade.label,
              hint: unidade.divisionName ?? undefined,
            }))}
          />
        </div>
        <div className="w-56">
          <Select
            trigger="field"
            size="sm"
            placeholder="Todo tipo de iniciativa"
            ariaLabel="Tipo de iniciativa"
            values={tiposSelecionados}
            onToggleValue={(valor) =>
              setTiposSelecionados((atuais) =>
                atuais.includes(valor as TimelineKind)
                  ? atuais.filter((item) => item !== valor)
                  : [...atuais, valor as TimelineKind],
              )
            }
            options={kinds.map((kind) => ({
              value: kind,
              label: TIMELINE_KIND_CONFIG[kind].label,
            }))}
          />
        </div>
        {busSelecionadas.length > 0 || tiposSelecionados.length > 0 ? (
          <button
            type="button"
            onClick={() => {
              setBusSelecionadas([]);
              setTiposSelecionados([]);
            }}
            className="rounded-lg px-2 py-1 text-xs text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            Limpar filtros
          </button>
        ) : null}
      </div>

      <div className="space-y-5">
        <Card>
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-200 px-5 py-3">
            <h2 className="text-sm font-semibold text-slate-900">
              {busSelecionadas.length === 0
                ? `${unidades.length} BUs`
                : `${busSelecionadas.length} de ${unidades.length} BUs`}{" "}
              · últimas {semanasNaJanela} semanas
            </h2>
            <p className="text-xs text-slate-500">
              variação sobre as {semanasNaJanela} anteriores
            </p>
          </div>

          <div className="grid grid-cols-2 divide-x divide-y divide-slate-100 sm:grid-cols-4">
            {INDICADORES.map(({ metric }) => (
              <Indicativo
                key={metric}
                metric={metric}
                valor={atual[metric]}
                variacaoPct={variacao(atual[metric], anterior[metric])}
                selecionado={indicador === metric}
                onSelecionar={() => setIndicador(metric)}
              />
            ))}
          </div>
        </Card>

        <div className="grid items-start gap-5 lg:grid-cols-[1fr_22rem]">
          <Card>
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-200 px-5 py-3">
              <h2 className="text-sm font-semibold text-slate-900">
                {rotuloDoIndicador(indicador)}, semana a semana
              </h2>
              <p className="text-xs text-slate-500">
                clique num indicador acima para trocar
              </p>
            </div>
            <CardBody>
              {serie.some((ponto) => ponto.valor !== null) ? (
                <BarrasComLinha pontos={serie} />
              ) : (
                <p className="py-8 text-center text-sm text-slate-500">
                  Nenhum número lançado neste período.
                </p>
              )}
            </CardBody>
          </Card>

          <Card>
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-200 px-5 py-3">
              <h2 className="text-sm font-semibold text-slate-900">Por BU</h2>
              <p className="text-xs text-slate-500">
                {rotuloDoIndicador(indicador)}
              </p>
            </div>
            <CardBody className="px-0 py-0">
              {comNumero.length === 0 ? (
                <EmptyState
                  variant="inline"
                  title="Nenhuma BU lançou números neste período."
                />
              ) : (
                <BarrasHorizontais itens={comNumero} />
              )}
              {semNumero.length > 0 ? (
                <details className="border-t border-slate-200 px-5 py-2.5">
                  <summary className="cursor-pointer text-xs text-amber-700 marker:text-slate-400">
                    {semNumero.length} sem lançamento no período
                  </summary>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
                    {semNumero.map((linha) => linha.label).join(" · ")}
                  </p>
                </details>
              ) : null}
            </CardBody>
          </Card>
        </div>

        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-3">
            <h2 className="text-sm font-semibold text-slate-900">
              O que vem por aí
            </h2>
            <PillTabs
              items={HORIZONTES.map((opcao) => ({
                value: opcao.value,
                label: opcao.label,
                count: agenda.filter(
                  (item) =>
                    idsVisiveis.includes(item.businessUnitId) &&
                    item.startsAt <=
                      agora.getTime() + Number(opcao.value) * DIA &&
                    (tiposSelecionados.length === 0 ||
                      tiposSelecionados.includes(item.kind)),
                ).length,
              }))}
              value={horizonte}
              onChange={setHorizonte}
            />
          </div>

          <CardBody className="px-0 py-0">
            {proximos.length === 0 ? (
              <EmptyState
                variant="inline"
                title={`Nada marcado para os próximos ${horizonte} dias.`}
              />
            ) : (
              <Agenda itens={proximos} agora={agora} />
            )}
          </CardBody>
        </Card>
      </div>
    </>
  );
}

/**
 * Um indicador, clicável.
 *
 * Clicar troca o que o gráfico e o ranking mostram — é o que evita oito
 * gráficos empilhados na tela: a pergunta "e o CAC?" se responde num clique,
 * no mesmo desenho.
 */
function Indicativo({
  metric,
  valor,
  variacaoPct,
  selecionado,
  onSelecionar,
}: {
  metric: Indicador;
  valor: number | null;
  variacaoPct: number | null;
  selecionado: boolean;
  onSelecionar: () => void;
}) {
  const bom =
    variacaoPct === null || variacaoPct === 0
      ? null
      : variacaoPct > 0 === (SENTIDO[metric] === "sobe");

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
      <p className="truncate text-[11px] uppercase tracking-wide text-slate-500">
        {rotuloDoIndicador(metric)}
      </p>
      <p className="mt-0.5 font-display text-xl font-semibold tabular-nums text-slate-900">
        {formatarIndicador(metric, valor)}
      </p>
      {variacaoPct === null ? (
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
          {formatarVariacao(variacaoPct)}
        </p>
      )}
    </button>
  );
}

function formatarVariacao(pct: number): string {
  const sinal = pct > 0 ? "+" : "";
  return `${sinal}${pct.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}

/**
 * A agenda agrupada por quando.
 *
 * "Esta semana / próximas semanas / mais adiante" em vez de uma lista corrida
 * de datas: o que se pergunta olhando isto é "o que eu preciso saber agora", e
 * a resposta é o primeiro grupo.
 */
function Agenda({ itens, agora }: { itens: ItemDaAgenda[]; agora: Date }) {
  const seteDias = agora.getTime() + 7 * DIA;
  const trintaDias = agora.getTime() + 30 * DIA;

  const grupos = [
    {
      titulo: "Nos próximos 7 dias",
      itens: itens.filter((item) => item.startsAt <= seteDias),
    },
    {
      titulo: "Em até 30 dias",
      itens: itens.filter(
        (item) => item.startsAt > seteDias && item.startsAt <= trintaDias,
      ),
    },
    {
      titulo: "Mais adiante",
      itens: itens.filter((item) => item.startsAt > trintaDias),
    },
  ].filter((grupo) => grupo.itens.length > 0);

  return (
    <>
      {grupos.map((grupo) => (
        <section key={grupo.titulo}>
          <div className="flex items-baseline justify-between gap-2 border-y border-slate-200 bg-slate-50/70 px-5 py-2 first:border-t-0">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {grupo.titulo}
            </h3>
            <span className="text-xs tabular-nums text-slate-500">
              {grupo.itens.length}
            </span>
          </div>
          <ul className="divide-y divide-slate-100">
            {grupo.itens.map((item) => {
              const config = TIMELINE_KIND_CONFIG[item.kind];
              const jaComecou = item.startsAt <= agora.getTime();

              return (
                <li key={item.id}>
                  <Link
                    href={`/planejamento/${item.businessUnitSlug}/calendario`}
                    className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-5 py-2.5 transition-colors hover:bg-slate-50"
                  >
                    <span
                      aria-hidden
                      className={cn("size-2 shrink-0 rounded-full", config.dot)}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-slate-900">
                        {item.title}
                      </span>
                      <span className="block truncate text-xs text-slate-500">
                        {item.businessUnitLabel} · {config.label}
                        {item.owner ? ` · ${item.owner}` : ""}
                      </span>
                    </span>
                    <span className="shrink-0 text-right text-xs tabular-nums text-slate-500">
                      {jaComecou ? (
                        <Badge tone="brand">em curso</Badge>
                      ) : (
                        formatDate(new Date(item.startsAt))
                      )}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </>
  );
}

/** Mesma regra do servidor: a semana começa na segunda. */
function inicioDaSemanaLocal(data: Date): Date {
  const copia = new Date(data);
  copia.setHours(0, 0, 0, 0);
  const dia = copia.getDay();
  copia.setDate(copia.getDate() - (dia === 0 ? 6 : dia - 1));
  return copia;
}
