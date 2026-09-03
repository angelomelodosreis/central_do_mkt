"use client";

import { useActionState } from "react";

import { confirmarCadastro } from "../actions";
import type { ResultadoDaVerificacao } from "../actions";
import { ButtonLink } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { Cabecalho } from "../shell";
import { CodigoDeTeste } from "../test-code";
import { SubmitButton } from "@/components/ui/submit-button";

/**
 * Cadastro do aplicativo: ler o QR, confirmar um código, guardar os códigos de
 * recuperação.
 *
 * Os três passos ficam no mesmo componente, e não em três páginas, por causa
 * dos códigos de recuperação: eles aparecem UMA vez, em texto puro, e só
 * existem na resposta da ação que confirmou o cadastro. Navegar para outra
 * página exigiria carregá-los na URL ou guardá-los em algum lugar — as duas
 * saídas piores do que não navegar.
 */
export function CadastroDoAplicativo({
  concluido,
  qrCode,
  segredo,
  codigoDeTeste,
}: {
  /** O cadastro já foi confirmado — numa visita anterior ou agora mesmo. */
  concluido: boolean;
  qrCode: string;
  segredo: string;
  /** Só no modo de teste local: o código válido agora. */
  codigoDeTeste?: string;
}) {
  const [estado, acao] = useActionState<ResultadoDaVerificacao, FormData>(
    confirmarCadastro,
    {},
  );

  if (estado.codigos) {
    return <CodigosDeRecuperacao codigos={estado.codigos} />;
  }

  // Cadastro já confirmado numa visita anterior: os códigos daquela vez não
  // existem mais em lugar nenhum legível, e gerar outros aqui invalidaria os
  // que a pessoa guardou.
  if (concluido) {
    return (
      <div className="space-y-6">
        <Cabecalho
          titulo="Tudo certo"
          descricao="O aplicativo está cadastrado. A partir de agora ele é pedido a cada nova sessão."
        />
        <ButtonLink variant="primary" className="w-full" href="/painel">
          Ir para o painel
        </ButtonLink>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Cabecalho
        titulo="Registre o aplicativo"
        descricao="Leia o QR abaixo no seu aplicativo autenticador e digite o código que ele mostrar."
      />

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div
          className="mx-auto w-44 [&>svg]:h-auto [&>svg]:w-full"
          // O SVG é gerado no servidor a partir de uma string que nós mesmos
          // montamos — não há conteúdo de terceiro aqui.
          dangerouslySetInnerHTML={{ __html: qrCode }}
        />
      </div>

      <details className="text-xs text-slate-500">
        <summary className="cursor-pointer">Não consigo ler o QR</summary>
        <p className="mt-2">
          No aplicativo, escolha inserir uma chave manualmente e digite:
        </p>
        <p className="mt-2 select-all break-all rounded-md bg-slate-100 px-3 py-2 font-mono text-sm text-slate-800">
          {segredo}
        </p>
      </details>

      <form action={acao} className="space-y-4">
        <Input
          name="codigo"
          autoComplete="one-time-code"
          inputMode="numeric"
          autoFocus
          required
          aria-label="Código de seis dígitos"
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
          pendingLabel="Conferindo…"
        >
          Confirmar
        </SubmitButton>
      </form>

      {codigoDeTeste ? <CodigoDeTeste codigo={codigoDeTeste} /> : null}
    </div>
  );
}

/**
 * Os códigos de recuperação, mostrados uma única vez.
 *
 * São o que substitui o celular perdido. Ficam guardados cifrados, então nem a
 * administração consegue lê-los depois — daí o aviso ser direto em vez de
 * educado.
 */
function CodigosDeRecuperacao({ codigos }: { codigos: string[] }) {
  return (
    <div className="space-y-5">
      <Cabecalho
        titulo="Guarde os códigos de recuperação"
        descricao="O aplicativo está cadastrado. Falta só isto."
      />

      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Guarde estes códigos agora. Cada um serve uma vez, para entrar quando
        você não tiver o celular à mão. Eles não aparecem de novo.
      </div>

      <ul className="grid grid-cols-2 gap-2 rounded-lg bg-slate-50 p-4">
        {codigos.map((codigo) => (
          <li
            key={codigo}
            className="select-all text-center font-mono text-sm text-slate-800"
          >
            {codigo}
          </li>
        ))}
      </ul>

      <ButtonLink variant="primary" className="w-full" href="/painel">
        Já guardei — continuar
      </ButtonLink>
    </div>
  );
}
