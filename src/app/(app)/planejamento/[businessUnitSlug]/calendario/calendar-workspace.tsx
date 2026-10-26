"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";

import { hydrate, type ClientItem, type ClientProduct } from "./calendar-types";
import { ItemPanel } from "./item-panel";
import { LaneView } from "./lane-view";
import { MonthView } from "./month-view";
import { WeekView } from "./week-view";
import { Button } from "@/components/ui/button";
import { FIELD_WIDTHS } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import type { TimelineKind } from "@/lib/db/schema";
import {
  addDays,
  addMonths,
  formatDayMonth,
  monthName,
  parseCalendarDate,
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
  unit: { slug: string };
  cycles: { slug: string; name: string }[];
  cycle: {
    id: string;
    slug: string;
    name: string;
    startsAt: string;
    endsAt: string;
  };
  zoom: Zoom;
  anchorIso: string;
  canEdit: boolean;
  products: ClientProduct[];
  items: ClientItem[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isNavigating, startTransition] = useTransition();

  const initialAnchor = useMemo(
    () => parseCalendarDate(anchorIso),
    [anchorIso],
  );
  const [currentAnchor, setCurrentAnchor] = useState<Date>(initialAnchor);

  useEffect(() => {
    setCurrentAnchor(parseCalendarDate(anchorIso));
  }, [anchorIso]);

  // Tags selecionadas — null significa todas as tags visíveis
  const [selectedKinds, setSelectedKinds] = useState<Set<TimelineKind> | null>(
    null,
  );
  const [productFilter, setProductFilter] = useState<string>("");
  const [openItemId, setOpenItemId] = useState<string | null>(null);
  const [creatingOn, setCreatingOn] = useState<Date | null>(null);

  const hydrated = useMemo(() => items.map(hydrate), [items]);

  const visible = useMemo(
    () =>
      hydrated.filter(
        (item) =>
          (!selectedKinds || selectedKinds.has(item.kind)) &&
          (!productFilter || item.productId === productFilter),
      ),
    [hydrated, selectedKinds, productFilter],
  );

  const openItem = hydrated.find((item) => item.id === openItemId) ?? null;

  /** Navegação e zoom viajam na URL: a visão fica compartilhável e recarregável. */
  function push(next: Partial<{ zoom: Zoom; em: Date; ciclo: string }>) {
    if (next.em) {
      setCurrentAnchor(next.em);
    }
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (next.zoom) params.set("zoom", next.zoom);
      if (next.em) params.set("em", toDateInput(next.em));
      if (next.ciclo) {
        params.set("ciclo", next.ciclo);
        params.delete("em");
      }
      router.push(`/planejamento/${unit.slug}/calendario?${params.toString()}`, {
        scroll: false,
      });
    });
  }

  function shift(direction: -1 | 1) {
    if (zoom === "semana")
      return push({ em: addDays(currentAnchor, 7 * direction) });
    if (zoom === "mes")
      return push({ em: addMonths(currentAnchor, direction) });
    if (zoom === "trimestre")
      return push({ em: addMonths(currentAnchor, 3 * direction) });
    return push({ em: addMonths(currentAnchor, 12 * direction) });
  }

  function toggleKind(kind: TimelineKind, multi = false) {
    setSelectedKinds((current) => {
      if (multi) {
        if (!current) return new Set([kind]);
        const next = new Set(current);
        if (next.has(kind)) {
          next.delete(kind);
          return next.size === 0 ? null : next;
        }
        next.add(kind);
        return next;
      }
      // Clique padrão: se já for a única tag selecionada, limpa para todas. Se não, isola a tag clicada.
      if (current && current.size === 1 && current.has(kind)) {
        return null;
      }
      return new Set([kind]);
    });
  }

  function handleItemSaved(savedDate: Date, savedKind: TimelineKind) {
    // Se o item foi criado/salvo em outro mês, navega automaticamente para lá
    // para que o usuário veja imediatamente o item que acabou de criar!
    if (
      savedDate.getFullYear() !== currentAnchor.getFullYear() ||
      savedDate.getMonth() !== currentAnchor.getMonth()
    ) {
      push({ em: savedDate });
    }
    // Se havia filtro ativo por tag e a tag do item salvo não está no filtro,
    // limpa o filtro (Todas) para que o novo item não fique oculto.
    if (selectedKinds && !selectedKinds.has(savedKind)) {
      setSelectedKinds(null);
    }
  }

  const periodLabel = describePeriod(zoom, currentAnchor);
  const countByKind = useMemo(() => {
    const map = new Map<TimelineKind, number>();
    for (const item of hydrated) {
      map.set(item.kind, (map.get(item.kind) ?? 0) + 1);
    }
    return map;
  }, [hydrated]);

  return (
    <>
      {/* O nome da BU já está no cabeçalho do espaço de trabalho; repetir aqui
          empurraria o calendário para baixo da dobra. O que falta neste nível é
          qual ciclo está aberto. */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-base font-semibold text-slate-900">
            Calendário estratégico
          </p>
          <p className="mt-0.5 text-sm text-slate-500">{cycle.name}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {cycles.length > 1 ? (
            <div className={FIELD_WIDTHS.lg}>
              <Select
                size="sm"
                value={cycle.slug}
                onValueChange={(next) => push({ ciclo: next })}
                ariaLabel="Ciclo de planejamento"
                options={cycles.map((c) => ({ value: c.slug, label: c.name }))}
              />
            </div>
          ) : null}

          {canEdit ? (
            <Button size="sm" onClick={() => setCreatingOn(currentAnchor)}>
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
            className="ml-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
          >
            Hoje
          </button>
          <span className="ml-2 font-display text-base font-semibold text-slate-900">
            {periodLabel}
          </span>
          {isNavigating && (
            <span className="ml-2 text-xs text-brand-600 font-medium animate-pulse">
              Carregando...
            </span>
          )}
        </div>

        <div className="flex rounded-xl border border-slate-200 bg-white p-0.5 shadow-sm">
          {(Object.keys(ZOOM_LABELS) as Zoom[]).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => push({ zoom: option })}
              aria-pressed={zoom === option}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer",
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

      {/* Tags: o controle principal do calendário. Clicar filtra os itens por tag. */}
      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mr-1 hidden sm:inline">
          Tags:
        </span>
        <button
          type="button"
          onClick={() => setSelectedKinds(null)}
          aria-pressed={selectedKinds === null}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset transition-all cursor-pointer",
            selectedKinds === null
              ? "bg-slate-900 text-white ring-slate-900 shadow-2xs font-semibold"
              : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50",
          )}
        >
          Todas
          <span className="tabular-nums opacity-75">{hydrated.length}</span>
        </button>
        {TIMELINE_KIND_ORDER.map((kind) => {
          const config = kindConfig(kind);
          const isSelected = selectedKinds ? selectedKinds.has(kind) : false;
          const isAllSelected = selectedKinds === null;
          const total = countByKind.get(kind) ?? 0;

          return (
            <button
              key={kind}
              type="button"
              onClick={(e) =>
                toggleKind(kind, e.shiftKey || e.ctrlKey || e.metaKey)
              }
              aria-pressed={isSelected || isAllSelected}
              title={config.description}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset transition-all cursor-pointer",
                isSelected
                  ? cn(config.chip, "ring-2 font-semibold shadow-xs")
                  : isAllSelected
                    ? config.chip
                    : "bg-white text-slate-400 ring-slate-200 opacity-60 hover:opacity-100",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "size-2 rounded-full",
                  isSelected || isAllSelected ? config.dot : "bg-slate-300",
                )}
              />
              {config.label}
              {total > 0 ? (
                <span className="tabular-nums opacity-75">{total}</span>
              ) : null}
            </button>
          );
        })}

        {products.length > 0 ? (
          <div className="ml-auto w-44">
            <Select
              size="sm"
              value={productFilter}
              onValueChange={setProductFilter}
              ariaLabel="Filtrar por produto"
              placeholder="Todos os produtos"
              options={[
                { value: "", label: "Todos os produtos" },
                ...products.map((product) => ({
                  value: product.id,
                  label: product.name,
                })),
              ]}
            />
          </div>
        ) : null}
      </div>

      {zoom === "semana" ? (
        <WeekView
          anchor={currentAnchor}
          items={visible}
          canEdit={canEdit}
          onOpen={setOpenItemId}
          onCreate={setCreatingOn}
        />
      ) : zoom === "mes" ? (
        <MonthView
          anchor={currentAnchor}
          items={visible}
          canEdit={canEdit}
          onOpen={setOpenItemId}
          onCreate={setCreatingOn}
        />
      ) : (
        <LaneView
          zoom={zoom}
          anchor={currentAnchor}
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
          onSaved={handleItemSaved}
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
      className="flex size-8 items-center justify-center rounded-lg text-lg leading-none text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 active:bg-slate-200 cursor-pointer select-none"
    >
      {children}
    </button>
  );
}
