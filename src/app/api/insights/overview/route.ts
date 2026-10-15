import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { getInsightsOverview } from "@/lib/modules/insights/queries";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await requireUser();
  } catch (authError) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const buId = searchParams.get("buId") || undefined;
  const periodDays = searchParams.get("period") ? parseInt(searchParams.get("period")!, 10) : 30;
  const viewport = (searchParams.get("viewport") as any) || "all";

  const data = await getInsightsOverview({ buId, periodDays, viewport });
  return NextResponse.json(data);
}
