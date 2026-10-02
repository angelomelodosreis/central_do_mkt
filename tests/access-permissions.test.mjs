import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  isFullAccessMaster,
  seesEverything,
  canSeeBusinessUnit,
  emptyScope,
} from "../src/lib/modules/access/scope.ts";
import {
  DEFAULT_ALLOWED_DOMAINS,
  extractEmailDomain,
  isAllowedCorporateDomain,
} from "../src/lib/auth/auth.ts";

describe("Sistema de Acessos e Escopos (Central do Marketing)", () => {
  test("Liberação de login para e-mails corporativos oficiais (@medcof.com.br, @grupomedcof.com.br)", () => {
    assert.equal(DEFAULT_ALLOWED_DOMAINS.includes("medcof.com.br"), true);
    assert.equal(DEFAULT_ALLOWED_DOMAINS.includes("grupomedcof.com.br"), true);

    const emailNathalia = "nathalia.bueno@medcof.com.br";
    const domainNathalia = extractEmailDomain(emailNathalia);
    assert.equal(domainNathalia, "medcof.com.br");
    assert.equal(isAllowedCorporateDomain(domainNathalia, null), true);

    const emailAngelo = "angelo.gabriel@grupomedcof.com.br";
    const domainAngelo = extractEmailDomain(emailAngelo);
    assert.equal(domainAngelo, "grupomedcof.com.br");
    assert.equal(isAllowedCorporateDomain(domainAngelo, null), true);

    const emailExterno = "usuario@gmail.com";
    const domainExterno = extractEmailDomain(emailExterno);
    assert.equal(domainExterno, "gmail.com");
    assert.equal(isAllowedCorporateDomain(domainExterno, null), false);
    assert.equal(isAllowedCorporateDomain(domainExterno, { isActive: true }), true);
  });

  test("Acesso Total Master restrito exclusivamente a Angelo e Bacochina", () => {
    assert.equal(isFullAccessMaster({ email: "angelo@medcof.com.br", name: "Angelo Melo" }), true);
    assert.equal(isFullAccessMaster({ email: "bacochina@medcof.com.br", name: "Bacochina" }), true);
    assert.equal(isFullAccessMaster({ email: "analista@medcof.com.br", name: "Carlos Silva" }), false);
    assert.equal(isFullAccessMaster({ email: "gestor@medcof.com.br", name: "Mariana Costa" }), false);
  });

  test("Escopo vazio falha fechado para qualquer recurso", () => {
    const empty = emptyScope();
    assert.equal(seesEverything(empty), false);
    assert.equal(canSeeBusinessUnit(empty, "bu_clinica_medica"), false);
  });

  test("Master enxerga qualquer Business Unit mesmo sem vínculo explícito", () => {
    const masterScope = {
      ...emptyScope(),
      isMasterFullAccess: true,
    };
    assert.equal(seesEverything(masterScope), true);
    assert.equal(canSeeBusinessUnit(masterScope, "bu_qualquer_uma"), true);
  });

  test("Usuário comum enxerga somente as BUs às quais foi vinculado", () => {
    const regularScope = {
      ...emptyScope(),
      businessUnitIds: new Set(["bu_pediatria", "bu_cirurgia"]),
    };
    assert.equal(seesEverything(regularScope), false);
    assert.equal(canSeeBusinessUnit(regularScope, "bu_pediatria"), true);
    assert.equal(canSeeBusinessUnit(regularScope, "bu_cirurgia"), true);
    assert.equal(canSeeBusinessUnit(regularScope, "bu_cardiologia"), false);
  });
});
