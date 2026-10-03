import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  getWeekStartIso,
  getWeekStartDate,
  getWeeksRangeIso,
  rotuloDaSemana,
  somar,
  calcular,
} from "../src/lib/modules/results/metrics.ts";

describe("Fechamento Semanal & Indicadores Consolidados (Módulo Results)", () => {
  test("Cálculo determinístico da segunda-feira (getWeekStartIso) em horário comercial SP", () => {
    // Sábado 03/10/2026 às 18:00 UTC (15:00 BRT) -> Semana iniciou na Segunda 28/09/2026
    const sabado = new Date("2026-10-03T18:00:00Z");
    assert.equal(getWeekStartIso(sabado), "2026-09-28");

    // Domingo 04/10/2026 às 23:00 BRT (05/10 02:00 UTC) -> Ainda é domingo no Brasil, pertence à semana de 28/09/2026
    const domingoNoiteBR = new Date("2026-10-05T02:00:00Z");
    assert.equal(getWeekStartIso(domingoNoiteBR), "2026-09-28");

    // Segunda 05/10/2026 às 10:00 BRT -> Nova semana iniciando em 05/10/2026
    const segundaFeira = new Date("2026-10-05T13:00:00Z");
    assert.equal(getWeekStartIso(segundaFeira), "2026-10-05");
  });

  test("Geração de intervalos de semanas (getWeeksRangeIso) cronológicas e contíguas", () => {
    const currentWeekIso = "2026-09-28";
    const ultimas4 = getWeeksRangeIso(currentWeekIso, 4, 0);
    assert.deepEqual(ultimas4, [
      "2026-09-07",
      "2026-09-14",
      "2026-09-21",
      "2026-09-28",
    ]);

    const anteriores4 = getWeeksRangeIso(currentWeekIso, 4, 4);
    assert.deepEqual(anteriores4, [
      "2026-08-10",
      "2026-08-17",
      "2026-08-24",
      "2026-08-31",
    ]);

    // O fim do período anterior conecta exatamente com o início do período atual
    assert.equal(anteriores4[3], "2026-08-31");
    assert.equal(ultimas4[0], "2026-09-07");
  });

  test("Rótulo da semana (rotuloDaSemana) estável e imune a shifts de fuso", () => {
    const date = getWeekStartDate("2026-09-28");
    const rotulo = rotuloDaSemana(date);
    assert.equal(rotulo, "28 set–4 out");
  });

  test("Casamento perfeito de semanas por weekIso sem buracos por offset de milissegundos", () => {
    const mockLinhasSemanais = [
      {
        businessUnitId: "bu-cardio",
        weekIso: "2026-09-21",
        weekStart: getWeekStartDate("2026-09-21").getTime(),
        revenue: 150000,
        sales: 15,
        leads: 120,
        mediaSpend: 20000,
      },
      {
        businessUnitId: "bu-cardio",
        weekIso: "2026-09-28",
        weekStart: getWeekStartDate("2026-09-28").getTime(),
        revenue: 200000,
        sales: 20,
        leads: 150,
        mediaSpend: 25000,
      },
      {
        businessUnitId: "bu-derma",
        weekIso: "2026-09-28",
        weekStart: getWeekStartDate("2026-09-28").getTime(),
        revenue: 80000,
        sales: 8,
        leads: 60,
        mediaSpend: 10000,
      },
    ];

    const currentWeekIso = "2026-09-28";
    const rangeIso = getWeeksRangeIso(currentWeekIso, 4, 0);

    // Mapeamento por weekIso
    const porSemana = new Map();
    for (const linha of mockLinhasSemanais) {
      if (linha.businessUnitId === "bu-cardio") {
        const lista = porSemana.get(linha.weekIso) ?? [];
        lista.push(linha);
        porSemana.set(linha.weekIso, lista);
      }
    }

    const serieCardio = rangeIso.map((wIso) => {
      const doGrupo = porSemana.get(wIso) ?? [];
      const valores = calcular(somar(doGrupo));
      return {
        weekIso: wIso,
        revenue: valores.revenue,
        sales: valores.sales,
      };
    });

    // Semanas passadas sem lançamento retornam null
    assert.equal(serieCardio[0].revenue, null);
    assert.equal(serieCardio[1].revenue, null);

    // Semanas com lançamento encontram os valores com 100% de precisão
    assert.equal(serieCardio[2].revenue, 150000);
    assert.equal(serieCardio[2].sales, 15);
    assert.equal(serieCardio[3].revenue, 200000);
    assert.equal(serieCardio[3].sales, 20);
  });
});
