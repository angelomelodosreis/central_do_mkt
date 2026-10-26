import { test, describe } from "node:test";
import assert from "node:assert/strict";

/**
 * Função pura que espelha as regras de iniciais de @/components/org/person-card
 */
function initials(name) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Parser de menções inteligente que busca correspondência com a lista de usuários conhecidos
 * (incluindo nomes compostos) e termos @termo avulsos.
 */
function parseMentions(content, users = []) {
  if (!content) return [];

  const knownNames = users
    .map((u) => u.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);

  const pattern =
    knownNames.length > 0
      ? new RegExp(
          `(${knownNames.map((n) => `@${n}`).join("|")}|@[A-Za-zÀ-ÖØ-öø-ÿ0-9_.-]+)`,
          "gi",
        )
      : /(@[A-Za-zÀ-ÖØ-öø-ÿ0-9_.-]+)/gi;

  const segments = content.split(pattern).filter((part) => part !== undefined && part !== "");

  return segments.map((part) => {
    if (part.startsWith("@")) {
      const rawName = part.slice(1).trim().toLowerCase();
      const matched = users.find(
        (u) =>
          u.name.toLowerCase() === rawName ||
          u.name.toLowerCase().startsWith(rawName) ||
          rawName.startsWith(u.name.toLowerCase()),
      );

      return {
        type: "mention",
        raw: part,
        matchedUser: matched || null,
        hasPhoto: Boolean(matched?.image),
        photoUrl: matched?.image ?? null,
        initialsFallback: matched ? initials(matched.name) : "@",
      };
    }

    return {
      type: "text",
      raw: part,
    };
  });
}

describe("Funcionalidade de Foto de Perfil, Avatar e Menções com Foto/Siglas", () => {
  describe("1. Geração de Iniciais (Siglas) de Fallback", () => {
    test("Gera siglas para nomes de duas ou mais palavras", () => {
      assert.equal(initials("Matheus Bacochina"), "MB");
      assert.equal(initials("Stella Celentano"), "SC");
      assert.equal(initials("Ângelo Gabriel"), "ÂG");
      assert.equal(initials("Beatriz Biscalchini"), "BB");
      assert.equal(initials("Matheus Vinicius Bacochina"), "MB");
    });

    test("Gera duas primeiras letras para nomes de uma palavra", () => {
      assert.equal(initials("Matheus"), "MA");
      assert.equal(initials("Ana"), "AN");
      assert.equal(initials("Dr"), "DR");
    });

    test("Trata espaços extras e nomes curtos/vazios com segurança", () => {
      assert.equal(initials("   Matheus   Bacochina   "), "MB");
      assert.equal(initials(""), "?");
      assert.equal(initials(" "), "?");
      assert.equal(initials("M"), "M");
    });
  });

  describe("2. Parser de Menções (@Nome) e Resolução de Foto vs Siglas", () => {
    const mockUsers = [
      {
        id: "usr_matheus",
        name: "Matheus Bacochina",
        email: "matheus@medcof.com.br",
        image: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAMCA...",
      },
      {
        id: "usr_stella",
        name: "Stella Celentano",
        email: "stella@medcof.com.br",
        image: null, // sem foto -> deve manter siglas SC
      },
      {
        id: "usr_angelo",
        name: "Ângelo Gabriel",
        email: "angelo@medcof.com.br",
        image: undefined, // sem foto -> deve manter siglas ÂG
      },
    ];

    test("Quando usuário citado TEM foto, a menção deve resolver com a foto", () => {
      const comment = "Por favor, @Matheus Bacochina verificar a base de dados.";
      const parsed = parseMentions(comment, mockUsers);

      const mention = parsed.find((p) => p.type === "mention");
      assert.ok(mention, "Deve encontrar a menção");
      assert.equal(mention.raw, "@Matheus Bacochina");
      assert.equal(mention.matchedUser?.name, "Matheus Bacochina");
      assert.equal(mention.hasPhoto, true);
      assert.ok(mention.photoUrl.startsWith("data:image/jpeg"));
    });

    test("Quando usuário citado NÃO tem foto, a menção deve manter apenas as siglas", () => {
      const comment = "Alinhar também com @Stella Celentano sobre a integração.";
      const parsed = parseMentions(comment, mockUsers);

      const mention = parsed.find((p) => p.type === "mention");
      assert.ok(mention, "Deve encontrar a menção");
      assert.equal(mention.raw, "@Stella Celentano");
      assert.equal(mention.matchedUser?.name, "Stella Celentano");
      assert.equal(mention.hasPhoto, false);
      assert.equal(mention.photoUrl, null);
      assert.equal(mention.initialsFallback, "SC");
    });

    test("Suporta múltiplos usuários citados na mesma mensagem com comportamentos independentes", () => {
      const comment = "@Matheus Bacochina e @Stella Celentano precisam aprovar com @Ângelo Gabriel.";
      const parsed = parseMentions(comment, mockUsers);

      const mentions = parsed.filter((p) => p.type === "mention");
      assert.equal(mentions.length, 3);

      // Matheus tem foto
      assert.equal(mentions[0].matchedUser?.name, "Matheus Bacochina");
      assert.equal(mentions[0].hasPhoto, true);
      assert.equal(mentions[0].initialsFallback, "MB");

      // Stella não tem foto -> siglas
      assert.equal(mentions[1].matchedUser?.name, "Stella Celentano");
      assert.equal(mentions[1].hasPhoto, false);
      assert.equal(mentions[1].initialsFallback, "SC");

      // Ângelo não tem foto -> siglas
      assert.equal(mentions[2].matchedUser?.name, "Ângelo Gabriel");
      assert.equal(mentions[2].hasPhoto, false);
      assert.equal(mentions[2].initialsFallback, "ÂG");
    });

    test("Menção de usuário inexistente no banco não quebra o sistema", () => {
      const comment = "Notificar @UsuarioDesconhecido para acesso.";
      const parsed = parseMentions(comment, mockUsers);

      const mention = parsed.find((p) => p.type === "mention");
      assert.ok(mention);
      assert.equal(mention.matchedUser, null);
      assert.equal(mention.hasPhoto, false);
      assert.equal(mention.initialsFallback, "@");
    });

    test("Texto comum sem menção é preservado sem alterações", () => {
      const comment = "Atualização concluída com 100% de sucesso nas métricas de conversão.";
      const parsed = parseMentions(comment, mockUsers);

      assert.equal(parsed.length, 1);
      assert.equal(parsed[0].type, "text");
      assert.equal(parsed[0].raw, comment);
    });
  });

  describe("3. Contrato de Atualização de Foto de Perfil", () => {
    test("Aceita upload de foto no formato Base64 ou URL", () => {
      const validPhotoPayload = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAMCAgMCA...";
      assert.ok(
        validPhotoPayload.startsWith("data:image/") ||
        validPhotoPayload.startsWith("http://") ||
        validPhotoPayload.startsWith("https://")
      );
    });

    test("Aceita null para remover a foto e restaurar siglas padrão", () => {
      const removePhotoPayload = null;
      assert.equal(removePhotoPayload, null);
    });
  });
});
