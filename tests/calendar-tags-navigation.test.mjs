import test from "node:test";
import assert from "node:assert/strict";

import {
  parseCalendarDate,
  addMonths,
  addDays,
  toDateInput,
  fromDateInput,
  daysBetween,
  monthGridDays,
} from "../src/lib/modules/strategy/dates.ts";
import {
  TIMELINE_KIND_CONFIG,
  TIMELINE_KIND_ORDER,
  KIND_ALIASES,
  canonicalKind,
  kindConfig,
} from "../src/lib/modules/strategy/timeline-kinds.ts";
import { TIMELINE_KINDS } from "../src/lib/db/schema/strategy.schema.ts";
import { hydrate } from "../src/app/(app)/planejamento/[businessUnitSlug]/calendario/calendar-types.ts";

test("1. parseCalendarDate preserva dia civil e previne recuo de fuso (UTC-3)", () => {
  // Teste de data civil formato YYYY-MM-DD
  const d1 = parseCalendarDate("2026-11-01");
  assert.equal(d1.getFullYear(), 2026);
  assert.equal(d1.getMonth(), 10); // Novembro (0-indexed)
  assert.equal(d1.getDate(), 1);

  // Teste de ISO string com 00:00:00Z - não pode recuar para 31 de Outubro
  const dIso = parseCalendarDate("2026-11-01T00:00:00.000Z");
  assert.equal(dIso.getFullYear(), 2026);
  assert.equal(dIso.getMonth(), 10);
  assert.equal(dIso.getDate(), 1);

  // Teste com toDateInput
  assert.equal(toDateInput(d1), "2026-11-01");
  assert.equal(toDateInput(dIso), "2026-11-01");

  // Teste de sanitização defensiva contra milissegundos interpretados como segundos (ano 57971)
  const msTimestampDate = new Date(1767225600000 * 1000); // ano 57971
  assert.equal(msTimestampDate.getFullYear(), 57971);
  const sanitized = parseCalendarDate(msTimestampDate);
  assert.ok(sanitized.getFullYear() <= 2100, "Deve sanitizar datas com ano > 2100");
  assert.ok(sanitized.getFullYear() === 2025 || sanitized.getFullYear() === 2026);
  assert.ok(
    toDateInput(msTimestampDate) === "2025-12-31" ||
      toDateInput(msTimestampDate) === "2026-01-01",
    "Deve sanitizar o ano sem quebrar a data",
  );
  assert.equal(toDateInput(parseCalendarDate("2026-01-01")), "2026-01-01");
});

test("2. Navegação de meses avança e retrocede sem travar em Outubro", () => {
  const outubro = parseCalendarDate("2026-10-26");
  assert.equal(outubro.getMonth(), 9); // Outubro

  // Avançar 1 mês
  const novembro = addMonths(outubro, 1);
  assert.equal(novembro.getMonth(), 10); // Novembro
  assert.equal(toDateInput(novembro), "2026-11-01");

  // Avançar mais 1 mês
  const dezembro = addMonths(novembro, 1);
  assert.equal(dezembro.getMonth(), 11); // Dezembro
  assert.equal(toDateInput(dezembro), "2026-12-01");

  // Avançar para virada de ano
  const janeiro = addMonths(dezembro, 1);
  assert.equal(janeiro.getFullYear(), 2027);
  assert.equal(janeiro.getMonth(), 0); // Janeiro
  assert.equal(toDateInput(janeiro), "2027-01-01");

  // Retroceder 1 mês
  const dezembroVolta = addMonths(janeiro, -1);
  assert.equal(dezembroVolta.getFullYear(), 2026);
  assert.equal(dezembroVolta.getMonth(), 11);
});

test("3. Catálogo oficial das 8 tags solicitadas pela Beatriz", () => {
  const expectedTags = [
    "event",
    "theoretical_exam",
    "practical_exam",
    "dinner",
    "launch",
    "communication",
    "seasonality",
    "other",
  ];

  // TIMELINE_KIND_ORDER deve conter exatamente as 8 tags solicitadas
  assert.deepEqual(TIMELINE_KIND_ORDER, expectedTags);

  // Todas as 8 tags devem estar em TIMELINE_KINDS
  for (const tag of expectedTags) {
    assert.ok(
      TIMELINE_KINDS.includes(tag),
      `Tag ${tag} deve existir em TIMELINE_KINDS`,
    );
  }

  // Conferência dos rótulos em português
  assert.equal(kindConfig("event").label, "Evento");
  assert.equal(kindConfig("theoretical_exam").label, "Prova teórica");
  assert.equal(kindConfig("practical_exam").label, "Prova prática");
  assert.equal(kindConfig("dinner").label, "Jantar");
  assert.equal(kindConfig("launch").label, "Lançamento");
  assert.equal(kindConfig("communication").label, "Comunicação");
  assert.equal(kindConfig("seasonality").label, "Sazonalidade de mercado");
  assert.equal(kindConfig("other").label, "Outros");

  // Conferência dos tooltips/descrições solicitados pela Beatriz
  assert.equal(
    kindConfig("theoretical_exam").description,
    "Data da prova teórica da especialidade",
  );
  assert.equal(
    kindConfig("practical_exam").description,
    "Data da prova prática da especialidade",
  );
  // Conferência da cor rosa para Jantar solicitada pela Beatriz
  assert.equal(kindConfig("dinner").chip, "bg-pink-100 text-pink-900 ring-pink-200");
  assert.equal(kindConfig("dinner").dot, "bg-pink-500");

  // Cada tag deve possuir cor própria e distinta (chip e dot)
  const chips = new Set();
  const dots = new Set();
  for (const tag of expectedTags) {
    const config = kindConfig(tag);
    assert.ok(config.chip, `Tag ${tag} deve ter classe chip definida`);
    assert.ok(config.dot, `Tag ${tag} deve ter classe dot definida`);
    assert.ok(config.lane, `Tag ${tag} deve ter classe lane definida`);
    chips.add(config.chip);
    dots.add(config.dot);
  }
  // Conferir que as cores são distintas
  assert.equal(chips.size, 8, "As 8 tags devem ter classes de cores distintas");
  assert.equal(dots.size, 8, "As 8 tags devem ter cores de dot distintas");
});

