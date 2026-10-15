import test from "node:test";
import assert from "node:assert/strict";

test("MedCof Insights - Teste A/B e Comparação entre 2 LPs", async (t) => {
  await t.test("Cálculo de Uplift e Vencedor A quando Página A converte mais", () => {
    const pageA = {
      name: "Portal Principal",
      visits: 1000,
      leads: 80,
      conversionRate: 8.0,
    };
    const pageB = {
      name: "Extensivo 2025",
      visits: 1000,
      leads: 50,
      conversionRate: 5.0,
    };

    let winner = "tie";
    let uplift = 0;
    if (pageA.conversionRate > pageB.conversionRate) {
      winner = "A";
      uplift = Math.round(((pageA.conversionRate - pageB.conversionRate) / pageB.conversionRate) * 1000) / 10;
    }

    assert.equal(winner, "A");
    assert.equal(uplift, 60.0); // (8 - 5) / 5 = +60%
  });

  await t.test("Cálculo de Uplift e Vencedor B quando Página B converte mais", () => {
    const pageA = {
      name: "Controle Antigo",
      visits: 2000,
      leads: 60,
      conversionRate: 3.0,
    };
    const pageB = {
      name: "Variante Nova B",
      visits: 1500,
      leads: 75,
      conversionRate: 5.0,
    };

    let winner = "tie";
    let uplift = 0;
    if (pageB.conversionRate > pageA.conversionRate) {
      winner = "B";
      uplift = Math.round(((pageB.conversionRate - pageA.conversionRate) / pageA.conversionRate) * 1000) / 10;
    }

    assert.equal(winner, "B");
    assert.equal(uplift, 66.7); // (5 - 3) / 3 = +66.7%
    assert.equal(Math.abs(pageA.leads - pageB.leads), 15);
  });

  await t.test("Empate técnico quando ambas as páginas possuem a mesma conversão", () => {
    const convA = 4.5;
    const convB = 4.5;

    let winner = "tie";
    if (convA > convB) winner = "A";
    else if (convB > convA) winner = "B";

    assert.equal(winner, "tie");
  });

  await t.test("Resiliência contra divisão por zero quando uma página tem 0 conversão ou 0 visitas", () => {
    const convA = 0;
    const convB = 4.0;

    let uplift = 0;
    if (convB > convA) {
      uplift = convA > 0 ? Math.round(((convB - convA) / convA) * 1000) / 10 : (convB > 0 ? 100 : 0);
    }

    assert.equal(uplift, 100);
  });

  await t.test("Funil de 4 etapas computa percentuais de drop-off contínuos", () => {
    const visits = 500;
    const ctaClicks = 250;
    const formStarts = 100;
    const leads = 40;

    const visitToCta = Math.round((ctaClicks / visits) * 1000) / 10;
    const ctaToForm = Math.round((formStarts / ctaClicks) * 1000) / 10;
    const formToLead = Math.round((leads / formStarts) * 1000) / 10;
    const overall = Math.round((leads / visits) * 1000) / 10;

    assert.equal(visitToCta, 50.0);
    assert.equal(ctaToForm, 40.0);
    assert.equal(formToLead, 40.0);
    assert.equal(overall, 8.0);
  });
});
