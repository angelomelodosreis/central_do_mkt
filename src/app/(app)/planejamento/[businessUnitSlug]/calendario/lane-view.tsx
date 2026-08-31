"use client";

import { useState } from "react";

import type { CalendarItem, ClientProduct } from "./calendar-types";
import type { TimelineKind } from "@/lib/db/schema";
import {
  daysBetween,
  endOfQuarter,
  monthShort,
  startOfQuarter,
} from "@/lib/modules/strategy/dates";
import { packLane } from "@/lib/modules/strategy/layout";
import {
  TIMELINE_KIND_ORDER,
  kindConfig,
} from "@/lib/modules/strategy/timeline-kinds";
import { cn } from "@/lib/utils/cn";

const BAR_HEIGHT = 24;

/**
 * Largura mínima (em % da faixa) para o título caber.
 *
 * Abaixo disso a barra vira uma marca: num ano inteiro, um item de um dia ocupa
 * 0,3% da largura — texto ali só produz uma letra solta.
 */
const LABEL_THRESHOLD = 4;

/**
 * Trimestre e ano em faixas horizontais.
 *
 * Uma grade de dias nesses zooms seria ilegível. Em faixas, a posição e o
 * comprimento de cada barra representam o período — é assim que a esteira de
 * produtos fica evidente: dá para ver o Extensivo correndo o ano inteiro
 * enquanto os Boot Camps pontuam em janelas.
 */
export function LaneView({
  zoom,
  anchor,
  items,
  products,
  onOpen,
}: {
  zoom: "trimestre" | "ano";
  anchor: Date;
  items: CalendarItem[];
  products: ClientProduct[];
  onOpen: (id: string) => void;
}) {
  // Agrupar por camada é o padrão; por produto é a leitura de portfólio.
  const [groupBy, setGroupBy] = useState<"kind" | "product">("kind");

  const from =
    zoom === "ano"
      ? new Date(anchor.getFullYear(), 0, 1)
      : startOfQuarter(anchor);
  const to =
    zoom === "ano"
      ? new Date(anchor.getFullYear(), 11, 31)
      : endOfQuarter(anchor);

  const totalDays = daysBetween(from, to) + 1;

  // Marcas de mês no topo, proporcionais ao número de dias de cada mês.
  const ticks: { label: string; left: number; width: number }[] = [];
  let cursor = new Date(from);
  while (cursor.getTime() <= to.getTime()) {
    const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
    const visibleStart =
      monthStart.getTime() < from.getTime() ? from : monthStart;
    const visibleEnd = monthEnd.getTime() > to.getTime() ? to : monthEnd;
    ticks.push({
      label: monthShort(cursor.getMonth()),
      left: (daysBetween(from, visibleStart) / totalDays) * 100,
      width: ((daysBetween(visibleStart, visibleEnd) + 1) / totalDays) * 100,
    });
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
  }

  const groups =
    groupBy === "kind"
      ? TIMELINE_KIND_ORDER.map((kind) => ({
          key: kind as string,
          label: kindConfig(kind).plural,
          items: items.filter((item) => item.kind === kind),
        }))
      : [
          ...products.map((product) => ({
            key: product.id,
            label: product.name,
            items: items.filter((item) => item.productId === product.id),
          })),
          {
            key: "__sem_produto",
            label: "Sem produto",
            items: items.filter((item) => !item.productId),
          },
        ];

  const preenchidos = groups.filter((group) => group.items.length > 0);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2">
        <p className="text-xs font-medium text-slate-500">Agrupar por</p>
        <div className="flex rounded-lg border border-slate-200 bg-white p-0.5">
          {(
            [
              ["kind", "Camada"],
              ["product", "Produto"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setGroupBy(value)}
              aria-pressed={groupBy === value}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                groupBy === value
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Régua de meses */}
      <div className="relative ml-40 h-7 border-b border-slate-200 bg-white">
        {ticks.map((tick, index) => (
          <span
            key={index}
            className="absolute top-0 flex h-full items-center border-l border-slate-100 pl-1.5 text-[11px] text-slate-400"
            style={{ left: `${tick.left}%`, width: `${tick.width}%` }}
          >
            {tick.label}
          </span>
        ))}
      </div>

      {preenchidos.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-slate-500">
          Nenhum item neste período.
        </p>
      ) : (
        preenchidos.map((group) => {
          const segments = packLane(group.items, from, to);
          const rows = segments.reduce((max, s) => Math.max(max, s.row + 1), 0);

          return (
            <div
              key={group.key}
              className="flex border-b border-slate-100 last:border-b-0"
            >
              <div className="w-40 shrink-0 border-r border-slate-100 px-3 py-2.5">
                <p className="text-xs font-medium text-slate-700">
                  {group.label}
                </p>
                <p className="text-[11px] text-slate-400">
                  {group.items.length}{" "}
                  {group.items.length === 1 ? "item" : "itens"}
                </p>
              </div>

              <div
                className="relative flex-1"
                style={{ minHeight: rows * (BAR_HEIGHT + 4) + 12, padding: 6 }}
              >
                {ticks.map((tick, index) => (
                  <span
                    key={index}
                    aria-hidden
                    className="absolute inset-y-0 border-l border-slate-50"
                    style={{ left: `${tick.left}%` }}
                  />
                ))}

                {segments.map((segment) => {
                  const config = kindConfig(segment.item.kind);
                  // Barra curta demais não comporta texto: mostrar "P" ou "B"
                  // é pior que não mostrar nada. Abaixo do limite ela vira uma
                  // marca sólida, e o nome fica no title e no clique.
                  const cabeTexto = segment.width >= LABEL_THRESHOLD;
                  return (
                    <button
                      key={segment.item.id}
                      type="button"
                      onClick={() => onOpen(segment.item.id)}
                      title={segment.item.title}
                      aria-label={segment.item.title}
                      className={cn(
                        "absolute flex items-center overflow-hidden ring-1 ring-inset transition-shadow hover:shadow-sm",
                        cabeTexto
                          ? "px-2 text-[11px] font-medium"
                          : "justify-center",
                        config.chip,
                        segment.clippedStart
                          ? "rounded-l-none"
                          : "rounded-l-md",
                        segment.clippedEnd ? "rounded-r-none" : "rounded-r-md",
                      )}
                      style={{
                        left: `${segment.left}%`,
                        width: cabeTexto ? `${segment.width}%` : 10,
                        top: segment.row * (BAR_HEIGHT + 4) + 6,
                        height: BAR_HEIGHT,
                      }}
                    >
                      {cabeTexto ? (
                        <span className="truncate">{segment.item.title}</span>
                      ) : (
                        <span
                          aria-hidden
                          className={cn("size-1.5 rounded-full", config.dot)}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

/** Reexportado para o tipo do agrupamento ficar próximo de quem o usa. */
export type LaneGroupKey = TimelineKind | string;
