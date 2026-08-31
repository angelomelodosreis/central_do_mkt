"use client";

import { useActionState } from "react";

import { createCycle } from "../../actions";
import {
  INITIAL_STRATEGY_STATE,
  type StrategyFormState,
} from "../../form-state";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, EmptyState } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";

/**
 * Primeiro passo de uma BU sem planejamento.
 *
 * O ciclo tem início e fim próprios porque o ano útil de cada BU é diferente —
 * Residência é ditada pelo calendário de provas, não por janeiro–dezembro.
 */
export function CycleSetup({
  businessUnitId,
  businessUnitLabel,
  canEdit,
}: {
  businessUnitId: string;
  businessUnitLabel: string;
  canEdit: boolean;
}) {
  const [state, formAction, isPending] = useActionState<
    StrategyFormState,
    FormData
  >(createCycle, INITIAL_STRATEGY_STATE);

  if (!canEdit) {
    return (
      <EmptyState
        title="Nenhum ciclo criado ainda"
        description={`O planejamento de ${businessUnitLabel} ainda não começou. Quem trabalha na BU precisa criar o primeiro ciclo.`}
      />
    );
  }

  const anoAtual = new Date().getFullYear();

  return (
    <Card>
      <CardHeader
        title="Criar o primeiro ciclo"
        description="Um ciclo é o período que o planejamento cobre. Tudo — calendário, metas, produtos — pendura nele."
      />
      <CardBody className="sm:px-6 sm:py-5">
        <form action={formAction} className="space-y-5">
          <input type="hidden" name="businessUnitId" value={businessUnitId} />

          {state.status === "error" && state.message ? (
            <div
              role="alert"
              className="rounded-lg border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-800"
            >
              {state.message}
            </div>
          ) : null}

          <Field
            label="Nome do ciclo"
            htmlFor="name"
            required
            hint={`Como o time se refere a esse período. Ex.: ${anoAtual + 1}, Temporada de provas ${anoAtual + 1}.`}
          >
            <Input
              id="name"
              name="name"
              defaultValue={String(anoAtual + 1)}
              maxLength={60}
              required
            />
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Começa em" htmlFor="startsAt" required>
              <Input
                id="startsAt"
                name="startsAt"
                type="date"
                defaultValue={`${anoAtual + 1}-01-01`}
                required
              />
            </Field>
            <Field label="Termina em" htmlFor="endsAt" required>
              <Input
                id="endsAt"
                name="endsAt"
                type="date"
                defaultValue={`${anoAtual + 1}-12-31`}
                required
              />
            </Field>
          </div>

          <Button type="submit" variant="primary" disabled={isPending}>
            {isPending ? "Criando…" : "Criar ciclo"}
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}
