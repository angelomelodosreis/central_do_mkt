"use client";

import type { CalendarItem } from "./calendar-types";
import {
  WEEKDAYS_SHORT,
  addDays,
  coversDay,
  isToday,
  startOfWeek,
} from "@/lib/modules/strategy/dates";
import {
  TIMELINE_STATUS_SIGNAL,
  kindConfig,
} from "@/lib/modules/strategy/timeline-kinds";
import { cn } from "@/lib/utils/cn";

/**
 * Semana em colunas altas.
 *
 * Aqui há espaço para o card mostrar mais que o título — produto e responsável
 * aparecem, o que na grade mensal seria ruído.
 */
export function WeekView({
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
  const start = startOfWeek(anchor);
  const days = Array.from({ length: 7 }, (_, index) => addDays(start, index));

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="grid grid-cols-1 sm:grid-cols-7">
        {days.map((day, index) => {
          const doDia = items.filter((item) => coversDay(item, day));
          return (
            <div
              key={day.toISOString()}
              onDoubleClick={() => canEdit && onCreate(day)}
              className={cn(
                "min-h-40 border-slate-100 p-2",
                index < 6 && "sm:border-r",
                "border-b sm:border-b-0",
              )}
            >
              <p className="mb-2 flex items-center gap-1.5">
                <span className="text-xs text-slate-400">
                  {WEEKDAYS_SHORT[day.getDay()]}
                </span>
                <span
                  className={cn(
                    "inline-flex size-6 items-center justify-center rounded-full text-xs tabular-nums",
                    isToday(day)
                      ? "bg-brand-600 font-semibold text-white"
                      : "text-slate-600",
                  )}
                >
                  {day.getDate()}
                </span>
              </p>

              <ul className="space-y-1">
                {doDia.map((item) => {
                  const config = kindConfig(item.kind);
                  const signal = TIMELINE_STATUS_SIGNAL[item.status];
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => onOpen(item.id)}
                        className={cn(
                          "w-full rounded-lg px-2 py-1.5 text-left text-xs ring-1 ring-inset transition-shadow hover:shadow-sm",
                          config.chip,
                        )}
                      >
                        <span className="flex items-center gap-1.5">
                          {signal ? (
                            <span
                              aria-hidden
                              className={cn(
                                "size-1.5 shrink-0 rounded-full",
                                signal.dot,
                              )}
                            />
                          ) : null}
                          <span className="truncate font-medium">
                            {item.title}
                          </span>
                        </span>
                        {item.owner ? (
                          <span className="mt-0.5 block truncate opacity-70">
                            {item.owner}
                          </span>
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>

      {canEdit ? (
        <p className="border-t border-slate-100 px-4 py-2 text-xs text-slate-400">
          Duplo clique num dia cria um item.
        </p>
      ) : null}
    </div>
  );
}
