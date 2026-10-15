import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { insightPage } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";

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
