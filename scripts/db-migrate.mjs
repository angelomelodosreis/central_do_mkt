/**
 * Aplica as migrations de `drizzle/migrations` no banco apontado por
 * TURSO_DATABASE_URL.
 *
 * Usa o migrator do drizzle-orm em vez de `drizzle-kit migrate`: o comando do
 * kit encerra com código 0 sem aplicar nada quando o dialeto é sqlite em
 * arquivo, o que dá a falsa impressão de sucesso. O migrator abaixo lê o mesmo
 * `meta/_journal.json`, registra o que aplicou em `__drizzle_migrations` e vale
 * tanto para o arquivo local quanto para o Turso remoto.
 *
 * Uso:  node scripts/db-migrate.mjs
 */
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { config as loadEnv } from "dotenv";
import { seedPlanningAllBus } from "./seed-planning-all-bus.mjs";
import { seedPlanningReviewFeed } from "./seed-planning-review-feed.mjs";

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

const client = createClient(isLocalFile ? { url } : { url, authToken });

try {
  await migrate(drizzle(client), { migrationsFolder: "./drizzle/migrations" });
  console.log(`Migrations aplicadas em ${url}`);
  try {
    await seedPlanningAllBus(client);
    await seedPlanningReviewFeed(client);
  } catch (seedErr) {
    console.warn("Aviso: falha ao semear dados:", seedErr.message);
  }

} catch (error) {
  console.error("Falha ao aplicar as migrations:", error.message);
  process.exit(1);
} finally {
  client.close();
}
