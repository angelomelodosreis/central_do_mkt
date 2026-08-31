import type { TimelineKind, TimelineStatus } from "@/lib/db/schema";

/**
 * Item já serializado para o cliente.
 *
 * As datas viajam como texto ISO porque o limite servidor→cliente não carrega
 * `Date`; são reidratadas uma vez, na entrada do componente.
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
    startsAt: new Date(item.startsAt),
    endsAt: new Date(item.endsAt),
  };
}
