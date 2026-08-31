"use client";

import { useFormStatus } from "react-dom";
import type { ComponentProps } from "react";

import { Button } from "./button";

/**
 * Botão de envio que sabe que está enviando.
 *
 * Os `<form action>` simples não davam sinal nenhum entre o clique e a resposta
 * do servidor — em ações como "Concluir" ou "Assumir", que fazem a lista inteira
 * ser revalidada, a demora parecia falta de resposta e a pessoa clicava de novo.
 *
 * Precisa ser um componente à parte porque `useFormStatus` só enxerga o
 * formulário quando é lido de DENTRO dele: chamado no mesmo componente que
 * renderiza o `<form>`, ele sempre devolveria `pending: false`.
 */
export function SubmitButton({
  children,
  pendingLabel,
  ...props
}: ComponentProps<typeof Button> & {
  /** Rótulo durante o envio. Sem ele, o próprio rótulo fica com reticências. */
  pendingLabel?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending || props.disabled} {...props}>
      {pending ? (pendingLabel ?? "…") : children}
    </Button>
  );
}
