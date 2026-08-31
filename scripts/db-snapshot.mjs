/**
 * Conta as linhas de cada tabela do banco apontado por TURSO_DATABASE_URL.
 *
 * Serve para comparar o ANTES e o DEPOIS de uma migration: rode, guarde a
 * saída, migre, rode de novo. Tabela que perdeu linha sem ter ganhado em outro
 * lugar é dado que sumiu — e é a única forma barata de descobrir isso antes de
 * alguém reclamar que o documento dele não está mais lá.
 *
 * Uso:  node scripts/db-snapshot.mjs
 *       TURSO_DATABASE_URL="libsql://..." TURSO_AUTH_TOKEN="..." node scripts/db-snapshot.mjs
 */
import { createClient } from "@libsql/client";
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local", quiet: true });

const url = process.env.TURSO_DATABASE_URL ?? "file:./.data/local.db";
const authToken = process.env.TURSO_AUTH_TOKEN;
const isLocalFile = url.startsWith("file:");

if (!isLocalFile && !authToken) {
  console.error("TURSO_AUTH_TOKEN é obrigatório para bancos remotos.");
  process.exit(1);
}

const client = createClient(isLocalFile ? { url } : { url, authToken });

try {
  const { rows: tabelas } = await client.execute(
    `SELECT name FROM sqlite_master
      WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name`,
  );

  const { rows: migracoes } = await client
    .execute(`SELECT COUNT(*) AS total FROM __drizzle_migrations`)
    .catch(() => ({ rows: [{ total: 0 }] }));

  console.log(`\nBanco: ${url}`);
  console.log(`Migrations aplicadas: ${migracoes[0].total}\n`);

  let vazias = 0;
  for (const { name } of tabelas) {
    const { rows } = await client.execute(
      `SELECT COUNT(*) AS total FROM "${name}"`,
    );
    const total = Number(rows[0].total);
    if (total === 0) vazias += 1;
    console.log(`${String(total).padStart(6)}  ${name}`);
  }

  console.log(`\n${tabelas.length} tabelas · ${vazias} vazias\n`);
} catch (error) {
  console.error("Falha ao ler o banco:", error.message);
  process.exit(1);
} finally {
  client.close();
}
