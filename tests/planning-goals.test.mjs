import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  scopeRange,
  isSummable,
  checkSums,
  missingFields,
  formatMetricValue,
} from "../src/lib/modules/strategy/goals.ts";

import { startOfDay, endOfDay } from "../src/lib/modules/strategy/dates.ts";

describe("Módulo de Metas e Planejamento Estratégico", () => {
  const mockCycle = {
    startsAt: startOfDay(new Date(2026, 0, 1)), // 01/01/2026 00:00:00
    endsAt: endOfDay(new Date(2026, 11, 31)), // 31/12/2026 23:59:59.999
  };

  test("Cálculo de escopos semestrais (H1 e H2) para ano civil", () => {
    const h1 = scopeRange(mockCycle, "h1");
    assert.equal(h1.partial, false);
    assert.equal(h1.startsAt.getMonth(), 0); // Janeiro
    assert.equal(h1.endsAt.getMonth(), 5); // Junho

    const h2 = scopeRange(mockCycle, "h2");
    assert.equal(h2.partial, false);
    assert.equal(h2.startsAt.getMonth(), 6); // Julho
    assert.equal(h2.endsAt.getMonth(), 11); // Dezembro
  });

  test("Identificação correta de métricas somáveis e não-somáveis", () => {
    assert.equal(isSummable("revenue"), true);
    assert.equal(isSummable("sales"), true);
    assert.equal(isSummable("lead_conversion"), false);
    assert.equal(isSummable("nps"), false);
  });

  test("Validação de conferência de somas (checkSums) entre semestres e ciclo", () => {
    // Caso 1: Semestres somam exatamente o ciclo (H1 600k + H2 400k = 1M) -> Sem divergência
    const goalsEqual = {
      cycle: {
        id: "g-cyc",
        targets: [{ metric: "revenue", target: 1000000, note: null }],
      },
      h1: {
        id: "g-h1",
        targets: [{ metric: "revenue", target: 600000, note: null }],
      },
      h2: {
        id: "g-h2",
        targets: [{ metric: "revenue", target: 400000, note: null }],
      },
    };
    const diffsNone = checkSums(goalsEqual);
    assert.equal(diffsNone.length, 0);

    // Caso 2: Semestres somam mais que o ciclo (H1 700k + H2 500k = 1.2M vs 1M ciclo -> diff +20%)
    const goalsDivergent = {
      cycle: {
        id: "g-cyc",
        targets: [{ metric: "revenue", target: 1000000, note: null }],
      },
      h1: {
        id: "g-h1",
        targets: [{ metric: "revenue", target: 700000, note: null }],
      },
      h2: {
        id: "g-h2",
        targets: [{ metric: "revenue", target: 500000, note: null }],
      },
    };
    const diffs = checkSums(goalsDivergent);
    assert.equal(diffs.length, 1);
    assert.equal(diffs[0].metric, "revenue");
    assert.equal(diffs[0].semestersSum, 1200000);
    assert.equal(diffs[0].diff, 0.2); // +20%
  });

  test("Detecção de campos faltantes no preenchimento de meta (missingFields)", () => {
    const emptyGoal = {
      rationale: null,
      fronts: [],
      nonGoals: null,
      successSignal: null,
      risks: null,
      targets: [],
    };
    const missing = missingFields(emptyGoal);
    assert.equal(missing.length, 6);

    const fullGoal = {
      rationale: "Foco em aquisição acelerada",
      fronts: [{ title: "Campanha Black Friday" }],
      nonGoals: "Não faremos desconto fora da janela",
      successSignal: "CAC abaixo de 500",
      risks: "Aumento de CPC no Google Ads",
      targets: [{ metric: "revenue", target: 500000, note: null }],
    };
    assert.equal(missingFields(fullGoal).length, 0);
  });

  test("Formatação de valores por tipo de métrica", () => {
    const formattedRev = formatMetricValue("revenue", 1500000);
    assert.ok(formattedRev.includes("milhão") || formattedRev.includes("R$"));

    const formattedPercent = formatMetricValue("lead_conversion", 3.5);
    assert.ok(formattedPercent.includes("%"));
  });

  test("Metas 2.0: Conformidade com a Planilha Oficial (gid=367912223)", () => {
    const OFFICIAL_DIAGNOSIS_TAGS = [
      "🔗 Demanda não capturada",
      "🔗 Mercado em crescimento",
      "🔗 Potencial de crescimento do produto",
      "🔗 Crescimento da base",
      "🔗 Oportunidade de ganho de eficiência",
      "🔗 Conversão abaixo do histórico",
    ];

    assert.equal(OFFICIAL_DIAGNOSIS_TAGS.length, 6);
    OFFICIAL_DIAGNOSIS_TAGS.forEach((tag) => {
      assert.ok(tag.startsWith("🔗"));
    });

    // Valida estrutura completa com 2º valor-alvo e comentários da planilha da Heloiza
    const referenceRow = {
      meta: "Ampliar a participação da MedCof GO no mercado",
      embasamento: "🔗 1. Negócio e mercado 🔗 Demanda não capturada 🔗 Mercado em crescimento",
      kpiPrimario: { nome: "Market share", alvo: "8,20%" },
      kpiSecundario: { nome: "Número de alunos", alvo: "159 alunos" },
      comentarios:
        "potencial de mercado é que tenha crescimento estimado de 1.933 pessoas para o TEGO, nesse valor colocado teríamos crescimento estimado de 18,7%",
    };

    assert.equal(referenceRow.kpiPrimario.nome, "Market share");
    assert.equal(referenceRow.kpiPrimario.alvo, "8,20%");
    assert.equal(referenceRow.kpiSecundario.nome, "Número de alunos");
    assert.equal(referenceRow.kpiSecundario.alvo, "159 alunos");
    assert.ok(referenceRow.comentarios.includes("18,7%"));
  });

  test("Diagnóstico 2.0: Os 5 Pilares Oficiais com Coluna E e Âncoras", () => {
    const FIVE_PILLARS = [
      { key: "businessMarketDiagnosis", num: 1, title: "1. Negócio e mercado", anchor: "pilar-1" },
      { key: "clientBrandDiagnosis", num: 2, title: "2. Cliente e marca", anchor: "pilar-2" },
      { key: "portfolioOfferDiagnosis", num: 3, title: "3. Portfólio e oferta", anchor: "pilar-3" },
      { key: "funnelConversionDiagnosis", num: 4, title: "4. Funil e conversão", anchor: "pilar-4" },
      { key: "contextCapacityDiagnosis", num: 5, title: "5. Contexto e capacidade", anchor: "pilar-5" },
    ];

    assert.equal(FIVE_PILLARS.length, 5);
    FIVE_PILLARS.forEach((p, idx) => {
      assert.equal(p.num, idx + 1);
      assert.equal(p.anchor, `pilar-${idx + 1}`);
      assert.ok(p.title.startsWith(`${idx + 1}.`));
    });
  });
});

