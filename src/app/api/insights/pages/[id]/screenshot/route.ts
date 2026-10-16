import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { insightPage } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireUser();
  } catch (authError) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const viewport = searchParams.get("viewport") === "mobile" ? "mobile" : "desktop";

  const db = await getDb();
  const page = await db
    .select({
      id: insightPage.id,
      url: insightPage.url,
      screenshotUrlDesktop: insightPage.screenshotUrlDesktop,
      screenshotUrlMobile: insightPage.screenshotUrlMobile,
    })
    .from(insightPage)
    .where(eq(insightPage.id, id))
    .get();

  if (!page) {
    return NextResponse.json({ error: "Página não encontrada" }, { status: 404 });
  }

  const customUrl = viewport === "mobile" ? page.screenshotUrlMobile : page.screenshotUrlDesktop;
  if (customUrl) {
    return NextResponse.redirect(customUrl, 307);
  }

  // Geração automática e confiável de Screenshot da Landing Page
  const targetUrl = page.url;
  const autoScreenshotUrl =
    viewport === "mobile"
      ? `https://api.microlink.io?url=${encodeURIComponent(targetUrl)}&screenshot=true&meta=false&embed=screenshot.url&viewport.isMobile=true&viewport.width=390&viewport.height=844`
      : `https://api.microlink.io?url=${encodeURIComponent(targetUrl)}&screenshot=true&meta=false&embed=screenshot.url`;

  return NextResponse.redirect(autoScreenshotUrl, 307);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireUser();
  } catch (authError) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const db = await getDb();

  try {
    const body = await request.json();
    const screenshotUrlDesktop = body.screenshotUrlDesktop || body.desktopUrl || null;
    const screenshotUrlMobile = body.screenshotUrlMobile || body.mobileUrl || null;

    await db
      .update(insightPage)
      .set({
        screenshotUrlDesktop: screenshotUrlDesktop || undefined,
        screenshotUrlMobile: screenshotUrlMobile || undefined,
        screenshotUpdatedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(insightPage.id, id));

    return NextResponse.json({ ok: true, screenshotUpdatedAt: new Date().toISOString() });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Falha ao atualizar screenshot", details: err?.message },
      { status: 500 }
    );
  }
}
