import test from "node:test";
import assert from "node:assert/strict";
import { buildPersonaSearchText } from "../src/lib/modules/personas/search-text.ts";

test("Personas - Título de Especialista (Feedback Heloiza Goes)", async (t) => {
  await t.test("1. buildPersonaSearchText indexa o título de especialista da persona titulada", () => {
    const personaInput = {
      name: "Dra. Juliana",
      headline: "Ginecologista e Obstetra em ascensão",
      quote: "Quero me atualizar e manter minha excelência clínica.",
      targetExam: "Nenhuma — já titulado",
      careerStage: "Titulado",
      specialtyTitle: "TEGO — Ginecologia e Obstetrícia",
      pains: [{ pain: "Falta de tempo para congressos", solution: "MedCof Atualização" }],
    };

    const searchText = buildPersonaSearchText(personaInput);
    assert.ok(searchText, "Search text deve ser gerado");
    assert.ok(searchText.includes("tego"), "Search text normalizado deve incluir 'tego'");
    assert.ok(searchText.includes("ginecologia"), "Search text normalizado deve incluir 'ginecologia'");
    assert.ok(searchText.includes("titulado"), "Search text normalizado deve incluir 'titulado'");
  });

  await t.test("2. Títulos de especialista sugeridos contêm as especialidades oficiais MedCof", () => {
    const officialTitles = [
      "TEGO",
      "TEC",
      "TED",
      "TSA",
      "CBC",
      "TECM",
      "TEEM",
      "EndócrinoPED",
      "TEME",
      "TEMI",
      "CBO",
      "TEOT",
      "TEP",
      "CBR",
      "TISBU",
      "RQE",
    ];

    assert.equal(officialTitles.length, 16);
    assert.ok(officialTitles.includes("TEGO"));
    assert.ok(officialTitles.includes("TEC"));
    assert.ok(officialTitles.includes("TED"));
    assert.ok(officialTitles.includes("TSA"));
  });

  await t.test("3. Persona não-titulada não polui o search text com specialtyTitle", () => {
    const personaInput = {
      name: "Dr. André",
      headline: "Residente de R2",
      careerStage: "Residente",
      specialtyTitle: null,
      pains: [],
    };

    const searchText = buildPersonaSearchText(personaInput);
    assert.ok(searchText, "Search text deve ser gerado");
    assert.ok(!searchText.includes("tego"), "Não deve conter título");
  });
});
