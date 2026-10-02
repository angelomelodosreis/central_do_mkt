import { and, asc, desc, eq, inArray, lt } from "drizzle-orm";

import { getDb } from "@/lib/db/client";
import {
  persona,
  personaPain,
  strategyCycle,
  strategyFinding,
  strategyGoalFinding,
  strategyGoalRevision,
  strategyMeasurement,
  strategyProduct,
  strategyRound,
  timelineItem,
  DIAGNOSIS_LENSES,
  GOAL_METRIC_CATALOG,
  type DiagnosisLens,
  type FindingKind,
  type GoalMetric,
  type StrategyCycle,
} from "@/lib/db/schema";
import { listBusinessUnitMembers } from "@/lib/modules/org/scope";
import { monthShort } from "@/lib/modules/strategy/dates";
import { loadCycleGoals, type CycleGoals } from "@/lib/modules/strategy/goals";
import { plural } from "@/lib/utils/text";

/* ─────────────────────────── rodadas ─────────────────────────── */

export type Round = {
  id: string;
  sequence: number;
  referenceDate: Date;
  isOpen: boolean;
  summary: string | null;
  businessMarketDiagnosis: string | null;
  clientBrandDiagnosis: string | null;
  portfolioOfferDiagnosis: string | null;
  funnelConversionDiagnosis: string | null;
  contextCapacityDiagnosis: string | null;
  mainChallenge: string | null;
  mainOpportunity: string | null;
  cycleObjective: string | null;
  cyclePeriod: string | null;
  updatedAt: Date;
};

export async function listRounds(cycleId: string): Promise<Round[]> {
  const db = await getDb();
  let rows = await db
    .select()
    .from(strategyRound)
    .where(eq(strategyRound.cycleId, cycleId))
    .orderBy(desc(strategyRound.sequence));

  if (rows.length === 0) {
    const auto = await ensureDefaultRound(cycleId);
    return [auto];
  }

  return rows.map((row) => ({
    id: row.id,
    sequence: row.sequence,
    referenceDate: row.referenceDate,
    isOpen: row.isOpen,
    summary: row.summary,
    businessMarketDiagnosis: row.businessMarketDiagnosis ?? null,
    clientBrandDiagnosis: row.clientBrandDiagnosis ?? null,
    portfolioOfferDiagnosis: row.portfolioOfferDiagnosis ?? null,
    funnelConversionDiagnosis: row.funnelConversionDiagnosis ?? null,
    contextCapacityDiagnosis: row.contextCapacityDiagnosis ?? null,
    mainChallenge: row.mainChallenge ?? null,
    mainOpportunity: row.mainOpportunity ?? null,
    cycleObjective: row.cycleObjective ?? null,
    cyclePeriod: row.cyclePeriod ?? null,
    updatedAt: row.updatedAt,
  }));
}

/** Garante que o ciclo tenha pelo menos uma rodada de diagnóstico aberta. */
export async function ensureDefaultRound(cycleId: string): Promise<Round> {
  const db = await getDb();
  const existing = await db
    .select()
    .from(strategyRound)
    .where(eq(strategyRound.cycleId, cycleId))
    .orderBy(desc(strategyRound.sequence))
    .limit(1);

  if (existing.length > 0) {
    const row = existing[0];
    return {
      id: row.id,
      sequence: row.sequence,
      referenceDate: row.referenceDate,
      isOpen: row.isOpen,
      summary: row.summary,
      businessMarketDiagnosis: row.businessMarketDiagnosis ?? null,
      clientBrandDiagnosis: row.clientBrandDiagnosis ?? null,
      portfolioOfferDiagnosis: row.portfolioOfferDiagnosis ?? null,
      funnelConversionDiagnosis: row.funnelConversionDiagnosis ?? null,
      contextCapacityDiagnosis: row.contextCapacityDiagnosis ?? null,
      mainChallenge: row.mainChallenge ?? null,
      mainOpportunity: row.mainOpportunity ?? null,
      cycleObjective: row.cycleObjective ?? null,
      cyclePeriod: row.cyclePeriod ?? null,
      updatedAt: row.updatedAt,
    };
  }

  const now = new Date();
  const id = `rnd_${cycleId}_1`;
  const defaultRoundData = {
    id,
    cycleId,
    sequence: 1,
    referenceDate: now,
    isOpen: true,
    summary: "1ª Rodada de Diagnóstico Semestral (Leitura dos 5 Pilares)",
    businessMarketDiagnosis: null,
    clientBrandDiagnosis: null,
    portfolioOfferDiagnosis: null,
    funnelConversionDiagnosis: null,
    contextCapacityDiagnosis: null,
    mainChallenge: null,
    mainOpportunity: null,
    cycleObjective: null,
    cyclePeriod: "Jan - Jun/2027",
    createdAt: now,
    updatedAt: now,
  };

  try {
    await db.insert(strategyRound).values(defaultRoundData).onConflictDoNothing();
  } catch {}

  return defaultRoundData;
}


