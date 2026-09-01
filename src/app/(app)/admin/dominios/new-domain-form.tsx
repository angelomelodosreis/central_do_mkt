"use client";

import { useActionState, useState } from "react";

import { createAllowedDomain } from "./actions";
import { INITIAL_DOMAIN_STATE } from "./form-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";

/**
 * Autorizar um domínio é uma ação, não o estado inicial da tela.
 *
 * O formulário morava aberto no topo, num cartão só dele, acima da lista —
 * três domínios cadastrados e um formulário permanente pedindo o quarto. Quem
 * abre esta tela quase sempre vem conferir ou desativar; o campo aparece
 * quando alguém pede.
 */
export function NewDomainForm() {
  const [state, formAction, isPending] = useActionState(
    createAllowedDomain,
    INITIAL_DOMAIN_STATE,
  );
  const [aberto, setAberto] = useState(false);

  if (!aberto) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="primary" onClick={() => setAberto(true)}>
          + Autorizar domínio
        </Button>
        {state.status === "success" && state.message ? (
          <p className="text-sm text-emerald-700">{state.message}</p>
        ) : null}
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-2">
      {state.message ? (
        <p
          role={state.status === "error" ? "alert" : "status"}
          className={
            state.status === "error"
              ? "text-sm text-danger-800"
              : "text-sm text-emerald-700"
          }
        >
          {state.message}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <div className="w-64">
          <Input
            name="domain"
            aria-label="Domínio"
            placeholder="Ex.: medcof.com.br"
            className="font-mono text-[13px]"
            maxLength={100}
            autoComplete="off"
            autoFocus
            required
          />
        </div>
        <Button type="submit" variant="primary" disabled={isPending}>
          {isPending ? "Autorizando…" : "Autorizar"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setAberto(false)}>
          Cancelar
        </Button>
      </div>
      <p className="text-xs text-slate-500">
        Escreva apenas o que vem depois do @.
      </p>
    </form>
  );
}
