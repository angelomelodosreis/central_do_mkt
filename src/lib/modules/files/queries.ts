import { and, asc, eq, inArray, or } from "drizzle-orm";

import type { CurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import {
  attachment,
  documentationPage,
  task,
  user,
  type Attachment,
  type AttachmentOwnerType,
} from "@/lib/db/schema";
import { docAccessFilter } from "@/lib/modules/documentation/queries";
import { seesAllBusinessUnits } from "@/lib/modules/org/scope";

export type AttachmentWithAuthor = Attachment & { authorName: string | null };

export async function listAttachments(
  ownerType: AttachmentOwnerType,
  ownerId: string,
): Promise<AttachmentWithAuthor[]> {
  const db = await getDb();

  const rows = await db
    .select({
      attachment,
      authorName: user.name,
    })
    .from(attachment)
    .leftJoin(user, eq(attachment.createdBy, user.id))
    .where(
      and(eq(attachment.ownerType, ownerType), eq(attachment.ownerId, ownerId)),
    )
    .orderBy(asc(attachment.position), asc(attachment.createdAt));

  return rows.map((row) => ({ ...row.attachment, authorName: row.authorName }));
}

/**
 * O anexo não tem permissão própria: ele herda a do registro a que pertence.
 *
 * Precisa ser assim porque o anexo é uma segunda porta para o mesmo conteúdo —
 * um PDF de pesquisa de mercado pendurado numa página interna de BU não pode ser
 * baixável por quem não abre a página. Sem esta checagem, o endereço do arquivo
 * viraria um contorno da regra de escopo.
 */
export async function canAccessOwner(
  ownerType: AttachmentOwnerType,
  ownerId: string,
  currentUser: CurrentUser,
): Promise<boolean> {
  const db = await getDb();

  if (ownerType === "doc_page") {
    const row = await db
      .select({ id: documentationPage.id })
      .from(documentationPage)
      .where(
        and(
          eq(documentationPage.id, ownerId),
          await docAccessFilter(currentUser),
        ),
      )
      .get();
    return Boolean(row);
  }

  // Tarefa: quem delega (coordenação) vê todas; os demais veem as suas — as
  // atribuídas a si, ao seu time, ou que eles mesmos criaram.
  if (seesAllBusinessUnits(currentUser)) {
    const row = await db
      .select({ id: task.id })
      .from(task)
      .where(eq(task.id, ownerId))
      .get();
    return Boolean(row);
  }

  const row = await db
    .select({ id: task.id })
    .from(task)
    .where(
      and(
        eq(task.id, ownerId),
        or(
          eq(task.assigneeId, currentUser.id),
          eq(task.createdBy, currentUser.id),
          // As MESMAS unidades que a fila usa — as da pessoa e as de cima.
          // Com `teamIds` cru, quem está no Design via a tarefa endereçada a
          // Conteúdo na própria fila e levava 404 ao abrir o anexo dela.
          currentUser.scope.taskOrgUnitIds.size > 0
            ? inArray(task.assignedTeamId, [
                ...currentUser.scope.taskOrgUnitIds,
              ])
            : undefined,
        ),
      ),
    )
    .get();

  return Boolean(row);
}

/** Busca um anexo já conferindo o acesso ao registro dono. */
export async function getAttachmentForUser(
  attachmentId: string,
  currentUser: CurrentUser,
): Promise<Attachment | null> {
  const db = await getDb();

  const row = await db
    .select()
    .from(attachment)
    .where(eq(attachment.id, attachmentId))
    .get();

  if (!row) return null;
  if (!(await canAccessOwner(row.ownerType, row.ownerId, currentUser))) {
    return null;
  }

  return row;
}
