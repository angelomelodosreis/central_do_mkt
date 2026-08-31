"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";

import type { StrategyFormState } from "./form-state";
import { requirePermission } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import {
  businessUnit,
  strategyCycle,
  strategyGoal,
  strategyFinding,
  strategyGoalFinding,
  strategyGoalRevision,
  strategyGoalTarget,
  strategyProduct,
  strategyRound,
  timelineItem,
  GOAL_SCOPES,
  GOAL_SCOPE_LABELS,
  isGoalMetric,
  TIMELINE_KINDS,
  TIMELINE_STATUSES,
  PRODUCT_CADENCES,
  type GoalMetric,
  type GoalScope,
  type ProductCadence,
  type TimelineKind,
  type TimelineStatus,
} from "@/lib/db/schema";
import { writeAuditLog } from "@/lib/modules/audit/log";
import { toKebabCase } from "@/lib/modules/documentation/slug";
import { canSeeBusinessUnit } from "@/lib/modules/access/scope";
import {
  endOfDay,
  fromDateInput,
  startOfDay,
} from "@/lib/modules/strategy/dates";
import { getItemBusinessUnit } from "@/lib/modules/strategy/queries";
import { TIMELINE_KIND_CONFIG } from "@/lib/modules/strategy/timeline-kinds";
import { newId } from "@/lib/utils/id";

function field(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function revalidateStrategy(businessUnitSlug: string) {
  revalidatePath(`/planejamento/${businessUnitSlug}`, "layout");
  revalidatePath("/planejamento");
}

/**
 * Portão de escrita do módulo.
 *
 * Toda gravação passa por aqui: além da permissão de módulo, confere se o
 * usuário trabalha naquela BU (ou tem alcance de coordenação). Esconder o botão
 * na tela é conveniência — é esta função que de fato protege.
 */
async function requireStrategyEditor(businessUnitId: string) {
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
      erro: `O planejamento de ${unit.label} só pode ser editado por quem trabalha na BU.`,
    } as const;
  }

  return { currentUser, unit } as const;
}

function isKind(value: string): value is TimelineKind {
  return (TIMELINE_KINDS as readonly string[]).includes(value);
}

function isStatus(value: string): value is TimelineStatus {
  return (TIMELINE_STATUSES as readonly string[]).includes(value);
}

/** Guarda só os campos que a categoria declara — o resto do form é ignorado. */
function readDetails(
  formData: FormData,
  kind: TimelineKind,
): Record<string, string> | null {
  const details: Record<string, string> = {};

  for (const spec of TIMELINE_KIND_CONFIG[kind].fields) {
    const value = field(formData, `detalhe_${spec.key}`);
    if (value) details[spec.key] = value;
  }

  return Object.keys(details).length > 0 ? details : null;
}

