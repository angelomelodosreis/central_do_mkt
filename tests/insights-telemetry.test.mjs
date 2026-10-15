import test from "node:test";
import assert from "node:assert/strict";
import {
  sanitizeAndValidateEvent,
  isOriginAllowed,
  checkRateLimit,
} from "../src/lib/modules/insights/collector.ts";

test("MedCof Insights Telemetria e Coletor", async (t) => {
  await t.test("isOriginAllowed valida allowlist oficial da MedCof e bloqueia origens externas", () => {
    assert.equal(isOriginAllowed("https://grupomedcof.com.br"), true);
    assert.equal(isOriginAllowed("https://extensivo.grupomedcof.com.br"), true);
    assert.equal(isOriginAllowed("https://medcofderma.com.br"), true);
    assert.equal(isOriginAllowed("https://medcofendocrino.com.br"), true);
    assert.equal(isOriginAllowed("https://minha-lp.pages.dev"), true);
    assert.equal(isOriginAllowed("http://localhost:3000"), true);
    assert.equal(isOriginAllowed("http://127.0.0.1:3000"), true);

    // Origens maliciosas ou desconhecidas devem ser bloqueadas
    assert.equal(isOriginAllowed("https://site-falso.com"), false);
    assert.equal(isOriginAllowed("https://phishing-medcof.com"), false);
    assert.equal(isOriginAllowed("https://evil.org"), false);
  });

  await t.test("checkRateLimit protege o endpoint contra flood por IP", () => {
    const testIp = "192.168.100.42";
    // Limite de 5 para o teste rápido
    assert.equal(checkRateLimit(testIp, 5, 5000), true);
    assert.equal(checkRateLimit(testIp, 5, 5000), true);
    assert.equal(checkRateLimit(testIp, 5, 5000), true);
    assert.equal(checkRateLimit(testIp, 5, 5000), true);
    assert.equal(checkRateLimit(testIp, 5, 5000), true);
    // 6ª requisição deve ser bloqueada
    assert.equal(checkRateLimit(testIp, 5, 5000), false);
  });

  await t.test("sanitizeAndValidateEvent aceita eventos válidos e normaliza coordenadas (0 a 1000)", () => {
    const raw = {
      event_type: "cta_click",
      page_id: "lp-extensivo-2026",
      page_url: "https://grupomedcof.com.br/extensivo-2026",
      element_id: "hero-cta",
      element_label: "Quero me matricular",
      section_id: "hero",
      viewport: "desktop",
      x: 520,
      y: 310,
      scroll_percent: 45,
      utm_source: "google",
      utm_campaign: "search-extensivo",
    };

    const valid = sanitizeAndValidateEvent(raw);
    assert.notEqual(valid, null);
    assert.equal(valid.eventType, "cta_click");
    assert.equal(valid.pageId, "lp-extensivo-2026");
    assert.equal(valid.elementId, "hero-cta");
    assert.equal(valid.x, 520);
    assert.equal(valid.y, 310);
    assert.equal(valid.scrollPercent, 45);
    assert.equal(valid.utmSource, "google");
  });

  await t.test("sanitizeAndValidateEvent calibra coordenadas fora do intervalo para [0, 1000]", () => {
    const rawNegative = {
      event_type: "click",
      page_id: "lp-test",
      x: -50,
      y: 1500,
      scroll_percent: 150,
    };

    const valid = sanitizeAndValidateEvent(rawNegative);
    assert.notEqual(valid, null);
    assert.equal(valid.x, 0); // clamp min 0
    assert.equal(valid.y, 1000); // clamp max 1000
    assert.equal(valid.scrollPercent, 100); // clamp max 100
  });

  await t.test("PII Blocker: rejeita imediatamente payloads contendo senhas, cartões ou CPF", () => {
    const rawWithPassword = {
      event_type: "click",
      page_id: "lp-test",
      password: "secretpassword123",
    };
    assert.equal(sanitizeAndValidateEvent(rawWithPassword), null);

    const rawWithCpf = {
      event_type: "form_submit",
      page_id: "lp-test",
      cpf: "123.456.789-00",
    };
    assert.equal(sanitizeAndValidateEvent(rawWithCpf), null);

    const rawWithCreditCard = {
      event_type: "click",
      credit_card: "411111111111",
    };
    assert.equal(sanitizeAndValidateEvent(rawWithCreditCard), null);
  });

  await t.test("sanitizeAndValidateEvent rejeita tipos de eventos inválidos", () => {
    const rawInvalid = {
      event_type: "malicious_injection",
      page_id: "lp-test",
    };
    assert.equal(sanitizeAndValidateEvent(rawInvalid), null);
  });
});
