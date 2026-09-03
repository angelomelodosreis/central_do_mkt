"use client";

/**
 * O código válido agora, para o modo de teste local.
 *
 * Só é renderizado em desenvolvimento (ver quem o chama). O botão de atualizar
 * existe porque o código muda a cada trinta segundos e esta linha é desenhada
 * uma vez, no carregamento: sem ele, quem demora a digitar vê um código que já
 * não vale e conclui que a tela está quebrada.
 */
export function CodigoDeTeste({ codigo }: { codigo: string }) {
  return (
    <p className="mt-6 rounded-lg bg-amber-50 px-4 py-3 text-center text-xs text-amber-900">
      Modo de teste local · código:{" "}
      <span className="font-mono text-sm font-semibold">{codigo}</span>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="ml-2 underline underline-offset-2 hover:no-underline"
      >
        atualizar
      </button>
    </p>
  );
}