test("4. Resolução de aliases, canonicalKind e compatibilidade retroativa", () => {
  // Aliases em português mapeados para tags canônicas
  assert.equal(canonicalKind("prova_teorica"), "theoretical_exam");
  assert.equal(canonicalKind("prova_pratica"), "practical_exam");
  assert.equal(canonicalKind("jantar"), "dinner");
  assert.equal(canonicalKind("outros"), "other");

  // Legado mapeado para tags canônicas
  assert.equal(canonicalKind("milestone"), "theoretical_exam");
  assert.equal(canonicalKind("product_window"), "launch");

  // Tags canônicas preservadas
  for (const tag of TIMELINE_KIND_ORDER) {
    assert.equal(canonicalKind(tag), tag);
  }

  // Fallback para desconhecido
  assert.equal(canonicalKind("desconhecido"), "event");
  assert.equal(canonicalKind(null), "event");

  // kindConfig resolve aliases corretamente
  assert.equal(kindConfig("prova_teorica").label, "Prova teórica");
  assert.equal(kindConfig("prova_pratica").label, "Prova prática");
  assert.equal(kindConfig("jantar").label, "Jantar");
  assert.equal(kindConfig("outros").label, "Outros");
});

test("5. Lógica de filtro por tag: clique simples isola/alterna e modifier multi-seleciona", () => {
  const items = [
    { id: "1", kind: "event", title: "Congresso Paulista" },
    { id: "2", kind: "theoretical_exam", title: "Prova USP" },
    { id: "3", kind: "practical_exam", title: "Habilidades UNIFESP" },
    { id: "4", kind: "dinner", title: "Jantar dos Aprovados" },
  ];

  // Função pura que replica a lógica de toggleKind do CalendarWorkspace
  function executeToggleKind(current, kind, multi = false) {
    if (multi) {
      if (!current) return new Set([kind]);
      const next = new Set(current);
      if (next.has(kind)) {
        next.delete(kind);
        return next.size === 0 ? null : next;
      }
      next.add(kind);
      return next;
    }
    if (current && current.size === 1 && current.has(kind)) {
      return null;
    }
    return new Set([kind]);
  }

  // Estado inicial: Todas visíveis
  let selection = null;
  let visible = items.filter((i) => !selection || selection.has(i.kind));
  assert.equal(visible.length, 4);

  // 1. Clicar em "event" -> isola "event"
  selection = executeToggleKind(selection, "event", false);
  assert.deepEqual(Array.from(selection), ["event"]);
  visible = items.filter((i) => !selection || selection.has(i.kind));
  assert.equal(visible.length, 1);
  assert.equal(visible[0].title, "Congresso Paulista");

  // 2. Clicar em "dinner" -> comuta diretamente para "dinner" (sem acumular)
  selection = executeToggleKind(selection, "dinner", false);
  assert.deepEqual(Array.from(selection), ["dinner"]);
  visible = items.filter((i) => !selection || selection.has(i.kind));
  assert.equal(visible.length, 1);
  assert.equal(visible[0].title, "Jantar dos Aprovados");

  // 3. Clicar novamente em "dinner" -> limpa para todas
  selection = executeToggleKind(selection, "dinner", false);
  assert.equal(selection, null);
  visible = items.filter((i) => !selection || selection.has(i.kind));
  assert.equal(visible.length, 4);

  // 4. Multi-seleção com tecla modificadora (Shift / Ctrl)
  selection = executeToggleKind(null, "event", true);
  selection = executeToggleKind(selection, "dinner", true);
  assert.equal(selection.size, 2);
  assert.ok(selection.has("event"));
  assert.ok(selection.has("dinner"));
  visible = items.filter((i) => !selection || selection.has(i.kind));
  assert.equal(visible.length, 2);
});

test("6. hydrate normaliza kinds legados e sanitiza datas civilmente", () => {
  const clientItemLegacy = {
    id: "legacy_1",
    kind: "prova_teorica",
    title: "Prova AMRIGS",
    summary: null,
    startsAt: "2026-11-15",
    endsAt: "2026-11-15",
    productId: null,
    owner: null,
    status: "planned",
    details: {},
  };

  const hydrated = hydrate(clientItemLegacy);
  assert.equal(hydrated.kind, "theoretical_exam", "Deve normalizar para tag canônica");
  assert.equal(hydrated.startsAt.getFullYear(), 2026);
  assert.equal(hydrated.startsAt.getMonth(), 10); // Nov
  assert.equal(hydrated.startsAt.getDate(), 15);
});
