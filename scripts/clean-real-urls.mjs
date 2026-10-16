import { createClient } from "@libsql/client";
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local", quiet: true });

const defaultUrl = process.env.TURSO_DATABASE_URL ?? "file:./.data/local.db";
const defaultToken = process.env.TURSO_AUTH_TOKEN;
const isLocal = defaultUrl.startsWith("file:");

export async function cleanRealUrls(dbClient = null) {
  const client = dbClient || createClient(isLocal ? { url: defaultUrl } : { url: defaultUrl, authToken: defaultToken });
  console.log("[clean-urls] Iniciando limpeza rigorosa de dados sintéticos/mock e URLs falsas...");

  const validPages = [
    { id: "lp-grupomedcof", url: "https://grupomedcof.com.br" },
    { id: "lp-extensivo-2025", url: "https://grupomedcof.com.br/extensivo-2025" },
    { id: "lp-hiit", url: "https://hiit.grupomedcof.com" },
    { id: "lp-medcofderma", url: "https://medcofderma.com.br" },
    { id: "lp-medcofendocrino", url: "https://medcofendocrino.com.br" },
    { id: "lp-cardio", url: "https://cardio.grupomedcof.com.br" },
    { id: "lp-cirurgia", url: "https://cirurgia.grupomedcof.com.br" },
    { id: "lp-clinicof", url: "https://clinicof.grupomedcof.com.br" },
    { id: "lp-anestesio", url: "https://anestesio.grupomedcof.com.br" },
    { id: "lp-pediatria", url: "https://pediatria.grupomedcof.com.br" },
    { id: "lp-tego", url: "https://tego.grupomedcof.com.br" },
    { id: "lp-ortopedia", url: "https://ortopedia.grupomedcof.com.br" },
    { id: "lp-oftalmo", url: "https://oftalmo.grupomedcof.com.br" },
    { id: "lp-otorrino", url: "https://otorrino.grupomedcof.com.br" },
    { id: "lp-radio", url: "https://radio.grupomedcof.com.br" },
    { id: "lp-uro", url: "https://uro.grupomedcof.com.br" },
    { id: "lp-temi", url: "https://temi.grupomedcof.com.br" },
    { id: "lp-revaliday", url: "https://revaliday.grupomedcof.com.br" },
    { id: "lp-concursus", url: "https://concursus.grupomedcof.com.br" },
    { id: "lp-usa", url: "https://usa.grupomedcof.com.br" },
    { id: "lp-lifehacks", url: "https://lifehacks.grupomedcof.com.br" },
    { id: "lp-aulaavcisquemico", url: "https://aulaavcisquemico.grupomedcof.com.br" },
    { id: "lp-gastro", url: "https://gastro.grupomedcof.com.br" },
    { id: "lp-institucional", url: "https://institucional.grupomedcof.com.br" },
    { id: "lp-mentoria", url: "https://mentoria.grupomedcof.com.br" },
    { id: "lp-eventos", url: "https://eventos.grupomedcof.com.br" },
    { id: "lp-handson", url: "https://handson.grupomedcof.com.br" },
    { id: "lp-raioxdabanca", url: "https://raioxdabanca.grupomedcof.com.br" },
  ];

  const validIds = validPages.map((p) => p.id);
  const validUrls = validPages.map((p) => p.url);

  // 1. Apagar TODOS os eventos sintéticos / gerados por script mock (com id 'ev_%' ou session_id 'session_%' ou campanha 'campanha-conversao-2026')
  try {
    const delMock = await client.execute({
      sql: `DELETE FROM insight_event WHERE id LIKE 'ev_%' OR session_id LIKE 'session_%' OR utm_campaign = 'campanha-conversao-2026'`,
      args: [],
    });
    if (delMock.rowsAffected > 0) {
      console.log(`[clean-urls] Purgados ${delMock.rowsAffected} eventos sintéticos/mock de telemetria.`);
    }
  } catch (err) {
    console.warn("[clean-urls] Erro ao purgar eventos sintéticos:", err.message);
  }

  // 2. Apagar eventos de páginas que não estão na lista de URLs reais
  try {
    const placeholdersUrls = validUrls.map(() => "?").join(",");
    const delOrphanEvents = await client.execute({
      sql: `DELETE FROM insight_event WHERE page_url NOT IN (${placeholdersUrls})`,
      args: validUrls,
    });
    if (delOrphanEvents.rowsAffected > 0) {
      console.log(`[clean-urls] Purgados ${delOrphanEvents.rowsAffected} eventos com URLs inválidas/inexistentes.`);
    }
  } catch (err) {
    console.warn("[clean-urls] Erro ao limpar eventos órfãos:", err.message);
  }

  // 3. Apagar páginas fictícias que não existem nos projetos reais (como lp-enamed, lp-internato, lp-endocrino-pediatrica, lp-pronto-socorro, etc.)
  try {
    const placeholdersIds = validIds.map(() => "?").join(",");
    const delFakePages = await client.execute({
      sql: `DELETE FROM insight_page WHERE id NOT IN (${placeholdersIds})`,
      args: validIds,
    });
    if (delFakePages.rowsAffected > 0) {
      console.log(`[clean-urls] Removidas ${delFakePages.rowsAffected} páginas inexistentes de insight_page.`);
    }
  } catch (err) {
    console.warn("[clean-urls] Erro ao remover páginas fictícias:", err.message);
  }

  // 4. Garantir que todas as páginas válidas tenham a URL correta de subdomínio
  for (const page of validPages) {
    try {
      await client.execute({
        sql: `UPDATE insight_page SET url = ? WHERE id = ?`,
        args: [page.url, page.id],
      });
    } catch {
      // Ignorar se a página ainda não foi inserida
    }
  }

  console.log("[clean-urls] Limpeza de dados sintéticos e normalização concluídas com sucesso!");
}

if (process.argv[1]?.endsWith("clean-real-urls.mjs")) {
  cleanRealUrls().catch(console.error);
}
