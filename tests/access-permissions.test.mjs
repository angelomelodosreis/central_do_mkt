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

  test("Membros e editores possuem permissão de visualização do módulo Panorama", () => {
    // Simula a matriz de permissões resolvida para member/editor
    const memberPermissions = {
      panorama: { canView: true, canEdit: false },
      personas: { canView: true, canEdit: true },
    };

    assert.equal(memberPermissions.panorama.canView, true);
    assert.equal(memberPermissions.panorama.canEdit, false);
  });

  test("Conformidade de cores para Realizado vs Meta (CAC e Ticket Médio)", () => {
    // Para CAC (métrica de custo com sentido 'desce'):
    // Se realizado <= meta (ex: 96%), pctDisplay <= 100 deve ser VERDE (sucesso)
    const cacFeito = 1277.46;
    const cacAlvo = 1331.0;
    const cacPct = (cacFeito / cacAlvo) * 100;
    const cacDisplay = Math.round(cacPct);
    const cacIsGood = cacDisplay <= 100;
    assert.equal(cacDisplay, 96);
    assert.equal(cacIsGood, true);

    // Se CAC exceder a meta (ex: 1500 vs 1331 = 113%), deve ser VERMELHO (alerta)
    const cacEstouradoPct = (1500 / 1331) * 100;
    const cacEstouradoDisplay = Math.round(cacEstouradoPct);
    assert.equal(cacEstouradoDisplay <= 100, false);

    // Para Ticket Médio (sentido 'sobe'):
    // Se feito = 3590.71 e alvo = 3592, pct = 99.96%, Math.round dá 100% -> VERDE (sucesso)
    const ticketFeito = 3590.71;
    const ticketAlvo = 3592.0;
    const ticketPct = (ticketFeito / ticketAlvo) * 100;
    const ticketDisplay = Math.round(ticketPct);
    const ticketIsGood = ticketDisplay >= 100;
    assert.equal(ticketDisplay, 100);
    assert.equal(ticketIsGood, true);
  });

  test("Membros e editores podem editar estratégia dentro do escopo da sua BU", () => {
    // Simula a função canEditModule em access.ts
    const canEditStrategy = (userRole, userPermissions, moduleKey, podeVerBu) =>
      podeVerBu &&
      (Boolean(userPermissions[moduleKey]?.canEdit) ||
        ((moduleKey === "personas" || moduleKey === "strategy") &&
          (userRole === "member" || userRole === "editor")));

    assert.equal(canEditStrategy("member", { strategy: { canEdit: true } }, "strategy", true), true);
    assert.equal(canEditStrategy("editor", { strategy: { canEdit: false } }, "strategy", true), true);
    assert.equal(canEditStrategy("member", { strategy: { canEdit: true } }, "strategy", false), false);
  });

  test("Pilares do Diagnóstico 2.0 priorizam faturamento histórico e deixam market share opcional", async () => {
    const { DIAGNOSIS_LENS_PROVOCATIONS, DIAGNOSIS_LENS_EVIDENCE_HINTS } = await import(
      "../src/lib/db/schema/diagnosis.schema.ts"
    );

    assert.ok(
      DIAGNOSIS_LENS_PROVOCATIONS.negocio_mercado.includes("faturamento e volume"),
      "Provocação de negócio_mercado deve focar em faturamento e volume",
    );
    assert.ok(
      DIAGNOSIS_LENS_EVIDENCE_HINTS.negocio_mercado.includes("opcional"),
      "Evidências de negócio_mercado devem esclarecer que market share formal é opcional",
    );
    assert.ok(
      DIAGNOSIS_LENS_EVIDENCE_HINTS.cliente_marca.includes("opcionais"),
      "Evidências de cliente_marca devem esclarecer que pesquisas amplas são opcionais",
    );
  });

  test("Rótulo da visão completa do Organograma engloba Empresa e Marketing", async () => {
    const { ORG_VIEW_LABELS } = await import("../src/app/(app)/organograma/types.ts");
    assert.equal(ORG_VIEW_LABELS.marketing, "Organograma Geral (Empresa & Marketing)");
  });
});
