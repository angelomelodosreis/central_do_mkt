"use client";

import { useMemo, useState } from "react";

import { saveInitiativeResults, saveWeeklyResults } from "./actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, EmptyState } from "@/components/ui/card";
import { Input } from "@/components/ui/field";
import { Stat, StatGrid } from "@/components/ui/stat";
import type { TimelineKind } from "@/lib/db/schema";
import {
  CAMPOS_BASE,
  INDICADORES,
  calcular,
  formatarIndicador,
  rotuloCurto,
  rotuloDaSemana,
  rotuloDoIndicador,
  somar,
  type BaseNumbers,
} from "@/lib/modules/results/metrics";
import { TIMELINE_KIND_CONFIG } from "@/lib/modules/strategy/timeline-kinds";
import { cn } from "@/lib/utils/cn";
import { formatDate } from "@/lib/utils/format";

export type SemanaEditavel = BaseNumbers & {
  /** Epoch da segunda-feira — é a chave dos campos no formulário. */
  epoch: number;
  note: string | null;
  /** A semana ainda está correndo. */
  emCurso: boolean;
};

export type IniciativaEditavel = {
  itemId: string;
  title: string;
  kind: TimelineKind;
  endsAt: string;
  resultado:
    (BaseNumbers & { attendance: number | null; note: string | null }) | null;
};

function texto(valor: number | null): string {
  return valor === null ? "" : String(valor);
}

/**
 * O lançamento semanal, em tabela.
 *
 * Tabela e não um formulário por semana: o gesto real é "abrir na sexta e
 * digitar a linha de cima", e quem esqueceu duas semanas precisa ver os dois
 * buracos ao mesmo tempo. As semanas sem lançamento aparecem vazias em vez de
 * sumirem — é a ausência que se quer enxergar.
 */
