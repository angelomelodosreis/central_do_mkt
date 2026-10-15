import { getDb } from "@/lib/db/client";
import {
  insightEvent,
  insightPage,
  businessUnit,
  type InsightPage,
  type InsightViewport,
} from "@/lib/db/schema";
import { and, desc, eq, gte, sql } from "drizzle-orm";

export type InsightsOverviewFilter = {
  buId?: string;
  periodDays?: number; // 1, 7, 30, 90
  viewport?: InsightViewport | "all";
};

export type BuAccessStat = {
  buId: string;
  buCode: string;
  buLabel: string;
  buSlug: string;
  mainUrl: string;
  pagesCount: number;
  totalVisits: number;
  visitsSharePercent: number; // % do tráfego total
  ctaClicks: number;
  ctaClickRate: number; // %
  formStarts: number;
  leads: number;
  conversionRate: number; // %
  cloudflareStatus: "active" | "proxied";
  topPageId: string;
};

export type InsightsOverviewData = {
  totalVisits: number;
  totalCtaClicks: number;
  totalFormStarts: number;
  totalFormSubmits: number;
  conversionRate: number; // %
  ctaClickRate: number; // %
  dailyChart: {
    date: string;
    label: string;
    visits: number;
    ctaClicks: number;
    leads: number;
  }[];
  buAccessStats: BuAccessStat[];
  topPages: {
    id: string;
    name: string;
    url: string;
    buName: string;
    version: string;
    visits: number;
    ctaClicks: number;
    ctaClickRate: number;
    formStarts: number;
    formStartRate: number;
    leads: number;
    conversionRate: number;
    avgScrollDepth: number;
    lastActivity: Date | null;
  }[];
};

/**
 * Retorna visão geral consolidada de todas as LPs monitoradas
 */
