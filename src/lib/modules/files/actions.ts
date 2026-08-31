"use server";

import { revalidatePath } from "next/cache";
import { and, eq, max } from "drizzle-orm";

import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import {
  attachment,
  ATTACHMENT_OWNER_TYPES,
  type AttachmentOwnerType,
} from "@/lib/db/schema";
import { writeAuditLog } from "@/lib/modules/audit/log";
import { describeEmbed } from "@/lib/modules/files/embed";
import { canAccessOwner } from "@/lib/modules/files/queries";
import { deleteStored, storeUpload } from "@/lib/modules/files/storage";
import { newId } from "@/lib/utils/id";

export type AttachmentFormState = {
  status: "idle" | "success" | "error";
  message?: string;
};

export const INITIAL_ATTACHMENT_STATE: AttachmentFormState = { status: "idle" };

function parseOwnerType(value: unknown): AttachmentOwnerType | null {
  return ATTACHMENT_OWNER_TYPES.includes(value as AttachmentOwnerType)
    ? (value as AttachmentOwnerType)
    : null;
}

/**
 * Quem pode anexar é quem pode ler o registro dono.
 *
 * Deliberadamente igual ao acesso de leitura, e não à permissão de editar o
 * módulo: anexar uma planilha a uma tarefa que é sua não é editar a tarefa, é
 * responder a ela. Exigir permissão de edição aqui deixaria o analista sem como
 * devolver o material de uma tarefa que ele mesmo recebeu.
 */
async function gate(ownerType: AttachmentOwnerType, ownerId: string) {
  const currentUser = await requireUser();
  const allowed = await canAccessOwner(ownerType, ownerId, currentUser);
  return allowed ? currentUser : null;
}

async function nextPosition(
  ownerType: AttachmentOwnerType,
  ownerId: string,
): Promise<number> {
  const db = await getDb();
  const row = await db
    .select({ maior: max(attachment.position) })
    .from(attachment)
    .where(
      and(eq(attachment.ownerType, ownerType), eq(attachment.ownerId, ownerId)),
    )
    .get();

  return (row?.maior ?? -1) + 1;
}

/**
 * Revalida a tela que exibe o anexo.
 *
 * O caminho vem do formulário porque um anexo pode estar pendurado em telas de
 * módulos diferentes — a alternativa seria revalidar a aplicação inteira a cada
 * upload.
 */
function revalidateOrigin(formData: FormData) {
  const origin = String(formData.get("revalidatePath") ?? "");
  if (origin.startsWith("/")) revalidatePath(origin, "layout");
}

/** Sobe um arquivo e o pendura no registro. */
export async function uploadAttachment(
  _previousState: AttachmentFormState,
  formData: FormData,
): Promise<AttachmentFormState> {
  const ownerType = parseOwnerType(formData.get("ownerType"));
  const ownerId = String(formData.get("ownerId") ?? "");
  if (!ownerType || !ownerId) {
    return {
      status: "error",
      message: "Registro de destino não identificado.",
    };
  }

  const currentUser = await gate(ownerType, ownerId);
  if (!currentUser) {
    return { status: "error", message: "Você não tem acesso a este registro." };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || !file.name) {
    return { status: "error", message: "Escolha um arquivo." };
  }

  const stored = await storeUpload(file, ownerType);
  if (!stored.ok) return { status: "error", message: stored.message };

  const title =
    String(formData.get("title") ?? "").trim() || stored.file.filename;
  const db = await getDb();
  const attachmentId = newId("att");

  await db.insert(attachment).values({
    id: attachmentId,
    ownerType,
    ownerId,
    kind: "upload",
    title,
    url: stored.file.url,
    storageProvider: stored.file.provider,
    storageKey: stored.file.storageKey,
    mimeType: stored.file.mimeType,
    sizeBytes: stored.file.sizeBytes,
    position: await nextPosition(ownerType, ownerId),
    createdBy: currentUser.id,
    createdAt: new Date(),
  });

  await writeAuditLog({
    actorUserId: currentUser.id,
    actorEmail: currentUser.email,
    action: "attachment.create",
    entityType: "attachment",
    entityId: attachmentId,
    summary: `Anexou o arquivo "${title}"`,
    afterData: {
      ownerType,
      ownerId,
      kind: "upload",
      mimeType: stored.file.mimeType,
      sizeBytes: stored.file.sizeBytes,
    },
  });

  revalidateOrigin(formData);
  return { status: "success", message: `"${title}" anexado.` };
}