/** Cria ou edita um item da linha do tempo. */
export async function saveTimelineItem(
  _previousState: StrategyFormState,
  formData: FormData,
): Promise<StrategyFormState> {
  const itemId = field(formData, "itemId");
  const cycleId = field(formData, "cycleId");
  const title = field(formData, "title");
  const kindValue = field(formData, "kind");

  if (!title) return { status: "error", message: "Informe o título do item." };
  if (!isKind(kindValue)) {
    return { status: "error", message: "Escolha a categoria do item." };
  }

  const startsAt = fromDateInput(field(formData, "startsAt"));
  const endsAtRaw = fromDateInput(field(formData, "endsAt"));
  if (!startsAt) {
    return { status: "error", message: "Informe a data de início." };
  }

  // Fim em branco significa item de um dia só. Fim antes do início é engano de
  // digitação: tratamos como um dia, em vez de recusar e perder o que a pessoa
  // escreveu.
  const endsAt =
    endsAtRaw && endsAtRaw.getTime() >= startsAt.getTime()
      ? endsAtRaw
      : startsAt;

  const db = await getDb();

  // Quem manda no acesso é a BU dona do ciclo. Numa edição ela vem pelo item;
  // numa criação, pelo ciclo informado.
  const target = itemId
    ? await getItemBusinessUnit(itemId)
    : await db
        .select({ id: strategyCycle.businessUnitId })
        .from(strategyCycle)
        .where(eq(strategyCycle.id, cycleId))
        .get();

  if (!target) {
    return {
      status: "error",
      message: "Ciclo de planejamento não encontrado.",
    };
  }

  const gate = await requireStrategyEditor(target.id);
  if ("erro" in gate) return { status: "error", message: gate.erro };

  const productId = field(formData, "productId") || null;
  const owner = field(formData, "owner") || null;
  const summary = field(formData, "summary") || null;
  const statusValue = field(formData, "status");
  const status: TimelineStatus = isStatus(statusValue)
    ? statusValue
    : "planned";
  const details = readDetails(formData, kindValue);
  const now = new Date();

  if (itemId) {
    const existing = await db
      .select()
      .from(timelineItem)
      .where(eq(timelineItem.id, itemId))
      .get();

    if (!existing) {
      return { status: "error", message: "Esse item não existe mais." };
    }

    await db
      .update(timelineItem)
      .set({
        kind: kindValue,
        title,
        summary,
        startsAt: startOfDay(startsAt),
        endsAt: endOfDay(endsAt),
        productId,
        owner,
        status,
        details,
        updatedBy: gate.currentUser.id,
        updatedAt: now,
      })
      .where(eq(timelineItem.id, itemId));

    await writeAuditLog({
      actorUserId: gate.currentUser.id,
      actorEmail: gate.currentUser.email,
      action: "timeline_item.update",
      entityType: "timeline_item",
      entityId: itemId,
      summary: `Editou "${existing.title}" no planejamento de ${gate.unit.label}`,
      beforeData: {
        kind: existing.kind,
        title: existing.title,
        summary: existing.summary,
        startsAt: existing.startsAt,
        endsAt: existing.endsAt,
        productId: existing.productId,
        owner: existing.owner,
        status: existing.status,
        details: existing.details,
      },
      afterData: { kind: kindValue, title, startsAt, endsAt, status },
    });

    revalidateStrategy(gate.unit.slug);
    return { status: "success", message: "Item atualizado." };
  }

  const newItemId = newId("tli");

  await db.insert(timelineItem).values({
    id: newItemId,
    cycleId,
    kind: kindValue,
    title,
    summary,
    startsAt: startOfDay(startsAt),
    endsAt: endOfDay(endsAt),
    productId,
    owner,
    status,
    details,
    createdBy: gate.currentUser.id,
    updatedBy: gate.currentUser.id,
    createdAt: now,
    updatedAt: now,
  });

  await writeAuditLog({
    actorUserId: gate.currentUser.id,
    actorEmail: gate.currentUser.email,
    action: "timeline_item.create",
    entityType: "timeline_item",
    entityId: newItemId,
    summary: `Criou "${title}" no planejamento de ${gate.unit.label}`,
    afterData: { kind: kindValue, title, startsAt, endsAt },
  });

  revalidateStrategy(gate.unit.slug);
  return { status: "success", message: "Item criado." };
}

/**
 * Move ou redimensiona um item.
 *
 * Existe separada de `saveTimelineItem` porque é o que o arrastar chama: só
 * datas, sem passar pelo formulário inteiro.
 */
export async function moveTimelineItem(formData: FormData): Promise<void> {
  const itemId = field(formData, "itemId");
  const startsAt = fromDateInput(field(formData, "startsAt"));
  const endsAtRaw = fromDateInput(field(formData, "endsAt"));
  if (!itemId || !startsAt) return;

  const target = await getItemBusinessUnit(itemId);
  if (!target) return;

  const gate = await requireStrategyEditor(target.id);
  if ("erro" in gate) return;

  const endsAt =
    endsAtRaw && endsAtRaw.getTime() >= startsAt.getTime()
      ? endsAtRaw
      : startsAt;

  const db = await getDb();
  const existing = await db
    .select()
    .from(timelineItem)
    .where(eq(timelineItem.id, itemId))
    .get();

  if (!existing) return;

  await db
    .update(timelineItem)
    .set({
      startsAt: startOfDay(startsAt),
      endsAt: endOfDay(endsAt),
      updatedBy: gate.currentUser.id,
      updatedAt: new Date(),
    })
    .where(eq(timelineItem.id, itemId));

  await writeAuditLog({
    actorUserId: gate.currentUser.id,
    actorEmail: gate.currentUser.email,
    action: "timeline_item.update",
    entityType: "timeline_item",
    entityId: itemId,
    summary: `Reposicionou "${existing.title}" no calendário de ${gate.unit.label}`,
    beforeData: { startsAt: existing.startsAt, endsAt: existing.endsAt },
    afterData: { startsAt, endsAt },
  });

  revalidateStrategy(gate.unit.slug);
}

