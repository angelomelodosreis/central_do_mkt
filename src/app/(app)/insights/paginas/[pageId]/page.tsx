import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import {
  getInsightPageById,
  getPageElementsRanking,
  getPageFunnelData,
  getPageHeatmapData,
  getPageUtmBreakdown,
} from "@/lib/modules/insights/queries";
import { PageInsightsView } from "./page-insights-view";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ pageId: string }>;
}): Promise<Metadata> {
  const { pageId } = await params;
  const page = await getInsightPageById(pageId);
  return {
    title: page ? `${page.name} · Heatmap & Insights` : "Heatmap | Central do Marketing",
  };
}

export default async function PageDetailPage({
  params,
}: {
  params: Promise<{ pageId: string }>;
}) {
  await requireUser();
  const { pageId } = await params;

  const page = await getInsightPageById(pageId);
  if (!page) {
    notFound();
  }

  const [heatmap, funnel, elements, utms] = await Promise.all([
    getPageHeatmapData(pageId, { viewport: "desktop", periodDays: 30 }),
    getPageFunnelData(pageId, { viewport: "desktop", periodDays: 30 }),
    getPageElementsRanking(pageId, { viewport: "desktop", periodDays: 30 }),
    getPageUtmBreakdown(pageId, 30),
  ]);

  return (
    <div className="pb-16">
      <PageInsightsView
        page={page}
        initialHeatmap={heatmap}
        initialFunnel={funnel}
        initialElements={elements}
        initialUtms={utms}
      />
    </div>
  );
}
