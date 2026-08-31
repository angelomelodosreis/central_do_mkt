import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { DocPageForm } from "@/app/(app)/documentacao/doc-page-form";
import { Card, CardBody, EmptyState, PageHeader } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { listCategories } from "@/lib/modules/documentation/queries";
import { requireStrategyBusinessUnit } from "@/lib/modules/strategy/access";

export const metadata: Metadata = { title: "Novo documento da BU" };
export const dynamic = "force-dynamic";

export default async function NewBusinessUnitDocPage({
  params,
  searchParams,
}: {
  params: Promise<{ businessUnitSlug: string }>;
  searchParams: Promise<{ categoria?: string }>;
}) {
  const { businessUnitSlug } = await params;
  const { categoria } = await searchParams;
  const { unit, canEditModule } =
    await requireStrategyBusinessUnit(businessUnitSlug);

  if (!canEditModule("documentation")) {
    redirect(`/planejamento/${unit.slug}/documentos`);
  }

  const categories = await listCategories();
  const base = `/planejamento/${unit.slug}/documentos`;

  if (categories.length === 0) {
    return (
      <>
        <PageHeader title="Novo documento" />
        <EmptyState
          title="Nenhuma categoria cadastrada"
          description="Todo documento entra numa categoria — é ela que organiza a biblioteca geral quando o material for publicado."
          action={
            <ButtonLink href="/documentacao/nova-categoria">
              Criar categoria
            </ButtonLink>
          }
        />
      </>
    );
  }

  const selected =
    categories.find((category) => category.slug === categoria) ?? categories[0];

  return (
    <>
      <PageHeader
        title="Novo documento"
        description={`Este documento nasce dentro de ${unit.label}. Abaixo você escolhe se ele fica interno ou também vai para a biblioteca geral.`}
      />

      <Card>
        <CardBody className="sm:px-6 sm:py-5">
          <DocPageForm
            mode="create"
            cancelHref={base}
            businessUnit={{ id: unit.id, label: unit.label }}
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
              // O padrão é interno: publicar é uma decisão consciente, e um
              // padrão que publica faria material de rascunho vazar por
              // esquecimento.
              scope: "business_unit",
              pageType: "standard",
            }}
          />
        </CardBody>
      </Card>
    </>
  );
}
