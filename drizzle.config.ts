import { config as loadEnv } from "dotenv";
import type { Config } from "drizzle-kit";

// O drizzle-kit roda fora do Next.js, então não herda o carregamento
// automático de .env.local — precisa ser explícito aqui.
loadEnv({ path: ".env.local", quiet: true });

const url = process.env.TURSO_DATABASE_URL ?? "file:./.data/local.db";
const authToken = process.env.TURSO_AUTH_TOKEN;
const isLocalFile = url.startsWith("file:");

/**
 * Um único arquivo de config serve para os dois ambientes.
 *
 * O SQL gerado é idêntico nos dois casos (libSQL é SQLite), o que muda é só
 * como o drizzle-kit se conecta para APLICAR as migrations: arquivo local usa
 * o dialeto `sqlite`; Turso remoto usa `turso`, que fala HTTP e exige token.
 */
export default {
  schema: "./src/lib/db/schema/index.ts",
  out: "./drizzle/migrations",
  dialect: isLocalFile ? "sqlite" : "turso",
  dbCredentials: isLocalFile ? { url } : { url, authToken },
  verbose: true,
  strict: true,
} satisfies Config;