/**
 * A rodada que a tela abre por padrão.
 *
 * Prefere a aberta; se todas estiverem fechadas, a mais recente. Sem rodada
 * nenhuma devolve `null`, e a tela convida a abrir a primeira.
 */
export function pickDefaultRound(rounds: Round[]): Round | null {
  return rounds.find((r) => r.isOpen) ?? rounds[0] ?? null;
}

export function roundLabel(round: Round): string {
  const mes = monthShort(round.referenceDate.getMonth());
  const ano = String(round.referenceDate.getFullYear()).slice(2);
  return `${round.sequence}ª rodada · ${mes}/${ano}`;
}

/* ─────────────────────────── achados ─────────────────────────── */

export type Finding = {
  id: string;
  lens: DiagnosisLens;
  kind: FindingKind;
  statement: string;
  evidence: string | null;
  /** Metas que apontam este achado — é o que revela o achado órfão. */
  goalIds: string[];
};

export async function listFindings(roundId: string): Promise<Finding[]> {
  const db = await getDb();

  const rows = await db
    .select()
    .from(strategyFinding)
    .where(eq(strategyFinding.roundId, roundId))
    .orderBy(asc(strategyFinding.sortOrder), asc(strategyFinding.createdAt));

  if (rows.length === 0) return [];

  const vinculos = await db
    .select()
    .from(strategyGoalFinding)
    .where(
      inArray(
        strategyGoalFinding.findingId,
        rows.map((r) => r.id),
      ),
    );

  const porAchado = new Map<string, string[]>();
  for (const v of vinculos) {
    const lista = porAchado.get(v.findingId) ?? [];
    lista.push(v.goalId);
    porAchado.set(v.findingId, lista);
  }

  return rows.map((row) => ({
    id: row.id,
    lens: row.lens,
    kind: row.kind,
    statement: row.statement,
    evidence: row.evidence,
    goalIds: porAchado.get(row.id) ?? [],
  }));
}

export function groupByLens(
  findings: Finding[],
): Record<DiagnosisLens, Finding[]> {
  const grupos = Object.fromEntries(
    DIAGNOSIS_LENSES.map((lens) => [lens, [] as Finding[]]),
  ) as Record<DiagnosisLens, Finding[]>;

  for (const achado of findings) {
    if (grupos[achado.lens]) grupos[achado.lens].push(achado);
  }
  return grupos;
}

/* ────────────────────────── realizado ────────────────────────── */

export type Measurement = {
  metric: GoalMetric;
  actual: number;
  note: string | null;
};

export async function listMeasurements(
  roundId: string,
): Promise<Measurement[]> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(strategyMeasurement)
    .where(eq(strategyMeasurement.roundId, roundId));

  return rows
    .filter((row) =>
      Object.prototype.hasOwnProperty.call(GOAL_METRIC_CATALOG, row.metric),
    )
    .map((row) => ({ metric: row.metric, actual: row.actual, note: row.note }));
}

export type Attainment = {
  metric: GoalMetric;
  target: number;
  actual: number;
  /** Percentual do alvo. Para custo (CPL, CAC) menor é melhor — ver `inverted`. */
  percent: number;
  /** Indicador em que ficar ABAIXO do alvo é bom. */
  inverted: boolean;
};

/**
 * Indicadores em que o alvo é um teto, não um piso.
 *
 * CPL, CAC e churn: gastar menos por lead é vitória, e tratá-los como os demais
 * mostraria "60% da meta" para quem foi muito bem.
 */
const TETOS: ReadonlySet<string> = new Set(["cpl", "cac", "churn_rate"]);

