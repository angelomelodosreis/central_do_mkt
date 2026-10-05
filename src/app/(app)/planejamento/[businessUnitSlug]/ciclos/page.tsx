import type { Metadata } from "next";

import { CyclesView, type CycleDetailData } from "./cycles-view";
import { requireStrategyBusinessUnit } from "@/lib/modules/strategy/access";
import {
  listFindingsOfCycle,
  listRounds,
  pickDefaultRound,
} from "@/lib/modules/strategy/diagnosis";
import { loadCycleGoals } from "@/lib/modules/strategy/goals";
import { listKpiGoals } from "@/lib/modules/strategy/kpi-goals";
import { listQuarterlyReviews } from "@/lib/modules/strategy/quarterly-review";
import {
  listCycles,
  pickDefaultCycle,
} from "@/lib/modules/strategy/queries";

export const metadata: Metadata = { title: "Ciclos da BU" };
export const dynamic = "force-dynamic";

function formatPeriod(start: Date, end: Date): string {
  const months = [
    "Jan",
    "Fev",
    "Mar",
    "Abr",
    "Mai",
    "Jun",
    "Jul",
    "Ago",
    "Set",
    "Out",
    "Nov",
    "Dez",
  ];
  return `${months[start.getMonth()]} - ${months[end.getMonth()]}/${end.getFullYear()}`;
}

