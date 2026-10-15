import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { listAllInsightPages } from "@/lib/modules/insights/queries";
import { getDb } from "@/lib/db/client";
import { insightPage } from "@/lib/db/schema";
import { sql } from "drizzle-orm";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireUser();
  } catch (authError) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const pages = await listAllInsightPages();
  return NextResponse.json({ pages });
}

export async function POST(request: Request) {
  let currentUser;
  try {
    currentUser = await requireUser();
  } catch (authError) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const name = String(body.name || "").trim();
    const url = String(body.url || "").trim();
    const businessUnitId = body.businessUnitId || null;
    const version = String(body.version || "v1").trim();

    if (!name || !url) {
      return NextResponse.json(
        { error: "Nome e URL são obrigatórios" },
        { status: 400 }
      );
    }

    // Gerar ID seguro a partir do nome ou URL
    const slugCandidate = name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    const id = `lp-${slugCandidate || Date.now()}`;
    const db = await getDb();

    // Se já existir por id ou url, retorna o id existente
    const existing = await db
      .select({ id: insightPage.id })
      .from(insightPage)
      .where(sql`${insightPage.id} = ${id} OR ${insightPage.url} = ${url}`)
      .get();

    if (existing) {
      return NextResponse.json({ ok: true, id: existing.id, existing: true }, { status: 200 });
    }

    await db.insert(insightPage).values({
      id,
      name,
      url,
      businessUnitId,
      version: version || "v1",
      isActive: body.isActive !== false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json({ ok: true, id }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Falha ao cadastrar página", details: err?.message },
      { status: 500 }
    );
  }
}
