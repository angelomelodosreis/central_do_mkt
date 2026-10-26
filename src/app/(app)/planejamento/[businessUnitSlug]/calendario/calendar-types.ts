import type { TimelineKind, TimelineStatus } from "@/lib/db/schema";
import { parseCalendarDate } from "@/lib/modules/strategy/dates";
import { canonicalKind } from "@/lib/modules/strategy/timeline-kinds";

/**
 * Item já serializado para o cliente.
 *
 * As datas viajam como texto ISO ou YYYY-MM-DD; são reidratadas de forma
 * segura para a meia-noite local, preservando o dia civil no Brasil (UTC-3).
 */
export type ClientItem = {
  id: string;
  kind: TimelineKind;
  title: string;
  summary: string | null;
  startsAt: string;
  endsAt: string;
  productId: string | null;
  owner: string | null;
  status: TimelineStatus;
  details: Record<string, string>;
};

export type ClientProduct = {
  id: string;
  name: string;
  cadence: "one_time" | "ongoing";
};

/** O mesmo item, com as datas prontas para as contas do calendário. */
export type CalendarItem = Omit<ClientItem, "startsAt" | "endsAt"> & {
  startsAt: Date;
  endsAt: Date;
};

export function hydrate(item: ClientItem): CalendarItem {
  return {
    ...item,
    kind: canonicalKind(item.kind),
    startsAt: parseCalendarDate(item.startsAt),
    endsAt: parseCalendarDate(item.endsAt),
  };
}
