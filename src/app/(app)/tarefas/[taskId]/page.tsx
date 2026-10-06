import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { and, desc, eq } from "drizzle-orm";
import { TaskRow, type TaskRowData } from "../task-row";
import { DeleteTaskButton } from "./delete-task-button";
import { AttachmentPanel } from "@/components/attachments/attachment-panel";
import { RichTextContent } from "@/components/rich-text/renderer";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { can, requirePermission } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { planningReviewItem } from "@/lib/db/schema";
import {
  isRichDocEmpty,
  parseRichDoc,
} from "@/lib/modules/documentation/rich-text";
import { listAttachments } from "@/lib/modules/files/queries";
import { getTaskForUser, relationFor } from "@/lib/modules/tasks/queries";
import { formatDateTime } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

type Params = Promise<{ taskId: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { taskId } = await params;
  const currentUser = await requirePermission("tasks", "view");
  const found = await getTaskForUser(taskId, currentUser);
  return { title: found?.title ?? "Tarefas" };
}

export default async function TaskDetailPage({ params }: { params: Params }) {
  const { taskId } = await params;
  const currentUser = await requirePermission("tasks", "view");

  const item = await getTaskForUser(taskId, currentUser);
  // Tarefa inexistente e tarefa de outra pessoa dão o mesmo 404: a fila de
  // pendências de alguém é informação dele.
  if (!item) notFound();

  const podeDelegar = can(currentUser, "tasks", "edit");
  const relation = relationFor(currentUser, item, { canDelegate: podeDelegar });

  const anexos = await listAttachments("task", item.id);

  let fullDescription = item.description;

  // Fallback para tarefas vindas de acompanhamentos onde o texto completo está em planningReviewItem
  if ((!fullDescription || fullDescription.length < 50) && item.title.startsWith("Follow-up")) {
    try {
      const db = await getDb();
      const reviewCandidate = await db
        .select({ details: planningReviewItem.details })
        .from(planningReviewItem)
        .where(
          item.businessUnitId
            ? eq(planningReviewItem.businessUnitId, item.businessUnitId)
            : undefined,
        )
        .orderBy(desc(planningReviewItem.createdAt))
        .limit(1)
        .get();
      if (reviewCandidate?.details) {
        fullDescription = reviewCandidate.details;
      }
    } catch {
      // Ignora erro no fallback
    }
  }

  const detalhes = parseRichDoc(fullDescription);

  const card: TaskRowData = {
    id: item.id,
    title: item.title,
    description: fullDescription,
    status: item.status,
    priority: item.priority,
    dueDate: item.dueDate?.toISOString() ?? null,
    blockedReason: item.blockedReason,
    assigneeId: item.assigneeId,
    assigneeName: item.assigneeName,
    assignedTeamName: item.assignedTeamName,
    businessUnitLabel: item.businessUnitLabel,
    businessUnitSlug: item.businessUnitSlug,
    createdByName: item.createdByName,
    createdAt: item.createdAt.toISOString(),
    relation,
  };

  return (
    <>
      <nav className="mb-4 text-sm text-slate-500">
        <Link href="/tarefas" className="hover:text-slate-900">
          Tarefas
        </Link>
        <span aria-hidden className="mx-1.5">
          /
        </span>
        <span className="text-slate-700">{item.title}</span>
      </nav>

      <Card>
        <CardBody className="px-0 py-0">
          <ul>
            <TaskRow task={card} destinos={[]} />
          </ul>
        </CardBody>
      </Card>

      {detalhes && !isRichDocEmpty(detalhes) ? (
        <div className="mt-6">
          <Card>
            <CardHeader
              title="O que deve ser feito"
              description="Instruções completas e detalhamento da tarefa"
            />
            <CardBody className="sm:px-6 sm:py-5">
              <RichTextContent doc={detalhes} />
            </CardBody>
          </Card>
        </div>
      ) : fullDescription && fullDescription.trim().length > 0 ? (
        <div className="mt-6">
          <Card>
            <CardHeader
              title="O que deve ser feito"
              description="Instruções completas e detalhamento da tarefa"
            />
            <CardBody className="sm:px-6 sm:py-5">
              <div className="whitespace-pre-wrap font-sans text-sm sm:text-base leading-relaxed text-slate-900 bg-slate-50/70 p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
                {fullDescription}
              </div>
            </CardBody>
          </Card>
        </div>
      ) : null}

      <div className="mt-6">
        <AttachmentPanel
          ownerType="task"
          ownerId={item.id}
          items={anexos.map((anexo) => ({
            id: anexo.id,
            kind: anexo.kind,
            title: anexo.title,
            url: anexo.url,
            mimeType: anexo.mimeType,
            sizeBytes: anexo.sizeBytes,
            authorName: anexo.authorName,
          }))}
          canEdit={relation.isAssignee || relation.isDelegator}
          revalidatePath={`/tarefas/${item.id}`}
          title="Entregas e material"
          description="Anexe aqui o resultado da tarefa, ou vincule o arquivo no Drive."
        />
      </div>

      <p className="mt-6 text-xs text-slate-500">
        Criada em {formatDateTime(item.createdAt)}
        {item.completedAt
          ? ` · concluída em ${formatDateTime(item.completedAt)}`
          : ""}
      </p>

      {relation.isDelegator ? (
        <div className="mt-4">
          <DeleteTaskButton taskId={item.id} title={item.title} />
        </div>
      ) : null}
    </>
  );
}