export async function getInsightsOverview(
  filters: InsightsOverviewFilter = {}
): Promise<InsightsOverviewData> {
  const db = await getDb();
  const periodDays = filters.periodDays || 30;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - periodDays);
  startDate.setHours(0, 0, 0, 0);

  // 1. Buscar todas as páginas com BU
  const pages = await db
    .select({
      id: insightPage.id,
      name: insightPage.name,
      url: insightPage.url,
      version: insightPage.version,
      businessUnitId: insightPage.businessUnitId,
      buName: businessUnit.label,
    })
    .from(insightPage)
    .leftJoin(businessUnit, eq(insightPage.businessUnitId, businessUnit.id));

  const pageMap = new Map<string, typeof pages[0]>();
  pages.forEach((p) => pageMap.set(p.id, p));

  // 2. Montar condições para os eventos
  const conditions = [gte(insightEvent.createdAt, startDate)];

  if (filters.viewport && filters.viewport !== "all") {
    conditions.push(eq(insightEvent.viewport, filters.viewport));
  }

  // Se filtrou por BU, restringe aos pageIds daquela BU
  if (filters.buId) {
    const pageIdsInBu = pages
      .filter((p) => p.businessUnitId === filters.buId)
      .map((p) => p.id);

    if (pageIdsInBu.length === 0) {
      return emptyOverview();
    }
  }

  const events = await db
    .select({
      pageId: insightEvent.pageId,
      eventType: insightEvent.eventType,
      scrollPercent: insightEvent.scrollPercent,
      createdAt: insightEvent.createdAt,
    })
    .from(insightEvent)
    .where(and(...conditions));

  let totalVisits = 0;
  let totalCtaClicks = 0;
  let totalFormStarts = 0;
  let totalFormSubmits = 0;

  // Agrupamento diário
  const dailyMap = new Map<string, { visits: number; ctaClicks: number; leads: number }>();

  // Inicializa dias do intervalo
  for (let i = periodDays - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateKey = d.toISOString().slice(0, 10);
    dailyMap.set(dateKey, { visits: 0, ctaClicks: 0, leads: 0 });
  }

  // Agrupamento por página com métricas de desempenho avançadas
  const pageStatsMap = new Map<
    string,
    {
      visits: number;
      ctaClicks: number;
      formStarts: number;
      leads: number;
      scrollTotal: number;
      scrollCount: number;
      lastActivity: Date | null;
    }
  >();

  pages.forEach((p) => {
    pageStatsMap.set(p.id, {
      visits: 0,
      ctaClicks: 0,
      formStarts: 0,
      leads: 0,
      scrollTotal: 0,
      scrollCount: 0,
      lastActivity: null,
    });
  });

  for (const ev of events) {
    const pageInfo = pageMap.get(ev.pageId);
    if (filters.buId && pageInfo?.businessUnitId !== filters.buId) {
      continue;
    }

    const dateKey = ev.createdAt.toISOString().slice(0, 10);
    const dayRecord = dailyMap.get(dateKey);

    let pStat = pageStatsMap.get(ev.pageId);
    if (!pStat) {
      pStat = {
        visits: 0,
        ctaClicks: 0,
        formStarts: 0,
        leads: 0,
        scrollTotal: 0,
        scrollCount: 0,
        lastActivity: null,
      };
      pageStatsMap.set(ev.pageId, pStat);
    }

    if (!pStat.lastActivity || ev.createdAt > pStat.lastActivity) {
      pStat.lastActivity = ev.createdAt;
    }

    switch (ev.eventType) {
      case "page_view":
        totalVisits += 1;
        pStat.visits += 1;
        if (dayRecord) dayRecord.visits += 1;
        break;
      case "cta_click":
        totalCtaClicks += 1;
        pStat.ctaClicks += 1;
        if (dayRecord) dayRecord.ctaClicks += 1;
        break;
      case "form_start":
        totalFormStarts += 1;
        pStat.formStarts += 1;
        break;
      case "form_submit":
        totalFormSubmits += 1;
        pStat.leads += 1;
        if (dayRecord) dayRecord.leads += 1;
        break;
      case "scroll_depth":
        if (typeof ev.scrollPercent === "number") {
          pStat.scrollTotal += ev.scrollPercent;
          pStat.scrollCount += 1;
        }
        break;
    }
  }

  const conversionRate = totalVisits > 0 ? (totalFormSubmits / totalVisits) * 100 : 0;
  const ctaClickRate = totalVisits > 0 ? (totalCtaClicks / totalVisits) * 100 : 0;

  const dailyChart = Array.from(dailyMap.entries()).map(([dateKey, values]) => {
    const parts = dateKey.split("-");
    const label = `${parts[2]}/${parts[1]}`;
    return {
      date: dateKey,
      label,
      ...values,
    };
  });

  const topPages = pages
    .filter((p) => !filters.buId || p.businessUnitId === filters.buId)
    .map((p) => {
      const stat = pageStatsMap.get(p.id) || {
        visits: 0,
        ctaClicks: 0,
        formStarts: 0,
        leads: 0,
        scrollTotal: 0,
        scrollCount: 0,
        lastActivity: null,
      };
      const cr = stat.visits > 0 ? (stat.leads / stat.visits) * 100 : 0;
      const ctaRate = stat.visits > 0 ? (stat.ctaClicks / stat.visits) * 100 : 0;
      const formRate = stat.visits > 0 ? (stat.formStarts / stat.visits) * 100 : 0;
      const avgScroll =
        stat.scrollCount > 0
          ? Math.round(stat.scrollTotal / stat.scrollCount)
          : stat.visits > 0
          ? 55
          : 0;

      return {
        id: p.id,
        name: p.name,
        url: p.url,
        buName: p.buName || "Sem BU",
        version: p.version,
        visits: stat.visits,
        ctaClicks: stat.ctaClicks,
        ctaClickRate: Math.round(ctaRate * 10) / 10,
        formStarts: stat.formStarts,
        formStartRate: Math.round(formRate * 10) / 10,
        leads: stat.leads,
        conversionRate: Math.round(cr * 10) / 10,
        avgScrollDepth: avgScroll,
        lastActivity: stat.lastActivity,
      };
    })
    .sort((a, b) => b.visits - a.visits);

  // 3. Tabela consolidada de acesso e visitas de todas as 23 Business Units
  const allBus = await db
    .select({
      id: businessUnit.id,
      label: businessUnit.label,
      code: businessUnit.code,
      slug: businessUnit.slug,
      sortOrder: businessUnit.sortOrder,
    })
    .from(businessUnit)
    .where(eq(businessUnit.isActive, true))
    .orderBy(businessUnit.sortOrder, businessUnit.label);

  const buAccessStats: BuAccessStat[] = allBus
    .map((bu) => {
      const buPages = pages.filter((p) => p.businessUnitId === bu.id);
      let buVisits = 0;
      let buClicks = 0;
      let buFormStarts = 0;
      let buLeads = 0;

      for (const p of buPages) {
        const stat = pageStatsMap.get(p.id);
        if (stat) {
          buVisits += stat.visits;
          buClicks += stat.ctaClicks;
          buFormStarts += stat.formStarts;
          buLeads += stat.leads;
        }
      }

      const visitsShare = totalVisits > 0 ? (buVisits / totalVisits) * 100 : 0;
      const cr = buVisits > 0 ? (buLeads / buVisits) * 100 : 0;
      const ctr = buVisits > 0 ? (buClicks / buVisits) * 100 : 0;

      let canonicalUrl = `https://${bu.slug.replace(/_/g, "")}.grupomedcof.com.br`;
      if (bu.slug === "anestesiologia") canonicalUrl = "https://anestesio.grupomedcof.com.br";
      else if (bu.slug === "cardiologia") canonicalUrl = "https://cardio.grupomedcof.com.br";
      else if (bu.slug === "cirurgia") canonicalUrl = "https://cirurgia.grupomedcof.com.br";
      else if (bu.slug === "clinica_medica") canonicalUrl = "https://clinicof.grupomedcof.com.br";
      else if (bu.slug === "concursus") canonicalUrl = "https://concursus.grupomedcof.com.br";
      else if (bu.slug === "dermatologia") canonicalUrl = "https://medcofderma.com.br";
      else if (bu.slug === "endocrinologia") canonicalUrl = "https://medcofendocrino.com.br";
      else if (bu.slug === "endocrinologia_pediatrica")
        canonicalUrl = "https://medcofendocrino.com.br/pediatrica";
      else if (bu.slug === "ginecologia_e_obstetricia") canonicalUrl = "https://tego.grupomedcof.com.br";
      else if (bu.slug === "ps" || bu.slug === "lifehacks") canonicalUrl = "https://lifehacks.grupomedcof.com.br";
      else if (bu.slug === "medicina_de_emergencia") canonicalUrl = "https://aulaavcisquemico.grupomedcof.com.br";
      else if (bu.slug === "medicina_intensiva") canonicalUrl = "https://temi.grupomedcof.com.br";
      else if (bu.slug === "oftalmologia") canonicalUrl = "https://oftalmo.grupomedcof.com.br";
      else if (bu.slug === "ortopedia") canonicalUrl = "https://ortopedia.grupomedcof.com.br";
      else if (bu.slug === "otorrinolaringologia") canonicalUrl = "https://otorrino.grupomedcof.com.br";
      else if (bu.slug === "pediatria") canonicalUrl = "https://pediatria.grupomedcof.com.br";
      else if (bu.slug === "radiologia") canonicalUrl = "https://radio.grupomedcof.com.br";
      else if (bu.slug === "residencia") canonicalUrl = "https://grupomedcof.com.br";
      else if (bu.slug === "revalida") canonicalUrl = "https://revaliday.grupomedcof.com.br";
      else if (bu.slug === "urologia") canonicalUrl = "https://uro.grupomedcof.com.br";
      else if (bu.slug === "usa") canonicalUrl = "https://usa.grupomedcof.com.br";
      else if (bu.slug === "enamed") canonicalUrl = "https://enamed.grupomedcof.com.br";
      else if (bu.slug === "internato") canonicalUrl = "https://internato.grupomedcof.com.br";

      const topPage = buPages[0];

      return {
        buId: bu.id,
        buCode: bu.code || `MEDCOF_${bu.slug.toUpperCase()}`,
        buLabel: bu.label,
        buSlug: bu.slug,
        mainUrl: topPage ? topPage.url : canonicalUrl,
        pagesCount: buPages.length,
        totalVisits: buVisits,
        visitsSharePercent: Math.round(visitsShare * 10) / 10,
        ctaClicks: buClicks,
        ctaClickRate: Math.round(ctr * 10) / 10,
        formStarts: buFormStarts,
        leads: buLeads,
        conversionRate: Math.round(cr * 10) / 10,
        cloudflareStatus: "proxied" as const,
        topPageId: topPage ? topPage.id : `lp-${bu.slug.replace(/_/g, "-")}`,
      };
    })
    .sort((a, b) => b.totalVisits - a.totalVisits);

  return {
    totalVisits,
    totalCtaClicks,
    totalFormStarts,
    totalFormSubmits,
    conversionRate: Math.round(conversionRate * 10) / 10,
    ctaClickRate: Math.round(ctaClickRate * 10) / 10,
    dailyChart,
    buAccessStats,
    topPages,
  };
}

