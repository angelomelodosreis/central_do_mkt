import { getDb } from "@/lib/db/client";
import {
  insightEvent,
  insightPage,
  INSIGHT_EVENT_TYPES,
  type InsightEventType,
  type InsightViewport,
  type NewInsightEvent,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * Domínios autorizados a enviar telemetria comportamental para a Central
 */
const ALLOWED_ORIGIN_PATTERNS = [
  /^https?:\/\/localhost(:\d+)?$/,
  /^https?:\/\/127\.0\.0\.1(:\d+)?$/,
  /^https?:\/\/([a-zA-Z0-9-]+\.)*grupomedcof\.com\.br$/,
  /^https?:\/\/([a-zA-Z0-9-]+\.)*medcof\.com\.br$/,
  /^https?:\/\/([a-zA-Z0-9-]+\.)*medcofderma\.com\.br$/,
  /^https?:\/\/([a-zA-Z0-9-]+\.)*medcofendocrino\.com\.br$/,
  /^https?:\/\/([a-zA-Z0-9-]+\.)*medcof[a-zA-Z0-9-]*\.com\.br$/,
  /^https?:\/\/([a-zA-Z0-9-]+\.)*pages\.dev$/,
  /^https?:\/\/([a-zA-Z0-9-]+\.)*vercel\.app$/,
];

export function isOriginAllowed(origin: string | null | undefined): boolean {
  if (!origin) return true; // Requisições sem Origin (ex: mobile webview ou servidor)
  try {
    const url = new URL(origin);
    const hostWithProtocol = `${url.protocol}//${url.host}`;
    return ALLOWED_ORIGIN_PATTERNS.some((pattern) => pattern.test(hostWithProtocol));
  } catch (e) {
    return false;
  }
}

/**
 * Cache em memória para rate limiting simples de ingestão por IP
 * Permite até 300 eventos por minuto por IP
 */
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(ip: string, limit = 300, windowMs = 60000): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (record.count >= limit) {
    return false;
  }

  record.count += 1;
  return true;
}

// Limpeza periódica do mapa de rate limiting a cada 5 minutos
if (typeof setInterval !== "undefined") {
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [key, value] of rateLimitMap.entries()) {
      if (now > value.resetAt) {
        rateLimitMap.delete(key);
      }
    }
  }, 300000);
  if (typeof (timer as any)?.unref === "function") {
    (timer as any).unref();
  }
}

/**
 * Bloqueador estrito de PII:
 * Garante que nenhum campo de texto digitado, senha, CPF ou dado pessoal seja ingerido
 */
const FORBIDDEN_KEYS = [
  "password",
  "senha",
  "cpf",
  "credit_card",
  "card",
  "cvv",
  "token",
  "secret",
  "auth",
  "bearer",
];

