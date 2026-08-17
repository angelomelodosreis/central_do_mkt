"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, ne } from "drizzle-orm";

import type { DocFormState } from "./form-state";
import { requirePermission } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import {
  DOC_VISIBILITIES,
  documentationCategory,
  documentationPage,
  type DocVisibility,
} from "@/lib/db/schema";
import { writeAuditLog } from "@/lib/modules/audit/log";
import {
  buildSearchText,
  normalizeRichInput,
} from "@/lib/modules/documentation/rich-text";
import { toKebabCase } from "@/lib/modules/documentation/slug";
import { newId } from "@/lib/utils/id";

function parseVisibility(value: unknown): DocVisibility {
  return DOC_VISIBILITIES.includes(value as DocVisibility)
    ? (value as DocVisibility)
    : "all_active_users";
}

/** Cria uma página de documentação. */
export async function createDocPage(
  _previousState: DocFormState,
  formData: FormData,
): Promise<DocFormState> {
  const currentUser = await requirePermission("documentation", "edit");

  const title = String(formData.get("title") ?? "").trim();
  const categoryId = String(formData.get("categoryId") ?? "");
  const summary = String(formData.get("summary") ?? "").trim();
  const content = normalizeRichInput(String(formData.get("content") ?? ""));
  const visibility = parseVisibility(formData.get("visibility"));

  if (!title) return { status: "error", message: "Informe o título da página." };
  if (!categoryId) {
    return { status: "error", message: "Escolha uma categoria." };
  }

  const slug = toKebabCase(title);
  if (!slug) {
    return {
      status: "error",
      message: "O título precisa ter ao menos uma letra ou número.",
    };
  }

  const db = await getDb();

  const category = await db
    .select({ id: documentationCategory.id, slug: documentationCategory.slug })
    .from(documentationCategory)
    .where(eq(documentationCategory.id, categoryId))
    .get();

  if (!category) {
    return { status: "error", message: "Essa categoria não existe mais." };
  }

  const duplicate = await db
    .select({ id: documentationPage.id })
    .from(documentationPage)
    .where(
      and(
        eq(documentationPage.categoryId, categoryId),
        eq(documentationPage.slug, slug),
      ),
    )
    .get();

  if (duplicate) {
    return {
      status: "error",
      message:
        "Já existe uma página com esse título nessa categoria. Escolha outro título.",
    };
  }

  const pageId = newId("page");
  const now = new Date();

  await db.insert(documentationPage).values({
    id: pageId,
    categoryId,
    slug,
    title,
    summary: summary || null,
    pageType: "standard",
    // Tudo que nasce agora vem do editor visual, já estruturado.
    contentFormat: "rich_text",
    content,
    searchText: buildSearchText({
      title,
      summary: summary || null,
      content,
      contentFormat: "rich_text",
    }),
    visibility,
    sortOrder: 100,
    createdBy: currentUser.id,
    updatedBy: currentUser.id,
    createdAt: now,
    updatedAt: now,
  });

  await writeAuditLog({
    actorUserId: currentUser.id,
    actorEmail: currentUser.email,
    action: "doc_page.create",
    entityType: "doc_page",
    entityId: pageId,
    summary: `Criou a página de documentação "${title}"`,
    afterData: { title, slug, categoryId, visibility, content },
  });

  revalidatePath("/documentacao");
  redirect(`/documentacao/${category.slug}/${slug}`);
}

