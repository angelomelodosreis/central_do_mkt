import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { getAbComparisonData } from "@/lib/modules/insights/queries";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await requireUser();
  } catch (authError) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const pageAId = searchParams.get("pageA");
  const pageBId = searchParams.get("pageB");
  const periodDays = searchParams.get("period") ? parseInt(searchParams.get("period")!, 10) : 30;
  const viewport = searchParams.get("viewport") || "all";

  if (!pageAId || !pageBId) {
    return NextResponse.json(
      { error: "Parâmetros 'pageA' e 'pageB' são obrigatórios" },
      { status: 400 }
    );
  }

  try {
    const comparison = await getAbComparisonData(pageAId, pageBId, {
      periodDays,
      viewport,
    });

    if (!comparison) {
      return NextResponse.json(
        { error: "Uma ou ambas as páginas não foram encontradas" },
        { status: 404 }
      );
    }

    return NextResponse.json(comparison);
  } catch (error: any) {
    console.error("Erro na comparação A/B:", error);
    return NextResponse.json(
      { error: "Erro interno ao processar comparação A/B" },
      { status: 500 }
    );
  }
}
