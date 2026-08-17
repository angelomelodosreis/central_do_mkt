import type { Metadata } from "next";
import Link from "next/link";

import { DocPageForm } from "../doc-page-form";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardBody, EmptyState, PageHeader } from "@/components/ui/card";
import { requirePermission } from "@/lib/auth/session";
import { listCategories } from "@/lib/modules/documentation/queries";

export const metadata: Metadata = { title: "Nova página" };
export const dynamic = "force-dynamic";

export default async function NewDocumentationPage({
  searchParams,
}: {
  searchParams: Promise<{ categoria?: string }>;
}) {
  await requirePermission("documentation", "edit");
  const categories = await listCategories();
  const { categoria } = await searchParams;

  // `?categoria=` vem dos botões "Nova página" de dentro de uma categoria, para
  // já abrir o formulário nela — e, com isso, no modelo dela.
  const selected =
    categories.find((category) => category.slug === categoria) ?? categories[0];

  return (
    <>
      <nav className="mb-4 text-sm text-slate-500">
        <Link href="/documentacao" className="hover:text-slate-900">
          Documentação
        </Link>
        <span aria-hidden className="mx-1.5">
          /
        </span>
        <span className="text-slate-700">Nova página</span>
      </nav>

      <PageHeader
        title="Nova página"
        description="Documente um processo, uma convenção ou um material de onboarding."
      />

      {categories.length === 0 ? (
        <EmptyState
          title="Crie uma categoria primeiro"
          description="Toda página pertence a uma categoria (ex.: Processos, Convenções)."
          action={
            <ButtonLink href="/documentacao/nova-categoria">
              Criar categoria
            </ButtonLink>
          }
        />
      ) : (
        <Card>
          <CardBody className="sm:px-6 sm:py-5">
            <DocPageForm
              mode="create"
              cancelHref="/documentacao"
              categories={categories.map((category) => ({
                id: category.id,
                name: category.name,
                slug: category.slug,
                pageTemplate: category.pageTemplate ?? "",
              }))}
              values={{
                title: "",
                categoryId: selected.id,
                summary: "",
                content: selected.pageTemplate ?? "",
                visibility: "all_active_users",
                pageType: "standard",
              }}
            />
          </CardBody>
        </Card>
      )}
    </>
  );
}