/** Duplica um item, deslocado para logo depois do original. */
export async function duplicateTimelineItem(formData: FormData): Promise<void> {
  const itemId = field(formData, "itemId");
  if (!itemId) return;

  const target = await getItemBusinessUnit(itemId);
  if (!target) return;

  const gate = await requireStrategyEditor(target.id);
  if ("erro" in gate) return;

  const db = await getDb();
  const original = await db
    .select()
    .from(timelineItem)
    .where(eq(timelineItem.id, itemId))
    .get();

  if (!original) return;

  const copyId = newId("tli");
  const now = new Date();

  await db.insert(timelineItem).values({
    ...original,
    id: copyId,
    title: `${original.title} (cópia)`,
    createdBy: gate.currentUser.id,
    updatedBy: gate.currentUser.id,
    createdAt: now,
    updatedAt: now,
  });

  await writeAuditLog({
    actorUserId: gate.currentUser.id,
    actorEmail: gate.currentUser.email,
    action: "timeline_item.create",
    entityType: "timeline_item",
    entityId: copyId,
    summary: `Duplicou "${original.title}" no planejamento de ${gate.unit.label}`,
    afterData: { copiadoDe: itemId },
  });

  revalidateStrategy(gate.unit.slug);
}

export async function deleteTimelineItem(formData: FormData): Promise<void> {
  const itemId = field(formData, "itemId");
  if (!itemId) return;

  const target = await getItemBusinessUnit(itemId);
  if (!target) return;

  const gate = await requireStrategyEditor(target.id);
  if ("erro" in gate) return;

  const db = await getDb();
  const existing = await db
    .select()
    .from(timelineItem)
    .where(eq(timelineItem.id, itemId))
    .get();

  if (!existing) return;

  await db.delete(timelineItem).where(eq(timelineItem.id, itemId));

  await writeAuditLog({
    actorUserId: gate.currentUser.id,
    actorEmail: gate.currentUser.email,
    action: "timeline_item.delete",
    entityType: "timeline_item",
    entityId: itemId,
    // O registro guarda o item inteiro: é o que permite desfazer na auditoria.
    summary: `Excluiu "${existing.title}" do planejamento de ${gate.unit.label}`,
    beforeData: existing,
  });

  revalidateStrategy(gate.unit.slug);
}

/** Cria um ciclo de planejamento para a BU. */
export async function createCycle(
  _previousState: StrategyFormState,
  formData: FormData,
): Promise<StrategyFormState> {
  const businessUnitId = field(formData, "businessUnitId");
  const name = field(formData, "name");
  const startsAt = fromDateInput(field(formData, "startsAt"));
  const endsAt = fromDateInput(field(formData, "endsAt"));

  if (!name) return { status: "error", message: "Informe o nome do ciclo." };
  if (!startsAt || !endsAt) {
    return { status: "error", message: "Informe o início e o fim do ciclo." };
  }
  if (endsAt.getTime() < startsAt.getTime()) {
    return { status: "error", message: "O fim do ciclo vem antes do início." };
  }

  const gate = await requireStrategyEditor(businessUnitId);
  if ("erro" in gate) return { status: "error", message: gate.erro };

  const slug = toKebabCase(name);
  if (!slug) {
    return {
      status: "error",
      message: "O nome precisa ter ao menos uma letra ou número.",
    };
  }

  const db = await getDb();

  // O slug é único dentro da BU: duas BUs podem ter o ciclo "2026".
  const sameSlug = await db
    .select({ id: strategyCycle.id })
    .from(strategyCycle)
    .where(
      and(
        eq(strategyCycle.businessUnitId, businessUnitId),
        eq(strategyCycle.slug, slug),
      ),
    )
    .get();

  if (sameSlug) {
    return {
      status: "error",
      message: `Já existe um ciclo "${name}" em ${gate.unit.label}.`,
    };
  }

  // Só um ciclo por BU fica marcado como atual.
  await db
    .update(strategyCycle)
    .set({ isCurrent: false })
    .where(eq(strategyCycle.businessUnitId, businessUnitId));

  const cycleId = newId("cyc");
  const now = new Date();

  await db.insert(strategyCycle).values({
    id: cycleId,
    businessUnitId,
    slug,
    name,
    startsAt: startOfDay(startsAt),
    endsAt: endOfDay(endsAt),
    isCurrent: true,
    createdBy: gate.currentUser.id,
    updatedBy: gate.currentUser.id,
    createdAt: now,
    updatedAt: now,
  });

  await writeAuditLog({
    actorUserId: gate.currentUser.id,
    actorEmail: gate.currentUser.email,
    action: "strategy_cycle.create",
    entityType: "strategy_cycle",
    entityId: cycleId,
    summary: `Criou o ciclo "${name}" em ${gate.unit.label}`,
    afterData: { name, slug, startsAt, endsAt },
  });

  revalidateStrategy(gate.unit.slug);
  return { status: "success", message: "Ciclo criado." };
}

