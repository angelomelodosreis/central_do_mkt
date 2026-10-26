"use client";

import { useState } from "react";

import { togglePersona } from "../../actions";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";

/**
 * Desativar pede confirmação; reativar não — só uma das duas direções tira algo
 * da vista do time.
 */
export function TogglePersonaButton({
  personaId,
  personaName,
  isActive,
}: {
  personaId: string;
  personaName: string;
  isActive: boolean;
}) {
  const [isConfirming, setIsConfirming] = useState(false);

  if (!isActive) {
    return (
      <form action={togglePersona}>
        <input type="hidden" name="personaId" value={personaId} />
        <SubmitButton variant="secondary" pendingLabel="Reativando…">
          Reativar persona
        </SubmitButton>
      </form>
    );
  }

  if (!isConfirming) {
    return (
      <Button
        type="button"
        variant="danger"
        onClick={() => setIsConfirming(true)}
      >
        Desativar persona
      </Button>
    );
  }

  return (
    <form action={togglePersona} className="space-y-3">
      <input type="hidden" name="personaId" value={personaId} />
      <p className="text-sm text-slate-700">
        Confirma desativar{" "}
        <span className="font-medium text-slate-900">{personaName}</span>?
      </p>
      <div className="flex flex-wrap gap-2">
        <SubmitButton variant="danger" pendingLabel="Desativando…">
          Sim, desativar
        </SubmitButton>
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
