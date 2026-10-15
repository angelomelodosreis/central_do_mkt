import { createClient } from "@libsql/client";
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local", quiet: true });

const url = process.env.TURSO_DATABASE_URL ?? "file:./.data/local.db";
const authToken = process.env.TURSO_AUTH_TOKEN;
const isLocalFile = url.startsWith("file:");

const client = createClient(isLocalFile ? { url } : { url, authToken });

export async function cleanRealUrls() {
  console.log("Removendo URLs falsas/inexistentes e normalizando para subdomínios reais...");

  // 1. Mapeamento de URLs antigas/fictícias para URLs reais dos projetos do Desktop
  const urlFixes = [
    { from: "https://grupomedcof.com.br/otorrino", to: "https://otorrino.grupomedcof.com.br", pageId: "lp-otorrino" },
    { from: "https://www.grupomedcof.com.br/otorrino", to: "https://otorrino.grupomedcof.com.br", pageId: "lp-otorrino" },
    { from: "https://grupomedcof.com.br/cardiologia", to: "https://cardio.grupomedcof.com.br", pageId: "lp-cardio" },
    { from: "https://grupomedcof.com.br/cirurgia", to: "https://cirurgia.grupomedcof.com.br", pageId: "lp-cirurgia" },
    { from: "https://grupomedcof.com.br/clinica-medica", to: "https://clinicof.grupomedcof.com.br", pageId: "lp-clinicof" },
    { from: "https://grupomedcof.com.br/anestesiologia", to: "https://anestesio.grupomedcof.com.br", pageId: "lp-anestesio" },
    { from: "https://grupomedcof.com.br/pediatria", to: "https://pediatria.grupomedcof.com.br", pageId: "lp-pediatria" },
    { from: "https://grupomedcof.com.br/ortopedia", to: "https://ortopedia.grupomedcof.com.br", pageId: "lp-ortopedia" },
    { from: "https://grupomedcof.com.br/oftalmologia", to: "https://oftalmo.grupomedcof.com.br", pageId: "lp-oftalmo" },
    { from: "https://grupomedcof.com.br/radiologia", to: "https://radio.grupomedcof.com.br", pageId: "lp-radio" },
    { from: "https://grupomedcof.com.br/urologia", to: "https://uro.grupomedcof.com.br", pageId: "lp-uro" },
    { from: "https://grupomedcof.com.br/medicina-intensiva", to: "https://temi.grupomedcof.com.br", pageId: "lp-temi" },
    { from: "https://grupomedcof.com.br/ginecologia", to: "https://tego.grupomedcof.com.br", pageId: "lp-tego" },
    { from: "https://grupomedcof.com.br/lifehacks", to: "https://lifehacks.grupomedcof.com.br", pageId: "lp-lifehacks" },
    { from: "https://grupomedcof.com.br/usa", to: "https://usa.grupomedcof.com.br", pageId: "lp-usa" },
    { from: "https://grupomedcof.com.br/revalida", to: "https://revaliday.grupomedcof.com.br", pageId: "lp-revaliday" },
    { from: "https://revalida.grupomedcof.com.br", to: "https://revaliday.grupomedcof.com.br", pageId: "lp-revaliday" },
    { from: "https://grupomedcof.com.br/hiit-target", to: "https://hiit.grupomedcof.com", pageId: "lp-hiit" },
    { from: "https://grupomedcof.com.br/ps", to: "https://lifehacks.grupomedcof.com.br", pageId: "lp-lifehacks" },
  ];

  for (const fix of urlFixes) {
    const res = await client.execute({
      sql: "UPDATE insight_event SET page_url = ?, page_id = ? WHERE page_url = ?",
      args: [fix.to, fix.pageId, fix.from],
    });
    if (res.rowsAffected > 0) {
      console.log(`[clean-urls] Atualizados ${res.rowsAffected} eventos de ${fix.from} -> ${fix.to}`);
    }
  }

  // 2. Apagar eventos de URLs que não existem em projetos
  const deleteUrls = [
    "https://grupomedcof.com.br/enamed",
    "https://grupomedcof.com.br/internato",
    "https://medcofendocrino.com.br/pediatrica",
  ];

  for (const d of deleteUrls) {
    const res = await client.execute({
      sql: "DELETE FROM insight_event WHERE page_url = ?",
      args: [d],
    });
    if (res.rowsAffected > 0) {
      console.log(`[clean-urls] Removidos ${res.rowsAffected} eventos inválidos de ${d}`);
    }
  }

  // 3. Atualizar páginas da tabela insight_page se houver URL errada
  for (const fix of urlFixes) {
    await client.execute({
      sql: "UPDATE insight_page SET url = ? WHERE url = ? OR id = ?",
      args: [fix.to, fix.from, fix.pageId],
    });
  }

  // 4. Remover qualquer página órfã que não seja dos projetos reais
  const realDomains = [
    "https://grupomedcof.com.br",
    "https://grupomedcof.com.br/extensivo-2025",
    "https://hiit.grupomedcof.com",
    "https://medcofderma.com.br",
    "https://medcofendocrino.com.br",
    "https://cardio.grupomedcof.com.br",
    "https://cirurgia.grupomedcof.com.br",
    "https://clinicof.grupomedcof.com.br",
    "https://anestesio.grupomedcof.com.br",
    "https://pediatria.grupomedcof.com.br",
    "https://tego.grupomedcof.com.br",
    "https://ortopedia.grupomedcof.com.br",
    "https://oftalmo.grupomedcof.com.br",
    "https://otorrino.grupomedcof.com.br",
    "https://radio.grupomedcof.com.br",
    "https://uro.grupomedcof.com.br",
    "https://temi.grupomedcof.com.br",
    "https://revaliday.grupomedcof.com.br",
    "https://concursus.grupomedcof.com.br",
    "https://usa.grupomedcof.com.br",
    "https://lifehacks.grupomedcof.com.br",
    "https://aulaavcisquemico.grupomedcof.com.br",
    "https://gastro.grupomedcof.com.br",
    "https://institucional.grupomedcof.com.br",
    "https://mentoria.grupomedcof.com.br",
    "https://eventos.grupomedcof.com.br",
    "https://handson.grupomedcof.com.br",
    "https://raioxdabanca.grupomedcof.com.br",
  ];

  const placeholders = realDomains.map(() => "?").join(",");
  const delPages = await client.execute({
    sql: `DELETE FROM insight_page WHERE url NOT IN (${placeholders})`,
    args: realDomains,
  });
  if (delPages.rowsAffected > 0) {
    console.log(`[clean-urls] Removidas ${delPages.rowsAffected} páginas inválidas do banco.`);
  }

  console.log("Limpeza de URLs concluída!");
}

if (process.argv[1]?.endsWith("clean-real-urls.mjs")) {
  cleanRealUrls().catch(console.error);
}
