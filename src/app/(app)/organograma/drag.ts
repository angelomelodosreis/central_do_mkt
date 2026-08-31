/**
 * Payload do arrastar, dentro do `DataTransfer`.
 *
 * Vai no `DataTransfer` e não em estado do React por um motivo aprendido no
 * calendário: o handler de `drop` executa no mesmo tique em que o `dragstart`
 * agendou o `setState`, então ele leria o estado ANTERIOR e moveria a pessoa
 * errada. O `DataTransfer` é síncrono e pertence ao próprio gesto.
 */
export type DragPayload = {
  userId: string;
  /** De onde saiu: id da BU (visão squads) ou do time (visão times). */
  fromId: string | null;
};

const MIME = "text/plain";
const PREFIX = "cm-org:";

export function writeDrag(event: React.DragEvent, payload: DragPayload): void {
  event.dataTransfer.setData(
    MIME,
    `${PREFIX}${payload.userId}:${payload.fromId ?? ""}`,
  );
  event.dataTransfer.effectAllowed = "move";
}

export function readDrag(event: React.DragEvent): DragPayload | null {
  const raw = event.dataTransfer.getData(MIME);
  if (!raw.startsWith(PREFIX)) return null;

  const [userId, fromId] = raw.slice(PREFIX.length).split(":");
  if (!userId) return null;

  return { userId, fromId: fromId || null };
}
