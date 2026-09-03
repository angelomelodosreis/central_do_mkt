"use client";

import { useState } from "react";

import { createReview } from "./actions";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

/**
 * Abrir a reunião pede uma data e nada mais.
 *
 * Tudo o que a reunião precisa saber do passado é consultado na hora — ações
 * em aberto, decisões que continuam valendo. Um formulário de abertura com
 * mais campos seria trabalho antes da conversa, e a conversa é o ponto.
 */
export function NovoAcompanhamento({
  businessUnitId,
}: {
  businessUnitId: string;
}) {
  const [aberto, setAberto] = useState(false);
  const hoje = new Date().toISOString().slice(0, 10);

  if (!aberto) {
    return (
      <Button variant="primary" onClick={() => setAberto(true)}>
        + Novo acompanhamento
      </Button>
    );
  }

  return (
    <form action={createReview} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="businessUnitId" value={businessUnitId} />
      <Field label="Data da reunião" htmlFor="meeting-date">
        <Input
          id="meeting-date"
          name="meetingDate"
          type="date"
          defaultValue={hoje}
          required
        />
      </Field>
      <Button type="submit" variant="primary">
        Abrir
      </Button>
      <Button type="button" variant="ghost" onClick={() => setAberto(false)}>
        Cancelar
      </Button>
    </form>
  );
}