/** Salva a edição de uma página. */
export async function updateDocPage(
  _previousState: DocFormState,
  formData: FormData,
): Promise<DocFormState> {
  const currentUser = await requirePermission("documentation", "edit");

  const pageId = String(formData.get("pageId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const categoryId = String(formData.get("categoryId") ?? "");
  const summary = String(formData.get("summary") ?? "").trim();
  const content = normalizeRichInput(String(formData.get("content") ?? ""));
  const visibility = parseVisibility(formData.get("visibility"));

  if (!pageId) return { status: "error", message: "Página não identificada." };
  if (!title) return { status: "error", message: "Informe o título da página." };

  const db = await getDb();

  const existing = await db
    .select()
    .from(documentationPage)
    .where(eq(documentationPage.id, pageId))
    .get();

  if (!existing) {
    return { status: "error", message: "Essa página não existe mais." };
  }

  const targetCategoryId = categoryId || existing.categoryId;
  const slug = toKebabCase(title) || existing.slug;

  const duplicate = await db
    .select({ id: documentationPage.id })
    .from(documentationPage)
    .where(
      and(
        eq(documentationPage.categoryId, targetCategoryId),
        eq(documentationPage.slug, slug),
        ne(documentationPage.id, pageId),
      ),
    )
    .get();

  if (duplicate) {
    return {
      status: "error",
      message:
        "Já existe outra página com esse título nessa categoria. Escolha outro título.",
    };
  }

  await db
    .update(documentationPage)
    .set({
      title,
      slug,
      categoryId: targetCategoryId,
      summary: summary || null,
      // Páginas especiais (ex.: referência de BUs) têm o conteúdo gerado pelo
      // sistema; não sobrescrevemos com o campo do formulário.
      content: existing.pageType === "standard" ? content : existing.content,
      // Salvar uma página antiga a converte para o formato estruturado — foi o
      // editor visual que produziu este corpo.
      contentFormat:
        existing.pageType === "standard" ? "rich_text" : existing.contentFormat,
      searchText: buildSearchText({
        title,
        summary: summary || null,
        content: existing.pageType === "standard" ? content : existing.content,
        contentFormat:
          existing.pageType === "standard"
            ? "rich_text"
            : existing.contentFormat,
      }),
      visibility,
      updatedBy: currentUser.id,
      updatedAt: new Date(),
    })
    .where(eq(documentationPage.id, pageId));

  // `beforeData` é o que permite desfazer esta edição na tela de auditoria —
  // e, na prática, funciona como o histórico de versões da página.
  await writeAuditLog({
    actorUserId: currentUser.id,
    actorEmail: currentUser.email,
    action: "doc_page.update",
    entityType: "doc_page",
    entityId: pageId,
    summary: `Editou a página de documentação "${title}"`,
    beforeData: {
      title: existing.title,
      slug: existing.slug,
      categoryId: existing.categoryId,
      summary: existing.summary,
      content: existing.content,
      visibility: existing.visibility,
    },
    afterData: {
      title,
      slug,
      categoryId: targetCategoryId,
      summary: summary || null,
      content: existing.pageType === "standard" ? content : existing.content,
      visibility,
    },
  });

  const category = await db
    .select({ slug: documentationCategory.slug })
    .from(documentationCategory)
    .where(eq(documentationCategory.id, targetCategoryId))
    .get();

  revalidatePath("/documentacao");
  // Sem a categoria não há como montar o endereço da página; voltamos para a
  // listagem em vez de gerar uma URL quebrada como /documentacao//slug.
  redirect(category ? `/documentacao/${category.slug}/${slug}` : "/documentacao");
}

/**
 * Exclui uma página.
 *
 * O registro de auditoria guarda o conteúdo completo em `beforeData`, então a
 * exclusão é reversível pelo botão de desfazer na tela de auditoria.
 */
export async function deleteDocPage(formData: FormData): Promise<void> {
  const currentUser = await requirePermission("documentation", "edit");

  const pageId = String(formData.get("pageId") ?? "");
  if (!pageId) return;

  const db = await getDb();

  const existing = await db
    .select()
    .from(documentationPage)
    .where(eq(documentationPage.id, pageId))
    .get();

  if (!existing) redirect("/documentacao");

  await db.delete(documentationPage).where(eq(documentationPage.id, pageId));

  await writeAuditLog({
    actorUserId: currentUser.id,
    actorEmail: currentUser.email,
    action: "doc_page.delete",
    entityType: "doc_page",
    entityId: pageId,
    summary: `Excluiu a página de documentação "${existing.title}"`,
    beforeData: existing,
  });

  revalidatePath("/documentacao");
  redirect("/documentacao?aviso=pagina-excluida");
}

/** Cria uma categoria de documentação. */
export async function createDocCategory(
  _previousState: DocFormState,
  formData: FormData,
): Promise<DocFormState> {
  const currentUser = await requirePermission("documentation", "edit");

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const pageTemplate = normalizeRichInput(String(formData.get("pageTemplate") ?? ""));

  if (!name) return { status: "error", message: "Informe o nome da categoria." };

  const slug = toKebabCase(name);
  if (!slug) {
    return {
      status: "error",
      message: "O nome precisa ter ao menos uma letra ou número.",
    };
  }

  const db = await getDb();

  const duplicate = await db
    .select({ id: documentationCategory.id })
    .from(documentationCategory)
    .where(eq(documentationCategory.slug, slug))
    .get();

  if (duplicate) {
    return { status: "error", message: "Já existe uma categoria com esse nome." };
  }

  const categoryId = newId("cat");
  const now = new Date();

  await db.insert(documentationCategory).values({
    id: categoryId,
    slug,
    name,
    description: description || null,
    pageTemplate,
    sortOrder: 100,
    createdAt: now,
    updatedAt: now,
  });

  await writeAuditLog({
    actorUserId: currentUser.id,
    actorEmail: currentUser.email,
    action: "doc_category.create",
    entityType: "doc_category",
    entityId: categoryId,
    summary: `Criou a categoria de documentação "${name}"`,
    afterData: {
      name,
      slug,
      description: description || null,
      pageTemplate,
    },
  });

  revalidatePath("/documentacao");
  redirect(`/documentacao?aviso=categoria-criada`);
}

/**
 * Edita nome, descrição e modelo de página de uma categoria.
 *
 * Como em `updateDocPage`, o slug é regerado a partir do nome — o endereço
 * acompanha o título em vez de congelar um nome antigo.
 */
export async function updateDocCategory(
  _previousState: DocFormState,
  formData: FormData,
): Promise<DocFormState> {
  const currentUser = await requirePermission("documentation", "edit");

  const categoryId = String(formData.get("categoryId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const pageTemplate = normalizeRichInput(String(formData.get("pageTemplate") ?? ""));

  if (!categoryId) {
    return { status: "error", message: "Categoria não identificada." };
  }
  if (!name) return { status: "error", message: "Informe o nome da categoria." };

  const db = await getDb();
  const existing = await db
    .select()
    .from(documentationCategory)
    .where(eq(documentationCategory.id, categoryId))
    .get();

  if (!existing) {
    return { status: "error", message: "Essa categoria não existe mais." };
  }

  const slug = toKebabCase(name) || existing.slug;

  const duplicate = await db
    .select({ id: documentationCategory.id })
    .from(documentationCategory)
    .where(
      and(
        eq(documentationCategory.slug, slug),
        ne(documentationCategory.id, categoryId),
      ),
    )
    .get();

  if (duplicate) {
    return { status: "error", message: "Já existe outra categoria com esse nome." };
  }

  await db
    .update(documentationCategory)
    .set({
      name,
      slug,
      description: description || null,
      pageTemplate,
      updatedAt: new Date(),
    })
    .where(eq(documentationCategory.id, categoryId));

  await writeAuditLog({
    actorUserId: currentUser.id,
    actorEmail: currentUser.email,
    action: "doc_category.update",
    entityType: "doc_category",
    entityId: categoryId,
    summary: `Editou a categoria de documentação "${existing.name}"`,
    beforeData: {
      name: existing.name,
      slug: existing.slug,
      description: existing.description,
      pageTemplate: existing.pageTemplate,
    },
    afterData: {
      name,
      slug,
      description: description || null,
      pageTemplate,
    },
  });

  revalidatePath("/documentacao");
  redirect(`/documentacao/${slug}`);
}
