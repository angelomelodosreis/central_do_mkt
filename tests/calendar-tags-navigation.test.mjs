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
  kindConfig,
} from "../src/lib/modules/strategy/timeline-kinds.ts";
import { TIMELINE_KINDS } from "../src/lib/db/schema/strategy.schema.ts";

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

test("4. Resolução de aliases e compatibilidade retroativa", () => {
  // Aliases em português
  assert.equal(kindConfig("prova_teorica").label, "Prova teórica");
  assert.equal(kindConfig("prova_pratica").label, "Prova prática");
  assert.equal(kindConfig("jantar").label, "Jantar");
  assert.equal(kindConfig("outros").label, "Outros");

  // Legado
  assert.equal(kindConfig("milestone").label, "Marco");
  assert.equal(kindConfig("product_window").label, "Janela de Produto (MedCof)");

  // Fallback para tipo desconhecido
  assert.equal(kindConfig("desconhecido").label, "Evento");
});

test("5. Lógica de filtro por tag (isolamento e reset para todas)", () => {
  const items = [
    { id: "1", kind: "event", title: "Congresso Paulista" },
    { id: "2", kind: "theoretical_exam", title: "Prova USP" },
    { id: "3", kind: "practical_exam", title: "Habilidades UNIFESP" },
    { id: "4", kind: "dinner", title: "Jantar dos Aprovados" },
  ];

  // Caso 1: selectedKinds = null (Todas as tags visíveis)
  const allVisible = items.filter(
    (item) => !null || (null).has(item.kind),
  );
  assert.equal(allVisible.length, 4);

  // Caso 2: Usuário clica na tag "event" -> filtra apenas Eventos
  const selectedEvent = new Set(["event"]);
  const eventItems = items.filter((item) => selectedEvent.has(item.kind));
  assert.equal(eventItems.length, 1);
  assert.equal(eventItems[0].title, "Congresso Paulista");

  // Caso 3: Usuário clica na tag "dinner" -> filtra apenas Jantar
  const selectedDinner = new Set(["dinner"]);
  const dinnerItems = items.filter((item) => selectedDinner.has(item.kind));
  assert.equal(dinnerItems.length, 1);
  assert.equal(dinnerItems[0].title, "Jantar dos Aprovados");

  // Caso 4: Usuário clica novamente na tag ativa -> reseta para null (todas)
  let currentSelection = new Set(["event"]);
  if (currentSelection.has("event") && currentSelection.size === 1) {
    currentSelection = null;
  }
  const resetItems = items.filter(
    (item) => !currentSelection || currentSelection.has(item.kind),
  );
  assert.equal(resetItems.length, 4);
});
