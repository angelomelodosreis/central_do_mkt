import { getCloudflareContext } from "@opennextjs/cloudflare";
import { drizzle, type DrizzleD1Database } from "drizzle-orm/d1";

import * as schema from "./schema";

export type Database = DrizzleD1Database<typeof schema>;

/**
 * Retorna o cliente Drizzle ligado ao D1 do request atual.
 *
 * Precisa ser chamado DENTRO do ciclo de vida de um request (server component,
 * server action ou route handler) — o binding do D1 vem do contexto do
 * Cloudflare, que não existe em escopo de módulo. Por isso é uma função e não
 * uma constante exportada.
 */
export async function getDb(): Promise<Database> {
  const { env } = await getCloudflareContext({ async: true });
  return drizzle(env.DB, { schema, casing: "snake_case" });
}

/** Variante síncrona, para uso dentro de handlers já em execução. */
export function getDbSync(): Database {
  const { env } = getCloudflareContext();
  return drizzle(env.DB, { schema, casing: "snake_case" });
}

export { schema };