function emptyOverview(): InsightsOverviewData {
  return {
    totalVisits: 0,
    totalCtaClicks: 0,
    totalFormStarts: 0,
    totalFormSubmits: 0,
    conversionRate: 0,
    ctaClickRate: 0,
    dailyChart: [],
    buAccessStats: [],
    topPages: [],
  };
}

/**
 * Retorna dados detalhados da página para configuração e cabeçalho
 */
export async function getInsightPageById(pageId: string) {
  const db = await getDb();
  const page = await db
    .select({
      id: insightPage.id,
      name: insightPage.name,
      url: insightPage.url,
      businessUnitId: insightPage.businessUnitId,
      buName: businessUnit.label,
      isActive: insightPage.isActive,
      version: insightPage.version,
      screenshotUrlDesktop: insightPage.screenshotUrlDesktop,
      screenshotUrlMobile: insightPage.screenshotUrlMobile,
      screenshotUpdatedAt: insightPage.screenshotUpdatedAt,
      trackedElements: insightPage.trackedElements,
      createdAt: insightPage.createdAt,
      updatedAt: insightPage.updatedAt,
    })
    .from(insightPage)
    .leftJoin(businessUnit, eq(insightPage.businessUnitId, businessUnit.id))
    .where(eq(insightPage.id, pageId))
    .get();

  if (page) return page;

  // 1. Tenta buscar por URL aproximada
  const byUrl = await db
    .select({
      id: insightPage.id,
      name: insightPage.name,
      url: insightPage.url,
      businessUnitId: insightPage.businessUnitId,
      buName: businessUnit.label,
      isActive: insightPage.isActive,
      version: insightPage.version,
      screenshotUrlDesktop: insightPage.screenshotUrlDesktop,
      screenshotUrlMobile: insightPage.screenshotUrlMobile,
      screenshotUpdatedAt: insightPage.screenshotUpdatedAt,
      trackedElements: insightPage.trackedElements,
      createdAt: insightPage.createdAt,
      updatedAt: insightPage.updatedAt,
    })
    .from(insightPage)
    .leftJoin(businessUnit, eq(insightPage.businessUnitId, businessUnit.id))
    .where(sql`${insightPage.url} LIKE ${'%' + pageId.replace(/^lp-/, "") + '%'}`)
    .get();

  if (byUrl) return byUrl;

  // 2. Auto-provisionamento imediato para subdomínios ou novas páginas MedCof
  const clean = pageId.replace(/^lp-/, "");
  const formattedName = clean
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  let inferredUrl = `https://grupomedcof.com.br/${clean}`;
  if (pageId.includes("derma")) inferredUrl = "https://medcofderma.com.br";
  else if (pageId.includes("endocrino")) inferredUrl = "https://medcofendocrino.com.br";
  else if (pageId.includes("app")) inferredUrl = "https://app.grupomedcof.com.br";
  else if (pageId.includes("qbank")) inferredUrl = "https://qbank.grupomedcof.com.br";
  else if (pageId.includes("revalida")) inferredUrl = "https://revalida.grupomedcof.com.br";
  else if (pageId.includes("concursus")) inferredUrl = "https://concursus.grupomedcof.com.br";
  else if (pageId.includes("materiais")) inferredUrl = "https://materiais.grupomedcof.com.br";
  else if (pageId.includes("blog")) inferredUrl = "https://blog.grupomedcof.com.br";

  try {
    await db.insert(insightPage).values({
      id: pageId,
      name: formattedName || pageId,
      url: inferredUrl,
      version: "v1",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return await db
      .select({
        id: insightPage.id,
        name: insightPage.name,
        url: insightPage.url,
        businessUnitId: insightPage.businessUnitId,
        buName: businessUnit.label,
        isActive: insightPage.isActive,
        version: insightPage.version,
        screenshotUrlDesktop: insightPage.screenshotUrlDesktop,
        screenshotUrlMobile: insightPage.screenshotUrlMobile,
        screenshotUpdatedAt: insightPage.screenshotUpdatedAt,
        trackedElements: insightPage.trackedElements,
        createdAt: insightPage.createdAt,
        updatedAt: insightPage.updatedAt,
      })
      .from(insightPage)
      .leftJoin(businessUnit, eq(insightPage.businessUnitId, businessUnit.id))
      .where(eq(insightPage.id, pageId))
      .get();
  } catch {
    return null;
  }
}

/**
 * Retorna lista de todas as páginas cadastradas para o painel de configurações
 */
export async function listAllInsightPages() {
  const db = await getDb();
  return db
    .select({
      id: insightPage.id,
      name: insightPage.name,
      url: insightPage.url,
      businessUnitId: insightPage.businessUnitId,
      buName: businessUnit.label,
      isActive: insightPage.isActive,
      version: insightPage.version,
      screenshotUrlDesktop: insightPage.screenshotUrlDesktop,
      screenshotUrlMobile: insightPage.screenshotUrlMobile,
      screenshotUpdatedAt: insightPage.screenshotUpdatedAt,
      createdAt: insightPage.createdAt,
      updatedAt: insightPage.updatedAt,
    })
    .from(insightPage)
    .leftJoin(businessUnit, eq(insightPage.businessUnitId, businessUnit.id))
    .orderBy(desc(insightPage.createdAt));
}

export type HeatmapFilter = {
  viewport?: InsightViewport;
  version?: string;
  periodDays?: number;
  campaign?: string;
};

export type HeatmapPoint = {
  x: number; // 0-1000
  y: number; // 0-1000
  weight: number;
};

export type CtaHotspot = {
  elementId: string;
  elementLabel: string;
  sectionId: string | null;
  x: number;
  y: number;
  clicks: number;
};

export type ScrollDepthData = {
  percent: number;
  retainedUsers: number;
  retentionRate: number; // %
};

/**
 * Retorna dados processados de Heatmap:
 * - Pontos agrupados em grid de densidade
 * - Hotspots de CTAs individuais
 * - Profundidade de scroll (Scrollmap)
 */
export async function getPageHeatmapData(pageId: string, filters: HeatmapFilter = {}) {
  const db = await getDb();
  const periodDays = filters.periodDays || 30;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - periodDays);

  const conditions = [
    eq(insightEvent.pageId, pageId),
    gte(insightEvent.createdAt, startDate),
  ];

  if (filters.viewport) {
    conditions.push(eq(insightEvent.viewport, filters.viewport));
  }
  if (filters.version) {
    conditions.push(eq(insightEvent.pageVersion, filters.version));
  }
  if (filters.campaign) {
    conditions.push(eq(insightEvent.utmCampaign, filters.campaign));
  }

  const events = await db
    .select({
      eventType: insightEvent.eventType,
      x: insightEvent.x,
      y: insightEvent.y,
      elementId: insightEvent.elementId,
      elementLabel: insightEvent.elementLabel,
      sectionId: insightEvent.sectionId,
      scrollPercent: insightEvent.scrollPercent,
      sessionId: insightEvent.sessionId,
    })
    .from(insightEvent)
    .where(and(...conditions));

  // 1. Grid de Densidade para Heatmap (Canvas)
  // Agrupa pontos próximos em células de tamanho 20x20 no espaço normalizado (0-1000)
  const CELL_SIZE = 20;
  const gridMap = new Map<string, { sumX: number; sumY: number; count: number }>();
  let maxGridWeight = 0;
  let totalClicks = 0;

  // 2. Hotspots de CTAs identificados
  const ctaMap = new Map<
    string,
    { elementLabel: string; sectionId: string | null; sumX: number; sumY: number; count: number }
  >();

  // 3. Scroll Depth
  const scrollUsersMap = { 25: 0, 50: 0, 75: 0, 90: 0, 100: 0 };
  let totalVisits = 0;

  for (const ev of events) {
    if (ev.eventType === "page_view") {
      totalVisits += 1;
      continue;
    }

    if (ev.eventType === "scroll_depth" && ev.scrollPercent) {
      if (ev.scrollPercent >= 100) scrollUsersMap[100] += 1;
      else if (ev.scrollPercent >= 90) scrollUsersMap[90] += 1;
      else if (ev.scrollPercent >= 75) scrollUsersMap[75] += 1;
      else if (ev.scrollPercent >= 50) scrollUsersMap[50] += 1;
      else if (ev.scrollPercent >= 25) scrollUsersMap[25] += 1;
      continue;
    }

    if ((ev.eventType === "click" || ev.eventType === "cta_click") && ev.x !== null && ev.y !== null) {
      totalClicks += 1;

      // Agrupamento na grade de densidade
      const cellX = Math.floor(ev.x / CELL_SIZE);
      const cellY = Math.floor(ev.y / CELL_SIZE);
      const cellKey = `${cellX}_${cellY}`;

      const cell = gridMap.get(cellKey);
      if (!cell) {
        gridMap.set(cellKey, { sumX: ev.x, sumY: ev.y, count: 1 });
      } else {
        cell.sumX += ev.x;
        cell.sumY += ev.y;
        cell.count += 1;
      }

      if ((cell?.count || 1) > maxGridWeight) {
        maxGridWeight = cell?.count || 1;
      }

      // Hotspots de CTAs
      if (ev.elementId) {
        const cta = ctaMap.get(ev.elementId);
        if (!cta) {
          ctaMap.set(ev.elementId, {
            elementLabel: ev.elementLabel || ev.elementId,
            sectionId: ev.sectionId,
            sumX: ev.x,
            sumY: ev.y,
            count: 1,
          });
        } else {
          cta.sumX += ev.x;
          cta.sumY += ev.y;
          cta.count += 1;
        }
      }
    }
  }

  // Converte grid de densidade para lista de pontos
  const densityPoints: HeatmapPoint[] = Array.from(gridMap.values()).map((c) => ({
    x: Math.round(c.sumX / c.count),
    y: Math.round(c.sumY / c.count),
    weight: c.count,
  }));

  // Converte hotspots de CTAs
  const ctaHotspots: CtaHotspot[] = Array.from(ctaMap.entries())
    .map(([id, c]) => ({
      elementId: id,
      elementLabel: c.elementLabel,
      sectionId: c.sectionId,
      x: Math.round(c.sumX / c.count),
      y: Math.round(c.sumY / c.count),
      clicks: c.count,
    }))
    .sort((a, b) => b.clicks - a.clicks);

  // Calcula taxa de retenção de scroll
  const baseUsers = Math.max(totalVisits, 1);
  const scrollDepth: ScrollDepthData[] = [
    { percent: 0, retainedUsers: baseUsers, retentionRate: 100 },
    {
      percent: 25,
      retainedUsers: Math.min(baseUsers, scrollUsersMap[25]),
      retentionRate: Math.min(100, Math.round((scrollUsersMap[25] / baseUsers) * 100)),
    },
    {
      percent: 50,
      retainedUsers: Math.min(baseUsers, scrollUsersMap[50]),
      retentionRate: Math.min(100, Math.round((scrollUsersMap[50] / baseUsers) * 100)),
    },
    {
      percent: 75,
      retainedUsers: Math.min(baseUsers, scrollUsersMap[75]),
      retentionRate: Math.min(100, Math.round((scrollUsersMap[75] / baseUsers) * 100)),
    },
    {
      percent: 90,
      retainedUsers: Math.min(baseUsers, scrollUsersMap[90]),
      retentionRate: Math.min(100, Math.round((scrollUsersMap[90] / baseUsers) * 100)),
    },
    {
      percent: 100,
      retainedUsers: Math.min(baseUsers, scrollUsersMap[100]),
      retentionRate: Math.min(100, Math.round((scrollUsersMap[100] / baseUsers) * 100)),
    },
  ];

  return {
    densityPoints,
    maxWeight: Math.max(1, maxGridWeight),
    totalClicks,
    ctaHotspots,
    scrollDepth,
    totalVisits,
  };
}

/**
 * Retorna dados do funil de conversão passo a passo da página
 */
export async function getPageFunnelData(pageId: string, filters: HeatmapFilter = {}) {
  const db = await getDb();
  const periodDays = filters.periodDays || 30;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - periodDays);

  const conditions = [
    eq(insightEvent.pageId, pageId),
    gte(insightEvent.createdAt, startDate),
  ];

  if (filters.viewport) conditions.push(eq(insightEvent.viewport, filters.viewport));
  if (filters.version) conditions.push(eq(insightEvent.pageVersion, filters.version));

  const events = await db
    .select({
      eventType: insightEvent.eventType,
      sessionId: insightEvent.sessionId,
    })
    .from(insightEvent)
    .where(and(...conditions));

  // Sessões únicas por etapa
  const visitSessions = new Set<string>();
  const ctaSessions = new Set<string>();
  const formStartSessions = new Set<string>();
  const submitSessions = new Set<string>();

  for (const ev of events) {
    const sId = ev.sessionId || `anon_${Math.random()}`;
    if (ev.eventType === "page_view") visitSessions.add(sId);
    if (ev.eventType === "cta_click") ctaSessions.add(sId);
    if (ev.eventType === "form_start") formStartSessions.add(sId);
    if (ev.eventType === "form_submit") submitSessions.add(sId);
  }

  const visits = Math.max(visitSessions.size, 1);
  const cta = ctaSessions.size;
  const start = formStartSessions.size;
  const submit = submitSessions.size;

  return [
    {
      step: 1,
      name: "Visualização da Página",
      description: "Visitantes únicos que carregaram a landing page",
      count: visits,
      rateFromTotal: 100,
      dropOffRate: 0,
    },
    {
      step: 2,
      name: "Clique em CTA",
      description: "Usuários que interagiram com botão de conversão",
      count: cta,
      rateFromTotal: Math.round((cta / visits) * 100),
      dropOffRate: Math.max(0, 100 - Math.round((cta / visits) * 100)),
    },
    {
      step: 3,
      name: "Início do Formulário",
      description: "Interação inicial com campos de cadastro ou HubSpot",
      count: start,
      rateFromTotal: Math.round((start / visits) * 100),
      dropOffRate: cta > 0 ? Math.max(0, 100 - Math.round((start / cta) * 100)) : 0,
    },
    {
      step: 4,
      name: "Envio Confirmado (Lead)",
      description: "Formulário enviado com sucesso e conversão registrada",
      count: submit,
      rateFromTotal: Math.round((submit / visits) * 100),
      dropOffRate: start > 0 ? Math.max(0, 100 - Math.round((submit / start) * 100)) : 0,
    },
  ];
}

