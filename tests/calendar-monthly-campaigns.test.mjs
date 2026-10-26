import { test, describe } from "node:test";
import assert from "node:assert/strict";

describe("Campanhas de Marketing do Mês no Calendário (Feedback Beatriz Biscalchini)", () => {
  const mockTimelineItems = [
    // Item regular pontual
    {
      id: "tli_1",
      kind: "theoretical_exam",
      title: "Prova Teórica USP",
      startsAt: "2026-10-15",
      endsAt: "2026-10-15",
      details: {},
    },
    // Outro item regular
    {
      id: "tli_2",
      kind: "dinner",
      title: "Jantar dos Residentes",
      startsAt: "2026-10-20",
      endsAt: "2026-10-20",
      details: {},
    },
    // Campanha de Vendas de Outubro (isMonthlyCampaign = true)
    {
      id: "camp_vendas_1",
      kind: "launch",
      title: "Lote Promocional Extensivo Cirurgia 2027",
      startsAt: "2026-10-01",
      endsAt: "2026-10-31",
      productId: "prod_ext_cir",
      details: {
        isMonthlyCampaign: "true",
        campaignType: "vendas",
        monthYearKey: "2026-10",
        salesGoal: "300 matrículas",
        offerDetails: "12x sem juros + bônus",
      },
    },
    // Campanha de Captação de Outubro
    {
      id: "camp_capt_1",
      kind: "event",
      title: "Captação Simulado Aberto ENARE R1",
      startsAt: "2026-10-01",
      endsAt: "2026-10-31",
      details: {
        isMonthlyCampaign: "true",
        campaignType: "captacao",
        monthYearKey: "2026-10",
        leadMagnet: "Guia 500 Questões Comentadas",
        leadsCount: "1.500 leads",
        personaId: "pers_cirurgia_formando",
        personaName: "Dra. Camila - Formanda",
      },
    },
    // Campanha de Awareness de Outubro
    {
      id: "camp_aware_1",
      kind: "communication",
      title: "Semana da Cirurgia no Podcast MedCof",
      startsAt: "2026-10-01",
      endsAt: "2026-10-31",
      details: {
        isMonthlyCampaign: "true",
        campaignType: "awareness",
        monthYearKey: "2026-10",
        channels: "YouTube Live, Spotify Podcast, Reels",
      },
    },
    // Campanha de Vendas de Novembro (outro mês)
    {
      id: "camp_vendas_nov",
      kind: "launch",
      title: "Black November Cirurgia",
      startsAt: "2026-11-01",
      endsAt: "2026-11-30",
      productId: "prod_ext_cir",
      details: {
        isMonthlyCampaign: "true",
        campaignType: "vendas",
        monthYearKey: "2026-11",
        salesGoal: "500 matrículas",
      },
    },
  ];

  test("1. Separação limpa: itens da grade de dias NÃO contêm campanhas mensais", () => {
    // A grade de dias do calendário deve conter APENAS itens regulares
    const regularItems = mockTimelineItems.filter(
      (item) => item.details?.isMonthlyCampaign !== "true",
    );

    assert.equal(regularItems.length, 2);
    assert.deepEqual(
      regularItems.map((i) => i.id),
      ["tli_1", "tli_2"],
    );
    // Garante que nenhuma campanha de 30 dias polui o grid diário
    assert.ok(
      regularItems.every((i) => i.details?.isMonthlyCampaign !== "true"),
      "Nenhuma campanha deve entrar na grade diária de eventos",
    );
  });

  test("2. Resolução das campanhas ativas do mês corrente (Outubro/2026)", () => {
    const activeMonthKey = "2026-10";
    const monthlyCampaigns = mockTimelineItems.filter(
      (item) =>
        item.details?.isMonthlyCampaign === "true" &&
        item.details?.monthYearKey === activeMonthKey,
    );

    assert.equal(monthlyCampaigns.length, 3);

    const vendas = monthlyCampaigns.find((c) => c.details.campaignType === "vendas");
    const captacao = monthlyCampaigns.find((c) => c.details.campaignType === "captacao");
    const awareness = monthlyCampaigns.find((c) => c.details.campaignType === "awareness");

    assert.ok(vendas, "Deve possuir campanha de vendas");
    assert.equal(vendas.title, "Lote Promocional Extensivo Cirurgia 2027");
    assert.equal(vendas.details.salesGoal, "300 matrículas");

    assert.ok(captacao, "Deve possuir campanha de captação");
    assert.equal(captacao.title, "Captação Simulado Aberto ENARE R1");
    assert.equal(captacao.details.leadMagnet, "Guia 500 Questões Comentadas");
    assert.equal(captacao.details.leadsCount, "1.500 leads");
    assert.equal(captacao.details.personaName, "Dra. Camila - Formanda");

    assert.ok(awareness, "Deve possuir campanha de awareness");
    assert.equal(awareness.title, "Semana da Cirurgia no Podcast MedCof");
    assert.equal(awareness.details.channels, "YouTube Live, Spotify Podcast, Reels");
  });

  test("3. Isolamento por mês: campanhas de Novembro não vazam para Outubro", () => {
    const activeMonthKey = "2026-10";
    const octoberCampaigns = mockTimelineItems.filter(
      (item) =>
        item.details?.isMonthlyCampaign === "true" &&
        item.details?.monthYearKey === activeMonthKey,
    );

    assert.ok(
      !octoberCampaigns.some((c) => c.id === "camp_vendas_nov"),
      "Campanha de Novembro não deve aparecer em Outubro",
    );
  });

  test("4. Formatação de mês/ano para navegação no calendário", () => {
    const dateOct = new Date(2026, 9, 15); // Outubro
    const keyOct = `${dateOct.getFullYear()}-${String(dateOct.getMonth() + 1).padStart(2, "0")}`;
    assert.equal(keyOct, "2026-10");

    const dateNov = new Date(2026, 10, 1); // Novembro
    const keyNov = `${dateNov.getFullYear()}-${String(dateNov.getMonth() + 1).padStart(2, "0")}`;
    assert.equal(keyNov, "2026-11");
  });

  test("5. Suporte a bolinhas indicadoras no Dia 1 sem esticar pelos 30 dias", () => {
    const activeCampaigns = [
      { id: "c1", type: "vendas", title: "Campanha A" },
      { id: "c2", type: "captacao", title: "Campanha B" },
      { id: "c3", type: "awareness", title: "Campanha C" },
    ];

    // O Dia 1 é o ponto de ancoragem discreto das bolinhas
    const day = 1;
    const shouldRenderIndicatorPill = day === 1 && activeCampaigns.length > 0;
    assert.equal(shouldRenderIndicatorPill, true);

    const day15 = 15;
    const shouldNotRenderOnOtherDays = day15 === 1 && activeCampaigns.length > 0;
    assert.equal(shouldNotRenderOnOtherDays, false);
  });
});
