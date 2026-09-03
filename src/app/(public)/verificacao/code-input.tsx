"use client";

import { useActionState } from "react";

import { confirmarSessaoAtual } from "./actions";
import type { ResultadoDaVerificacao } from "./actions";
import { Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

/**
 * O campo do código.
 *
 * Um campo só para os dois tipos de código — o de seis dígitos do aplicativo e
 * o de recuperação. Quem chegou aqui sem o celular não deveria precisar
 * escolher a aba certa antes de conseguir entrar.
 */
export function CampoDeCodigo({ bloqueado }: { bloqueado: boolean }) {
  const [estado, acao] = useActionState<ResultadoDaVerificacao, FormData>(
    confirmarSessaoAtual,
    {},
  );

  return (
    <form action={acao} className="space-y-4">
      <Input
        name="codigo"
        // `one-time-code` é o que faz o iOS e o Android oferecerem o código
        // direto do teclado.
        autoComplete="one-time-code"
        inputMode="text"
        autoFocus
        required
        disabled={bloqueado}
        aria-label="Código de verificação"
        placeholder="000000"
        className="text-center font-mono text-2xl tracking-[0.4em]"
      />

      {estado.erro ? (
        <p role="alert" className="text-sm text-danger-700">
          {estado.erro}
        </p>
      ) : null}

      <SubmitButton
        variant="primary"
        className="w-full"
        disabled={bloqueado}
        pendingLabel="Conferindo…"
      >
        Entrar
      </SubmitButton>
    </form>
  );
}