function isCadence(value: string): value is ProductCadence {
  return (PRODUCT_CADENCES as readonly string[]).includes(value);
}

/** Cadastra um produto da BU, para a esteira do calendário. */
export async function createProduct(
  _previousState: StrategyFormState,
  formData: FormData,
): Promise<StrategyFormState> {
  const businessUnitId = field(formData, "businessUnitId");
  const name = field(formData, "name");
  const cadenceValue = field(formData, "cadence");
  const family = field(formData, "family") || null;

  if (!name) return { status: "error", message: "Informe o nome do produto." };
  if (!isCadence(cadenceValue)) {
    return {
      status: "error",
      message: "Escolha se o produto é pontual ou contínuo.",
    };
  }

  const gate = await requireStrategyEditor(businessUnitId);
  if ("erro" in gate) return { status: "error", message: gate.erro };

  const slug = toKebabCase(name);
  if (!slug) {
    return {
      status: "error",
      message: "O nome precisa ter ao menos uma letra ou número.",
    };
  }

  const db = await getDb();
  const now = new Date();
  const productId = newId("prd");

  await db.insert(strategyProduct).values({
    id: productId,
    businessUnitId,
    slug,
    name,
    cadence: cadenceValue,
    family,
    details: null,
    isActive: true,
    sortOrder: 100,
    createdBy: gate.currentUser.id,
    updatedBy: gate.currentUser.id,
    createdAt: now,
    updatedAt: now,
  });

  await writeAuditLog({
    actorUserId: gate.currentUser.id,
    actorEmail: gate.currentUser.email,
    action: "strategy_product.create",
    entityType: "strategy_product",
    entityId: productId,
    summary: `Cadastrou o produto "${name}" em ${gate.unit.label}`,
    afterData: { name, slug, cadence: cadenceValue },
  });

  revalidateStrategy(gate.unit.slug);
  return { status: "success", message: `Produto "${name}" cadastrado.` };
}

