import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";

import { DocPageForm } from "../../../doc-page-form";
import { DeletePageButton } from "./delete-page-button";
import { Card, CardBody, CardHeader, PageHeader } from "@/components/ui/card";
import { requirePermission } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { businessUnit } from "@/lib/db/schema";
import {
  getPageBySlug,
  listCategories,
} from "@/lib/modules/documentation/queries";
import {
  isRichText,
  markdownToHtml,
  parseRichDoc,
} from "@/lib/modules/documentation/rich-text";

export const metadata: Metadata = { title: "Editar página" };
export const dynamic = "force-dynamic";

export default async function EditDocumentationPage({
  params,
}: {
  params: Promise<{ categorySlug: string; pageSlug: string }>;
}) {
  const { categorySlug, pageSlug } = await params;
  const currentUser = await requirePermission("documentation", "edit");

  const result = await getPageBySlug(categorySlug, pageSlug, currentUser);
  if (!result) notFound();

  const { category, page } = result;
  const categories = await listCategories();
  const viewHref = `/documentacao/${category.slug}/${page.slug}`;

  // Página produzida dentro de uma BU: o formulário precisa da BU para oferecer
  // a escolha entre material interno e biblioteca geral. Sem ela, publicar ou
  // despublicar exigiria recriar a página.
  const db = await getDb();
  const owningUnit = page.businessUnitId
    ? ((await db
        .select({ id: businessUnit.id, label: businessUnit.label })
        .from(businessUnit)
        .where(eq(businessUnit.id, page.businessUnitId))
        .get()) ?? undefined)
    : undefined;

  // Página escrita no editor antigo: convertemos o Markdown para o editor visual
  // conseguir abri-la. Ela só muda de formato de fato quando for salva.
  //
  // A decisão é pelo conteúdo, não pelo rótulo: uma linha que diz `rich_text`
  // mas não tem um documento válido dentro é tratada como Markdown. Sem isso, a
  // menor divergência entre coluna e conteúdo abriria o editor vazio — e salvar
  // apagaria o texto da pessoa.
  const storedDoc = isRichText(page.contentFormat)
    ? parseRichDoc(page.content)
    : null;
  const isLegacyMarkdown = !storedDoc;
  const contentHtml =
    isLegacyMarkdown && page.content
      ? await markdownToHtml(page.content)
      : undefined;

  return (
    <>
      <nav className="mb-4 flex flex-wrap items-center gap-1.5 text-sm text-slate-500">
        <Link href="/documentacao" className="hover:text-slate-900">
          Documentação
        </Link>
        <span aria-hidden>/</span>
        <Link href={viewHref} className="hover:text-slate-900">
          {page.title}
        </Link>
        <span aria-hidden>/</span>
        <span className="text-slate-700">Editar</span>
      </nav>

      <PageHeader
        title="Editar página"
        description="Toda alteração fica registrada na trilha de auditoria e pode ser desfeita."
      />

      {isLegacyMarkdown && page.content ? (
        <div className="mb-6 rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-900">
          Esta página foi escrita no editor antigo. O conteúdo já está aberto no
          editor visual — ao salvar, ela passa a usar o formato novo.
        </div>
      ) : null}

      <Card>
        <CardBody className="sm:px-6 sm:py-5">
          <DocPageForm
            mode="edit"
            businessUnit={owningUnit}
            cancelHref={viewHref}
            categories={categories.map((item) => ({
              id: item.id,
              name: item.name,
              slug: item.slug,
              pageTemplate: item.pageTemplate ?? "",
            }))}
            values={{
              pageId: page.id,
              title: page.title,
              categoryId: page.categoryId,
              summary: page.summary ?? "",
              content: isLegacyMarkdown ? "" : (page.content ?? ""),
              contentHtml,
              visibility: page.visibility,
          scope: page.scope,
              pageType: page.pageType,
            }}
          />
        </CardBody>
      </Card>

      <div className="mt-8">
        <Card className="border-danger-200">
          <CardHeader
            title="Excluir página"
            description="A página sai do ar imediatamente. A exclusão fica registrada na auditoria e pode ser desfeita por um administrador."
          />
          <CardBody>
            <DeletePageButton pageId={page.id} pageTitle={page.title} />
          </CardBody>
        </Card>
      </div>
    </>
  );
}