/**
 * Compara o realizado da rodada com o alvo da meta do ciclo.
 *
 * Contra a meta do CICLO, e não do semestre: o realizado de uma rodada é
 * acumulado do ciclo, e comparar acumulado com alvo de semestre daria número sem
 * sentido. Só entram indicadores que a meta definiu — realizado sem alvo não tem
 * denominador.
 */
export function computeAttainment(
  goals: CycleGoals,
  measurements: Measurement[],
): Attainment[] {
  const doCiclo = goals.cycle;
  if (!doCiclo) return [];

  const resultado: Attainment[] = [];

  for (const medida of measurements) {
    const alvo = doCiclo.targets.find((t) => t.metric === medida.metric);
    if (!alvo || alvo.target === 0) continue;

    const inverted = TETOS.has(medida.metric);
    resultado.push({
      metric: medida.metric,
      target: alvo.target,
      actual: medida.actual,
      percent: inverted
        ? (alvo.target / medida.actual) * 100
        : (medida.actual / alvo.target) * 100,
      inverted,
    });
  }

  return resultado;
}

/* ──────────────────── evidência que a plataforma calcula ──────────────────── */

export type EvidenceItem = { label: string; detail?: string; alert?: boolean };
export type LensEvidence = Record<DiagnosisLens, EvidenceItem[]>;

/**
 * Monta o painel de evidência de cada lente.
 *
 * É o coração da ferramenta: um diagnóstico que começa em branco não é
 * preenchido. Tudo aqui vem de dado que a BU já cadastrou em outra aba, e o
 * `alert` marca o que merece atenção — produto sem janela de venda, mês vazio,
 * dor sem solução. O analista julga; não redigita.
 */