/** Edita nome, cadência e família de um produto. */
export async function updateProduct(
  _previousState: StrategyFormState,
  formData: FormData,
): Promise<StrategyFormState> {
  const productId = field(formData, "productId");
  const name = field(formData, "name");
  const cadenceValue = field(formData, "cadence");
  const family = field(formData, "family") || null;

  if (!productId)
    return { status: "error", message: "Produto não identificado." };
  if (!name) return { status: "error", message: "Informe o nome do produto." };
  if (!isCadence(cadenceValue)) {
    return {
      status: "error",
      message: "Escolha se o produto é pontual ou contínuo.",
    };
  }

  const db = await getDb();
  const before = await db
    .select()
    .from(strategyProduct)
    .where(eq(strategyProduct.id, productId))
    .get();

  if (!before)
    return { status: "error", message: "Esse produto não existe mais." };

  // A BU vem do registro, e não do formulário: senão um POST adulterado moveria
  // o produto para uma BU que a pessoa nem abre.
  const gate = await requireStrategyEditor(before.businessUnitId);
  if ("erro" in gate) return { status: "error", message: gate.erro };

  const slug = toKebabCase(name) || before.slug;

  const duplicate = await db
    .select({ id: strategyProduct.id })
    .from(strategyProduct)
    .where(
      and(
        eq(strategyProduct.businessUnitId, before.businessUnitId),
        eq(strategyProduct.slug, slug),
      ),
    )
    .get();

  if (duplicate && duplicate.id !== productId) {
    return {
      status: "error",
      message: `Já existe outro produto com esse nome em ${gate.unit.label}.`,
    };
  }

  await db
    .update(strategyProduct)
    .set({
      name,
      slug,
      cadence: cadenceValue,
      family,
      updatedBy: gate.currentUser.id,
      updatedAt: new Date(),
    })
    .where(eq(strategyProduct.id, productId));

  await writeAuditLog({
    actorUserId: gate.currentUser.id,
    actorEmail: gate.currentUser.email,
    action: "strategy_product.update",
    entityType: "strategy_product",
    entityId: productId,
    summary: `Editou o produto "${before.name}" em ${gate.unit.label}`,
    beforeData: {
      name: before.name,
      slug: before.slug,
      cadence: before.cadence,
      family: before.family,
    },
    afterData: { name, slug, cadence: cadenceValue, family },
  });

  revalidateStrategy(gate.unit.slug);
  return { status: "success", message: `Produto "${name}" atualizado.` };
}

/**
 * Ativa ou desativa um produto.
 *
 * Sem exclusão: janelas de venda no calendário apontam para o produto, e
 * apagá-lo deixaria o histórico do ciclo sem explicação.
 */
export async function toggleProduct(formData: FormData): Promise<void> {
  const productId = field(formData, "productId");
  if (!productId) return;

  const db = await getDb();
  const before = await db
    .select()
    .from(strategyProduct)
    .where(eq(strategyProduct.id, productId))
    .get();

  if (!before) return;

  const gate = await requireStrategyEditor(before.businessUnitId);
  if ("erro" in gate) return;

  const nextIsActive = !before.isActive;

  await db
    .update(strategyProduct)
    .set({
      isActive: nextIsActive,
      updatedBy: gate.currentUser.id,
      updatedAt: new Date(),
    })
    .where(eq(strategyProduct.id, productId));

  await writeAuditLog({
    actorUserId: gate.currentUser.id,
    actorEmail: gate.currentUser.email,
    action: "strategy_product.toggle",
    entityType: "strategy_product",
    entityId: productId,
    summary: nextIsActive
      ? `Reativou o produto "${before.name}"`
      : `Desativou o produto "${before.name}"`,
    beforeData: { isActive: before.isActive },
    afterData: { isActive: nextIsActive },
  });

  revalidateStrategy(gate.unit.slug);
}
/**
 * Salva a meta de um escopo (ciclo, 1º ou 2º semestre).
 *
 * Uma submissão por escopo, e não a tela inteira de uma vez: os três escopos são
 * escritos em momentos diferentes — a meta do ciclo em dezembro, a do 2º
 * semestre em junho — e um formulário único forçaria reenviar texto que ninguém
 * abriu, além de tornar a auditoria ilegível ("alterou as metas").
 *
 * Os indicadores são regravados por completo (apaga e insere) em vez de
 * comparados um a um. São poucos por meta, e o conjunto ESCOLHIDO faz parte da
 * definição: desmarcar um indicador tem de apagá-lo, e um `upsert` campo a campo
 * deixaria órfão o que saiu da seleção.
 */
