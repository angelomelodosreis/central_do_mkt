import type { Metadata } from "next";
import Link from "next/link";

import { Logo } from "@/components/layout/logo";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = { title: "Página não encontrada" };

/**
 * 404 da plataforma. Substitui a tela padrão do Next, que é em inglês.
 *
 * Também é o que aparece quando alguém tenta abrir uma página restrita
 * ou um endereço digitado incorretamente.
 */
export default function NotFound() {
  return (
    <main className="flex min-h-[80vh] flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg text-center">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>

        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm sm:p-8">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-brand-50 text-2xl text-brand-600">
            🧭
          </div>

          <h1 className="mt-4 font-display text-2xl font-bold tracking-tight text-slate-900">
            Página não encontrada
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            O endereço que você tentou acessar não existe, foi movido ou seu
            perfil não possui acesso direto a ele.
          </p>

          <div className="mt-6 grid grid-cols-2 gap-2 text-left sm:gap-3">
            <Link
              href="/painel"
              className="flex flex-col rounded-xl border border-slate-200/80 bg-slate-50/60 p-3 transition hover:border-brand-300 hover:bg-brand-50/50"
            >
              <span className="text-xs font-semibold text-slate-900">
                Painel Geral
              </span>
              <span className="text-[11px] text-slate-500">
                Minha fila e BUs
              </span>
            </Link>

            <Link
              href="/planejamento"
              className="flex flex-col rounded-xl border border-slate-200/80 bg-slate-50/60 p-3 transition hover:border-brand-300 hover:bg-brand-50/50"
            >
              <span className="text-xs font-semibold text-slate-900">
                Planejamento
              </span>
              <span className="text-[11px] text-slate-500">
                Todas as 23 BUs
              </span>
            </Link>

            <Link
              href="/tarefas"
              className="flex flex-col rounded-xl border border-slate-200/80 bg-slate-50/60 p-3 transition hover:border-brand-300 hover:bg-brand-50/50"
            >
              <span className="text-xs font-semibold text-slate-900">
                Tarefas
              </span>
              <span className="text-[11px] text-slate-500">
                Fila de execução
              </span>
            </Link>

            <Link
              href="/documentacao"
              className="flex flex-col rounded-xl border border-slate-200/80 bg-slate-50/60 p-3 transition hover:border-brand-300 hover:bg-brand-50/50"
            >
              <span className="text-xs font-semibold text-slate-900">
                Documentação
              </span>
              <span className="text-[11px] text-slate-500">
                Processos e regras
              </span>
            </Link>
          </div>

          <div className="mt-6 flex flex-wrap justify-center gap-2 border-t border-slate-100 pt-5">
            <ButtonLink href="/painel">Voltar ao Painel</ButtonLink>
            <ButtonLink href="/perfil" variant="secondary">
              Ver Meu Perfil & BUs
            </ButtonLink>
          </div>
        </div>

        <p className="mt-6 text-xs text-slate-500">
          Precisa de auxílio ou encontrou um link quebrado?{" "}
          <Link
            href="/documentacao"
            className="font-medium text-brand-600 hover:underline"
          >
            Fale com a coordenação de marketing
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
