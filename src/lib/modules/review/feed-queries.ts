import { desc, eq, inArray, like, or } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import {
  businessUnit,
  planningReviewComment,
  planningReviewItem,
  type PlanningReviewComment,
  type PlanningReviewItem,
  type PlanningReviewStatus,
} from "@/lib/db/schema";

export type PlanningReviewWithComments = PlanningReviewItem & {
  businessUnit: {
    id: string;
    slug: string;
    label: string;
    code: string | null;
  };
  comments: PlanningReviewComment[];
};


export async function listReviewFeedItems(options?: {
  businessUnitId?: string;
  businessUnitSlug?: string;
  status?: PlanningReviewStatus | string;
  assignee?: string;
  coordinator?: string;
  search?: string;
}): Promise<PlanningReviewWithComments[]> {
  const db = await getDb();

  const query = db
    .select({
      item: planningReviewItem,
      bu: {
        id: businessUnit.id,
        slug: businessUnit.slug,
        label: businessUnit.label,
        code: businessUnit.code,
      },
    })
    .from(planningReviewItem)
    .innerJoin(businessUnit, eq(planningReviewItem.businessUnitId, businessUnit.id))
    .orderBy(desc(planningReviewItem.meetingDate), desc(planningReviewItem.createdAt));

  const rows = await query;

  if (rows.length === 0) {
    return [];
  }

  // Buscar todos os comentários dos itens retornados
  const itemIds = rows.map((r) => r.item.id);
  const comments = await db
    .select()
    .from(planningReviewComment)
    .where(inArray(planningReviewComment.reviewItemId, itemIds))
    .orderBy(planningReviewComment.createdAt);

  const commentsByItem = new Map<string, PlanningReviewComment[]>();
  for (const c of comments) {
    const list = commentsByItem.get(c.reviewItemId) ?? [];
    list.push(c);
    commentsByItem.set(c.reviewItemId, list);
  }

  let results: PlanningReviewWithComments[] = rows.map((r) => ({
    ...r.item,
    businessUnit: r.bu,
    comments: commentsByItem.get(r.item.id) ?? [],
  }));

  // Filtros em memória (rápidos e flexíveis)
  if (options?.businessUnitId && options.businessUnitId !== "all") {
    results = results.filter((r) => r.businessUnitId === options.businessUnitId);
  }

  if (options?.businessUnitSlug && options.businessUnitSlug !== "all") {
    results = results.filter((r) => r.businessUnit.slug === options.businessUnitSlug);
  }

  if (options?.status && options.status !== "all") {
    results = results.filter((r) => r.status === options.status);
  }

  if (options?.assignee && options.assignee !== "all") {
    const term = options.assignee.toLowerCase();
    results = results.filter((r) => r.assigneeName.toLowerCase().includes(term));
  }

  if (options?.coordinator && options.coordinator !== "all") {
    const term = options.coordinator.toLowerCase();
    results = results.filter((r) => r.coordinatorName.toLowerCase().includes(term));
  }

  if (options?.search && options.search.trim()) {
    const term = options.search.toLowerCase().trim();
    results = results.filter(
      (r) =>
        r.details.toLowerCase().includes(term) ||
        r.businessUnit.label.toLowerCase().includes(term) ||
        r.assigneeName.toLowerCase().includes(term) ||
        r.coordinatorName.toLowerCase().includes(term) ||
        (r.tags && r.tags.toLowerCase().includes(term)),
    );
  }

  return results;
}

export async function getReviewFeedItem(id: string): Promise<PlanningReviewWithComments | null> {
  const db = await getDb();
  const row = await db
    .select({
      item: planningReviewItem,
      bu: {
        id: businessUnit.id,
        slug: businessUnit.slug,
        label: businessUnit.label,
        code: businessUnit.code,
      },
    })
    .from(planningReviewItem)
    .innerJoin(businessUnit, eq(planningReviewItem.businessUnitId, businessUnit.id))
    .where(eq(planningReviewItem.id, id))
    .get();

  if (!row) return null;

  const comments = await db
    .select()
    .from(planningReviewComment)
    .where(eq(planningReviewComment.reviewItemId, id))
    .orderBy(planningReviewComment.createdAt);

  return {
    ...row.item,
    businessUnit: row.bu,
    comments,
  };
}