export async function buildEvidence(
  cycle: StrategyCycle,
  goals: CycleGoals,
): Promise<LensEvidence> {
  const db = await getDb();

  const [produtos, itens, personas, dores, equipe, cicloAnterior] =
    await Promise.all([
      db
        .select()
        .from(strategyProduct)
        .where(
          and(
            eq(strategyProduct.businessUnitId, cycle.businessUnitId),
            eq(strategyProduct.isActive, true),
          ),
        ),
      db.select().from(timelineItem).where(eq(timelineItem.cycleId, cycle.id)),
      db
        .select()
        .from(persona)
        .where(
          and(
            eq(persona.businessUnitId, cycle.businessUnitId),
            eq(persona.isActive, true),
          ),
        ),
      db
        .select({ pain: personaPain.pain, personaName: persona.name })
        .from(personaPain)
        .innerJoin(persona, eq(personaPain.personaId, persona.id))
        .where(
          and(
            eq(persona.businessUnitId, cycle.businessUnitId),
            eq(persona.isActive, true),
          ),
        ),
      listBusinessUnitMembers(cycle.businessUnitId),
      db
        .select()
        .from(strategyCycle)
        .where(
          and(
            eq(strategyCycle.businessUnitId, cycle.businessUnitId),
            lt(strategyCycle.startsAt, cycle.startsAt),
          ),
        )
        .orderBy(desc(strategyCycle.startsAt))
        .limit(1),
    ]);

  // ── Portfólio ──
  const comJanela = new Set(
    itens
      .filter((i) => i.kind === "product_window" && i.productId)
      .map((i) => i.productId as string),
  );
  const semJanela = produtos.filter((p) => !comJanela.has(p.id));
  const contínuos = produtos.filter((p) => p.cadence === "ongoing").length;
  const pontuais = produtos.filter((p) => p.cadence === "one_time").length;

  const portfolio: EvidenceItem[] = [
    {
      label: `${produtos.length} ${produtos.length === 1 ? "produto ativo" : "produtos ativos"}`,
      detail: produtos.map((p) => p.name).join(", ") || undefined,
    },
    {
      label: `${plural(contínuos, "contínuo")}, ${pontuais} ${pontuais === 1 ? "pontual" : "pontuais"}`,
    },
  ];
  if (semJanela.length > 0) {
    portfolio.push({
      label: `${semJanela.length} sem janela de venda no calendário`,
      detail: semJanela.map((p) => p.name).join(", "),
      alert: true,
    });
  }

  // ── Público ──
  const canais = new Map<string, number>();
  for (const p of personas) {
    for (const canal of p.channels ?? []) {
      canais.set(canal, (canais.get(canal) ?? 0) + 1);
    }
  }
  const audience: EvidenceItem[] = [
    {
      label: `${personas.length} ${personas.length === 1 ? "persona ativa" : "personas ativas"}`,
      detail: personas.map((p) => p.name).join(", ") || undefined,
    },
  ];
  if (dores.length > 0) {
    audience.push({
      label: `${dores.length} ${dores.length === 1 ? "dor sem solução" : "dores sem solução"}`,
      detail: dores
        .slice(0, 6)
        .map((d) => `${d.pain} (${d.personaName})`)
        .join(" · "),
      alert: true,
    });
  }
  if (canais.size > 0) {
    audience.push({
      label: "Canais citados pelas personas",
      detail: [...canais.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([canal, n]) => `${canal} (${n})`)
        .join(", "),
    });
  }

  // ── Ano e sazonalidade ──
  const porTipo = new Map<string, number>();
  for (const item of itens) {
    porTipo.set(item.kind, (porTipo.get(item.kind) ?? 0) + 1);
  }

  const mesesOcupados = new Set<number>();
  for (const item of itens) {
    const cursor = new Date(item.startsAt);
    // Item longo ocupa todos os meses que atravessa.
    while (cursor.getTime() <= item.endsAt.getTime()) {
      mesesOcupados.add(cursor.getFullYear() * 12 + cursor.getMonth());
      cursor.setMonth(cursor.getMonth() + 1);
    }
  }
  const mesesVazios: string[] = [];
  const cursor = new Date(
    cycle.startsAt.getFullYear(),
    cycle.startsAt.getMonth(),
    1,
  );
  while (cursor.getTime() <= cycle.endsAt.getTime()) {
    if (!mesesOcupados.has(cursor.getFullYear() * 12 + cursor.getMonth())) {
      mesesVazios.push(monthShort(cursor.getMonth()));
    }
    cursor.setMonth(cursor.getMonth() + 1);
  }

  const seasonality: EvidenceItem[] = [
    {
      label: `${itens.length} ${itens.length === 1 ? "item" : "itens"} no calendário do ciclo`,
    },
  ];
  if (porTipo.size > 0) {
    seasonality.push({
      label: "Por tipo",
      detail: [...porTipo.entries()].map(([k, n]) => `${k}: ${n}`).join(", "),
    });
  }
  if (mesesVazios.length > 0) {
    seasonality.push({
      label: `${mesesVazios.length} ${mesesVazios.length === 1 ? "mês sem nada planejado" : "meses sem nada planejado"}`,
      detail: mesesVazios.join(", "),
      alert: true,
    });
  }

  // ── Ciclo anterior ──
  const previous_cycle: EvidenceItem[] = [];
  const anterior = cicloAnterior[0];
  if (anterior) {
    previous_cycle.push({ label: `Ciclo anterior: ${anterior.name}` });

    const metasAntigas = await loadCycleGoals(anterior.id);
    if (metasAntigas.cycle) {
      previous_cycle.push({
        label: "O que foi prometido",
        detail: metasAntigas.cycle.objective,
      });
      if (metasAntigas.cycle.targets.length > 0) {
        previous_cycle.push({
          label: "Alvos do ciclo anterior",
          detail: metasAntigas.cycle.targets
            .map((t) => `${GOAL_METRIC_CATALOG[t.metric].label}: ${t.target}`)
            .join(", "),
        });
      }
    } else {
      previous_cycle.push({
        label: "O ciclo anterior não teve meta escrita",
        alert: true,
      });
    }
  } else {
    previous_cycle.push({
      label: "Este é o primeiro ciclo desta BU na plataforma",
      detail: "Não há ciclo anterior para comparar.",
    });
  }

  // ── Externo e capacidade ──
  const external: EvidenceItem[] = [
    {
      label: `${equipe.length} ${equipe.length === 1 ? "pessoa na BU" : "pessoas na BU"}`,
      detail:
        equipe
          .map((p) => `${p.name}${p.isLead ? " (responsável)" : ""}`)
          .join(", ") || undefined,
    },
  ];
  if (!equipe.some((p) => p.isLead)) {
    external.push({
      label: "Nenhum responsável definido para a BU",
      alert: true,
    });
  }
  if (!goals.cycle) {
    external.push({
      label: "A meta geral deste ciclo ainda não foi escrita",
      detail: "O diagnóstico existe para embasá-la.",
    });
  }

  // ── Funil e conversão ──
  const funil_conversao: EvidenceItem[] = [];
  if (goals.cycle?.targets && goals.cycle.targets.length > 0) {
    const metasCapta = goals.cycle.targets.filter(
      (t) =>
        t.metric === "leads" ||
        t.metric === "cpl" ||
        t.metric === "lead_conversion" ||
        t.metric === "sales" ||
        t.metric === "sales_conversion",
    );
    if (metasCapta.length > 0) {
      funil_conversao.push({
        label: `${metasCapta.length} indicadores de funil na meta do ciclo`,
        detail: metasCapta
          .map((t) => `${GOAL_METRIC_CATALOG[t.metric].label}: ${t.target}`)
          .join(" · "),
      });
    }
  }
  if (funil_conversao.length === 0) {
    funil_conversao.push({
      label: "Acompanhamento do funil de conversão da BU",
      detail:
        "Analise leads qualificados, taxas de conversão de landing page e CAC do produto principal.",
    });
  }

  return {
    negocio_mercado: previous_cycle,
    cliente_marca: audience,
    portfolio_oferta: portfolio,
    funil_conversao,
    contexto_capacidade: [...seasonality, ...external],
    // Fallback legado
    portfolio,
    audience,
    seasonality,
    previous_cycle,
    external,
  } as LensEvidence;
}

