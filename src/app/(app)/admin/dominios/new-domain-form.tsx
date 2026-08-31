"use client";

import { useActionState } from "react";

import { createAllowedDomain } from "./actions";
import { INITIAL_DOMAIN_STATE } from "./form-state";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

export function NewDomainForm() {
  const [state, formAction, isPending] = useActionState(
    createAllowedDomain,
    INITIAL_DOMAIN_STATE,
  );

  return (
    <form action={formAction} className="space-y-4">
      {state.status === "error" && state.message ? (
        <div
          role="alert"
          className="rounded-lg border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-800"
        >
          {state.message}
        </div>
      ) : null}

      {state.status === "success" && state.message ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {state.message}
        </div>
      ) : null}

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-64 flex-1">
          <Field label="Domínio" htmlFor="domain" required>
            <Input
              id="domain"
              name="domain"
              placeholder="Ex.: medcof.com.br"
              className="font-mono text-[13px]"
              maxLength={100}
              autoComplete="off"
              required
            />
          </Field>
        </div>
        <Button type="submit" variant="primary" disabled={isPending}>
          {isPending ? "Autorizando…" : "Autorizar"}
        </Button>
      </div>
    </form>
  );
}