/**
 * Pendura um link do Google Drive (ou qualquer endereço) no registro.
 *
 * É o caminho para arquivo que já vive no Drive: nada é copiado, guardamos o
 * endereço e exibimos embutido. A permissão de abrir continua sendo a do Drive,
 * o que é o comportamento correto para material que já é gerido lá — e evita
 * que a plataforma se torne uma segunda cópia desatualizada.
 */
export async function linkAttachment(
  _previousState: AttachmentFormState,
  formData: FormData,
): Promise<AttachmentFormState> {
  const ownerType = parseOwnerType(formData.get("ownerType"));
  const ownerId = String(formData.get("ownerId") ?? "");
  if (!ownerType || !ownerId) {
    return {
      status: "error",
      message: "Registro de destino não identificado.",
    };
  }

  const currentUser = await gate(ownerType, ownerId);
  if (!currentUser) {
    return { status: "error", message: "Você não tem acesso a este registro." };
  }

  const rawUrl = String(formData.get("url") ?? "").trim();
  const embed = rawUrl ? describeEmbed(rawUrl) : null;

  if (!embed) {
    return {
      status: "error",
      message:
        "Cole um endereço http(s) válido — por exemplo, o link de um Google Doc.",
    };
  }

  const title =
    String(formData.get("title") ?? "").trim() ||
    // Sem título, o nome vira o caminho do link, que é ruim mas honesto —
    // melhor que uma linha em branco na lista.
    new URL(rawUrl).pathname.split("/").filter(Boolean).slice(-1)[0] ||
    rawUrl;

  const db = await getDb();
  const attachmentId = newId("att");

  await db.insert(attachment).values({
    id: attachmentId,
    ownerType,
    ownerId,
    kind: "link",
    title,
    url: rawUrl,
    storageProvider: null,
    storageKey: null,
    mimeType: null,
    sizeBytes: null,
    position: await nextPosition(ownerType, ownerId),
    createdBy: currentUser.id,
    createdAt: new Date(),
  });

  await writeAuditLog({
    actorUserId: currentUser.id,
    actorEmail: currentUser.email,
    action: "attachment.create",
    entityType: "attachment",
    entityId: attachmentId,
    summary: `Vinculou "${title}" (${embed.kind})`,
    afterData: { ownerType, ownerId, kind: "link", url: rawUrl },
  });

  revalidateOrigin(formData);
  return { status: "success", message: `"${title}" vinculado.` };
}

/** Remove o anexo e, quando é upload nosso, o binário também. */
export async function deleteAttachment(formData: FormData): Promise<void> {
  const attachmentId = String(formData.get("attachmentId") ?? "");
  if (!attachmentId) return;

  const db = await getDb();
  const row = await db
    .select()
    .from(attachment)
    .where(eq(attachment.id, attachmentId))
    .get();

  if (!row) return;

  const currentUser = await gate(row.ownerType, row.ownerId);
  if (!currentUser) return;

  await db.delete(attachment).where(eq(attachment.id, attachmentId));

  if (row.kind === "upload") {
    await deleteStored(row.storageProvider, row.storageKey, row.url);
  }

  await writeAuditLog({
    actorUserId: currentUser.id,
    actorEmail: currentUser.email,
    action: "attachment.delete",
    entityType: "attachment",
    entityId: attachmentId,
    summary: `Removeu o anexo "${row.title}"`,
    beforeData: {
      ownerType: row.ownerType,
      ownerId: row.ownerId,
      kind: row.kind,
      title: row.title,
      url: row.url,
    },
  });

  revalidateOrigin(formData);
}
