"use server";

import { revalidatePath } from "next/cache";
import { desc, eq, sql } from "drizzle-orm";

import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { growthSession } from "@/lib/db/schema";
import { newId } from "@/lib/utils/id";
import { sanitizePlainText } from "@/lib/utils/text";
import { extractYoutubeId, normalizeVideoUrl } from "./utils";

export type ActionState = {
  success?: boolean;
  error?: string;
  id?: string;
};

/**
 * Cria ou cadastra uma nova Growth Session no acervo.
 * Suporta múltiplos tipos de materiais: vídeos (YouTube, Loom, Drive),
 * atas / resumos de IA, apresentações de slides, ferramentas e links extras.
 */
export async function createGrowthSessionAction(
  formData: FormData,
): Promise<ActionState> {
  try {
    const user = await requireUser();

    const titleRaw = formData.get("title")?.toString();
    const themeRaw = formData.get("theme")?.toString();
    const categoryRaw = formData.get("category")?.toString();
    const presenterRaw = formData.get("presenter")?.toString();
    const dateRaw = formData.get("date")?.toString();
    const timeRaw = formData.get("time")?.toString();
    const videoUrlRaw = formData.get("videoUrl")?.toString();
    const summaryUrlRaw = formData.get("summaryUrl")?.toString();
    const presentationUrlRaw = formData.get("presentationUrl")?.toString();
    const toolUrlRaw = formData.get("toolUrl")?.toString();
    const linksJsonRaw = formData.get("linksJson")?.toString();
    const descriptionRaw = formData.get("description")?.toString();

    const title = sanitizePlainText(titleRaw, 250);
    const theme = sanitizePlainText(themeRaw, 200);
    const category = sanitizePlainText(categoryRaw || "Estratégia", 80);
    const presenter = sanitizePlainText(presenterRaw, 120);
    const date = sanitizePlainText(dateRaw, 60);
    const time = timeRaw ? sanitizePlainText(timeRaw, 30) : null;
    const description = sanitizePlainText(descriptionRaw, 4000);

    if (!title) {
      return { error: "O título da Growth Session é obrigatório." };
    }
    if (!theme) {
      return { error: "O tema / foco da sessão é obrigatório." };
    }
    if (!presenter) {
      return { error: "O nome do(a) apresentador(a) é obrigatório." };
    }
    if (!date) {
      return { error: "A data da sessão é obrigatória." };
    }
    if (!description) {
      return { error: "A descrição ou principais aprendizados são obrigatórios." };
    }

    // Processamento do vídeo (YouTube ou URL externa)
    const normalizedVideoUrl = normalizeVideoUrl(videoUrlRaw);
    const youtubeId = normalizedVideoUrl ? extractYoutubeId(normalizedVideoUrl) : null;

    // Normalização das URLs de materiais
    const summaryUrl = summaryUrlRaw?.trim() ? normalizeVideoUrl(summaryUrlRaw) : null;
    const presentationUrl = presentationUrlRaw?.trim()
      ? normalizeVideoUrl(presentationUrlRaw)
      : null;
    const toolUrl = toolUrlRaw?.trim() ? normalizeVideoUrl(toolUrlRaw) : null;

    // Processamento de links extras
    let cleanLinksJson: string | null = null;
    if (linksJsonRaw) {
      try {
        const parsed = JSON.parse(linksJsonRaw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const validLinks = parsed
            .filter((item) => item && item.url && typeof item.url === "string" && item.url.trim().length > 0)
            .map((item) => ({
              label: sanitizePlainText(item.label || "Material complementar", 100),
              url: normalizeVideoUrl(item.url),
            }));
          if (validLinks.length > 0) {
            cleanLinksJson = JSON.stringify(validLinks);
          }
        }
      } catch {
        cleanLinksJson = null;
      }
    }

    const db = await getDb();

    // Obtém o próximo uploadOrder
    const maxOrderRow = await db
      .select({ maxOrder: sql<number>`MAX(${growthSession.uploadOrder})` })
      .from(growthSession)
      .get();

    const nextOrder = (maxOrderRow?.maxOrder ?? 0) + 1;
    const id = newId("gws");
    const now = new Date();

    await db.insert(growthSession).values({
      id,
      uploadOrder: nextOrder,
      title,
      theme,
      date,
      time: time || null,
      presenter,
      category: category || "Estratégia",
      youtubeId: youtubeId || null,
      videoUrl: normalizedVideoUrl || null,
      toolUrl: toolUrl || null,
      summaryUrl: summaryUrl || null,
      presentationUrl: presentationUrl || null,
      links: cleanLinksJson,
      description,
      createdBy: user.id,
      createdAt: now,
      updatedAt: now,
    });

    revalidatePath("/growth-sessions");
    return { success: true, id };
  } catch (err) {
    console.error("[createGrowthSessionAction] Erro ao cadastrar:", err);
    return {
      error:
        err instanceof Error ? err.message : "Erro ao cadastrar Growth Session. Tente novamente.",
    };
  }
}

/**
 * Remove uma Growth Session do catálogo.
 */
export async function deleteGrowthSessionAction(
  sessionId: string,
): Promise<ActionState> {
  try {
    await requireUser();
    if (!sessionId) {
      return { error: "ID da sessão é obrigatório." };
    }

    const db = await getDb();
    await db.delete(growthSession).where(eq(growthSession.id, sessionId));

    revalidatePath("/growth-sessions");
    return { success: true, id: sessionId };
  } catch (err) {
    console.error("[deleteGrowthSessionAction] Erro ao remover:", err);
    return {
      error: err instanceof Error ? err.message : "Erro ao remover sessão.",
    };
  }
}
