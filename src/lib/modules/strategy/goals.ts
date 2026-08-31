import { asc, eq, inArray } from "drizzle-orm";

import { getDb } from "@/lib/db/client";
import {
  strategyGoal,
  strategyGoalTarget,
  GOAL_METRIC_CATALOG,
  GOAL_SCOPES,
  type GoalMetric,
  type GoalScope,
  type StrategyCycle,
} from "@/lib/db/schema";
import { endOfDay, startOfDay } from "@/lib/modules/strategy/dates";

/**
 * O ano a que o ciclo se refere.
 *
 * Vem da data de início, e não do slug: o slug é texto livre e nada garante que
 * seja um ano. Um ciclo que começa em fev/2026 é o ciclo de 2026.
 */
export function cycleYear(cycle: Pick<StrategyCycle, "startsAt">): number {
  return cycle.startsAt.getFullYear();
}

/**
 * O período de um escopo.
 *
 * Os semestres são CIVIS — jan–jun e jul–dez — mesmo quando o ciclo não é
 * ano-calendário. É uma escolha de legibilidade: "1º semestre" significa a mesma
 * coisa em toda BU e em toda conversa, ainda que o ciclo de uma delas comece em
 * fevereiro. Quando o ciclo não cobre o semestre inteiro, `partial` avisa, e a
 * tela mostra o recorte real em vez de fingir que o semestre está cheio.
 */
export function scopeRange(
  cycle: Pick<StrategyCycle, "startsAt" | "endsAt">,
  scope: GoalScope,
): { startsAt: Date; endsAt: Date; partial: boolean } {
  if (scope === "cycle") {
    return { startsAt: cycle.startsAt, endsAt: cycle.endsAt, partial: false };
  }

  const year = cycle.startsAt.getFullYear();
  const civil =
    scope === "h1"
      ? {
          startsAt: startOfDay(new Date(year, 0, 1)),
          endsAt: endOfDay(new Date(year, 5, 30)),
        }
      : {
          startsAt: startOfDay(new Date(year, 6, 1)),
          endsAt: endOfDay(new Date(year, 11, 31)),
        };

  // Recorta pelo ciclo: um ciclo fev–dez não tem janeiro para planejar.
  const startsAt =
    cycle.startsAt.getTime() > civil.startsAt.getTime()
      ? cycle.startsAt
      : civil.startsAt;
  const endsAt =
    cycle.endsAt.getTime() < civil.endsAt.getTime()
      ? cycle.endsAt
      : civil.endsAt;

  return {
    startsAt,
    endsAt,
    partial:
      startsAt.getTime() !== civil.startsAt.getTime() ||
      endsAt.getTime() !== civil.endsAt.getTime(),
  };
}

/** O semestre já terminou? Usado para marcar o que é passado na tela. */
export function scopeIsPast(
  cycle: Pick<StrategyCycle, "startsAt" | "endsAt">,
  scope: GoalScope,
): boolean {
  return scopeRange(cycle, scope).endsAt.getTime() < Date.now();
}

/** O escopo do semestre em que estamos, ou `null` fora do ciclo. */
export function currentSemester(
  cycle: Pick<StrategyCycle, "startsAt" | "endsAt">,
): GoalScope | null {
  const agora = Date.now();
  for (const scope of ["h1", "h2"] as const) {
    const { startsAt, endsAt } = scopeRange(cycle, scope);
    if (agora >= startsAt.getTime() && agora <= endsAt.getTime()) return scope;
  }
  return null;
}

export type GoalTarget = {
  metric: GoalMetric;
  target: number;
  note: string | null;
};

export type GoalFront = { title: string; detail?: string };

export type Goal = {
  id: string;
  scope: GoalScope;
  objective: string;
  rationale: string | null;
  fronts: GoalFront[];
  nonGoals: string | null;
  successSignal: string | null;
  risks: string | null;
  targets: GoalTarget[];
  updatedAt: Date;
};

/** As três metas de um ciclo, indexadas por escopo. `null` = ainda não escrita. */
export type CycleGoals = Record<GoalScope, Goal | null>;

export async function loadCycleGoals(cycleId: string): Promise<CycleGoals> {
  const db = await getDb();

  const rows = await db
    .select()
    .from(strategyGoal)
    .where(eq(strategyGoal.cycleId, cycleId));

  const empty = Object.fromEntries(
    GOAL_SCOPES.map((scope) => [scope, null]),
  ) as CycleGoals;

  if (rows.length === 0) return empty;

  const targets = await db
    .select()
    .from(strategyGoalTarget)
    .where(
      inArray(
        strategyGoalTarget.goalId,
        rows.map((row) => row.id),
      ),
    )
    .orderBy(asc(strategyGoalTarget.sortOrder));

  const byGoal = new Map<string, GoalTarget[]>();
  for (const row of targets) {
    if (
      !Object.prototype.hasOwnProperty.call(GOAL_METRIC_CATALOG, row.metric)
    ) {
      continue;
    }
    const list = byGoal.get(row.goalId) ?? [];
    list.push({ metric: row.metric, target: row.target, note: row.note });
    byGoal.set(row.goalId, list);
  }

  for (const row of rows) {
    if (!(GOAL_SCOPES as readonly string[]).includes(row.scope)) continue;
    empty[row.scope] = {
      id: row.id,
      scope: row.scope,
      objective: row.objective,
      rationale: row.rationale,
      fronts: Array.isArray(row.fronts) ? row.fronts : [],
      nonGoals: row.nonGoals,
      successSignal: row.successSignal,
      risks: row.risks,
      targets: byGoal.get(row.id) ?? [],
      updatedAt: row.updatedAt,
    };
  }

  return empty;
}

