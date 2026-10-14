"use client";

import { useState } from "react";
import { deletePersona } from "../../actions";
import { Button } from "@/components/ui/button";

export function DeletePersonaButton({
  personaId,
  personaName,
}: {
  personaId: string;
  personaName: string;
}) {
  const [isConfirming, setIsConfirming] = useState(false);

  if (!isConfirming) {
    return (
      <Button
        type="button"
        variant="danger"
        onClick={() => setIsConfirming(true)}
      >
        Excluir persona definitivamente
      </Button>
    );
  }

  return (
    <form action={deletePersona} className="space-y-3">
      <input type="hidden" name="personaId" value={personaId} />
      <p className="text-sm text-slate-700">
        Tem certeza que deseja apagar permanentemente a persona{" "}
        <strong className="font-semibold text-slate-900">{personaName}</strong>? Esta ação não pode ser desfeita.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant="danger">
          Sim, excluir definitivamente
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
