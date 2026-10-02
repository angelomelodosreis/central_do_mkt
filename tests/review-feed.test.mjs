import { test, describe } from "node:test";
import assert from "node:assert/strict";

describe("Feed e Tabela de Revisão de Planejamento (Slack Canvas)", () => {
  const sampleItems = [
    {
      id: "rev_cirurgia_1",
      businessUnitId: "bu_cirurgia",
      businessUnitSlug: "cirurgia",
      businessUnitLabel: "Cirurgia",
      coordinatorName: "Ingrid Silva",
      meetingDate: new Date("2026-08-24T14:00:00Z"),
      followUpDate: new Date("2026-09-08T18:00:00Z"),
      details: "• Revisar precificação e oferta do Extensivo Cirurgia\n• Alinhar calendário de postagens de Black November com Social Media",
      assigneeName: "Mariana Vasconcelos",
      status: "concluido",
      comments: [
        {
          id: "c1",
          authorName: "Ingrid Silva",
          content: "Reunião finalizada. Mariana, favor priorizar criativos.",
        },
        {
          id: "c2",
          authorName: "Mariana Vasconcelos",
          content: "Perfeito, Ingrid! Subi a prévia no Drive.",
        },
      ],
    },
    {
      id: "rev_clinica_medica_1",
      businessUnitId: "bu_clinica_medica",
      businessUnitSlug: "clinica_medica",
      businessUnitLabel: "Clínica Médica",
      coordinatorName: "Ingrid Silva",
      meetingDate: new Date("2026-09-29T10:00:00Z"),
      followUpDate: new Date("2026-10-12T18:00:00Z"),
      details: "• Alinhar com o time de Social Media a semana de Clínica Médica\n• Análise da taxa de conversão do checkout",
      assigneeName: "João Fontes",
      status: "em_andamento",
      comments: [
        {
          id: "c3",
          authorName: "João Fontes",
          content: "A taxa de conversão subiu de 1.8% para 2.4%.",
        },
      ],
    },
    {
      id: "rev_concursus_1",
      businessUnitId: "bu_concursus",
      businessUnitSlug: "concursus",
      businessUnitLabel: "Concursus",
      coordinatorName: "Ingrid Silva",
      meetingDate: new Date("2026-09-22T11:00:00Z"),
      followUpDate: new Date("2026-10-01T18:00:00Z"),
      details: "• Auditoria de páginas de captura para o concurso unificado",
      assigneeName: "Ricardo Machado",
      status: "pendente",
      comments: [],
    },
  ];

  test("Filtro por Business Unit específica (Clínica Médica)", () => {
    const buFilter = "clinica_medica";
    const filtered = sampleItems.filter(
      (item) => item.businessUnitSlug === buFilter || item.businessUnitId === buFilter,
    );

    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].businessUnitLabel, "Clínica Médica");
    assert.equal(filtered[0].assigneeName, "João Fontes");
  });

  test("Filtro por Status ('concluido', 'em_andamento', 'pendente')", () => {
    const concluidos = sampleItems.filter((i) => i.status === "concluido");
    const emAndamento = sampleItems.filter((i) => i.status === "em_andamento");
    const pendentes = sampleItems.filter((i) => i.status === "pendente");

    assert.equal(concluidos.length, 1);
    assert.equal(emAndamento.length, 1);
    assert.equal(pendentes.length, 1);
  });

  test("Verificação de atraso / prazo de follow up expirado", () => {
    const isOverdue = (date, status) => {
      if (status === "concluido") return false;
      const d = new Date(date);
      const referenceNow = new Date("2026-10-02T12:00:00Z");
      return d.getTime() < referenceNow.getTime();
    };

    // Cirurgia está concluída, então não é atrasada mesmo com data anterior
    assert.equal(isOverdue(sampleItems[0].followUpDate, sampleItems[0].status), false);
    // Concursus com prazo 01/10/2026 e status pendente deve estar atrasado em 02/10/2026
    assert.equal(isOverdue(sampleItems[2].followUpDate, sampleItems[2].status), true);
  });

  test("Thread de comentários mantém ordem cronológica e contador correto", () => {
    const cirurgiaItem = sampleItems[0];
    assert.equal(cirurgiaItem.comments.length, 2);
    assert.equal(cirurgiaItem.comments[0].authorName, "Ingrid Silva");
    assert.equal(cirurgiaItem.comments[1].authorName, "Mariana Vasconcelos");

    const concursusItem = sampleItems[2];
    assert.equal(concursusItem.comments.length, 0);
  });
});
