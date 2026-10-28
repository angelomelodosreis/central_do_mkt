import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  extractYoutubeId,
  normalizeVideoUrl,
} from "../src/lib/modules/growth-sessions/utils.ts";
import { sanitizePlainText } from "../src/lib/utils/text.ts";

describe("Módulo Growth Sessions & Treinamentos MedCof", () => {
  describe("1. Extrator Inteligente de YouTube ID", () => {
    test("Extrai ID a partir de link curto youtu.be", () => {
      const url = "https://youtu.be/1QQZoc-l9jA";
      assert.equal(extractYoutubeId(url), "1QQZoc-l9jA");
    });

    test("Extrai ID a partir de link longo youtube.com/watch?v= com parâmetros adicionais", () => {
      const url = "https://www.youtube.com/watch?v=qq3FLxiTtAo&feature=share&t=25s";
      assert.equal(extractYoutubeId(url), "qq3FLxiTtAo");
    });

    test("Extrai ID a partir de link embed", () => {
      const url = "https://www.youtube.com/embed/4yC-YiLC9mg";
      assert.equal(extractYoutubeId(url), "4yC-YiLC9mg");
    });

    test("Reconhece ID puro de 11 caracteres", () => {
      const id = "zbgCkt0sFIc";
      assert.equal(extractYoutubeId(id), "zbgCkt0sFIc");
    });

    test("Retorna null para links não-YouTube ou vazios", () => {
      assert.equal(extractYoutubeId("https://loom.com/share/abc123xyz"), null);
      assert.equal(extractYoutubeId("https://drive.google.com/file/d/123/view"), null);
      assert.equal(extractYoutubeId(""), null);
      assert.equal(extractYoutubeId(null), null);
      assert.equal(extractYoutubeId(undefined), null);
    });
  });

  describe("2. Normalizador de URL de Vídeo", () => {
    test("Preserva URLs que já possuem https://", () => {
      const url = "https://youtu.be/1QQZoc-l9jA";
      assert.equal(normalizeVideoUrl(url), url);
    });

    test("Adiciona https:// para links sem protocolo", () => {
      const url = "youtu.be/1QQZoc-l9jA";
      assert.equal(normalizeVideoUrl(url), "https://youtu.be/1QQZoc-l9jA");
    });

    test("Converte ID solto em link do YouTube", () => {
      const id = "WEYCr-bbM3U";
      assert.equal(normalizeVideoUrl(id), "https://youtu.be/WEYCr-bbM3U");
    });

    test("Retorna null para entradas vazias", () => {
      assert.equal(normalizeVideoUrl(""), null);
      assert.equal(normalizeVideoUrl("   "), null);
      assert.equal(normalizeVideoUrl(null), null);
    });
  });

  describe("3. Estruturação e Sanitização de Sessões", () => {
    test("Sanitiza título, tema e descrição removendo tags HTML e scripts", () => {
      const rawTitle = "GROWTH SESSIONS - Teste <script>alert(1)</script>";
      const cleanTitle = sanitizePlainText(rawTitle);
      assert.equal(cleanTitle, "GROWTH SESSIONS - Teste alert(1)");

      const rawDesc = "Aprenda sobre tráfego pago <img src=x onerror=alert(1)> e escala.";
      const cleanDesc = sanitizePlainText(rawDesc);
      assert.equal(cleanDesc, "Aprenda sobre tráfego pago  e escala.");
    });

    test("Suporta serialização e desserialização de links extras", () => {
      const rawLinks = [
        { label: "Ata da Reunião", url: "https://docs.google.com/document/d/123" },
        { label: "Template Slides", url: "https://assets.grupomedcof.com.br/slides.pdf" },
      ];
      const serialized = JSON.stringify(rawLinks);
      const parsed = JSON.parse(serialized);

      assert.equal(parsed.length, 2);
      assert.equal(parsed[0].label, "Ata da Reunião");
      assert.equal(parsed[1].url, "https://assets.grupomedcof.com.br/slides.pdf");
    });

    test("Suporta sessões puramente documentais (sem vídeo)", () => {
      const docSession = {
        title: "Playbook de Redação e Tom de Voz",
        theme: "Brand Voice & Copywriting",
        videoUrl: null,
        youtubeId: null,
        summaryUrl: "https://docs.google.com/document/d/xyz",
        presentationUrl: "https://assets.grupomedcof.com.br/brand.pdf",
      };

      assert.equal(docSession.videoUrl, null);
      assert.equal(docSession.youtubeId, null);
      assert.ok(docSession.summaryUrl);
      assert.ok(docSession.presentationUrl);
    });
  });
});
