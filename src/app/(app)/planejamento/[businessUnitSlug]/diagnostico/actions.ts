"use server";

import { revalidatePath } from "next/cache";
import { and, eq, max } from "drizzle-orm";

import type { StrategyFormState } from "../../form-state";
import { requirePermission } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import {
  businessUnit,
  strategyCycle,
  strategyFinding,
  strategyGoalFinding,
  strategyMeasurement,
  strategyRound,
  DIAGNOSIS_LENSES,
  FINDING_KINDS,
  isGoalMetric,
  type DiagnosisLens,
  type FindingKind,
  type GoalMetric,
} from "@/lib/db/schema";
import { writeAuditLog } from "@/lib/modules/audit/log";
import { canSeeBusinessUnit } from "@/lib/modules/access/scope";
import { fromDateInput, startOfDay } from "@/lib/modules/strategy/dates";
import { newId } from "@/lib/utils/id";

function field(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

/**
 * Converte o que a pessoa digitou em número.
 *
 * Aceita o formato brasileiro ("1.250,50") e o cru ("1250.5"): quem digita usa
 * vírgula, quem cola de uma planilha traz ponto.
 */
function parseAmount(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const normalized = trimmed
    .replace(/[R$%\s]/g, "")
    .replace(/\.(?=\d{3}(\D|$))/g, "")
    .replace(",", ".");

  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

/**
 * Portão de escrita do diagnóstico.
 *
 * Mesma regra do resto do módulo: além da permissão, exige que a pessoa trabalhe
 * na BU (ou tenha alcance de coordenação). Esconder o botão é conveniência — é
 * esta função que protege.
 */
async function requireEditor(businessUnitId: string) {
  const currentUser = await requirePermission("strategy", "edit");

  const db = await getDb();
  const unit = await db
    .select({
      id: businessUnit.id,
      slug: businessUnit.slug,
      label: businessUnit.label,
    })
    .from(businessUnit)
    .where(eq(businessUnit.id, businessUnitId))
    .get();

  if (!unit) return { erro: "Essa Business Unit não existe mais." } as const;

  const noEscopo = canSeeBusinessUnit(currentUser.scope, unit.id);

  if (!noEscopo) {
    return {
      erro: `O diagnóstico de ${unit.label} só pode ser editado por quem trabalha na BU.`,
    } as const;
  }

  return { currentUser, unit } as const;
}

/** Localiza o ciclo e confere a permissão de uma vez. */
async function gateByCycle(cycleId: string) {
  const db = await getDb();
  const cycle = await db
    .select({
      id: strategyCycle.id,
      name: strategyCycle.name,
      businessUnitId: strategyCycle.businessUnitId,
    })
    .from(strategyCycle)
    .where(eq(strategyCycle.id, cycleId))
    .get();

  if (!cycle) return { erro: "Esse ciclo não existe mais." } as const;

  const gate = await requireEditor(cycle.businessUnitId);
  if ("erro" in gate) return { erro: gate.erro } as const;

  return {
    currentUser: gate.currentUser,
    unit: gate.unit,
    cycle,
  } as const;
}

/** Localiza a rodada (e o ciclo dela) e confere a permissão. */
async function gateByRound(roundId: string) {
  const db = await getDb();
  const row = await db
    .select({
      roundId: strategyRound.id,
      sequence: strategyRound.sequence,
      isOpen: strategyRound.isOpen,
      cycleId: strategyCycle.id,
      cycleName: strategyCycle.name,
      businessUnitId: strategyCycle.businessUnitId,
    })
    .from(strategyRound)
    .innerJoin(strategyCycle, eq(strategyRound.cycleId, strategyCycle.id))
    .where(eq(strategyRound.id, roundId))
    .get();

  if (!row) return { erro: "Essa rodada não existe mais." } as const;

  const gate = await requireEditor(row.businessUnitId);
  if ("erro" in gate) return { erro: gate.erro } as const;

  return {
    currentUser: gate.currentUser,
    unit: gate.unit,
    round: row,
  } as const;
}

function revalidateStrategy(slug: string) {
  revalidatePath(`/planejamento/${slug}`, "layout");
}

/* ─────────────────────────── rodadas ─────────────────────────── */

/**
 * Abre uma rodada de diagnóstico.
 *
 * A sequência é calculada, não digitada, e as anteriores são fechadas na mesma
 * operação: duas rodadas abertas ao mesmo tempo tornariam ambíguo onde um achado
 * novo deve entrar.
 */
export async function openRound(
  _previousState: StrategyFormState,
  formData: FormData,
): Promise<StrategyFormState> {
  const cycleId = field(formData, "cycleId");
  const gate = await gateByCycle(cycleId);
  if ("erro" in gate) return { status: "error", message: gate.erro };

  const dataRef =
    fromDateInput(field(formData, "referenceDate")) ?? startOfDay(new Date());

  const db = await getDb();
  const ultima = await db
    .select({ maior: max(strategyRound.sequence) })
    .from(strategyRound)
    .where(eq(strategyRound.cycleId, cycleId))
    .get();

  const sequence = (ultima?.maior ?? 0) + 1;
  const now = new Date();

  await db
    .update(strategyRound)
    .set({ isOpen: false, updatedAt: now })
    .where(
      and(eq(strategyRound.cycleId, cycleId), eq(strategyRound.isOpen, true)),
    );

  const id = newId("rnd");
  await db.insert(strategyRound).values({
    id,
    cycleId,
    sequence,
    referenceDate: dataRef,
    isOpen: true,
    summary: null,
    createdBy: gate.currentUser.id,
    updatedBy: gate.currentUser.id,
    createdAt: now,
    updatedAt: now,
  });

  await writeAuditLog({
    actorUserId: gate.currentUser.id,
    actorEmail: gate.currentUser.email,
    action: "strategy_round.create",
    entityType: "strategy_round",
    entityId: id,
    summary: `Abriu a ${sequence}ª rodada de diagnóstico de ${gate.unit.label} · ${gate.cycle.name}`,
    afterData: { sequence, referenceDate: dataRef.toISOString() },
  });

  revalidateStrategy(gate.unit.slug);
  return { status: "success", message: `${sequence}ª rodada aberta.` };
}

/** Grava a leitura geral da rodada, síntese (desafio e oportunidade), objetivo do ciclo e pilares. */
export async function saveRoundSummary(
  _previousState: StrategyFormState,
  formData: FormData,
): Promise<StrategyFormState> {
  const roundId = field(formData, "roundId");
  const gate = await gateByRound(roundId);
  if ("erro" in gate) return { status: "error", message: gate.erro };
  if (!gate.round.isOpen) {
    return {
      status: "error",
      message: "Esta rodada está fechada para edição.",
    };
  }

  const db = await getDb();
  const updatePayload: Record<string, any> = {
    summary: field(formData, "summary") || null,
    mainChallenge: field(formData, "mainChallenge") || null,
    mainOpportunity: field(formData, "mainOpportunity") || null,
    cycleObjective: field(formData, "cycleObjective") || null,
    cyclePeriod: field(formData, "cyclePeriod") || null,
    updatedBy: gate.currentUser.id,
    updatedAt: new Date(),
  };

  const bm = field(formData, "businessMarketDiagnosis");
  if (bm !== "") updatePayload.businessMarketDiagnosis = bm;
  const cb = field(formData, "clientBrandDiagnosis");
  if (cb !== "") updatePayload.clientBrandDiagnosis = cb;
  const po = field(formData, "portfolioOfferDiagnosis");
  if (po !== "") updatePayload.portfolioOfferDiagnosis = po;
  const fc = field(formData, "funnelConversionDiagnosis");
  if (fc !== "") updatePayload.funnelConversionDiagnosis = fc;
  const cc = field(formData, "contextCapacityDiagnosis");
  if (cc !== "") updatePayload.contextCapacityDiagnosis = cc;

  await db
    .update(strategyRound)
    .set(updatePayload)
    .where(eq(strategyRound.id, roundId));

  await writeAuditLog({
    actorUserId: gate.currentUser.id,
    actorEmail: gate.currentUser.email,
    action: "strategy_round.update",
    entityType: "strategy_round",
    entityId: roundId,
    summary: `Atualizou a síntese e objetivo da ${gate.round.sequence}ª rodada de ${gate.unit.label}`,
    afterData: updatePayload,
  });

  revalidateStrategy(gate.unit.slug);
  return {
    status: "success",
    message: "Diagnóstico da BU salvo com sucesso.",
  };
}

/** Grava o Diagnóstico da BU em um dos 5 pilares individualmente. */
export async function savePillarDiagnosisAction(
  _previousState: StrategyFormState,
  formData: FormData,
): Promise<StrategyFormState> {
  const roundId = field(formData, "roundId");
  const gate = await gateByRound(roundId);
  if ("erro" in gate) return { status: "error", message: gate.erro };
  if (!gate.round.isOpen) {
    return {
      status: "error",
      message: "Esta rodada está fechada para edição.",
    };
  }

  const lens = field(formData, "lens");
  const text = field(formData, "diagnosisText");

  if (
    lens !== "negocio_mercado" &&
    lens !== "cliente_marca" &&
    lens !== "portfolio_oferta" &&
    lens !== "funil_conversao" &&
    lens !== "contexto_capacidade"
  ) {
    return {
      status: "error",
      message: "Pilar inválido para diagnóstico.",
    };
  }

  const db = await getDb();
  const updateData: Record<string, string | null> = {};
  if (lens === "negocio_mercado") updateData.businessMarketDiagnosis = text || null;
  else if (lens === "cliente_marca") updateData.clientBrandDiagnosis = text || null;
  else if (lens === "portfolio_oferta") updateData.portfolioOfferDiagnosis = text || null;
  else if (lens === "funil_conversao") updateData.funnelConversionDiagnosis = text || null;
  else if (lens === "contexto_capacidade") updateData.contextCapacityDiagnosis = text || null;

  await db
    .update(strategyRound)
    .set({
      ...updateData,
      updatedBy: gate.currentUser.id,
      updatedAt: new Date(),
    })
    .where(eq(strategyRound.id, roundId));

  await writeAuditLog({
    actorUserId: gate.currentUser.id,
    actorEmail: gate.currentUser.email,
    action: "strategy_round.update",
    entityType: "strategy_round",
    entityId: roundId,
    summary: `Atualizou o diagnóstico do pilar "${lens}" na ${gate.round.sequence}ª rodada de ${gate.unit.label}`,
    afterData: updateData,
  });

  revalidateStrategy(gate.unit.slug);
  return {
    status: "success",
    message: "Diagnóstico da BU atualizado com sucesso.",
  };
}


/** Fecha ou reabre a rodada. */
export async function toggleRound(formData: FormData): Promise<void> {
  const roundId = String(formData.get("roundId") ?? "");
  const gate = await gateByRound(roundId);
  if ("erro" in gate) return;

  const proximo = !gate.round.isOpen;
  const db = await getDb();
  const now = new Date();

  // Reabrir fecha as outras, pela mesma razão de `openRound`.
  if (proximo) {
    await db
      .update(strategyRound)
      .set({ isOpen: false, updatedAt: now })
      .where(
        and(
          eq(strategyRound.cycleId, gate.round.cycleId),
          eq(strategyRound.isOpen, true),
        ),
      );
  }

  await db
    .update(strategyRound)
    .set({ isOpen: proximo, updatedBy: gate.currentUser.id, updatedAt: now })
    .where(eq(strategyRound.id, roundId));

  await writeAuditLog({
    actorUserId: gate.currentUser.id,
    actorEmail: gate.currentUser.email,
    action: "strategy_round.update",
    entityType: "strategy_round",
    entityId: roundId,
    summary: `${proximo ? "Reabriu" : "Fechou"} a ${gate.round.sequence}ª rodada de ${gate.unit.label} · ${gate.round.cycleName}`,
    beforeData: { isOpen: gate.round.isOpen },
    afterData: { isOpen: proximo },
  });

  revalidateStrategy(gate.unit.slug);
}

/* ─────────────────────────── achados ─────────────────────────── */

function isLens(value: string): value is DiagnosisLens {
  return (DIAGNOSIS_LENSES as readonly string[]).includes(value);
}

function isKind(value: string): value is FindingKind {
  return (FINDING_KINDS as readonly string[]).includes(value);
}

/** Cria ou edita um achado. */
export async function saveFinding(
  _previousState: StrategyFormState,
  formData: FormData,
): Promise<StrategyFormState> {
  const roundId = field(formData, "roundId");
  const gate = await gateByRound(roundId);
  if ("erro" in gate) return { status: "error", message: gate.erro };
  if (!gate.round.isOpen) {
    return {
      status: "error",
      message: "Esta rodada está fechada para edição.",
    };
  }

  const lens = field(formData, "lens");
  const kind = field(formData, "kind");
  const statement = field(formData, "statement");

  if (!isLens(lens)) return { status: "error", message: "Lente inválida." };
  if (!isKind(kind))
    return { status: "error", message: "Classifique o achado." };
  if (!statement) {
    return { status: "error", message: "Escreva a frase do achado." };
  }

  const db = await getDb();
  const findingId = field(formData, "findingId");
  const now = new Date();
  const evidence = field(formData, "evidence") || null;

  if (findingId) {
    const existente = await db
      .select({ id: strategyFinding.id, roundId: strategyFinding.roundId })
      .from(strategyFinding)
      .where(eq(strategyFinding.id, findingId))
      .get();

    // Confere que o achado é da rodada informada: sem isso, um id trocado no
    // formulário editaria achado de outra BU.
    if (!existente || existente.roundId !== roundId) {
      return { status: "error", message: "Esse achado não existe mais." };
    }

    await db
      .update(strategyFinding)
      .set({ lens, kind, statement, evidence, updatedAt: now })
      .where(eq(strategyFinding.id, findingId));

    await writeAuditLog({
      actorUserId: gate.currentUser.id,
      actorEmail: gate.currentUser.email,
      action: "strategy_finding.update",
      entityType: "strategy_finding",
      entityId: findingId,
      summary: `Atualizou o achado "${statement.slice(0, 60)}" de ${gate.unit.label}`,
      afterData: { lens, kind, statement, evidence },
    });

    revalidateStrategy(gate.unit.slug);
    return { status: "success", message: "Achado atualizado." };
  }

  const ultimo = await db
    .select({ maior: max(strategyFinding.sortOrder) })
    .from(strategyFinding)
    .where(eq(strategyFinding.roundId, roundId))
    .get();

  const id = newId("find");
  await db.insert(strategyFinding).values({
    id,
    roundId,
    lens,
    kind,
    statement,
    evidence,
    sortOrder: (ultimo?.maior ?? 0) + 1,
    createdBy: gate.currentUser.id,
    createdAt: now,
    updatedAt: now,
  });

  await writeAuditLog({
    actorUserId: gate.currentUser.id,
    actorEmail: gate.currentUser.email,
    action: "strategy_finding.create",
    entityType: "strategy_finding",
    entityId: id,
    summary: `Registrou o achado "${statement.slice(0, 60)}" em ${gate.unit.label}`,
    afterData: { lens, kind, statement, evidence },
  });

  revalidateStrategy(gate.unit.slug);
  return { status: "success", message: "Achado registrado." };
}

export async function deleteFinding(formData: FormData): Promise<void> {
  const findingId = String(formData.get("findingId") ?? "");
  if (!findingId) return;

  const db = await getDb();
  const achado = await db
    .select({
      id: strategyFinding.id,
      statement: strategyFinding.statement,
      businessUnitId: strategyCycle.businessUnitId,
      isOpen: strategyRound.isOpen,
    })
    .from(strategyFinding)
    .innerJoin(strategyRound, eq(strategyFinding.roundId, strategyRound.id))
    .innerJoin(strategyCycle, eq(strategyRound.cycleId, strategyCycle.id))
    .where(eq(strategyFinding.id, findingId))
    .get();

  if (!achado) return;
  if (!achado.isOpen) return;

  const gate = await requireEditor(achado.businessUnitId);
  if ("erro" in gate) return;

  await db
    .delete(strategyGoalFinding)
    .where(eq(strategyGoalFinding.findingId, findingId));

  await db.delete(strategyFinding).where(eq(strategyFinding.id, findingId));

  await writeAuditLog({
    actorUserId: gate.currentUser.id,
    actorEmail: gate.currentUser.email,
    action: "strategy_finding.delete",
    entityType: "strategy_finding",
    entityId: findingId,
    summary: `Apagou o achado "${achado.statement.slice(0, 60)}" de ${gate.unit.label}`,
    beforeData: { statement: achado.statement },
  });

  revalidateStrategy(gate.unit.slug);
}

/* ────────────────────────── realizado ────────────────────────── */

/**
 * Grava o realizado dos indicadores nesta rodada.
 *
 * Regrava o conjunto inteiro: são poucos campos, e um indicador esvaziado no
 * formulário precisa desaparecer do banco — atualizar campo a campo deixaria o
 * valor antigo pendurado.
 */
export async function saveMeasurements(
  _previousState: StrategyFormState,
  formData: FormData,
): Promise<StrategyFormState> {
  const roundId = field(formData, "roundId");
  const gate = await gateByRound(roundId);
  if ("erro" in gate) return { status: "error", message: gate.erro };
  if (!gate.round.isOpen) {
    return {
      status: "error",
      message: "Esta rodada está fechada para edição.",
    };
  }

  const medidas: { metric: GoalMetric; actual: number; note: string | null }[] =
    [];

  for (const [chave, valor] of formData.entries()) {
    const match = /^realizado_([a-z_]+)$/.exec(chave);
    if (!match) continue;

    const metric = match[1];
    if (!isGoalMetric(metric)) continue;

    const parsed = parseAmount(String(valor));
    if (parsed === null) continue;

    medidas.push({
      metric,
      actual: parsed,
      note: field(formData, `nota_realizado_${metric}`) || null,
    });
  }

  const db = await getDb();
  const now = new Date();

  await db
    .delete(strategyMeasurement)
    .where(eq(strategyMeasurement.roundId, roundId));

  if (medidas.length > 0) {
    await db.insert(strategyMeasurement).values(
      medidas.map((m) => ({
        id: newId("meas"),
        roundId,
        metric: m.metric,
        actual: m.actual,
        note: m.note,
        createdAt: now,
        updatedAt: now,
      })),
    );
  }

  await db
    .update(strategyRound)
    .set({ updatedBy: gate.currentUser.id, updatedAt: now })
    .where(eq(strategyRound.id, roundId));

  await writeAuditLog({
    actorUserId: gate.currentUser.id,
    actorEmail: gate.currentUser.email,
    action: "strategy_measurement.save",
    entityType: "strategy_round",
    entityId: roundId,
    summary: `Registrou ${medidas.length} indicadores realizados na ${gate.round.sequence}ª rodada de ${gate.unit.label}`,
    afterData: { totalIndicadores: medidas.length },
  });

  revalidateStrategy(gate.unit.slug);
  return {
    status: "success",
    message:
      medidas.length === 0
        ? "Nenhum número registrado nesta rodada."
        : `${medidas.length} ${medidas.length === 1 ? "indicador registrado" : "indicadores registrados"}.`,
  };
}

/** Grava o Diagnóstico da BU completo (5 Pilares + Síntese com Desafio e Oportunidade) */
export async function saveFullDiagnosisAction(data: {
  roundId: string;
  businessUnitId: string;
  businessMarketDiagnosis?: string | null;
  clientBrandDiagnosis?: string | null;
  portfolioOfferDiagnosis?: string | null;
  funnelConversionDiagnosis?: string | null;
  contextCapacityDiagnosis?: string | null;
  mainChallenge?: string | null;
  mainOpportunity?: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  const gate = await gateByRound(data.roundId);
  if ("erro" in gate) return { ok: false, error: gate.erro };
  if (!gate.round.isOpen) {
    return { ok: false, error: "Esta rodada está fechada para edição." };
  }

  const db = await getDb();
  const updatePayload = {
    businessMarketDiagnosis: data.businessMarketDiagnosis?.trim() || null,
    clientBrandDiagnosis: data.clientBrandDiagnosis?.trim() || null,
    portfolioOfferDiagnosis: data.portfolioOfferDiagnosis?.trim() || null,
    funnelConversionDiagnosis: data.funnelConversionDiagnosis?.trim() || null,
    contextCapacityDiagnosis: data.contextCapacityDiagnosis?.trim() || null,
    mainChallenge: data.mainChallenge?.trim() || null,
    mainOpportunity: data.mainOpportunity?.trim() || null,
    updatedBy: gate.currentUser.id,
    updatedAt: new Date(),
  };

  await db
    .update(strategyRound)
    .set(updatePayload)
    .where(eq(strategyRound.id, data.roundId));

  await writeAuditLog({
    actorUserId: gate.currentUser.id,
    actorEmail: gate.currentUser.email,
    action: "strategy_round.update",
    entityType: "strategy_round",
    entityId: data.roundId,
    summary: `Atualizou o Diagnóstico da BU e síntese na ${gate.round.sequence}ª rodada de ${gate.unit.label}`,
    afterData: updatePayload,
  });

  revalidateStrategy(gate.unit.slug);
  return { ok: true };
}