export function sanitizeAndValidateEvent(raw: any): NewInsightEvent | null {
  if (!raw || typeof raw !== "object") return null;

  const eventType = String(raw.event_type || raw.eventType || "").toLowerCase();
  if (!INSIGHT_EVENT_TYPES.includes(eventType as InsightEventType)) {
    return null;
  }

  // Verifica se há chaves proibidas no objeto
  const allKeys = Object.keys(raw).map((k) => k.toLowerCase());
  for (const forbidden of FORBIDDEN_KEYS) {
    if (allKeys.some((k) => k.includes(forbidden))) {
      return null;
    }
  }

  const pageId = String(raw.page_id || raw.pageId || "default-lp").slice(0, 100);
  const pageUrl = String(raw.page_url || raw.pageUrl || "").slice(0, 500);
  const pagePath = String(raw.page_path || raw.pagePath || "/").slice(0, 255);
  const pageVersion = String(raw.page_version || raw.pageVersion || "v1").slice(0, 20);

  const rawViewport = String(raw.viewport || "desktop").toLowerCase();
  const viewport: InsightViewport = rawViewport === "mobile" ? "mobile" : "desktop";

  let x: number | null = null;
  if (typeof raw.x === "number" && !isNaN(raw.x)) {
    x = Math.max(0, Math.min(1000, Math.round(raw.x)));
  }

  let y: number | null = null;
  if (typeof raw.y === "number" && !isNaN(raw.y)) {
    y = Math.max(0, Math.min(1000, Math.round(raw.y)));
  }

  let scrollPercent: number | null = null;
  if (typeof raw.scroll_percent === "number" && !isNaN(raw.scroll_percent)) {
    scrollPercent = Math.max(0, Math.min(100, Math.round(raw.scroll_percent)));
  } else if (typeof raw.scrollPercent === "number" && !isNaN(raw.scrollPercent)) {
    scrollPercent = Math.max(0, Math.min(100, Math.round(raw.scrollPercent)));
  }

  const elementId = raw.element_id || raw.elementId ? String(raw.element_id || raw.elementId).slice(0, 100) : null;
  const elementLabel = raw.element_label || raw.elementLabel ? String(raw.element_label || raw.elementLabel).slice(0, 100) : null;
  const sectionId = raw.section_id || raw.sectionId ? String(raw.section_id || raw.sectionId).slice(0, 80) : null;

  const utmSource = raw.utm_source || raw.utmSource ? String(raw.utm_source || raw.utmSource).slice(0, 100) : null;
  const utmMedium = raw.utm_medium || raw.utmMedium ? String(raw.utm_medium || raw.utmMedium).slice(0, 100) : null;
  const utmCampaign = raw.utm_campaign || raw.utmCampaign ? String(raw.utm_campaign || raw.utmCampaign).slice(0, 100) : null;
  const referrer = raw.referrer ? String(raw.referrer).slice(0, 255) : null;
  const sessionId = raw.session_id || raw.sessionId ? String(raw.session_id || raw.sessionId).slice(0, 60) : null;

  const timestamp = typeof raw.timestamp === "number" && raw.timestamp > 0 ? new Date(raw.timestamp) : new Date();

  return {
    id: `live_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    pageId,
    pageUrl: pageUrl || "https://grupomedcof.com.br",
    pagePath,
    pageVersion,
    eventType: eventType as InsightEventType,
    elementId,
    elementLabel,
    sectionId,
    viewport,
    x,
    y,
    scrollPercent,
    utmSource,
    utmMedium,
    utmCampaign,
    referrer,
    sessionId,
    createdAt: timestamp,
  };
}

/**
 * Garante que a página monitorada exista no banco de dados para integridade
 */
async function ensurePageExists(pageId: string, pageUrl: string, version: string) {
  const db = await getDb();
  const existing = await db
    .select({ id: insightPage.id })
    .from(insightPage)
    .where(eq(insightPage.id, pageId))
    .get();

  if (!existing) {
    const parsedUrl = new URL(pageUrl || "https://grupomedcof.com.br");
    const name = pageId
      .replace(/^lp-/, "")
      .replace(/-/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase());

    await db.insert(insightPage).values({
      id: pageId,
      name: name || pageId,
      url: pageUrl || `https://${parsedUrl.hostname}`,
      version: version || "v1",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
}

/**
 * Ingestão de lote de eventos no banco de dados com segurança
 */
export async function ingestEventsBatch(rawEvents: any[]): Promise<{ ingested: number; rejected: number }> {
  if (!Array.isArray(rawEvents) || rawEvents.length === 0) {
    return { ingested: 0, rejected: 0 };
  }

  const validEvents: NewInsightEvent[] = [];
  let rejected = 0;

  for (const raw of rawEvents) {
    const valid = sanitizeAndValidateEvent(raw);
    if (valid) {
      validEvents.push(valid);
    } else {
      rejected += 1;
    }
  }

  if (validEvents.length === 0) {
    return { ingested: 0, rejected };
  }

  // Agrupa por pageId para garantir criação das páginas no banco
  const uniquePages = new Map<string, { url: string; version: string }>();
  for (const ev of validEvents) {
    if (!uniquePages.has(ev.pageId)) {
      uniquePages.set(ev.pageId, { url: ev.pageUrl, version: ev.pageVersion || "v1" });
    }
  }

  for (const [pId, info] of uniquePages.entries()) {
    try {
      await ensurePageExists(pId, info.url, info.version);
    } catch (e) {
      // Ignora erro de concorrência se já existir
    }
  }

  const db = await getDb();
  // Insere em lotes de 50 para LibSQL
  const CHUNK_SIZE = 50;
  for (let i = 0; i < validEvents.length; i += CHUNK_SIZE) {
    const chunk = validEvents.slice(i, i + CHUNK_SIZE);
    await db.insert(insightEvent).values(chunk);
  }

  return { ingested: validEvents.length, rejected };
}
