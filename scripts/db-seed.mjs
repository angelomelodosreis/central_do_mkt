/**
 * Aplica `drizzle/seed.sql` no banco apontado por TURSO_DATABASE_URL.
 *
 * Substitui o antigo `wrangler d1 execute`. O seed usa INSERT OR IGNORE em
 * todas as linhas, então rodar mais de uma vez não duplica nem sobrescreve
 * nada — é seguro chamar depois de cada migration.
 *
 * Uso:  node scripts/db-seed.mjs
 */
import { readFile } from "node:fs/promises";
import { createClient } from "@libsql/client";
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local", quiet: true });

const url = process.env.TURSO_DATABASE_URL ?? "file:./.data/local.db";
const authToken = process.env.TURSO_AUTH_TOKEN;
const isLocalFile = url.startsWith("file:");

if (!isLocalFile && !authToken) {
  console.error(
    "TURSO_AUTH_TOKEN é obrigatório para bancos remotos.\n" +
      "Gere um com `turso db tokens create <nome-do-banco>` e defina em .env.local.",
  );
  process.exit(1);
}

const client = createClient(
  isLocalFile ? { url } : { url, authToken },
);

try {
  const sql = await readFile(new URL("../drizzle/seed.sql", import.meta.url), "utf8");
  await client.executeMultiple(sql);
  console.log(`Seed aplicado em ${url}`);
} catch (error) {
  console.error("Falha ao aplicar o seed:", error.message);
  process.exit(1);
} finally {
  client.close();
}