/* ─────────────────────── relatório de órfãos ─────────────────────── */

export type Orphans = {
  /** Achados que nenhuma meta respondeu. */
  findingsWithoutGoal: Finding[];
  /** Metas que não apontam nenhum achado. */
  goalsWithoutFinding: { id: string; label: string }[];
};

export function findOrphans(
  findings: Finding[],
  goals: CycleGoals,
  scopeLabels: Record<string, string>,
): Orphans {
  const findingsWithoutGoal = findings.filter((f) => f.goalIds.length === 0);

  const comAchado = new Set(findings.flatMap((f) => f.goalIds));
  const goalsWithoutFinding = Object.values(goals)
    .filter((goal): goal is NonNullable<typeof goal> => goal !== null)
    .filter((goal) => !comAchado.has(goal.id))
    .map((goal) => ({
      id: goal.id,
      label: scopeLabels[goal.scope] ?? goal.scope,
    }));

  return { findingsWithoutGoal, goalsWithoutFinding };
}

/** Os achados de um ciclo, de todas as rodadas, para o seletor em Metas. */
export async function listFindingsOfCycle(
  cycleId: string,
): Promise<(Finding & { roundSequence: number })[]> {
  const db = await getDb();

  const rows = await db
    .select({
      finding: strategyFinding,
      sequence: strategyRound.sequence,
    })
    .from(strategyFinding)
    .innerJoin(strategyRound, eq(strategyFinding.roundId, strategyRound.id))
    .where(eq(strategyRound.cycleId, cycleId))
    .orderBy(desc(strategyRound.sequence), asc(strategyFinding.sortOrder));

  if (rows.length === 0) return [];

  const vinculos = await db
    .select()
    .from(strategyGoalFinding)
    .where(
      inArray(
        strategyGoalFinding.findingId,
        rows.map((r) => r.finding.id),
      ),
    );

  const porAchado = new Map<string, string[]>();
  for (const v of vinculos) {
    const lista = porAchado.get(v.findingId) ?? [];
    lista.push(v.goalId);
    porAchado.set(v.findingId, lista);
  }

  return rows.map(({ finding, sequence }) => ({
    id: finding.id,
    lens: finding.lens,
    kind: finding.kind,
    statement: finding.statement,
    evidence: finding.evidence,
    goalIds: porAchado.get(finding.id) ?? [],
    roundSequence: sequence,
  }));
}

/** As revisões de uma meta, mais recente primeiro. */
export async function listGoalRevisions(goalId: string) {
  const db = await getDb();

  return db
    .select()
    .from(strategyGoalRevision)
    .where(eq(strategyGoalRevision.goalId, goalId))
    .orderBy(desc(strategyGoalRevision.changedAt));
}
