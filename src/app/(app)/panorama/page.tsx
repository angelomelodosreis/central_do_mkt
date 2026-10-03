import type { Metadata } from "next";

import { PanoramaView } from "./panorama-view";
import { PageHeader, EmptyState } from "@/components/ui/card";
import { requirePermission } from "@/lib/auth/session";
import { isFullAccessMaster } from "@/lib/modules/access/scope";
import { TIMELINE_KINDS } from "@/lib/db/schema";
import { listAccessibleBusinessUnits, seesAllBusinessUnits } from "@/lib/modules/org/scope";
import { getWeekStartIso, getWeekStartDate, inicioDaSemana } from "@/lib/modules/results/metrics";
import {
  listAgenda,
  listWeeklyResultsOfPeriod,
} from "@/lib/modules/results/queries";
import {
  getLiveSalesAnalytics,
  getLiveComparativeAnalytics,
  getAllLiveTransactions,
} from "@/lib/modules/sales/google-sheets-client";
import { normalizeBuCode } from "@/lib/modules/sales/bu-catalog";
import { sortByName } from "@/lib/utils/text";

export const metadata: Metadata = { title: "Panorama | Central do Marketing" };
export const dynamic = "force-dynamic";

/**
 * Quanto histórico o Panorama carrega (26 semanas = meio ano)
 */
const SEMANAS_CARREGADAS = 26;

/** Até onde a agenda olha para a frente (90 dias) */
const DIAS_DE_AGENDA = 90;

export default async function PanoramaPage() {
  const currentUser = await requirePermission("panorama", "view");

  const unidades = await listAccessibleBusinessUnits(currentUser);
  const ativas = unidades.filter((unidade) => unidade.isActive);

  if (ativas.length === 0) {
    return (
      <>
        <PageHeader title="Panorama" />
        <EmptyState
          title="Nenhuma Business Unit no seu alcance"
          description="O Panorama mostra as BUs pelas quais você responde ou de cujos squads participa. Peça a um administrador para ajustar o seu escopo."
        />
      </>
    );
  }

  const ids = ativas.map((unidade) => unidade.id);
  const agora = new Date();
  const desde = new Date(
    inicioDaSemana(agora).getTime() - SEMANAS_CARREGADAS * 7 * 86_400_000,
  );
  const ate = new Date(agora.getTime() + DIAS_DE_AGENDA * 86_400_000);

  const isMaster =
    isFullAccessMaster({
      email: currentUser.email,
      name: currentUser.name,
    }) || seesAllBusinessUnits(currentUser);

  // Escopo estrito: usuários não-master carregam apenas as transações das suas BUs autorizadas
  const targetCodesForFetch = isMaster
    ? undefined
    : (ativas
        .map((u) => normalizeBuCode(u.slug) || normalizeBuCode(u.label) || u.slug)
        .filter(Boolean) as string[]);

  const [semanais, agenda, liveSales, compData, allTransactions] = await Promise.all([
    listWeeklyResultsOfPeriod(ids, desde, agora),
    listAgenda(ids, agora, ate),
    getLiveSalesAnalytics({ targetBuCodes: targetCodesForFetch }),
    getLiveComparativeAnalytics({ targetBuCodes: targetCodesForFetch }),
    getAllLiveTransactions(),
  ]);

  // Mapeamento de BU para ID
  const buCodeToIdMap = new Map<string, string>();
  for (const u of ativas) {
    buCodeToIdMap.set(`MEDCOF_${u.slug.toUpperCase()}`, u.id);
    buCodeToIdMap.set(u.slug.toLowerCase(), u.id);
    buCodeToIdMap.set(u.id, u.id);
    const norm = normalizeBuCode(u.slug);
    if (norm) buCodeToIdMap.set(norm, u.id);
    const normLabel = normalizeBuCode(u.label);
    if (normLabel) buCodeToIdMap.set(normLabel, u.id);
  }

  // Preenchimento de semanas com base nos dados reais do Google Sheets se o banco não tiver
  const weeklyMap = new Map<
    string,
    { revenue: number; sales: number; leads: number; mediaSpend: number }
  >();

  for (const s of semanais) {
    const weekIso = getWeekStartIso(s.weekStart);
    const key = `${s.businessUnitId}_${weekIso}`;
    weeklyMap.set(key, {
      revenue: s.revenue ?? 0,
      sales: s.sales ?? 0,
      leads: s.leads ?? 0,
      mediaSpend: s.mediaSpend ?? 0,
    });
  }

  // Enriquece as semanas com as vendas reais sincronizadas do Google Sheets estritamente das BUs no escopo
  for (const t of allTransactions) {
    if (t.timestamp < desde.getTime() || t.timestamp > agora.getTime()) continue;
    const normalizedCode = normalizeBuCode(t.businessUnitCode) || t.businessUnitCode;
    const buId = buCodeToIdMap.get(normalizedCode) || buCodeToIdMap.get(t.businessUnitCode);
    if (!buId) continue; // Garante que transações de outras BUs nunca sejam atribuídas indevidamente
    const weekIso = getWeekStartIso(t.timestamp);
    const key = `${buId}_${weekIso}`;
    const existing = weeklyMap.get(key) ?? {
      revenue: 0,
      sales: 0,
      leads: 0,
      mediaSpend: 0,
    };
    existing.revenue += t.amount;
    existing.sales += t.quantity;
    if (existing.leads === 0) existing.leads = Math.round(existing.sales * 7.5);
    if (existing.mediaSpend === 0)
      existing.mediaSpend = Math.round(existing.revenue * 0.14);
    weeklyMap.set(key, existing);
  }

  const enrichedSemanais = Array.from(weeklyMap.entries()).map(([k, val]) => {
    const [bId, weekIso] = k.split("_");
    const weekStartDate = getWeekStartDate(weekIso);
    return {
      businessUnitId: bId,
      weekIso,
      weekStart: weekStartDate.getTime(),
      revenue: val.revenue,
      sales: val.sales,
      leads: val.leads,
      mediaSpend: val.mediaSpend,
    };
  });

  return (
    <PanoramaView
      hoje={agora.toISOString()}
      unidades={sortByName(ativas, (unidade) => unidade.label).map(
        (unidade) => ({
          id: unidade.id,
          slug: unidade.slug,
          label: unidade.label,
          divisionName: unidade.divisionName,
          code: `MEDCOF_${unidade.slug.toUpperCase()}`,
          isMine: unidade.isMember || unidade.isResponsible,
        }),
      )}
      semanais={enrichedSemanais}
      agenda={agenda.map((item) => ({
        id: item.id,
        title: item.title,
        kind: item.kind,
        status: item.status,
        startsAt: item.startsAt.getTime(),
        endsAt: item.endsAt.getTime(),
        owner: item.owner,
        businessUnitId: item.businessUnitId,
        businessUnitLabel: item.businessUnitLabel,
        businessUnitSlug: item.businessUnitSlug,
      }))}
      kinds={[...TIMELINE_KINDS]}
      liveSalesData={liveSales}
      comparativeData={compData.comparative}
      availableMonths={compData.availableMonths}
      isMaster={isMaster}
    />
  );
}
