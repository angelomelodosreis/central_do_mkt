"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import {
  hydrate,
  type ClientItem,
  type ClientProduct,
} from "./calendar-types";
import { ItemPanel } from "./item-panel";
import { LaneView } from "./lane-view";
import { MonthView } from "./month-view";
import { WeekView } from "./week-view";
import { Button } from "@/components/ui/button";
import type { TimelineKind } from "@/lib/db/schema";
import {
  addDays,
  addMonths,
  formatDayMonth,
  monthName,
  startOfQuarter,
  toDateInput,
} from "@/lib/modules/strategy/dates";
import {
  TIMELINE_KIND_ORDER,
  kindConfig,
} from "@/lib/modules/strategy/timeline-kinds";
import { cn } from "@/lib/utils/cn";

const ZOOM_LABELS = {
  semana: "Semana",
  mes: "Mês",
  trimestre: "Trimestre",
  ano: "Ano",
} as const;

type Zoom = keyof typeof ZOOM_LABELS;

export function CalendarWorkspace({
  unit,
  cycles,
  cycle,
  zoom,
  anchorIso,
  canEdit,
  products,
  items,
}: {
  unit: { slug: string; label: string };
  cycles: { slug: string; name: string }[];
  cycle: { id: string; slug: string; name: string; startsAt: string; endsAt: string };
  zoom: Zoom;
  anchorIso: string;
  canEdit: boolean;
  products: ClientProduct[];
  items: ClientItem[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const anchor = useMemo(() => new Date(anchorIso), [anchorIso]);

  // Camadas escondidas — o padrão é tudo visível. Guardar as escondidas (e não
  // as visíveis) faz uma camada nova nascer aparecendo.
  const [hiddenKinds, setHiddenKinds] = useState<Set<TimelineKind>>(new Set());
  const [productFilter, setProductFilter] = useState<string>("");
  const [openItemId, setOpenItemId] = useState<string | null>(null);
  const [creatingOn, setCreatingOn] = useState<Date | null>(null);

  const hydrated = useMemo(() => items.map(hydrate), [items]);

  const visible = useMemo(
    () =>
      hydrated.filter(
        (item) =>
          !hiddenKinds.has(item.kind) &&
          (!productFilter || item.productId === productFilter),
      ),
    [hydrated, hiddenKinds, productFilter],
  );

  const openItem = hydrated.find((item) => item.id === openItemId) ?? null;

  /** Navegação e zoom viajam na URL: a visão fica compartilhável e recarregável. */
  function push(next: Partial<{ zoom: Zoom; em: Date; ciclo: string }>) {
    const params = new URLSearchParams(searchParams.toString());
    if (next.zoom) params.set("zoom", next.zoom);
    if (next.em) params.set("em", toDateInput(next.em));
    if (next.ciclo) {
      params.set("ciclo", next.ciclo);
      params.delete("em");
    }
    router.push(`/planejamento/${unit.slug}?${params.toString()}`);
  }

  function shift(direction: -1 | 1) {
    if (zoom === "semana") return push({ em: addDays(anchor, 7 * direction) });
    if (zoom === "mes") return push({ em: addMonths(anchor, direction) });
    if (zoom === "trimestre") return push({ em: addMonths(anchor, 3 * direction) });
    return push({ em: addMonths(anchor, 12 * direction) });
  }

  function toggleKind(kind: TimelineKind) {
    setHiddenKinds((current) => {
      const next = new Set(current);
      if (next.has(kind)) next.delete(kind);
      else next.add(kind);
      return next;
    });
  }

  const periodLabel = describePeriod(zoom, anchor);
  const countByKind = useMemo(() => {
    const map = new Map<TimelineKind, number>();
    for (const item of hydrated) {
      map.set(item.kind, (map.get(item.kind) ?? 0) + 1);
    }
    return map;
  }, [hydrated]);

  return (
    <>
      {/* Cabeçalho: BU, ciclo e período. É a âncora de contexto do módulo. */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-semibold tracking-tight text-slate-900">
            {unit.label}
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Calendário estratégico · {cycle.name}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {cycles.length > 1 ? (
            <select
              value={cycle.slug}
              onChange={(event) => push({ ciclo: event.target.value })}
              aria-label="Ciclo de planejamento"
              className="h-9 rounded-xl border border-slate-300 bg-white px-3 pr-8 text-sm text-slate-700 shadow-sm"
            >
              {cycles.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          ) : null}

          {canEdit ? (
            <Button size="sm" onClick={() => setCreatingOn(anchor)}>
              Novo item
            </Button>
          ) : null}
        </div>
      </div>

      {/* Barra de controle: período à esquerda, zoom à direita. */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <IconButton label="Período anterior" onClick={() => shift(-1)}>
            ‹
          </IconButton>
          <IconButton label="Próximo período" onClick={() => shift(1)}>
            ›
          </IconButton>
          <button
            type="button"
            onClick={() => push({ em: new Date() })}
            className="ml-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            Hoje
          </button>
          <span className="ml-2 font-display text-base font-semibold text-slate-900">
            {periodLabel}
          </span>
        </div>

        <div className="flex rounded-xl border border-slate-200 bg-white p-0.5 shadow-sm">
          {(Object.keys(ZOOM_LABELS) as Zoom[]).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => push({ zoom: option })}
              aria-pressed={zoom === option}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                zoom === option
                  ? "bg-brand-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100",
              )}
            >
              {ZOOM_LABELS[option]}
            </button>
          ))}
        </div>
      </div>

      {/* Camadas: o controle principal do calendário. Desligar é o que impede
          a poluição — o analista escolhe o que quer enxergar. */}
      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        {TIMELINE_KIND_ORDER.map((kind) => {
          const config = kindConfig(kind);
          const hidden = hiddenKinds.has(kind);
          const total = countByKind.get(kind) ?? 0;
          return (
            <button
              key={kind}
              type="button"
              onClick={() => toggleKind(kind)}
              aria-pressed={!hidden}
              title={config.description}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset transition-all",
                hidden
                  ? "bg-white text-slate-400 ring-slate-200 opacity-60"
                  : config.chip,
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "size-2 rounded-full",
                  hidden ? "bg-slate-300" : config.dot,
                )}
              />
              {config.label}
              {total > 0 ? (
                <span className="tabular-nums opacity-60">{total}</span>
              ) : null}
            </button>
          );
        })}

        {products.length > 0 ? (
          <select
            value={productFilter}
            onChange={(event) => setProductFilter(event.target.value)}
            aria-label="Filtrar por produto"
            className="ml-auto h-8 rounded-full border border-slate-300 bg-white px-3 pr-7 text-xs text-slate-700 shadow-sm"
          >
            <option value="">Todos os produtos</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </select>
        ) : null}
      </div>

      {zoom === "semana" ? (
        <WeekView
          anchor={anchor}
          items={visible}
          canEdit={canEdit}
          onOpen={setOpenItemId}
          onCreate={setCreatingOn}
        />
      ) : zoom === "mes" ? (
        <MonthView
          anchor={anchor}
          items={visible}
          canEdit={canEdit}
          onOpen={setOpenItemId}
          onCreate={setCreatingOn}
        />
      ) : (
        <LaneView
          zoom={zoom}
          anchor={anchor}
          items={visible}
          products={products}
          onOpen={setOpenItemId}
        />
      )}

      {openItem || creatingOn ? (
        <ItemPanel
          cycleId={cycle.id}
          products={products}
          canEdit={canEdit}
          item={openItem}
          createOn={creatingOn}
          onClose={() => {
            setOpenItemId(null);
            setCreatingOn(null);
          }}
        />
      ) : null}
    </>
  );
}

function describePeriod(zoom: Zoom, anchor: Date): string {
  if (zoom === "semana") {
    const start = addDays(anchor, -anchor.getDay());
    const end = addDays(start, 6);
    return `${formatDayMonth(start)} – ${formatDayMonth(end)}`;
  }
  if (zoom === "mes") {
    return `${capitalize(monthName(anchor.getMonth()))} de ${anchor.getFullYear()}`;
  }
  if (zoom === "trimestre") {
    const start = startOfQuarter(anchor);
    return `${Math.floor(start.getMonth() / 3) + 1}º trimestre de ${start.getFullYear()}`;
  }
  return String(anchor.getFullYear());
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex size-8 items-center justify-center rounded-lg text-lg leading-none text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
    >
      {children}
    </button>
  );
}
