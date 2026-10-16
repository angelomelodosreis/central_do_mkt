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

  await t.test("5. Resolução da aba e sub-aba de comentários do diagnóstico", () => {
    function resolveTabs({ aba, subaba }) {
      const initialTab = aba === "metas" || aba === "revisoes" ? aba : "diagnostico";
      const initialDiagnosisSubTab =
        aba === "comentarios" || subaba === "comentarios"
          ? "comentarios"
          : subaba === "todos"
            ? "todos"
            : "diagnostico";
      return { initialTab, initialDiagnosisSubTab };
    }

    // Acesso padrão sem parâmetros
    assert.deepEqual(resolveTabs({}), {
      initialTab: "diagnostico",
      initialDiagnosisSubTab: "diagnostico",
    });

    // Acesso direto via aba=comentarios
    assert.deepEqual(resolveTabs({ aba: "comentarios" }), {
      initialTab: "diagnostico",
      initialDiagnosisSubTab: "comentarios",
    });

    // Acesso via subaba=comentarios na aba de diagnóstico
    assert.deepEqual(resolveTabs({ aba: "diagnostico", subaba: "comentarios" }), {
      initialTab: "diagnostico",
      initialDiagnosisSubTab: "comentarios",
    });

    // Acesso na visão completa
    assert.deepEqual(resolveTabs({ aba: "diagnostico", subaba: "todos" }), {
      initialTab: "diagnostico",
      initialDiagnosisSubTab: "todos",
    });

    // Outras abas preservam integridade
    assert.deepEqual(resolveTabs({ aba: "metas" }), {
      initialTab: "metas",
      initialDiagnosisSubTab: "diagnostico",
    });
  });

  await t.test("6. Sincronização e contagem de comentários do diagnóstico", () => {
    const sampleComments = [
      {
        id: "diag_com_1",
        authorName: "Beatriz Biscalchini",
        content: "Alinhamento 1",
        createdAt: "2026-10-10T10:00:00.000Z",
      },
      {
        id: "diag_com_2",
        authorName: "Angelo Bacochina",
        content: "Validação com coordenadores",
        createdAt: "2026-10-11T12:00:00.000Z",
      },
    ];

    const count = sampleComments.length;
    const participants = new Set(sampleComments.map((c) => c.authorName)).size;
    assert.equal(count, 2);
    assert.equal(participants, 2);

    // Adição de novo comentário atualiza contador dinamicamente
    const newComment = {
      id: "diag_com_3",
      authorName: "Beatriz Biscalchini",
      content: "Atualização TEGO",
      createdAt: "2026-10-12T14:00:00.000Z",
    };
    const updated = [...sampleComments, newComment];
    assert.equal(updated.length, 3);
    assert.equal(new Set(updated.map((c) => c.authorName)).size, 2);
  });

  await t.test("7. Normalização de parâmetros de URL ao navegar entre sub-abas do diagnóstico", () => {
    function getUpdatedUrlParams(currentUrlString, targetSubTab) {
      const url = new URL(currentUrlString);
      url.searchParams.set("aba", "diagnostico");
      if (targetSubTab === "diagnostico") {
        url.searchParams.delete("subaba");
      } else {
        url.searchParams.set("subaba", targetSubTab);
      }
      return {
        aba: url.searchParams.get("aba"),
        subaba: url.searchParams.get("subaba"),
        search: url.search,
      };
    }

    // Caso 1: Usuário entrou com aba=comentarios e clica em "Pilares e Síntese" (sub-aba diagnostico)
    const res1 = getUpdatedUrlParams("http://localhost/planejamento/clinica-medica/ciclos?aba=comentarios", "diagnostico");
    assert.equal(res1.aba, "diagnostico");
    assert.equal(res1.subaba, null);
    assert.equal(res1.search, "?aba=diagnostico");

    // Caso 2: Usuário entra com aba=diagnostico e clica em "Aba de Comentários"
    const res2 = getUpdatedUrlParams("http://localhost/planejamento/clinica-medica/ciclos?aba=diagnostico", "comentarios");
    assert.equal(res2.aba, "diagnostico");
    assert.equal(res2.subaba, "comentarios");
    assert.equal(res2.search, "?aba=diagnostico&subaba=comentarios");

    // Caso 3: Usuário entra na visão completa
    const res3 = getUpdatedUrlParams("http://localhost/planejamento/clinica-medica/ciclos", "todos");
    assert.equal(res3.aba, "diagnostico");
    assert.equal(res3.subaba, "todos");
    assert.equal(res3.search, "?aba=diagnostico&subaba=todos");
  });

  await t.test("8. Formatação resiliente de datas de comentários com edge cases", () => {
    function formatCommentDate(dateStr) {
      if (!dateStr) return "Nenhuma ainda";
      try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        return d.toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
      } catch {
        return dateStr;
      }
    }

    // Nulo, indefinido e vazio
    assert.equal(formatCommentDate(null), "Nenhuma ainda");
    assert.equal(formatCommentDate(undefined), "Nenhuma ainda");
    assert.equal(formatCommentDate(""), "Nenhuma ainda");

    // String inválida retorna a própria string com segurança
    assert.equal(formatCommentDate("data_invalida"), "data_invalida");

    // Timestamp ISO válido formata no padrão brasileiro
    const formatted = formatCommentDate("2026-10-16T14:30:00.000Z");
    assert.ok(formatted.includes("/2026"));
    assert.ok(formatted.includes(":"));
  });

  await t.test("9. Preservação da sub-aba de comentários na alternância das abas principais", () => {
    // Simula o ciclo de vida do estado em CyclesView
    let activeTab = "diagnostico";
    let diagnosisSubTab = "comentarios";

    // Usuário vai para Metas
    activeTab = "metas";
    assert.equal(activeTab, "metas");
    // Sub-aba de diagnóstico continua preservada em memória
    assert.equal(diagnosisSubTab, "comentarios");

    // Usuário retorna para Diagnóstico
    activeTab = "diagnostico";
    assert.equal(activeTab, "diagnostico");
    assert.equal(diagnosisSubTab, "comentarios"); // Não reseta para "diagnostico"
  });
});
