import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  calculateSalesAnalytics,
  calculateComparativeAnalysis,
  getAvailableMonths,
  formatMonthYearLabel,
} from "../src/lib/modules/sales/calculations.ts";
import { BU_CATALOG } from "../src/lib/modules/sales/bu-catalog.ts";

describe("Motor de Cálculos de Vendas e Marketing (Central do Mkt)", () => {
  const mockTransactions = [
    {
      id: "tx-1",
      date: "2026-09-10T10:00:00Z",
      timestamp: new Date("2026-09-10T10:00:00Z").getTime(),
      amount: 5000,
      quantity: 1,
      businessUnitCode: "CLINICA_MEDICA",
      businessUnitLabel: "Clínica Médica",
      productName: "Extensivo R1",
      paymentMethod: "credit_card",
      status: "approved",
    },
    {
      id: "tx-2",
      date: "2026-09-15T15:00:00Z",
      timestamp: new Date("2026-09-15T15:00:00Z").getTime(),
      amount: 3000,
      quantity: 1,
      businessUnitCode: "CIRURGIA",
      businessUnitLabel: "Cirurgia",
      productName: "Semi-extensivo",
      paymentMethod: "pix",
      status: "approved",
    },
    {
      id: "tx-3",
      date: "2026-10-01T08:30:00Z",
      timestamp: new Date("2026-10-01T08:30:00Z").getTime(),
      amount: 10000,
      quantity: 2,
      businessUnitCode: "CLINICA_MEDICA",
      businessUnitLabel: "Clínica Médica",
      productName: "Extensivo R1",
      paymentMethod: "credit_card",
      status: "approved",
    },
    {
      id: "tx-4",
      date: "2026-10-02T12:00:00Z",
      timestamp: new Date("2026-10-02T12:00:00Z").getTime(),
      amount: 4000,
      quantity: 1,
      businessUnitCode: "ANESTESIOLOGIA",
      businessUnitLabel: "Anestesiologia",
      productName: "Boot Camp",
      paymentMethod: "boleto",
      status: "pending",
    },
    {
      id: "tx-5",
      date: "2026-10-02T14:00:00Z",
      timestamp: new Date("2026-10-02T14:00:00Z").getTime(),
      amount: 2000,
      quantity: 1,
      businessUnitCode: "RESIDENCIA",
      businessUnitLabel: "Residência",
      productName: "Questões",
      paymentMethod: "pix",
      status: "cancelled",
    },
  ];

  test("Cálculo geral de métricas agregadas e ticket médio", () => {
    const result = calculateSalesAnalytics(mockTransactions);

    assert.equal(result.summary.totalRevenue, 24000);
    assert.equal(result.summary.totalSales, 6);
    // Vendas aprovadas: 5000 + 3000 + 10000 = 18000 (quantidades: 1 + 1 + 2 = 4)
    assert.equal(result.summary.approvedRevenue, 18000);
    assert.equal(result.summary.approvedSales, 4);
    assert.equal(result.summary.overallAverageTicket, 4500); // 18000 / 4
    assert.equal(result.summary.pendingSales, 1);
  });

  test("Filtragem de transações por Business Unit específica (código canônico)", () => {
    const clinicaResult = calculateSalesAnalytics(mockTransactions, {
      targetBuCode: "CLINICA_MEDICA",
    });

    assert.equal(clinicaResult.summary.totalRevenue, 15000);
    assert.equal(clinicaResult.summary.approvedSales, 3);
    assert.equal(clinicaResult.summary.overallAverageTicket, 5000);
  });

  test("Filtragem resiliente por ID de banco (bu_clinica_medica), slug (clinica-medica) e multi-BU", () => {
    // 1. Usando formato de ID de banco
    const byId = calculateSalesAnalytics(mockTransactions, {
      targetBuCode: "bu_clinica_medica",
    });
    assert.equal(byId.summary.approvedSales, 3);
    assert.equal(byId.summary.totalRevenue, 15000);

    // 2. Usando formato de slug com hífen
    const bySlug = calculateSalesAnalytics(mockTransactions, {
      targetBuCode: "clinica-medica",
    });
    assert.equal(bySlug.summary.approvedSales, 3);

    // 3. Usando formato de slug com underline
    const bySlugUnder = calculateSalesAnalytics(mockTransactions, {
      targetBuCode: "clinica_medica",
    });
    assert.equal(bySlugUnder.summary.approvedSales, 3);

    // 4. Multi-BU: Clínica Médica + Cirurgia
    const multi = calculateSalesAnalytics(mockTransactions, {
      targetBuCodes: ["bu_clinica_medica", "bu_cirurgia"],
    });
    assert.equal(multi.summary.approvedSales, 4); // 3 clinica + 1 cirurgia
    assert.equal(multi.summary.totalRevenue, 18000); // 15000 clinica + 3000 cirurgia
  });

  test("Série temporal diária, velocidade (dV/dt) e taxa de variação", () => {
    const result = calculateSalesAnalytics(mockTransactions);

    assert.ok(result.dailySeries.length > 0);
    const day10Sep = result.dailySeries.find((p) => p.date === "2026-09-10");
    assert.ok(day10Sep);
    assert.equal(day10Sep.revenue, 5000);
    assert.equal(day10Sep.velocitySales, 1);

    const day01Oct = result.dailySeries.find((p) => p.date === "2026-10-01");
    assert.ok(day01Oct);
    assert.equal(day01Oct.revenue, 10000);
    assert.equal(day01Oct.salesCount, 2);
  });

  test("Análise Comparativa MoM (Mês Atual vs Mês Anterior)", () => {
    const comp = calculateComparativeAnalysis(mockTransactions, {
      currentMonthKey: "2026-10",
      previousMonthKey: "2026-09",
    });

    // Outubro: tx-3 (10000, 2) + tx-4 (4000, 1) = 14000, 3 vendas
    assert.equal(comp.currentPeriod.revenue, 14000);
    assert.equal(comp.currentPeriod.sales, 3);

    // Setembro: tx-1 (5000, 1) + tx-2 (3000, 1) = 8000, 2 vendas
    assert.equal(comp.previousPeriod.revenue, 8000);
    assert.equal(comp.previousPeriod.sales, 2);

    // Deltas
    assert.equal(comp.deltas.revenueDelta, 6000);
    assert.equal(comp.deltas.salesDelta, 1);
    assert.equal(comp.deltas.revenueGrowthPercent, 75); // (6000 / 8000) * 100 = 75%
  });

  test("Tratamento de lista vazia sem quebra de divisão por zero", () => {
    const emptyResult = calculateSalesAnalytics([]);
    assert.equal(emptyResult.summary.totalRevenue, 0);
    assert.equal(emptyResult.summary.totalSales, 0);
    assert.equal(emptyResult.summary.overallAverageTicket, 0);
    assert.equal(emptyResult.dailySeries.length, 0);

    const emptyComp = calculateComparativeAnalysis([]);
    assert.equal(emptyComp.currentPeriod.revenue, 0);
    assert.equal(emptyComp.previousPeriod.revenue, 0);
    assert.equal(emptyComp.deltas.revenueGrowthPercent, 0);
  });

  test("Formatação amigável de chaves de mês/ano em português", () => {
    assert.equal(formatMonthYearLabel("2026-10"), "Outubro/2026");
    assert.equal(formatMonthYearLabel("2026-03"), "Março/2026");
    assert.equal(formatMonthYearLabel("2025-12"), "Dezembro/2025");
    assert.equal(formatMonthYearLabel("2026-10-01_2026-10-05"), "01/10/2026 a 05/10/2026");
  });

  test("Análise Comparativa com intervalo exato por Ano, Mês e Dia", () => {
    // Período Base: apenas 2026-10-01 (tx-3: 10000, 2 vendas)
    // Período Comparado: apenas 2026-09-10 (tx-1: 5000, 1 venda)
    const customComp = calculateComparativeAnalysis(mockTransactions, {
      startDate: "2026-10-01",
      endDate: "2026-10-01",
      compareStartDate: "2026-09-10",
      compareEndDate: "2026-09-10",
    });

    assert.equal(customComp.currentPeriod.sales, 2);
    assert.equal(customComp.currentPeriod.revenue, 10000);
    assert.equal(customComp.currentPeriod.label, "01/10/2026");

    assert.equal(customComp.previousPeriod.sales, 1);
    assert.equal(customComp.previousPeriod.revenue, 5000);
    assert.equal(customComp.previousPeriod.label, "10/09/2026");

    assert.equal(customComp.deltas.revenueDelta, 5000);
    assert.equal(customComp.deltas.salesDelta, 1);
    assert.equal(customComp.deltas.revenueGrowthPercent, 100);
    assert.ok(customComp.dayByDaySeries.length > 0);
  });

  test("Catálogo oficial das 23 Business Units da MedCof e integridade de códigos", () => {
    assert.equal(BU_CATALOG.length, 23);
    const codes = new Set(BU_CATALOG.map((b) => b.code));
    assert.ok(codes.has("MEDCOF_CARDIOLOGIA"));
    assert.ok(codes.has("MEDCOF_DERMATOLOGIA"));
    assert.ok(codes.has("MEDCOF_ANESTESIOLOGIA"));
    assert.ok(codes.has("MEDCOF_UROLOGIA"));
    assert.ok(codes.has("MEDCOF_ORTOPEDIA"));
    assert.ok(codes.has("MEDCOF_RADIOLOGIA"));
    assert.ok(codes.has("MEDCOF_REVALIDA"));
    assert.ok(codes.has("MEDCOF_USA"));
    assert.ok(codes.has("MEDCOF_INTERNATO"));
    assert.ok(codes.has("MEDCOF_CONCURSUS"));
  });
});