export async function saveGoal(
  _previousState: StrategyFormState,
  formData: FormData,
): Promise<StrategyFormState> {
  const cycleId = field(formData, "cycleId");
  const scopeRaw = field(formData, "scope");

  if (!cycleId) return { status: "error", message: "Ciclo não identificado." };
  if (!(GOAL_SCOPES as readonly string[]).includes(scopeRaw)) {
    return { status: "error", message: "Escopo de meta inválido." };
  }
  const scope = scopeRaw as GoalScope;

  const objective = field(formData, "objective");
  if (!objective) {
    return {
      status: "error",
      message: "O objetivo é obrigatório — é a frase que define a meta.",
    };
  }

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

  if (!cycle)
    return { status: "error", message: "Esse ciclo não existe mais." };

  const gate = await requireStrategyEditor(cycle.businessUnitId);
  if ("erro" in gate) return { status: "error", message: gate.erro };

  // ── Frentes ──
  // Chegam como `frente_titulo_0` / `frente_detalhe_0`. Frente sem título é
  // linha que a pessoa deixou em branco no formulário, e não uma frente vazia.
  const fronts: { title: string; detail?: string }[] = [];
  for (let index = 0; index < 6; index += 1) {
    const title = field(formData, `frente_titulo_${index}`);
    if (!title) continue;
    const detail = field(formData, `frente_detalhe_${index}`);
    fronts.push(detail ? { title, detail } : { title });
  }

  // ── Indicadores ──
  // Só entra o que foi marcado E tem número: indicador marcado sem valor é
  // seleção pela metade, e gravá-lo com zero inventaria uma meta de zero.
  const marcados = formData.getAll("indicador").map(String);
  const alvos: { metric: GoalMetric; target: number; note: string | null }[] =
    [];

  for (const metric of marcados) {
    if (!isGoalMetric(metric)) continue;
    const valor = parseAmount(field(formData, `valor_${metric}`));
    if (valor === null) continue;
    const note = field(formData, `nota_${metric}`);
    alvos.push({ metric, target: valor, note: note || null });
  }

  const now = new Date();
  const existing = await db
    .select()
    .from(strategyGoal)
    .where(
      and(eq(strategyGoal.cycleId, cycleId), eq(strategyGoal.scope, scope)),
    )
    .get();

  const campos = {
    objective,
    rationale: field(formData, "rationale") || null,
    fronts: fronts.length > 0 ? fronts : null,
    nonGoals: field(formData, "nonGoals") || null,
    successSignal: field(formData, "successSignal") || null,
    risks: field(formData, "risks") || null,
    updatedBy: gate.currentUser.id,
    updatedAt: now,
  };

  let goalId: string;
  let anteriores: unknown = null;

  if (existing) {
    goalId = existing.id;
    const alvosAntes = await db
      .select()
      .from(strategyGoalTarget)
      .where(eq(strategyGoalTarget.goalId, goalId));

    anteriores = {
      objective: existing.objective,
      rationale: existing.rationale,
      fronts: existing.fronts,
      nonGoals: existing.nonGoals,
      successSignal: existing.successSignal,
      risks: existing.risks,
      indicadores: alvosAntes.map((a) => ({
        metric: a.metric,
        target: a.target,
      })),
    };

    // Histórico de revisão: guarda o estado ANTERIOR, com o motivo e a rodada
    // de diagnóstico aberta no momento. É o que permite distinguir, meses
    // depois, uma meta revisada e mantida de uma que ninguém revisitou — a
    // trilha de auditoria registra a mesma mudança, mas ela é ferramenta de
    // administração, não conteúdo que o time lê na própria meta.
    const rodadaAberta = await db
      .select({ id: strategyRound.id })
      .from(strategyRound)
      .where(
        and(eq(strategyRound.cycleId, cycleId), eq(strategyRound.isOpen, true)),
      )
      .get();

    await db.insert(strategyGoalRevision).values({
      id: newId("grev"),
      goalId,
      roundId: rodadaAberta?.id ?? null,
      reason: field(formData, "revisionReason") || null,
      snapshot: anteriores as Record<string, unknown>,
      changedBy: gate.currentUser.id,
      changedAt: now,
    });

    await db
      .update(strategyGoal)
      .set(campos)
      .where(eq(strategyGoal.id, goalId));
    await db
      .delete(strategyGoalTarget)
      .where(eq(strategyGoalTarget.goalId, goalId));
  } else {
    goalId = newId("goal");
    await db.insert(strategyGoal).values({
      id: goalId,
      cycleId,
      scope,
      ...campos,
      createdBy: gate.currentUser.id,
      createdAt: now,
    });
  }

  // ── Vínculo com os achados do diagnóstico ──
  // Regravado por completo, como os indicadores: desmarcar um achado tem de
  // desfazer o vínculo, e o relatório de órfãos só funciona se o conjunto for
  // exato. Só entram achados do próprio ciclo.
  const achadosEscolhidos = formData
    .getAll("achado")
    .map(String)
    .filter(Boolean);
  const achadosDoCiclo = await db
    .select({ id: strategyFinding.id })
    .from(strategyFinding)
    .innerJoin(strategyRound, eq(strategyFinding.roundId, strategyRound.id))
    .where(eq(strategyRound.cycleId, cycleId));

  const permitidos = new Set(achadosDoCiclo.map((a) => a.id));
  const achadosFinais = achadosEscolhidos.filter((id) => permitidos.has(id));

  await db
    .delete(strategyGoalFinding)
    .where(eq(strategyGoalFinding.goalId, goalId));

  if (achadosFinais.length > 0) {
    await db
      .insert(strategyGoalFinding)
      .values(achadosFinais.map((findingId) => ({ goalId, findingId })));
  }

  if (alvos.length > 0) {
    await db.insert(strategyGoalTarget).values(
      alvos.map((alvo, index) => ({
        id: newId("gtgt"),
        goalId,
        metric: alvo.metric,
        target: alvo.target,
        note: alvo.note,
        sortOrder: index,
        createdAt: now,
        updatedAt: now,
      })),
    );
  }

  await writeAuditLog({
    actorUserId: gate.currentUser.id,
    actorEmail: gate.currentUser.email,
    action: existing ? "strategy_goal.update" : "strategy_goal.create",
    entityType: "strategy_goal",
    entityId: goalId,
    summary: `${existing ? "Atualizou" : "Definiu"} a meta de ${GOAL_SCOPE_LABELS[scope].toLowerCase()} de ${gate.unit.label} · ${cycle.name}`,
    beforeData: anteriores,
    afterData: {
      ...campos,
      indicadores: alvos.map((a) => ({ metric: a.metric, target: a.target })),
      achados: achadosFinais,
    },
  });

  revalidateStrategy(gate.unit.slug);
  return {
    status: "success",
    message: `Meta de ${GOAL_SCOPE_LABELS[scope].toLowerCase()} salva.`,
  };
}

