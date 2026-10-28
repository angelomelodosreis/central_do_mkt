import { desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import {
  growthSession,
  type GrowthSession,
  type GrowthSessionExtraLink,
} from "@/lib/db/schema";
import { DEFAULT_GROWTH_SESSIONS } from "./constants";

export type GrowthSessionView = GrowthSession & {
  parsedLinks: GrowthSessionExtraLink[];
};

let tableEnsured = false;

/**
 * Garante que a tabela growth_session exista e que as 15 sessões oficiais estejam
 * semeadas, mesmo em ambientes onde a migration da CLI ainda não foi disparada manualmente.
 */
export async function ensureGrowthSessionTable(): Promise<void> {
  if (tableEnsured) return;

  try {
    const db = await getDb();

    // 1. Cria a tabela e índices se não existirem
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS growth_session (
        id text PRIMARY KEY NOT NULL,
        upload_order integer DEFAULT 1 NOT NULL,
        title text NOT NULL,
        theme text NOT NULL,
        date text NOT NULL,
        time text,
        presenter text NOT NULL,
        category text DEFAULT 'Estratégia' NOT NULL,
        youtube_id text,
        video_url text,
        tool_url text,
        summary_url text,
        presentation_url text,
        links text,
        description text NOT NULL,
        created_by text,
        created_at integer NOT NULL,
        updated_at integer NOT NULL
      );
    `);

    await db.run(
      sql`CREATE INDEX IF NOT EXISTS growth_session_order_idx ON growth_session (upload_order);`,
    );
    await db.run(
      sql`CREATE INDEX IF NOT EXISTS growth_session_category_idx ON growth_session (category);`,
    );
    await db.run(
      sql`CREATE INDEX IF NOT EXISTS growth_session_presenter_idx ON growth_session (presenter);`,
    );

    // 2. Verifica se está vazia e semeia os dados oficiais
    const countRes = await db
      .select({ count: sql<number>`count(*)` })
      .from(growthSession)
      .get();

    const count = Number(countRes?.count ?? 0);
    if (count === 0) {
      const now = new Date();
      for (const s of DEFAULT_GROWTH_SESSIONS) {
        await db.insert(growthSession).values({
          id: s.id,
          uploadOrder: s.uploadOrder,
          title: s.title,
          theme: s.theme,
          date: s.date,
          time: s.time,
          presenter: s.presenter,
          category: s.category,
          youtubeId: s.youtubeId,
          videoUrl: s.videoUrl,
          toolUrl: s.toolUrl,
          summaryUrl: s.summaryUrl,
          presentationUrl: s.presentationUrl,
          links: s.links,
          description: s.description,
          createdBy: s.createdBy,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    tableEnsured = true;
  } catch (err) {
    console.warn(
      "[ensureGrowthSessionTable] Aviso ao verificar/criar tabela de growth_session:",
      err,
    );
  }
}

/**
 * Lista todas as Growth Sessions cadastradas, ordenadas pela ordem de upload decrescente
 * (mais recentes primeiro).
 */
export async function listGrowthSessions(): Promise<GrowthSessionView[]> {
  await ensureGrowthSessionTable();

  try {
    const db = await getDb();

    const rows = await db
      .select()
      .from(growthSession)
      .orderBy(desc(growthSession.uploadOrder), desc(growthSession.createdAt));

    if (rows.length === 0) {
      return DEFAULT_GROWTH_SESSIONS;
    }

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
  } catch (err) {
    console.error("[listGrowthSessions] Erro ao consultar banco, usando fallback seguro:", err);
    return DEFAULT_GROWTH_SESSIONS;
  }
}

/**
 * Busca uma Growth Session específica por ID.
 */
export async function getGrowthSessionById(
  id: string,
): Promise<GrowthSessionView | null> {
  await ensureGrowthSessionTable();

  try {
    const db = await getDb();

    const row = await db
      .select()
      .from(growthSession)
      .where(eq(growthSession.id, id))
      .get();

    if (!row) {
      return DEFAULT_GROWTH_SESSIONS.find((s) => s.id === id) ?? null;
    }

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
  } catch {
    return DEFAULT_GROWTH_SESSIONS.find((s) => s.id === id) ?? null;
  }
}
