"use client";

import { useState } from "react";

import { deleteTask } from "../actions";
import { Button } from "@/components/ui/button";

/**
 * Confirmação em dois passos.
 *
 * Não é `confirm()` do navegador porque a exclusão apaga o histórico de uma
 * tarefa que outra pessoa pode estar executando — e um diálogo nativo, que
 * aparece igual em qualquer site, é fácil de aceitar por reflexo.
 */
export function DeleteTaskButton({
  taskId,
  title,
  compact = false,
}: {
  taskId: string;
  title: string;
  /** Dentro de uma linha de lista, onde a confirmação precisa caber. */
  compact?: boolean;
}) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <Button variant="ghost" size="sm" onClick={() => setConfirming(true)}>
        {compact ? "Excluir" : "Excluir tarefa"}
      </Button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-danger-200 bg-danger-50 px-3 py-2.5">
      <p className="text-sm text-danger-900">
        Excluir “{title}”? A tarefa sai da fila de quem a recebeu.
      </p>
      <form action={deleteTask}>
        <input type="hidden" name="taskId" value={taskId} />
        <Button type="submit" size="sm" variant="danger">
          Excluir
        </Button>
      </form>
      <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
        Cancelar
      </Button>
    </div>
  );
}
