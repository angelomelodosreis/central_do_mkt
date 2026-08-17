import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CategoryForm } from "../../category-form";
import { Card, CardBody, PageHeader } from "@/components/ui/card";
import { requirePermission } from "@/lib/auth/session";
import { getCategoryBySlug } from "@/lib/modules/documentation/queries";

export const metadata: Metadata = { title: "Editar categoria" };
export const dynamic = "force-dynamic";

type Params = Promise<{ categorySlug: string }>;

/**
 * O caminho é `editar-categoria`, e não `editar`, para não competir com
 * `[categorySlug]/[pageSlug]` — uma página cujo slug fosse "editar" ficaria
 * inalcançável.
 */
export default async function EditCategoryPage({ params }: { params: Params }) {
  await requirePermission("documentation", "edit");
  const { categorySlug } = await params;

  const category = await getCategoryBySlug(categorySlug);
  if (!category) notFound();

  return (
    <>
      <nav className="mb-4 text-sm text-slate-500">
        <Link href="/documentacao" className="hover:text-slate-900">
          Documentação
        </Link>
        <span aria-hidden className="mx-1.5">
          /
        </span>
        <Link
          href={`/documentacao/${category.slug}`}
          className="hover:text-slate-900"
        >
          {category.name}
        </Link>
        <span aria-hidden className="mx-1.5">
          /
        </span>
        <span className="text-slate-700">Editar categoria</span>
      </nav>

      <PageHeader
        title="Editar categoria"
        description="O modelo de página define com o que as próximas páginas desta categoria começam."
      />

      <Card>
        <CardBody className="sm:px-6 sm:py-5">
          <CategoryForm
            mode="edit"
            cancelHref={`/documentacao/${category.slug}`}
            values={{
              categoryId: category.id,
              name: category.name,
              description: category.description ?? "",
              pageTemplate: category.pageTemplate ?? "",
            }}
          />
        </CardBody>
      </Card>
    </>
  );
}
