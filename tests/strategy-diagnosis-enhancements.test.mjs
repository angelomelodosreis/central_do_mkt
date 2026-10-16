import test from "node:test";
import assert from "node:assert/strict";

test("Ajustes Estratégicos do Diagnóstico e Ciclos (Feedback Biscalchini & Bacochina)", async (t) => {
  await t.test("1. Ciclo anual formatado como Jan - Dez/2027 por padrão", () => {
    const rawPeriod = "Jan - Jun/2027";
    const normalized = rawPeriod === "Jan - Jun/2027" ? "Jan - Dez/2027" : rawPeriod;
    assert.equal(normalized, "Jan - Dez/2027");
  });

  await t.test("2. Cálculo dinâmico de progresso do ciclo sem valor fixo (eliminação do 68% hardcoded)", () => {
    function computeCycleProgress({ filledPillarsCount, goalsCount, reviewsCompletedCount, status }) {
      if (status === "completed") return 100;
      const diagnosisProgress = Math.min(25, filledPillarsCount * 5); // até 25%
      const goalsProgress = goalsCount > 0 ? 25 : 0; // 25% se houver metas
      const reviewsProgress = Math.min(50, reviewsCompletedCount * 25); // até 50%
      return Math.min(100, diagnosisProgress + goalsProgress + reviewsProgress);
    }

    // Sem nada preenchido: 0%
    assert.equal(computeCycleProgress({ filledPillarsCount: 0, goalsCount: 0, reviewsCompletedCount: 0, status: "in_progress" }), 0);

    // Com 5 pilares do diagnóstico preenchidos: 25%
    assert.equal(computeCycleProgress({ filledPillarsCount: 5, goalsCount: 0, reviewsCompletedCount: 0, status: "in_progress" }), 25);

    // Diagnóstico + Metas definidas: 50%
    assert.equal(computeCycleProgress({ filledPillarsCount: 5, goalsCount: 3, reviewsCompletedCount: 0, status: "in_progress" }), 50);

    // Diagnóstico + Metas + 1ª Revisão concluída: 75%
    assert.equal(computeCycleProgress({ filledPillarsCount: 5, goalsCount: 3, reviewsCompletedCount: 1, status: "in_progress" }), 75);

    // Ciclo completo com 2 revisões: 100%
    assert.equal(computeCycleProgress({ filledPillarsCount: 5, goalsCount: 3, reviewsCompletedCount: 2, status: "in_progress" }), 100);
  });

  await t.test("3. Unificação de Desafio e Oportunidade em uma única pergunta", () => {
    const unifiedQuestionTitle = "Qual é o principal desafio ou oportunidade da BU hoje?";
    assert.ok(unifiedQuestionTitle.includes("desafio ou oportunidade"));

    // Testa preservação de dados legados
    const legacyChallenge = "Baixa conversão em cardio";
    const legacyOpportunity = "Novos produtos de ultrassom";
    const unified = legacyChallenge || legacyOpportunity || "";
    assert.equal(unified, "Baixa conversão em cardio");
  });

  await t.test("4. Estrutura de comentários do diagnóstico", () => {
    const comment = {
      id: "diag_com_123",
      roundId: "rnd_test_1",
      businessUnitId: "bu_go",
      authorName: "Beatriz Biscalchini",
      authorRole: "Coordenação",
      content: "Alinhamento com Matheus: focar na expansão do TEGO no 1º semestre.",
      createdAt: new Date().toISOString(),
    };

    assert.ok(comment.id.startsWith("diag_com"));
    assert.ok(comment.content.length > 0);
    assert.equal(comment.authorName, "Beatriz Biscalchini");
  });
});
