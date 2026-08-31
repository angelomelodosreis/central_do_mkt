"use client";

import { useState } from "react";

import { moveTimelineItem } from "../../actions";
import type { CalendarItem } from "./calendar-types";
import {
  WEEKDAYS_SHORT,
  addDays,
  daysBetween,
  isToday,
  monthGridDays,
  startOfMonth,
  toDateInput,
} from "@/lib/modules/strategy/dates";
import { packWeek } from "@/lib/modules/strategy/layout";
import {
  TIMELINE_STATUS_SIGNAL,
  kindConfig,
} from "@/lib/modules/strategy/timeline-kinds";
import { cn } from "@/lib/utils/cn";

/** Altura de cada faixa de card dentro de uma célula do mês. */
const ROW_HEIGHT = 22;

export function MonthView({
  anchor,
  items,
  canEdit,
  onOpen,
  onCreate,
}: {
  anchor: Date;
  items: CalendarItem[];
  canEdit: boolean;
  onOpen: (id: string) => void;
  onCreate: (day: Date) => void;
}) {
  const month = startOfMonth(anchor);
  const days = monthGridDays(month);
  const weeks = Array.from({ length: 6 }, (_, index) =>
    days.slice(index * 7, index * 7 + 7),
  );

  /**
   * Item sendo arrastado — só para esmaecer o card de origem.
   *
   * O que o `drop` precisa saber (qual item, e se é mover ou esticar) viaja no
   * `DataTransfer`, e não neste estado: estado do React só chega ao manipulador
   * no render seguinte, e um solte rápido leria o valor anterior.
   */
  const [dragId, setDragId] = useState<string | null>(null);

  function startDrag(
    event: React.DragEvent,
    id: string,
    mode: "move" | "resize",
  ) {
    event.dataTransfer.setData("text/plain", `${mode}:${id}`);
    event.dataTransfer.effectAllowed = "move";
    setDragId(id);
  }

  function readDrag(event: React.DragEvent) {
    const raw = event.dataTransfer.getData("text/plain");
    const [mode, id] = raw.split(":");
    if (mode !== "move" && mode !== "resize") return null;
    return { mode: mode as "move" | "resize", id };
  }

  function handleDrop(item: CalendarItem, day: Date, mode: "move" | "resize") {
    const form = new FormData();
    form.set("itemId", item.id);

    if (mode === "move") {
      const length = daysBetween(item.startsAt, item.endsAt);
      form.set("startsAt", toDateInput(day));
      form.set("endsAt", toDateInput(addDays(day, length)));
    } else {
      // Esticar nunca deixa o fim antes do início.
      const end = day.getTime() < item.startsAt.getTime() ? item.startsAt : day;
      form.set("startsAt", toDateInput(item.startsAt));
      form.set("endsAt", toDateInput(end));
    }

    void moveTimelineItem(form);
    setDragId(null);
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
        {WEEKDAYS_SHORT.map((label) => (
          <div
            key={label}
            className="px-2 py-2 text-center text-xs font-medium text-slate-500"
          >
            {label}
          </div>
        ))}
      </div>

      <div>
        {weeks.map((week, weekIndex) => {
          const segments = packWeek(items, week[0]);
          const rows = segments.reduce(
            (max, segment) => Math.max(max, segment.row + 1),
            0,
          );

          return (
            <div
              key={weekIndex}
              className="relative grid grid-cols-7 border-b border-slate-100 last:border-b-0"
              style={{ minHeight: 92 + rows * ROW_HEIGHT }}
            >
              {week.map((day) => {
                const foraDoMes = day.getMonth() !== month.getMonth();
                return (
                  <div
                    key={day.toISOString()}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      event.preventDefault();
                      const info = readDrag(event);
                      if (!info) return;
                      const item = items.find((i) => i.id === info.id);
                      if (item) handleDrop(item, day, info.mode);
                    }}
                    onDoubleClick={() => canEdit && onCreate(day)}
                    className={cn(
                      "min-h-24 border-r border-slate-100 px-1.5 pt-1.5 last:border-r-0",
                      foraDoMes && "bg-slate-50/60",
                    )}
                  >
                    <span
                      className={cn(
                        "inline-flex size-6 items-center justify-center rounded-full text-xs tabular-nums",
                        isToday(day)
                          ? "bg-brand-600 font-semibold text-white"
                          : foraDoMes
                            ? "text-slate-300"
                            : "text-slate-500",
                      )}
                    >
                      {day.getDate()}
                    </span>
                  </div>
                );
              })}

              {/* As barras flutuam sobre a grade: é o que permite um item
                  atravessar vários dias como uma peça só. */}
              <div className="pointer-events-none absolute inset-x-0 top-9 px-1.5">
                {segments.map((segment) => {
                  const config = kindConfig(segment.item.kind);
                  const signal = TIMELINE_STATUS_SIGNAL[segment.item.status];
                  return (
                    <div
                      key={segment.item.id}
                      className="pointer-events-auto absolute"
                      style={{
                        left: `${(segment.column / 7) * 100}%`,
                        width: `${(segment.span / 7) * 100}%`,
                        top: segment.row * ROW_HEIGHT,
                        paddingLeft: 4,
                        paddingRight: 4,
                      }}
                    >
                      <div
                        draggable={canEdit}
                        onDragStart={(event) =>
                          startDrag(event, segment.item.id, "move")
                        }
                        onDragEnd={() => setDragId(null)}
                        onClick={() => onOpen(segment.item.id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            onOpen(segment.item.id);
                          }
                        }}
                        title={segment.item.title}
                        className={cn(
                          "group flex h-[18px] cursor-pointer items-center gap-1 px-1.5 text-[11px] font-medium ring-1 ring-inset transition-shadow hover:shadow-sm",
                          config.chip,
                          segment.continuesBefore ? "rounded-l-none" : "rounded-l-md",
                          segment.continuesAfter ? "rounded-r-none" : "rounded-r-md",
                          dragId === segment.item.id && "opacity-40",
                        )}
                      >
                        {signal ? (
                          <span
                            aria-hidden
                            title={signal.label}
                            className={cn("size-1.5 shrink-0 rounded-full", signal.dot)}
                          />
                        ) : null}
                        <span className="truncate">{segment.item.title}</span>

                        {/* Alça de redimensionar: só aparece no hover, para não
                            virar ruído em um calendário cheio. */}
                        {canEdit && !segment.continuesAfter ? (
                          <span
                            draggable
                            onDragStart={(event) => {
                              event.stopPropagation();
                              startDrag(event, segment.item.id, "resize");
                            }}
                            onDragEnd={() => setDragId(null)}
                            onClick={(event) => event.stopPropagation()}
                            title="Arraste para mudar a duração"
                            className="ml-auto hidden h-full w-1.5 shrink-0 cursor-col-resize rounded-sm bg-current opacity-30 group-hover:block"
                          />
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {canEdit ? (
        <p className="border-t border-slate-100 px-4 py-2 text-xs text-slate-400">
          Duplo clique num dia cria um item. Arraste um card para mover, ou a
          alça da direita para mudar a duração.
        </p>
      ) : null}
    </div>
  );
}