/** Apaga a meta de um escopo, com os indicadores dela (cascata no banco). */
export async function deleteGoal(formData: FormData): Promise<void> {
  const goalId = String(formData.get("goalId") ?? "");
  if (!goalId) return;

  const db = await getDb();
  const goal = await db
    .select({
      id: strategyGoal.id,
      scope: strategyGoal.scope,
      objective: strategyGoal.objective,
      businessUnitId: strategyCycle.businessUnitId,
      cycleName: strategyCycle.name,
    })
    .from(strategyGoal)
    .innerJoin(strategyCycle, eq(strategyGoal.cycleId, strategyCycle.id))
    .where(eq(strategyGoal.id, goalId))
    .get();

  if (!goal) return;

  const gate = await requireStrategyEditor(goal.businessUnitId);
  if ("erro" in gate) return;

  await db.delete(strategyGoal).where(eq(strategyGoal.id, goalId));

  await writeAuditLog({
    actorUserId: gate.currentUser.id,
    actorEmail: gate.currentUser.email,
    action: "strategy_goal.delete",
    entityType: "strategy_goal",
    entityId: goalId,
    summary: `Apagou a meta de ${GOAL_SCOPE_LABELS[goal.scope].toLowerCase()} de ${gate.unit.label} · ${goal.cycleName}`,
    beforeData: { objective: goal.objective, scope: goal.scope },
  });

  revalidateStrategy(gate.unit.slug);
}

/**
 * Converte o que a pessoa digitou em número.
 *
 * Aceita o formato brasileiro ("1.250,50") e o cru ("1250.5"), porque as duas
 * coisas acontecem: quem digita usa vírgula, quem cola de uma planilha traz
 * ponto. Campo vazio devolve `null`, que é diferente de zero — "não projetei"
 * não é "projetei zero".
 */
function parseAmount(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const normalized = trimmed
    .replace(/[R$\s]/g, "")
    // Separador de milhar só é ponto quando existe vírgula depois dele.
    .replace(/\.(?=\d{3}(\D|$))/g, "")
    .replace(",", ".");

  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}
