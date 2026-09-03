import type { Metadata } from "next";

import {
  InitiativesPanel,
  WeeklyPanel,
  type IniciativaEditavel,
  type SemanaEditavel,
} from "./results-panel";
import { PageHeader } from "@/components/ui/card";
import { inicioDaSemana, semanasEntre } from "@/lib/modules/results/metrics";
import {
  listInitiativesToReport,
  listWeeklyResults,
} from "@/lib/modules/results/queries";
import { requireStrategyBusinessUnit } from "@/lib/modules/strategy/access";
import { listCycles, pickDefaultCycle } from "@/lib/modules/strategy/queries";

export const metadata: Metadata = { title: "Resultados" };
export const dynamic = "force-dynamic";

/**
 * Quantas semanas a tabela abre.
 *
 * Treze é um trimestre: o bastante para ver a curva e para achar o buraco de
 * quem esqueceu de lançar, sem virar uma tela de rolagem infinita. O histórico
 * mais antigo continua no banco e aparece no Panorama.
 */
const SEMANAS_VISIVEIS = 13;

export default async function ResultadosPage({
  params,
}: {
  params: Promise<{ businessUnitSlug: string }>;
}) {
  const { businessUnitSlug } = await params;
  const { unit, canEdit } = await requireStrategyBusinessUnit(businessUnitSlug);

  const agora = new Date();
  const semanaAtual = inicioDaSemana(agora);
  const primeira = new Date(
    semanaAtual.getTime() - (SEMANAS_VISIVEIS - 1) * 7 * 86_400_000,
  );

  const cycles = await listCycles(unit.id);
  const cycle = pickDefaultCycle(cycles);

  const [lancados, iniciativas] = await Promise.all([
    listWeeklyResults(unit.id, { desde: primeira }),
    cycle ? listInitiativesToReport(cycle.id, agora) : Promise.resolve([]),
  ]);

  const porSemana = new Map(
    lancados.map((linha) => [linha.weekStart.getTime(), linha]),
  );

  // Da mais recente para a mais antiga: quem abre esta tela na sexta vem
  // lançar a semana que acabou, e ela precisa ser a primeira linha.
  const semanas: SemanaEditavel[] = semanasEntre(primeira, semanaAtual)
    .reverse()
    .map((inicio) => {
      const epoch = inicio.getTime();
      const linha = porSemana.get(epoch);
      return {
        epoch,
        revenue: linha?.revenue ?? null,
        sales: linha?.sales ?? null,
        leads: linha?.leads ?? null,
        mediaSpend: linha?.mediaSpend ?? null,
        note: linha?.note ?? null,
        emCurso: epoch === semanaAtual.getTime(),
      };
    });

  const paraOPainel: IniciativaEditavel[] = iniciativas.map((item) => ({
    itemId: item.itemId,
    title: item.title,
    kind: item.kind,
    endsAt: item.endsAt.toISOString(),
    resultado: item.resultado,
  }));

  return (
    <>
      <PageHeader
        title="Resultados"
        description={`O realizado de ${unit.label}, semana a semana. É o que alimenta o Panorama e a comparação com as metas.`}
      />

      <div className="space-y-5">
        <WeeklyPanel
          businessUnitId={unit.id}
          semanas={semanas}
          canEdit={canEdit}
        />
        <InitiativesPanel
          businessUnitId={unit.id}
          iniciativas={paraOPainel}
          canEdit={canEdit}
        />
      </div>
    </>
  );
}
