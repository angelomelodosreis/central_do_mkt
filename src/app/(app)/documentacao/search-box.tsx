import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";

/**
 * Campo de busca da documentação.
 *
 * É um `form` GET comum, sem JavaScript: o termo vira `?q=` na URL, então o
 * resultado é recarregável, compartilhável e funciona mesmo antes da página
 * hidratar.
 */
export function SearchBox({ term }: { term: string }) {
  return (
    <form
      action="/documentacao"
      method="GET"
      role="search"
      className="mb-6 flex flex-wrap items-center gap-2"
    >
      <div className="min-w-0 flex-1 basis-64">
        <label htmlFor="q" className="sr-only">
          Buscar na documentação
        </label>
        <Input
          id="q"
          name="q"
          type="search"
          defaultValue={term}
          placeholder="Buscar por palavra-chave: checkout, comercial, briefing…"
          maxLength={120}
        />
      </div>
      <Button type="submit" variant="secondary">
        Buscar
      </Button>
      {term ? (
        <Link
          href="/documentacao"
          className="text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          Limpar
        </Link>
      ) : null}
    </form>
  );
}