/**
 * Escreve o número conforme a unidade do indicador.
 *
 * Dinheiro fica compacto ("R$ 1,2 mi") porque a meta anual de faturamento tem
 * sete dígitos e o número inteiro não cabe no cartão.
 */
export function formatMetricValue(metric: GoalMetric, value: number): string {
  const { unit } = GOAL_METRIC_CATALOG[metric];

  switch (unit) {
    case "currency": {
      if (Math.abs(value) >= 1_000_000) {
        return `R$ ${(value / 1_000_000).toLocaleString("pt-BR", {
          maximumFractionDigits: 1,
        })} mi`;
      }
      if (Math.abs(value) >= 10_000) {
        return `R$ ${(value / 1_000).toLocaleString("pt-BR", {
          maximumFractionDigits: 0,
        })} mil`;
      }
      return `R$ ${value.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}`;
    }
    case "percent":
      return `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
    case "ratio":
      return `${value.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}×`;
    case "score":
      return value.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
    default:
      return value.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
  }
}

export function metricLabel(metric: GoalMetric): string {
  return GOAL_METRIC_CATALOG[metric].label;
}

/**
 * Indicadores que NÃO somam entre semestres.
 *
 * Somar duas taxas ou dois ticket médios não produz nada: 40% no 1º semestre
 * mais 45% no 2º não são 85%. Para esses a conferência compara ordem de
 * grandeza em vez de soma — ou melhor, não compara.
 */
const NAO_SOMAVEIS: ReadonlySet<string> = new Set(
  Object.entries(GOAL_METRIC_CATALOG)
    .filter(([, spec]) => spec.unit !== "count" && spec.unit !== "currency")
    .map(([key]) => key),
);

export function isSummable(metric: GoalMetric): boolean {
  return !NAO_SOMAVEIS.has(metric);
}

export type SumCheck = {
  metric: GoalMetric;
  cycleTarget: number;
  semestersSum: number;
  /** Diferença relativa. Positiva = semestres somam mais que o ciclo. */
  diff: number;
};

/**
 * Confere se os semestres fecham a meta do ciclo.
 *
 * Avisa, não bloqueia: divergência quase sempre é erro de digitação, mas às
 * vezes é intencional — deixar margem no ciclo é uma decisão legítima que a
 * ferramenta não deve proibir. Só entram indicadores somáveis e presentes nos
 * três escopos; comparar contra semestre em branco acusaria divergência em todo
 * planejamento pela metade.
 */
export function checkSums(goals: CycleGoals): SumCheck[] {
  const doCiclo = goals.cycle;
  if (!doCiclo) return [];

  const checks: SumCheck[] = [];

  for (const alvo of doCiclo.targets) {
    if (!isSummable(alvo.metric)) continue;

    const semestres = (["h1", "h2"] as const).map((scope) =>
      goals[scope]?.targets.find((t) => t.metric === alvo.metric),
    );

    // Exige os dois semestres preenchidos para este indicador.
    if (semestres.some((s) => s === undefined)) continue;

    const soma = semestres.reduce((total, s) => total + (s?.target ?? 0), 0);
    if (alvo.target === 0) continue;

    const diff = (soma - alvo.target) / alvo.target;
    // Tolerância de 0,5% absorve arredondamento sem esconder erro de verdade.
    if (Math.abs(diff) < 0.005) continue;

    checks.push({
      metric: alvo.metric,
      cycleTarget: alvo.target,
      semestersSum: soma,
      diff,
    });
  }

  return checks;
}

/** Quantos campos do template ficaram em branco — a "completude" da meta. */
export function missingFields(goal: Goal): string[] {
  const faltando: string[] = [];
  if (!goal.rationale) faltando.push("Por que este é o foco agora");
  if (goal.fronts.length === 0) faltando.push("Frentes");
  if (!goal.nonGoals) faltando.push("O que não vamos fazer");
  if (!goal.successSignal) faltando.push("Sinal de sucesso");
  if (!goal.risks) faltando.push("Riscos e dependências");
  if (goal.targets.length === 0) faltando.push("Indicadores");
  return faltando;
}
