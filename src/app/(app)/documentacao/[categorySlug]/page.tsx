import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq, inArray } from "drizzle-orm";

import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardHeader, EmptyState, PageHeader } from "@/components/ui/card";
import { can, requirePermission } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { documentationPage, DOC_VISIBILITY_LABELS } from "@/lib/db/schema";
import {
  getCategoryBySlug,
  visibilitiesFor,
} from "@/lib/modules/documentation/queries";
import { formatDate } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

type Params = Promise<{ categorySlug: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { categorySlug } = await params;
  const category = await getCategoryBySlug(categorySlug);
  return { title: category?.name ?? "Documentação" };
}

/**
 * Listagem das páginas de uma categoria.
 *
 * Existe para que o caminho `/documentacao/<categoria>` seja válido — é o que a
 * pessoa espera ao clicar no nome da categoria ou ao encurtar a URL na barra
 * de endereços.
 */
export default async function CategoryPage({ params }: { params: Params }) {
  const { categorySlug } = await params;
  const currentUser = await requirePermission("documentation", "view");

  const category = await getCategoryBySlug(categorySlug);
  if (!category) notFound();

  // O filtro de visibilidade entra na própria consulta: uma página restrita
  // nunca chega ao processo que monta a tela de quem não pode vê-la.
  const db = await getDb();
  const visiblePages = await db
    .select({
      id: documentationPage.id,
      slug: documentationPage.slug,
      title: documentationPage.title,
      summary: documentationPage.summary,
      pageType: documentationPage.pageType,
      visibility: documentationPage.visibility,
      updatedAt: documentationPage.updatedAt,
    })
    .from(documentationPage)
    .where(
      and(
        eq(documentationPage.categoryId, category.id),
        inArray(documentationPage.visibility, visibilitiesFor(currentUser.role)),
      ),
    )
    .orderBy(asc(documentationPage.sortOrder), asc(documentationPage.title));

  const canEdit = can(currentUser, "documentation", "edit");

  return (
    <>
      <nav className="mb-4 text-sm text-slate-500">
        <Link href="/documentacao" className="hover:text-slate-900">
          Documentação
        </Link>
        <span aria-hidden className="mx-1.5">
          /
        </span>
        <span className="text-slate-700">{category.name}</span>
      </nav>

      <PageHeader
        title={category.name}
        description={category.description ?? undefined}
        action={
          canEdit ? (
            <div className="flex flex-wrap gap-2">
              <ButtonLink
                href={`/documentacao/${category.slug}/editar-categoria`}
                variant="secondary"
              >
                Editar categoria
              </ButtonLink>
              <ButtonLink href={`/documentacao/nova?categoria=${category.slug}`}>
                Nova página
              </ButtonLink>
            </div>
          ) : null
        }
      />

      {visiblePages.length === 0 ? (
        <EmptyState
          title="Nenhuma página nesta categoria"
          description={
            canEdit
              ? "Crie a primeira página desta categoria."
              : "Assim que houver conteúdo aqui, ele aparece nesta lista."
          }
          action={
            canEdit ? (
              <ButtonLink href={`/documentacao/nova?categoria=${category.slug}`}>
                Criar página
              </ButtonLink>
            ) : null
          }
        />
      ) : (
        <Card>
          <CardHeader title={`Páginas (${visiblePages.length})`} />
          <CardBody className="px-0 py-0">
            <ul className="divide-y divide-slate-100">
              {visiblePages.map((page) => (
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
      )}
    </>
  );
}
