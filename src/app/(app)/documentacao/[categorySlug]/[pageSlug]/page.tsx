import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AttachmentPanel } from "@/components/attachments/attachment-panel";
import { ReferencePageBody } from "@/components/bases/reference-page";
import { Markdown } from "@/components/markdown";
import { RichTextContent } from "@/components/rich-text/renderer";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { can, isPlatformAdmin, requirePermission } from "@/lib/auth/session";
import { DOC_VISIBILITY_LABELS, isReferencePage } from "@/lib/db/schema";
import { getPageBySlug } from "@/lib/modules/documentation/queries";
import {
  isRichDocEmpty,
  isRichText,
  parseRichDoc,
} from "@/lib/modules/documentation/rich-text";
import { listAttachments } from "@/lib/modules/files/queries";
import { getBusinessUnitById } from "@/lib/modules/org/queries";
import { formatDateTime } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

type Params = Promise<{ categorySlug: string; pageSlug: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { categorySlug, pageSlug } = await params;
  const currentUser = await requirePermission("documentation", "view");
  const result = await getPageBySlug(categorySlug, pageSlug, currentUser);
  return { title: result?.page.title ?? "Documentação" };
}

export default async function DocumentationPageView({
  params,
}: {
  params: Params;
}) {
  const { categorySlug, pageSlug } = await params;
  const currentUser = await requirePermission("documentation", "view");
  // Bases oficiais são administradas na Administração; aqui só se consulta.
  const podeAdministrarBases = isPlatformAdmin(currentUser);

  const result = await getPageBySlug(categorySlug, pageSlug, currentUser);
  // Página inexistente e página restrita caem no mesmo 404, de propósito: assim
  // a URL não revela que existe conteúdo que o usuário não pode ver.
  if (!result) notFound();

  const { category, page } = result;
  const canEdit = can(currentUser, "documentation", "edit");

  const [anexos, unidade] = await Promise.all([
    listAttachments("doc_page", page.id),
    page.businessUnitId ? getBusinessUnitById(page.businessUnitId) : null,
  ]);

  // Páginas antigas seguem em Markdown; as novas vêm do editor visual. O formato
  // gravado é quem decide, então nada precisou ser migrado à força.
  const richDoc = isRichText(page.contentFormat)
    ? parseRichDoc(page.content)
    : null;
  const hasBody = richDoc
    ? !isRichDocEmpty(richDoc)
    : Boolean(page.content?.trim());

  return (
    <>
      <nav className="mb-4 flex flex-wrap items-center gap-1.5 text-sm text-slate-500">
        <Link href="/documentacao" className="hover:text-slate-900">
          Documentação
        </Link>
        <span aria-hidden>/</span>
        <Link
          href={`/documentacao/${category.slug}`}
          className="hover:text-slate-900"
        >
          {category.name}
        </Link>
      </nav>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            {page.title}
          </h1>
          {page.summary ? (
            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              {page.summary}
            </p>
          ) : null}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {isReferencePage(page.pageType) ? (
              <Badge tone="brand">Base oficial · dados ao vivo</Badge>
            ) : null}
            {/* De onde o documento vem e até onde ele chega. Quem lê precisa
                saber se o resto do time também vê isso. */}
            {unidade ? (
              <Link
                href={`/planejamento/${unidade.slug}/documentos`}
                className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700 ring-1 ring-inset ring-brand-200 transition-colors hover:bg-brand-100"
              >
                {page.scope === "business_unit"
                  ? `Interno · ${unidade.label}`
                  : unidade.label}
              </Link>
            ) : null}
            {page.visibility !== "all_active_users" ? (
              <Badge tone="warning">
                {DOC_VISIBILITY_LABELS[page.visibility]}
              </Badge>
            ) : null}
            <span className="text-xs text-slate-400">
              Atualizada em {formatDateTime(page.updatedAt)}
            </span>
          </div>
        </div>

        {canEdit ? (
          <ButtonLink
            href={`/documentacao/${category.slug}/${page.slug}/editar`}
            variant="secondary"
          >
            Editar
          </ButtonLink>
        ) : null}
      </div>

      <Card>
        <CardBody className="sm:px-6 sm:py-5">
          {isReferencePage(page.pageType) ? (
            <ReferencePageBody pageType={page.pageType} canEdit={podeAdministrarBases} />
          ) : !hasBody ? (
            <p className="text-sm text-slate-500">
              Esta página ainda não tem conteúdo.
            </p>
          ) : richDoc ? (
            <RichTextContent doc={richDoc} />
          ) : (
            <Markdown content={page.content ?? ""} />
          )}
        </CardBody>
      </Card>

      <div className="mt-6">
        <AttachmentPanel
          ownerType="doc_page"
          ownerId={page.id}
          items={anexos.map((item) => ({
            id: item.id,
            kind: item.kind,
            title: item.title,
            url: item.url,
            mimeType: item.mimeType,
            sizeBytes: item.sizeBytes,
            authorName: item.authorName,
          }))}
          canEdit={canEdit}
          revalidatePath={`/documentacao/${category.slug}/${page.slug}`}
          description="PDFs, planilhas e links do Drive ligados a este documento. PDF e imagem abrem aqui mesmo."
        />
      </div>
    </>
  );
}
