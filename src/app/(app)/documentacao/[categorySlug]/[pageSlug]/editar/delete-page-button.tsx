"use client";

import { useState } from "react";

import { deleteDocPage } from "../../../actions";
import { Button } from "@/components/ui/button";

/**
 * Exclusão em duas etapas: o primeiro clique pede confirmação explícita.
 * Evita apagar conteúdo por engano com um clique só.
 */
export function DeletePageButton({
  pageId,
  pageTitle,
}: {
  pageId: string;
  pageTitle: string;
}) {
  const [isConfirming, setIsConfirming] = useState(false);

  if (!isConfirming) {
    return (
      <Button
        type="button"
        variant="danger"
        onClick={() => setIsConfirming(true)}
      >
        Excluir esta página
      </Button>
    );
  }

  return (
    <form action={deleteDocPage} className="space-y-3">
      <input type="hidden" name="pageId" value={pageId} />
      <p className="text-sm text-slate-700">
        Confirma a exclusão de{" "}
        <span className="font-medium text-slate-900">{pageTitle}</span>?
      </p>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant="danger">
          Sim, excluir
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => setIsConfirming(false)}
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}
