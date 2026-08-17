import type { Metadata } from "next";
import Link from "next/link";

import { Logo } from "@/components/layout/logo";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = { title: "Página não encontrada" };

/**
 * 404 da plataforma. Substitui a tela padrão do Next, que é em inglês.
 *
 * Também é o que aparece quando alguém tenta abrir uma página de documentação
 * restrita: não distinguimos "não existe" de "você não pode ver", para a URL
 * não revelar a existência de conteúdo restrito.
 */
export default function NotFound() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-md text-center">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <p aria-hidden className="text-3xl">
            🧭
          </p>

          <h1 className="mt-4 text-xl font-semibold tracking-tight text-slate-900">
            Página não encontrada
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            O endereço que você abriu não existe, foi removido ou você não tem
            acesso a ele.
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <ButtonLink href="/painel">Ir para o painel</ButtonLink>
            <ButtonLink href="/documentacao" variant="secondary">
              Ver a documentação
            </ButtonLink>
          </div>
        </div>

        <p className="mt-6 text-xs text-slate-500">
          Se você chegou aqui por um link interno,{" "}
          <Link
            href="/documentacao"
            className="font-medium text-brand-600 hover:underline"
          >
            avise um administrador
          </Link>{" "}
          para corrigirmos.
        </p>
      </div>
    </main>
  );
}