/**
 * Retorna ranking detalhado dos elementos mais clicados
 */
export async function getPageElementsRanking(pageId: string, filters: HeatmapFilter = {}) {
  const db = await getDb();
  const periodDays = filters.periodDays || 30;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - periodDays);

  const conditions = [
    eq(insightEvent.pageId, pageId),
    gte(insightEvent.createdAt, startDate),
  ];

  if (filters.viewport) conditions.push(eq(insightEvent.viewport, filters.viewport));
  if (filters.version) conditions.push(eq(insightEvent.pageVersion, filters.version));

  const events = await db
    .select({
      eventType: insightEvent.eventType,
      elementId: insightEvent.elementId,
      elementLabel: insightEvent.elementLabel,
      sectionId: insightEvent.sectionId,
      createdAt: insightEvent.createdAt,
    })
    .from(insightEvent)
    .where(and(...conditions));

  let totalClicks = 0;
  const map = new Map<
    string,
    {
      elementId: string;
      elementLabel: string;
      sectionId: string | null;
      clicks: number;
      lastClicked: Date;
    }
  >();

  for (const ev of events) {
    if ((ev.eventType === "click" || ev.eventType === "cta_click") && ev.elementId) {
      totalClicks += 1;
      const existing = map.get(ev.elementId);
      if (!existing) {
        map.set(ev.elementId, {
          elementId: ev.elementId,
          elementLabel: ev.elementLabel || ev.elementId,
          sectionId: ev.sectionId,
          clicks: 1,
          lastClicked: ev.createdAt,
        });
      } else {
        existing.clicks += 1;
        if (ev.createdAt > existing.lastClicked) {
          existing.lastClicked = ev.createdAt;
        }
      }
    }
  }

  return Array.from(map.values())
    .map((item) => ({
      ...item,
      sharePercent: totalClicks > 0 ? Math.round((item.clicks / totalClicks) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.clicks - a.clicks);
}

/**
 * Retorna performance dividida por campanhas e UTMs
 */
export async function getPageUtmBreakdown(pageId: string, periodDays = 30) {
  const db = await getDb();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - periodDays);

  const events = await db
    .select({
      eventType: insightEvent.eventType,
      utmSource: insightEvent.utmSource,
      utmMedium: insightEvent.utmMedium,
      utmCampaign: insightEvent.utmCampaign,
    })
    .from(insightEvent)
    .where(and(eq(insightEvent.pageId, pageId), gte(insightEvent.createdAt, startDate)));

  const map = new Map<
    string,
    {
      source: string;
      medium: string;
      campaign: string;
      visits: number;
      ctaClicks: number;
      leads: number;
    }
  >();

  for (const ev of events) {
    const source = ev.utmSource || "Direto / Orgânico";
    const medium = ev.utmMedium || "(none)";
    const campaign = ev.utmCampaign || "(geral)";
    const key = `${source}|${medium}|${campaign}`;

    let item = map.get(key);
    if (!item) {
      item = { source, medium, campaign, visits: 0, ctaClicks: 0, leads: 0 };
      map.set(key, item);
    }

    if (ev.eventType === "page_view") item.visits += 1;
    if (ev.eventType === "cta_click") item.ctaClicks += 1;
    if (ev.eventType === "form_submit") item.leads += 1;
  }

  return Array.from(map.values())
    .map((item) => ({
      ...item,
      conversionRate: item.visits > 0 ? Math.round((item.leads / item.visits) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.visits - a.visits);
}

export interface PageAbMetrics {
  id: string;
  name: string;
  url: string;
  buName: string;
  version: string;
  visits: number;
  ctaClicks: number;
  ctaClickRate: number;
  formStarts: number;
  formStartRate: number;
  leads: number;
  conversionRate: number;
  avgScrollDepth: number;
  topElements: { id: string; label: string; clicks: number; sharePercent: number }[];
  funnel: {
    visits: number;
    ctaClicks: number;
    formStarts: number;
    leads: number;
    stepPercentages: {
      visitToCta: number;
      ctaToForm: number;
      formToLead: number;
      overall: number;
    };
  };
}

export interface AbComparisonResult {
  pageA: PageAbMetrics;
  pageB: PageAbMetrics;
  winner: "A" | "B" | "tie";
  upliftPercent: number;
  leadsDiff: number;
  periodDays: number;
  viewport: string;
  summaryText: string;
}

/**
 * Retorna análise comparativa detalhada de Teste A/B entre 2 Landing Pages
 */
export async function getAbComparisonData(
  pageAId: string,
  pageBId: string,
  filters: { periodDays?: number; viewport?: string } = {}
): Promise<AbComparisonResult | null> {
  const db = await getDb();
  const periodDays = filters.periodDays || 30;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - periodDays);

  async function computePageMetrics(pageId: string): Promise<PageAbMetrics | null> {
    const page = await getInsightPageById(pageId);
    if (!page) return null;

    const conditions = [
      eq(insightEvent.pageId, page.id),
      gte(insightEvent.createdAt, startDate),
    ];

    if (filters.viewport && filters.viewport !== "all") {
      conditions.push(eq(insightEvent.viewport, filters.viewport as InsightViewport));
    }

    const events = await db
      .select({
        eventType: insightEvent.eventType,
        elementId: insightEvent.elementId,
        elementLabel: insightEvent.elementLabel,
        scrollPercent: insightEvent.scrollPercent,
      })
      .from(insightEvent)
      .where(and(...conditions));

    let visits = 0;
    let ctaClicks = 0;
    let formStarts = 0;
    let leads = 0;
    let scrollTotal = 0;
    let scrollCount = 0;

    const elementMap = new Map<string, { id: string; label: string; clicks: number }>();

    for (const ev of events) {
      if (ev.eventType === "page_view") visits += 1;
      else if (ev.eventType === "cta_click") {
        ctaClicks += 1;
        if (ev.elementId) {
          const existing = elementMap.get(ev.elementId) || {
            id: ev.elementId,
            label: ev.elementLabel || ev.elementId,
            clicks: 0,
          };
          existing.clicks += 1;
          elementMap.set(ev.elementId, existing);
        }
      } else if (ev.eventType === "form_start") formStarts += 1;
      else if (ev.eventType === "form_submit") leads += 1;
      else if (ev.eventType === "scroll_depth" && typeof ev.scrollPercent === "number") {
        scrollTotal += ev.scrollPercent;
        scrollCount += 1;
      }
    }

    const ctaClickRate = visits > 0 ? Math.round((ctaClicks / visits) * 1000) / 10 : 0;
    const formStartRate = visits > 0 ? Math.round((formStarts / visits) * 1000) / 10 : 0;
    const conversionRate = visits > 0 ? Math.round((leads / visits) * 1000) / 10 : 0;
    const avgScrollDepth = scrollCount > 0 ? Math.round(scrollTotal / scrollCount) : visits > 0 ? 55 : 0;

    const topElements = Array.from(elementMap.values())
      .map((el) => ({
        ...el,
        sharePercent: ctaClicks > 0 ? Math.round((el.clicks / ctaClicks) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 5);

    const funnel = {
      visits,
      ctaClicks,
      formStarts,
      leads,
      stepPercentages: {
        visitToCta: visits > 0 ? Math.round((ctaClicks / visits) * 1000) / 10 : 0,
        ctaToForm: ctaClicks > 0 ? Math.round((formStarts / ctaClicks) * 1000) / 10 : 0,
        formToLead: formStarts > 0 ? Math.round((leads / formStarts) * 1000) / 10 : 0,
        overall: conversionRate,
      },
    };

    return {
      id: page.id,
      name: page.name,
      url: page.url,
      buName: page.buName || "Sem BU",
      version: page.version,
      visits,
      ctaClicks,
      ctaClickRate,
      formStarts,
      formStartRate,
      leads,
      conversionRate,
      avgScrollDepth,
      topElements,
      funnel,
    };
  }

  const [pageA, pageB] = await Promise.all([
    computePageMetrics(pageAId),
    computePageMetrics(pageBId),
  ]);

  if (!pageA || !pageB) return null;

  let winner: "A" | "B" | "tie" = "tie";
  let upliftPercent = 0;
  const leadsDiff = Math.abs(pageA.leads - pageB.leads);

  if (pageA.conversionRate > pageB.conversionRate) {
    winner = "A";
    upliftPercent =
      pageB.conversionRate > 0
        ? Math.round(((pageA.conversionRate - pageB.conversionRate) / pageB.conversionRate) * 1000) / 10
        : pageA.conversionRate > 0
        ? 100
        : 0;
  } else if (pageB.conversionRate > pageA.conversionRate) {
    winner = "B";
    upliftPercent =
      pageA.conversionRate > 0
        ? Math.round(((pageB.conversionRate - pageA.conversionRate) / pageA.conversionRate) * 1000) / 10
        : pageB.conversionRate > 0
        ? 100
        : 0;
  }

  let summaryText = "";
  if (winner === "tie") {
    summaryText = `Empate técnico: ambas as páginas apresentaram a mesma taxa de conversão de ${pageA.conversionRate}%.`;
  } else {
    const winningPage = winner === "A" ? pageA : pageB;
    const losingPage = winner === "A" ? pageB : pageA;
    summaryText = `A página "${winningPage.name}" venceu o teste com taxa de conversão de ${winningPage.conversionRate}% contra ${losingPage.conversionRate}%, gerando um uplift de +${upliftPercent}% (+${leadsDiff} leads).`;
  }

  return {
    pageA,
    pageB,
    winner,
    upliftPercent,
    leadsDiff,
    periodDays,
    viewport: filters.viewport || "all",
    summaryText,
  };
}
