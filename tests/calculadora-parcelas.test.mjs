import test from "node:test";
import assert from "node:assert/strict";

import {
  calculateInstallments,
  generatePieceCopy,
  fmtBRL,
  fmtPct,
  DEFAULT_PARCELAS_RATE,
  round2,
} from "../src/lib/modules/calculadora-parcelas/math.ts";

test("Calculadora de Parcelas MedCof (Juros Simples)", async (t) => {
  await t.test("1. Em 1x (à vista), não há juros", () => {
    const res = calculateInstallments(1, 15497, DEFAULT_PARCELAS_RATE);
    assert.equal(res.base, 15497);
    assert.equal(res.add, 0);
    assert.equal(res.inst, 15497);
    assert.equal(res.total, 15497);
    assert.equal(res.juros, 0);
  });

  await t.test("2. Em 24x com R$ 15.497 e taxa de 1,67%, bate exatamente com a planilha", () => {
    const res = calculateInstallments(24, 15497, 1.67);
    // base: 15497 / 24 = 645.7083...
    assert.ok(Math.abs(res.base - 645.7083) < 0.01);
    // add: 15497 * 0.0167 = 258.7999...
    assert.ok(Math.abs(res.add - 258.7999) < 0.01);
    // inst: round2(645.7083 + 258.7999) = 904.51
    assert.equal(res.inst, 904.51);
    // total: 904.51 * 24 = 21708.24
    assert.equal(res.total, 21708.24);
    // juros: 21708.24 - 15497 = 6211.24
    assert.equal(res.juros, 6211.24);
  });

  await t.test("3. Em 12x com R$ 15.497 e taxa de 1,67%", () => {
    const res = calculateInstallments(12, 15497, 1.67);
    // base: 15497 / 12 = 1291.4166...
    // add: 15497 * 0.0167 = 258.7999...
    // inst: 1291.4166 + 258.7999 = 1550.22
    assert.equal(res.inst, 1550.22);
    assert.equal(res.total, 18602.64);
    assert.equal(res.juros, 3105.64);
  });

  await t.test("4. Em 6x com R$ 10.000 e taxa de 1,67%", () => {
    const res = calculateInstallments(6, 10000, 1.67);
    // base: 10000 / 6 = 1666.666...
    // add: 10000 * 0.0167 = 167
    // inst: 1666.67 + 167 = 1833.67
    assert.equal(res.inst, 1833.67);
    assert.equal(res.total, 11002.02);
    assert.equal(res.juros, 1002.02);
  });

  await t.test("5. Proteção contra entradas zero, negativas ou inválidas", () => {
    const resZero = calculateInstallments(0, 0, 1.67);
    assert.equal(resZero.inst, 0);
    assert.equal(resZero.total, 0);
    assert.equal(resZero.juros, 0);

    const resNeg = calculateInstallments(-5, -1000, -1.67);
    assert.equal(resNeg.inst, 0);
    assert.equal(resNeg.total, 0);
    assert.equal(resNeg.juros, 0);
  });

  await t.test("6. Geração de texto para criativos e peças (com e sem produto)", () => {
    const copyWithProd = generatePieceCopy({
      product: "Extensivo TED 2027",
      n: 24,
      inst: 904.51,
      price: 15497,
      total: 21708.24,
    });

    assert.ok(copyWithProd.includes("Extensivo TED 2027"));
    assert.ok(copyWithProd.includes("24x de R$"));
    assert.ok(copyWithProd.includes("904,51"));
    assert.ok(copyWithProd.includes("ou R$"));
    assert.ok(copyWithProd.includes("15.497,00 à vista"));
    assert.ok(copyWithProd.includes("Total a prazo: R$"));
    assert.ok(copyWithProd.includes("21.708,24"));

    const copyWithoutProd = generatePieceCopy({
      product: "",
      n: 1,
      inst: 15497,
      price: 15497,
      total: 15497,
    });

    assert.ok(!copyWithoutProd.includes("Total a prazo"));
    assert.ok(copyWithoutProd.startsWith("1x de R$"));
  });
});
