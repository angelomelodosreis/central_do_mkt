import type { ReactNode } from "react";

import { Logo } from "@/components/layout/logo";

/**
 * A moldura das duas telas de verificação.
 *
 * Mesma composição da tela de login de propósito: para quem está entrando, o
 * segundo fator é a continuação do login, não um lugar novo.
 */
export function CartaoDeVerificacao({
  titulo,
  descricao,
  children,
  rodape,
}: {
  /**
   * Opcional porque a tela de cadastro escreve o próprio título: ele muda
   * conforme o passo, e o passo mora no estado do componente de cliente.
   */
  titulo?: string;
  descricao?: ReactNode;
  children: ReactNode;
  rodape?: ReactNode;
}) {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8">
          {titulo ? <Cabecalho titulo={titulo} descricao={descricao} /> : null}
          <div className={titulo ? "mt-6" : undefined}>{children}</div>
        </div>

        {rodape ? (
          <div className="mt-6 text-center text-xs text-slate-500">
            {rodape}
          </div>
        ) : null}
      </div>
    </main>
  );
}

/** Título e linha de contexto, no mesmo desenho em todos os passos. */
export function Cabecalho({
  titulo,
  descricao,
}: {
  titulo: string;
  descricao?: ReactNode;
}) {
  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight text-slate-900">
        {titulo}
      </h1>
      {descricao ? (
        <p className="mt-1.5 text-sm text-slate-500">{descricao}</p>
      ) : null}
    </div>
  );
}
