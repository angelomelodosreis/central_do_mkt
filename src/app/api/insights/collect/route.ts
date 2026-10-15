import { NextResponse } from "next/server";
import { checkRateLimit, ingestEventsBatch, isOriginAllowed } from "@/lib/modules/insights/collector";

export const runtime = "nodejs";

function buildCorsHeaders(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Page-Id",
    "Access-Control-Max-Age": "86400",
  };
}

export async function OPTIONS(request: Request) {
  const origin = request.headers.get("origin");
  if (!isOriginAllowed(origin)) {
    return new NextResponse(null, { status: 403 });
  }
  return new NextResponse(null, {
    status: 204,
    headers: buildCorsHeaders(origin),
  });
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");

  // 1. Validar Origem
  if (!isOriginAllowed(origin)) {
    return NextResponse.json(
      { error: "Origem não permitida" },
      { status: 403, headers: buildCorsHeaders(origin) }
    );
  }

  // 2. Rate Limiting por IP
  const forwardedFor = request.headers.get("x-forwarded-for");
  const ip = forwardedFor ? forwardedFor.split(",")[0].trim() : "127.0.0.1";

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "Limite de requisições excedido" },
      { status: 429, headers: buildCorsHeaders(origin) }
    );
  }

  try {
    const body = await request.json();
    const events = Array.isArray(body?.events) ? body.events : Array.isArray(body) ? body : [body];

    if (!events || events.length === 0) {
      return NextResponse.json(
        { ok: true, ingested: 0 },
        { status: 200, headers: buildCorsHeaders(origin) }
      );
    }

    // Ingestão com sanitização e bloqueio de PII
    const result = await ingestEventsBatch(events);

    return NextResponse.json(
      { ok: true, ingested: result.ingested, rejected: result.rejected },
      { status: 200, headers: buildCorsHeaders(origin) }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: "Falha ao processar telemetria", details: err?.message },
      { status: 400, headers: buildCorsHeaders(origin) }
    );
  }
}
