import type { Metadata } from "next";

import { PanoramaView } from "./panorama-view";
import { PageHeader, EmptyState } from "@/components/ui/card";
import { requirePermission } from "@/lib/auth/session";
import { TIMELINE_KINDS } from "@/lib/db/schema";
import { listAccessibleBusinessUnits } from "@/lib/modules/org/scope";
import { inicioDaSemana } from "@/lib/modules/results/metrics";
import {
  listAgenda,
  listWeeklyResultsOfPeriod,
} from "@/lib/modules/results/queries";
import { sortByName } from "@/lib/utils/text";

export const metadata: Metadata = { title: "Panorama" };
export const dynamic = "force-dynamic";

/**
 * Quanto histórico o Panorama carrega.
 *
 * Vinte e seis semanas — meio ano — é o bastante para o filtro de 90 dias ter
 * um período anterior inteiro para comparar, e a filtragem por período
 * acontece no cliente: trocar de 30 para 90 dias é instantâneo em vez de uma
 * ida ao servidor, e meio ano de fechamento semanal de 22 BUs são ~570 linhas.
 */
const SEMANAS_CARREGADAS = 26;

/** Até onde a agenda olha para a frente. O filtro de 7/30/90 recorta daqui. */
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

  const [semanais, agenda] = await Promise.all([
    listWeeklyResultsOfPeriod(ids, desde, agora),
    listAgenda(ids, agora, ate),
  ]);

  return (
    <PanoramaView
      hoje={agora.toISOString()}
      unidades={sortByName(ativas, (unidade) => unidade.label).map(
        (unidade) => ({
          id: unidade.id,
          slug: unidade.slug,
          label: unidade.label,
          divisionName: unidade.divisionName,
          isMine: unidade.isMember || unidade.isResponsible,
        }),
      )}
      semanais={semanais.map((linha) => ({
        businessUnitId: linha.businessUnitId,
        weekStart: linha.weekStart.getTime(),
        revenue: linha.revenue,
        sales: linha.sales,
        leads: linha.leads,
        mediaSpend: linha.mediaSpend,
      }))}
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
    />
  );
}
