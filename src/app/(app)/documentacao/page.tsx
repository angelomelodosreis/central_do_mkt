import type { Metadata } from "next";
import Link from "next/link";

import { ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader, EmptyState, PageHeader } from "@/components/ui/card";
import { SearchBox } from "./search-box";
import { can, requirePermission } from "@/lib/auth/session";
import { DOC_VISIBILITY_LABELS } from "@/lib/db/schema";
import {
  listCategoriesWithPages,
  searchDocPages,
  type DocSearchHit,
} from "@/lib/modules/documentation/queries";
import { formatDate } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Documentação" };
export const dynamic = "force-dynamic";

const NOTICES: Record<string, string> = {
  "pagina-excluida":
    "Página excluída. É possível desfazer isso na tela de Administração > Auditoria.",
  "categoria-criada": "Categoria criada.",
};

export default async function DocumentationIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ aviso?: string; q?: string }>;
}) {
  const currentUser = await requirePermission("documentation", "view");
  const { aviso, q } = await searchParams;
  const canEdit = can(currentUser, "documentation", "edit");

  const term = (q ?? "").trim();
  const results = term ? await searchDocPages(term, currentUser) : null;

  const categories = await listCategoriesWithPages(currentUser);
  const hasAnyPage = categories.some((category) => category.pages.length > 0);

  return (
    <>
      <PageHeader
        title="Documentação"
        description="Processos, convenções e material de onboarding do time de marketing."
        action={
          canEdit ? (
            <div className="flex flex-wrap gap-2">
              <ButtonLink href="/documentacao/nova-categoria" variant="secondary">
                Nova categoria
              </ButtonLink>
              <ButtonLink href="/documentacao/nova">Nova página</ButtonLink>
            </div>
          ) : null
        }
      />

      {aviso && NOTICES[aviso] ? (
        <div className="mb-6 rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-900">
          {NOTICES[aviso]}
        </div>
      ) : null}

      {hasAnyPage ? <SearchBox term={term} /> : null}

      {results ? (
        <SearchResults term={term} results={results} />
      ) : !hasAnyPage ? (
        <EmptyState
          title="Nenhuma página disponível ainda"
          description={
            canEdit
              ? "Crie a primeira página de documentação do time."
              : "Assim que o time publicar conteúdo, ele aparece aqui."
          }
          action={
            canEdit ? (
              <ButtonLink href="/documentacao/nova">Criar página</ButtonLink>
            ) : null
          }
        />
      ) : (
        <div className="space-y-6">
          {categories
            // Categoria vazia é ruído para quem só lê, mas quem edita precisa
            // enxergá-la — senão uma categoria recém-criada fica invisível.
            .filter((category) => category.pages.length > 0 || canEdit)
            .map((category) => (
              <Card key={category.id}>
                <CardHeader
                  title={category.name}
                  description={category.description ?? undefined}
                  action={
                    canEdit ? (
                      <ButtonLink
                        href={`/documentacao/nova?categoria=${category.slug}`}
                        variant="ghost"
                        size="sm"
                      >
                        Nova página
                      </ButtonLink>
                    ) : null
                  }
                />
                <CardBody className="px-0 py-0">
                  {category.pages.length === 0 ? (
                    <p className="px-5 py-6 text-center text-sm text-slate-500">
                      Nenhuma página aqui ainda.
                    </p>
                  ) : null}
                  <ul className="divide-y divide-slate-100">
                    {category.pages.map((page) => (
                      <li key={page.id}>
                        <Link
                          href={`/documentacao/${category.slug}/${page.slug}`}
                          className="flex flex-wrap items-baseline justify-between gap-2 px-5 py-3.5 transition-colors hover:bg-slate-50"
                        >
                          <span className="min-w-0">
                            <span className="flex flex-wrap items-center gap-2">
                              <span className="font-medium text-slate-900">
                                {page.title}
                              </span>
                              {page.pageType === "business_units_reference" ? (
                                <Badge tone="brand">Dados ao vivo</Badge>
                              ) : null}
                              {page.visibility !== "all_active_users" ? (
                                <Badge tone="warning">
                                  {DOC_VISIBILITY_LABELS[page.visibility]}
                                </Badge>
                              ) : null}
                            </span>
                            {page.summary ? (
                              <span className="mt-0.5 block text-sm text-slate-500">
                                {page.summary}
                              </span>
                            ) : null}
                          </span>
                          <span className="shrink-0 text-xs text-slate-400">
                            atualizada em {formatDate(page.updatedAt)}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </CardBody>
              </Card>
            ))}
        </div>
      )}
    </>
  );
}

/** Lista de resultados da busca, no lugar da navegação por categorias. */
function SearchResults({
  term,
  results,
}: {
  term: string;
  results: DocSearchHit[];
}) {
  if (results.length === 0) {
    return (
      <EmptyState
        title={`Nada encontrado para "${term}"`}
        description="Tente uma palavra mais curta ou um sinônimo. A busca procura no título, no resumo e no corpo das páginas."
        action={
          <ButtonLink href="/documentacao" variant="secondary">
            Ver todas as categorias
          </ButtonLink>
        }
      />
    );
  }

  return (
    <Card>
      <CardHeader
        title={`${results.length} ${
          results.length === 1 ? "resultado" : "resultados"
        } para "${term}"`}
      />
      <CardBody className="px-0 py-0">
        <ul className="divide-y divide-slate-100">
          {results.map((page) => (
            <li key={page.id}>
              <Link
                href={`/documentacao/${page.categorySlug}/${page.slug}`}
                className="block px-5 py-3.5 transition-colors hover:bg-slate-50"
              >
                <span className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-slate-900">
                      {page.title}
                    </span>
                    <Badge tone="neutral">{page.categoryName}</Badge>
                    {page.visibility !== "all_active_users" ? (
                      <Badge tone="warning">
                        {DOC_VISIBILITY_LABELS[page.visibility]}
                      </Badge>
                    ) : null}
                  </span>
                  <span className="shrink-0 text-xs text-slate-400">
                    atualizada em {formatDate(page.updatedAt)}
                  </span>
                </span>
                {page.summary ? (
                  <span className="mt-0.5 block text-sm text-slate-500">
                    {page.summary}
                  </span>
                ) : null}
                {page.excerpt ? (
                  <span className="mt-1 block text-xs text-slate-400">
                    {page.excerpt}
                  </span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      </CardBody>
    </Card>
  );
}