export function WeeklyPanel({
  businessUnitId,
  semanas,
  canEdit,
}: {
  businessUnitId: string;
  semanas: SemanaEditavel[];
  canEdit: boolean;
}) {
  const [rascunho, setRascunho] = useState<Record<string, string>>(() => {
    const inicial: Record<string, string> = {};
    for (const semana of semanas) {
      inicial[`revenue_${semana.epoch}`] = texto(semana.revenue);
      inicial[`sales_${semana.epoch}`] = texto(semana.sales);
      inicial[`leads_${semana.epoch}`] = texto(semana.leads);
      inicial[`mediaSpend_${semana.epoch}`] = texto(semana.mediaSpend);
      inicial[`note_${semana.epoch}`] = semana.note ?? "";
    }
    return inicial;
  });

  const original = useMemo(() => {
    const base: Record<string, string> = {};
    for (const semana of semanas) {
      base[`revenue_${semana.epoch}`] = texto(semana.revenue);
      base[`sales_${semana.epoch}`] = texto(semana.sales);
      base[`leads_${semana.epoch}`] = texto(semana.leads);
      base[`mediaSpend_${semana.epoch}`] = texto(semana.mediaSpend);
      base[`note_${semana.epoch}`] = semana.note ?? "";
    }
    return base;
  }, [semanas]);

  const alterado = Object.keys(original).some(
    (chave) => (rascunho[chave] ?? "") !== original[chave],
  );

  /** O total do que está na tela AGORA, e não o que está gravado. */
  const total = somar(
    semanas.map((semana) => ({
      revenue: paraNumero(rascunho[`revenue_${semana.epoch}`]),
      sales: paraNumero(rascunho[`sales_${semana.epoch}`]),
      leads: paraNumero(rascunho[`leads_${semana.epoch}`]),
      mediaSpend: paraNumero(rascunho[`mediaSpend_${semana.epoch}`]),
    })),
  );
  const indicadores = calcular(total);

  const preenchidas = semanas.filter((semana) =>
    CAMPOS_BASE.some((campo) => rascunho[`${campo.key}_${semana.epoch}`]),
  ).length;

  return (
    <form action={saveWeeklyResults}>
      <input type="hidden" name="businessUnitId" value={businessUnitId} />
      {semanas.map((semana) => (
        <input
          key={semana.epoch}
          type="hidden"
          name="semanas"
          value={semana.epoch}
        />
      ))}

      <Card>
        <CardHeader
          title="Fechamento semanal"
          action={
            <span className="text-xs text-slate-500">
              {preenchidas} de {semanas.length} semanas lançadas
            </span>
          }
        />

        <div className="mt-2 overflow-x-auto border-t border-slate-100">
          <table className="w-full min-w-[46rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left">
                <th className="w-36 px-5 py-2 text-xs font-medium text-slate-500">
                  Semana
                </th>
                {CAMPOS_BASE.map((campo) => (
                  <th
                    key={campo.key}
                    className="px-2 py-2 text-xs font-medium text-slate-500"
                  >
                    {campo.label}
                  </th>
                ))}
                <th className="px-2 py-2 pr-5 text-xs font-medium text-slate-500">
                  Observação
                </th>
              </tr>
            </thead>
            <tbody>
              {semanas.map((semana) => (
                <tr
                  key={semana.epoch}
                  className={cn(
                    "border-b border-slate-100 last:border-0",
                    semana.emCurso && "bg-slate-50/60",
                  )}
                >
                  <td className="px-5 py-1.5">
                    <span className="whitespace-nowrap text-slate-700">
                      {rotuloDaSemana(new Date(semana.epoch))}
                    </span>
                    {semana.emCurso ? (
                      <span className="block text-xs text-slate-400">
                        em curso
                      </span>
                    ) : null}
                  </td>
                  {CAMPOS_BASE.map((campo) => (
                    <td key={campo.key} className="px-2 py-1.5">
                      <Input
                        name={`${campo.key}_${semana.epoch}`}
                        value={rascunho[`${campo.key}_${semana.epoch}`] ?? ""}
                        onChange={(evento) =>
                          setRascunho((atual) => ({
                            ...atual,
                            [`${campo.key}_${semana.epoch}`]:
                              evento.target.value,
                          }))
                        }
                        disabled={!canEdit}
                        inputMode="decimal"
                        aria-label={`${campo.label} — semana de ${rotuloDaSemana(new Date(semana.epoch))}`}
                        placeholder={campo.prefix ?? "0"}
                        className="h-8 text-right tabular-nums"
                      />
                    </td>
                  ))}
                  <td className="px-2 py-1.5 pr-5">
                    <Input
                      name={`note_${semana.epoch}`}
                      value={rascunho[`note_${semana.epoch}`] ?? ""}
                      onChange={(evento) =>
                        setRascunho((atual) => ({
                          ...atual,
                          [`note_${semana.epoch}`]: evento.target.value,
                        }))
                      }
                      disabled={!canEdit}
                      maxLength={140}
                      aria-label={`Observação — semana de ${rotuloDaSemana(new Date(semana.epoch))}`}
                      className="h-8"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* O total do período fecha a tabela em vez de abrir a tela: o número
            que interessa aqui é a linha que se acabou de digitar; o
            consolidado é conferência. */}
        <StatGrid>
          {INDICADORES.map(({ metric }) => (
            <Stat
              key={metric}
              label={rotuloCurto(metric)}
              labelCompleto={rotuloDoIndicador(metric)}
              value={formatarIndicador(metric, indicadores[metric])}
              tamanho="sm"
            />
          ))}
        </StatGrid>

        {canEdit ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-5 py-3">
            <p className="text-xs text-slate-500">
              Deixar uma linha em branco apaga o lançamento dela.
            </p>
            {/* Os botões só existem quando há o que salvar: um "Salvar"
                permanentemente desabilitado parece a tela quebrada. */}
            {alterado ? (
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setRascunho(original)}
                >
                  Descartar
                </Button>
                <Button type="submit" variant="primary">
                  Salvar
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}
      </Card>
    </form>
  );
}

function paraNumero(valor: string | undefined): number | null {
  if (!valor) return null;
  const limpo = valor
    .replace(/[R$\s]/g, "")
    .replace(/\.(?=\d{3}(\D|$))/g, "")
    .replace(",", ".");
  const numero = Number(limpo);
  return Number.isFinite(numero) ? numero : null;
}

/**
 * O resultado que se credita a cada lançamento e evento já encerrado.
 *
 * Fica embaixo do semanal e não se soma a ele: o semanal é o total da BU, isto
 * é a fatia atribuída a uma ação. A frase está na tela porque somar os dois é
 * o erro natural de quem chega aqui.
 */
export function InitiativesPanel({
  businessUnitId,
  iniciativas,
  canEdit,
}: {
  businessUnitId: string;
  iniciativas: IniciativaEditavel[];
  canEdit: boolean;
}) {
  const [abertas, setAbertas] = useState<string[]>(() =>
    iniciativas.filter((item) => item.resultado).map((item) => item.itemId),
  );

  if (iniciativas.length === 0) {
    return (
      <Card>
        <CardBody className="px-0 py-0">
          <EmptyState
            variant="inline"
            title="Nenhum lançamento ou evento encerrado ainda."
            description="Quando um deles passar da data de fim, ele aparece aqui para receber o resultado."
          />
        </CardBody>
      </Card>
    );
  }

  return (
    <form action={saveInitiativeResults}>
      <input type="hidden" name="businessUnitId" value={businessUnitId} />

      <Card>
        <CardHeader
          title="Resultado por iniciativa"
          description="Não some com o semanal: aqui é a fatia atribuída a cada ação."
        />

        <ul className="divide-y divide-slate-100">
          {iniciativas.map((item) => {
            const aberta = abertas.includes(item.itemId);
            const config = TIMELINE_KIND_CONFIG[item.kind];

            return (
              <li key={item.itemId} className="px-5 py-3">
                <input type="hidden" name="iniciativas" value={item.itemId} />

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-slate-900">
                        {item.title}
                      </span>
                      <Badge tone="neutral">{config.label}</Badge>
                    </p>
                    <p className="text-xs text-slate-500">
                      terminou em {formatDate(new Date(item.endsAt))}
                      {item.resultado ? " · resultado lançado" : ""}
                    </p>
                  </div>

                  {canEdit ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        setAbertas((atual) =>
                          atual.includes(item.itemId)
                            ? atual.filter((id) => id !== item.itemId)
                            : [...atual, item.itemId],
                        )
                      }
                    >
                      {aberta ? "Fechar" : "Lançar resultado"}
                    </Button>
                  ) : null}
                </div>

                {aberta ? (
                  <div className="mt-3 grid gap-3 sm:grid-cols-5">
                    {CAMPOS_BASE.map((campo) => (
                      <label key={campo.key} className="block">
                        <span className="mb-1 block text-xs uppercase tracking-wide text-slate-500">
                          {campo.label}
                        </span>
                        <Input
                          name={`ini_${campo.key}_${item.itemId}`}
                          defaultValue={texto(
                            item.resultado?.[campo.key] ?? null,
                          )}
                          disabled={!canEdit}
                          inputMode="decimal"
                          className="h-8 text-right tabular-nums"
                        />
                      </label>
                    ))}
                    <label className="block">
                      <span className="mb-1 block text-xs uppercase tracking-wide text-slate-500">
                        Presenças
                      </span>
                      <Input
                        name={`ini_attendance_${item.itemId}`}
                        defaultValue={texto(item.resultado?.attendance ?? null)}
                        disabled={!canEdit}
                        inputMode="numeric"
                        className="h-8 text-right tabular-nums"
                      />
                    </label>
                    <label className="block sm:col-span-5">
                      <span className="mb-1 block text-xs uppercase tracking-wide text-slate-500">
                        O que aprendemos
                      </span>
                      <Input
                        name={`ini_note_${item.itemId}`}
                        defaultValue={item.resultado?.note ?? ""}
                        disabled={!canEdit}
                        maxLength={280}
                        placeholder="O que repetiríamos e o que faríamos diferente."
                      />
                    </label>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>

        {canEdit ? (
          <div className="flex justify-end border-t border-slate-200 px-5 py-3">
            <Button type="submit" variant="primary">
              Salvar
            </Button>
          </div>
        ) : null}
      </Card>
    </form>
  );
}