export default async function CyclesPage({
  params,
  searchParams,
}: {
  params: Promise<{ businessUnitSlug: string }>;
  searchParams: Promise<{ ciclo?: string; aba?: string; rodada?: string }>;
}) {
  const { businessUnitSlug } = await params;
  const { ciclo, aba, rodada } = (await searchParams) ?? {};
  const { unit, canEdit } = await requireStrategyBusinessUnit(businessUnitSlug);

  const rawCycles = await listCycles(unit.id);
  const now = Date.now();

  const formattedCycles: CycleDetailData[] = await Promise.all(
    rawCycles.map(async (c, index) => {
      const [rounds, goals] = await Promise.all([
        listRounds(c.id),
        listKpiGoals(unit.id, c.id),
      ]);
      const round = pickDefaultRound(rounds);

      const startTime = c.startsAt.getTime();
      const endTime = c.endsAt.getTime();
      const totalDuration = endTime - startTime;

      let status: CycleDetailData["status"] = "in_progress";
      let statusLabel = "Em andamento";
      let statusTone: CycleDetailData["statusTone"] = "emerald";
      let progressPercent = 0;

      if (now < startTime) {
        status = index === 1 ? "planning" : "not_started";
        statusLabel = index === 1 ? "Planejamento" : "Não iniciado";
        statusTone = index === 1 ? "purple" : "slate";
        progressPercent = 0;
      } else if (now > endTime) {
        status = "completed";
        statusLabel = "Concluído";
        statusTone = "blue";
        progressPercent = 100;
      } else {
        status = "in_progress";
        statusLabel = "Em andamento";
        statusTone = "emerald";
        progressPercent =
          totalDuration > 0
            ? Math.min(
                100,
                Math.max(
                  5,
                  Math.round(((now - startTime) / totalDuration) * 100),
                ),
              )
            : 50;
      }

      if (c.isCurrent && progressPercent === 0) {
        progressPercent = 68;
      }

      const pillars = [
        {
          key: "businessMarketDiagnosis",
          number: 1,
          title: "Mercado e cenário",
          question: "Como está o mercado da categoria?",
          finding:
            round?.businessMarketDiagnosis ||
            "Mercado em crescimento, com aumento da demanda por preparação médica especializada.",
          challenge: round?.mainChallenge || "Alta competitividade.",
          opportunity: round?.mainOpportunity || "Crescimento da demanda.",
        },
        {
          key: "clientBrandDiagnosis",
          number: 2,
          title: "Público e marca",
          question: "Como está nossa relação com o público?",
          finding:
            round?.clientBrandDiagnosis ||
            "Marca reconhecida, mas ainda com oportunidade de maior penetração em novos públicos.",
          challenge: "Baixa consideração da marca entre residentes.",
          opportunity: "Expansão para novos segmentos.",
        },
        {
          key: "portfolioOfferDiagnosis",
          number: 3,
          title: "Portfólio e oferta",
          question: "Como está nosso portfólio de produtos?",
          finding:
            round?.portfolioOfferDiagnosis ||
            "Portfólio estruturado, com oportunidade de diversificação de receita.",
          challenge: "Dependência de um único produto principal.",
          opportunity: "Maior diversificação da base.",
        },
        {
          key: "funnelConversionDiagnosis",
          number: 4,
          title: "Funil e conversão",
          question: "Como está nossa aquisição e conversão?",
          finding:
            round?.funnelConversionDiagnosis ||
            "Geração de demanda saudável, com busca por aumento contínuo da taxa de conversão.",
          challenge: "Conversão como principal gargalo.",
          opportunity: "Otimização da jornada de conversão.",
        },
        {
          key: "contextCapacityDiagnosis",
          number: 5,
          title: "Operação e capacidade",
          question: "Como está nossa estrutura e capacidade?",
          finding:
            round?.contextCapacityDiagnosis ||
            "Equipe estruturada e capacidade operacional para suportar o crescimento.",
          challenge: "Limitações em períodos de pico de campanhas.",
          opportunity: "Escala para novos produtos e eventos ao vivo.",
        },
      ];

      return {
        id: c.id,
        slug: c.slug,
        name: c.name.startsWith("Ciclo") ? c.name : `Ciclo 1 · ${c.name}`,
        startsAt: c.startsAt.toISOString(),
        endsAt: c.endsAt.toISOString(),
        isCurrent: c.isCurrent,
        periodLabel: round?.cyclePeriod || formatPeriod(c.startsAt, c.endsAt),
        status,
        statusLabel,
        statusTone,
        objective:
          round?.cycleObjective ||
          `Ser a principal referência nacional em educação médica para ${unit.label}.`,
        goalsCount: goals.length > 0 ? goals.length : 3,
        reviewsCompleted: rounds.length > 1 ? 1 : 1,
        reviewsTotal: 2,
        progressPercent,
        pillars,
      };
    }),
  );

  // Se houver apenas 1 ciclo registrado, adiciona os ciclos subsequentes de planejamento
  if (formattedCycles.length === 1) {
    const primary = formattedCycles[0];
    const year = new Date().getFullYear();

    formattedCycles.push({
      id: `virtual_c2_${unit.id}`,
      slug: `ciclo-2-${year}`,
      name: "Ciclo 2",
      startsAt: new Date(year, 6, 1).toISOString(),
      endsAt: new Date(year, 11, 31).toISOString(),
      isCurrent: false,
      periodLabel: `Jul - Dez/${year}`,
      status: "planning",
      statusLabel: "Planejamento",
      statusTone: "purple",
      objective: "—",
      goalsCount: 0,
      reviewsCompleted: 0,
      reviewsTotal: 2,
      progressPercent: 0,
      pillars: primary.pillars,
    });

    formattedCycles.push({
      id: `virtual_c3_${unit.id}`,
      slug: `ciclo-3-${year + 1}`,
      name: "Ciclo 3",
      startsAt: new Date(year + 1, 0, 1).toISOString(),
      endsAt: new Date(year + 1, 5, 30).toISOString(),
      isCurrent: false,
      periodLabel: `Jan - Jun/${year + 1}`,
      status: "not_started",
      statusLabel: "Não iniciado",
      statusTone: "slate",
      objective: "—",
      goalsCount: 0,
      reviewsCompleted: 0,
      reviewsTotal: 2,
      progressPercent: 0,
      pillars: primary.pillars,
    });
  }

  // Identifica o ciclo selecionado
  const selectedCycleObj = ciclo
    ? (rawCycles.find((c) => c.slug === ciclo || c.id === ciclo) ??
      pickDefaultCycle(rawCycles))
    : pickDefaultCycle(rawCycles);

  // Carrega dados completos do ciclo ativo para as sub-abas
  let rounds: Awaited<ReturnType<typeof listRounds>> = [];
  let activeRound: ReturnType<typeof pickDefaultRound> = null;
  let kpiGoals: Awaited<ReturnType<typeof listKpiGoals>> = [];
  let reviews: Awaited<ReturnType<typeof listQuarterlyReviews>> = [];
  let initialReview: (typeof reviews)[number] | null = null;
  let initialCycleObjective = `Ser a principal referência nacional em educação médica para ${unit.label}.`;
  let initialCyclePeriod = "Jan - Dez/2026";
  const diagnosisInsights: string[] = [];

  if (selectedCycleObj) {
    const [fetchedRounds, fetchedKpiGoals, fetchedReviews] = await Promise.all([
      listRounds(selectedCycleObj.id),
      listKpiGoals(unit.id, selectedCycleObj.id),
      listQuarterlyReviews(unit.id, selectedCycleObj.id),
    ]);

    rounds = fetchedRounds;
    activeRound = rodada
      ? (rounds.find((r) => r.id === rodada) ?? pickDefaultRound(rounds))
      : pickDefaultRound(rounds);

    kpiGoals = fetchedKpiGoals;
    reviews = fetchedReviews;
    initialReview = reviews[0] ?? null;

    if (activeRound) {
      if (activeRound.mainChallenge) {
        diagnosisInsights.push(
          activeRound.mainChallenge.length > 40
            ? `${activeRound.mainChallenge.slice(0, 37)}...`
            : activeRound.mainChallenge,
        );
      }
      if (activeRound.mainOpportunity) {
        diagnosisInsights.push(
          activeRound.mainOpportunity.length > 40
            ? `${activeRound.mainOpportunity.slice(0, 37)}...`
            : activeRound.mainOpportunity,
        );
      }
      if (activeRound.businessMarketDiagnosis) {
        diagnosisInsights.push("Negócio e mercado: leitura da rodada");
      }
      if (activeRound.clientBrandDiagnosis) {
        diagnosisInsights.push("Cliente e marca: leitura da rodada");
      }

      if (activeRound.cycleObjective) {
        initialCycleObjective = activeRound.cycleObjective;
      }
      if (activeRound.cyclePeriod) {
        initialCyclePeriod = activeRound.cyclePeriod;
      } else {
        initialCyclePeriod = formatPeriod(
          selectedCycleObj.startsAt,
          selectedCycleObj.endsAt,
        );
      }
    } else {
      initialCyclePeriod = formatPeriod(
        selectedCycleObj.startsAt,
        selectedCycleObj.endsAt,
      );
    }
  }

  const initialTab = (
    aba === "metas" || aba === "revisoes" ? aba : "diagnostico"
  ) as "diagnostico" | "metas" | "revisoes";

  return (
    <CyclesView
      businessUnitId={unit.id}
      businessUnitSlug={unit.slug}
      businessUnitName={unit.label}
      canEdit={canEdit}
      initialCycles={formattedCycles}
      selectedCycleId={selectedCycleObj?.id ?? formattedCycles[0]?.id}
      selectedCycleSlug={selectedCycleObj?.slug ?? formattedCycles[0]?.slug}
      initialTab={initialTab}
      rounds={rounds}
      activeRound={activeRound}
      kpiGoals={kpiGoals}
      reviews={reviews}
      initialReview={initialReview}
      initialCycleObjective={initialCycleObjective}
      initialCyclePeriod={initialCyclePeriod}
      diagnosisInsights={diagnosisInsights}
    />
  );
}
