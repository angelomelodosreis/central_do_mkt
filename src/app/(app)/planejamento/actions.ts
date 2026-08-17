"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";

import type { StrategyFormState } from "./form-state";
import { requirePermission } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import {
  businessUnit,
  strategyCycle,
  strategyProduct,
  timelineItem,
  TIMELINE_KINDS,
  TIMELINE_STATUSES,
  PRODUCT_CADENCES,
  type ProductCadence,
  type TimelineKind,
  type TimelineStatus,
} from "@/lib/db/schema";
import { writeAuditLog } from "@/lib/modules/audit/log";
import { toKebabCase } from "@/lib/modules/documentation/slug";
import { canEditBusinessUnitStrategy } from "@/lib/modules/strategy/access";
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
 * usuário é o dono daquela BU (ou administrador). Esconder o botão na tela é
 * conveniência — é esta função que de fato protege.
 */
async function requireStrategyEditor(businessUnitId: string) {
  const currentUser = await requirePermission("strategy", "edit");

  const db = await getDb();
  const unit = await db
    .select({
      id: businessUnit.id,
      slug: businessUnit.slug,
      label: businessUnit.label,
      strategyOwnerId: businessUnit.strategyOwnerId,
    })
    .from(businessUnit)
    .where(eq(businessUnit.id, businessUnitId))
    .get();

  if (!unit) return { erro: "Essa Business Unit não existe mais." } as const;

  if (!canEditBusinessUnitStrategy(currentUser, unit)) {
    return {
      erro: `O planejamento de ${unit.label} só pode ser editado por quem responde pela BU.`,
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
    return { status: "error", message: "Ciclo de planejamento não encontrado." };
  }

  const gate = await requireStrategyEditor(target.id);
  if ("erro" in gate) return { status: "error", message: gate.erro };

  const productId = field(formData, "productId") || null;
  const owner = field(formData, "owner") || null;
  const summary = field(formData, "summary") || null;
  const statusValue = field(formData, "status");
  const status: TimelineStatus = isStatus(statusValue) ? statusValue : "planned";
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
    return { status: "error", message: "Escolha se o produto é pontual ou contínuo." };
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
