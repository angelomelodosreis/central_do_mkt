import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { getPageElementsRanking, getPageUtmBreakdown } from "@/lib/modules/insights/queries";

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

  const viewport = (searchParams.get("viewport") as any) || undefined;
  const version = searchParams.get("version") || undefined;
  const periodDays = searchParams.get("period") ? parseInt(searchParams.get("period")!, 10) : 30;

  const [elements, utms] = await Promise.all([
    getPageElementsRanking(id, { viewport, version, periodDays }),
    getPageUtmBreakdown(id, periodDays),
  ]);

  return NextResponse.json({ elements, utms });
}
