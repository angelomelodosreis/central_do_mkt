import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { getInsightPageById } from "@/lib/modules/insights/queries";
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
  const page = await getInsightPageById(id);

  if (!page) {
    return NextResponse.json({ error: "Página não encontrada" }, { status: 404 });
  }

  return NextResponse.json({ page });
}

export async function PATCH(
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
    const updateData: Partial<typeof insightPage.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (body.name !== undefined) updateData.name = String(body.name).trim();
    if (body.url !== undefined) updateData.url = String(body.url).trim();
    if (body.businessUnitId !== undefined) updateData.businessUnitId = body.businessUnitId;
    if (body.version !== undefined) updateData.version = String(body.version).trim();
    if (body.isActive !== undefined) updateData.isActive = Boolean(body.isActive);
    if (body.screenshotUrlDesktop !== undefined) updateData.screenshotUrlDesktop = body.screenshotUrlDesktop;
    if (body.screenshotUrlMobile !== undefined) updateData.screenshotUrlMobile = body.screenshotUrlMobile;
    if (body.screenshotUpdatedAt !== undefined) updateData.screenshotUpdatedAt = new Date(body.screenshotUpdatedAt);

    await db.update(insightPage).set(updateData).where(eq(insightPage.id, id));

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Falha ao atualizar página", details: err?.message },
      { status: 500 }
    );
  }
}
