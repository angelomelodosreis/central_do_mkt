import { desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import {
  growthSession,
  type GrowthSession,
  type GrowthSessionExtraLink,
} from "@/lib/db/schema";

export type GrowthSessionView = GrowthSession & {
  parsedLinks: GrowthSessionExtraLink[];
};

/**
 * Lista todas as Growth Sessions cadastradas, ordenadas pela ordem de upload decrescente
 * (mais recentes primeiro).
 */
export async function listGrowthSessions(): Promise<GrowthSessionView[]> {
  const db = await getDb();

  const rows = await db
    .select()
    .from(growthSession)
    .orderBy(desc(growthSession.uploadOrder), desc(growthSession.createdAt));

  return rows.map((session) => {
    let parsedLinks: GrowthSessionExtraLink[] = [];
    if (session.links) {
      try {
        const parsed = JSON.parse(session.links);
        if (Array.isArray(parsed)) {
          parsedLinks = parsed
            .filter((l) => l && typeof l.url === "string" && l.url.trim().length > 0)
            .map((l) => ({
              label: String(l.label || "Material complementar").trim(),
              url: String(l.url).trim(),
            }));
        }
      } catch {
        parsedLinks = [];
      }
    }

    return {
      ...session,
      parsedLinks,
    };
  });
}

/**
 * Busca uma Growth Session específica por ID.
 */
export async function getGrowthSessionById(
  id: string,
): Promise<GrowthSessionView | null> {
  const db = await getDb();

  const row = await db
    .select()
    .from(growthSession)
    .where(eq(growthSession.id, id))
    .get();

  if (!row) return null;

  let parsedLinks: GrowthSessionExtraLink[] = [];
  if (row.links) {
    try {
      const parsed = JSON.parse(row.links);
      if (Array.isArray(parsed)) {
        parsedLinks = parsed
          .filter((l) => l && typeof l.url === "string" && l.url.trim().length > 0)
          .map((l) => ({
            label: String(l.label || "Material complementar").trim(),
            url: String(l.url).trim(),
          }));
      }
    } catch {
      parsedLinks = [];
    }
  }

  return {
    ...row,
    parsedLinks,
  };
}
