import { createClient, type Client } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";

import { databaseAuthToken, databaseUrl } from "@/lib/env";
import * as schema from "./schema";

export type Database = LibSQLDatabase<typeof schema>;

/**
 * Conexão libSQL reaproveitada entre requests.
 *
 * Numa função serverless da Vercel o módulo permanece carregado entre
 * invocações do mesmo container, então criar o cliente uma única vez evita
 * reabrir a conexão a cada request. O cliente é seguro para uso concorrente.
 */
let cachedClient: Client | null = null;
let cachedDb: Database | null = null;

function getClient(): Client {
  if (cachedClient) return cachedClient;

  const url = databaseUrl();
  const authToken = databaseAuthToken();
  const isLocalFile = url.startsWith("file:");

  // Banco remoto sem token não falha na conexão — falha na primeira query, com
  // erro de autorização difícil de ligar à causa. Melhor barrar aqui.
  if (!isLocalFile && !authToken) {
    throw new Error(
      "TURSO_AUTH_TOKEN é obrigatório para bancos remotos. " +
        "Gere um com `turso db tokens create <nome-do-banco>` e defina em " +
        ".env.local (local) ou nas Environment Variables da Vercel (produção).",
    );
  }

  cachedClient = createClient(
    isLocalFile ? { url } : { url, authToken: authToken! },
  );
  return cachedClient;
}

function build(): Database {
  if (cachedDb) return cachedDb;
  cachedDb = drizzle(getClient(), { schema, casing: "snake_case" });
  return cachedDb;
}

/**
 * Retorna o cliente Drizzle ligado ao banco.
 *
 * Continua sendo uma função assíncrona (e não uma constante exportada) porque é
 * assim que os 29 arquivos que consomem o banco já a chamam. A conexão em si é
 * criada de forma preguiçosa na primeira chamada e reaproveitada depois.
 */
export async function getDb(): Promise<Database> {
  return build();
}

/** Variante síncrona, para uso dentro de handlers já em execução. */
export function getDbSync(): Database {
  return build();
}

export { schema };
