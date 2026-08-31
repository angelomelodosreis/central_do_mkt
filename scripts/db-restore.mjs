/**
 * Restaura um backup gerado por `db-backup.mjs`, apagando o que estiver lá.
 *
 * É o "voltar atrás" da migration. Destrutivo por definição — restaurar é
 * substituir —, então exige o nome do banco escrito à mão em `--confirmar`:
 * um comando que apaga produção não pode ser um comando que se digita por
 * reflexo, nem que se acerta por engano ao repetir o anterior no terminal.
 *
 * Uso:  node scripts/db-restore.mjs backups/producao-2026-08-28T12-00-00.sql --confirmar=central-do-marketing
 */
import { readFile } from "node:fs/promises";
import { createClient } from "@libsql/client";
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local", quiet: true });

const arquivo = process.argv[2];
const confirmacao = process.argv
  .find((argumento) => argumento.startsWith("--confirmar="))
  ?.split("=")[1];

if (!arquivo) {
  console.error(
    "Informe o arquivo de backup.\n" +
      "Uso: node scripts/db-restore.mjs <arquivo.sql> --confirmar=<nome-do-banco>",
  );
  process.exit(1);
}

const url = process.env.TURSO_DATABASE_URL ?? "file:./.data/local.db";
const authToken = process.env.TURSO_AUTH_TOKEN;
const isLocalFile = url.startsWith("file:");

if (!isLocalFile && !authToken) {
  console.error("TURSO_AUTH_TOKEN é obrigatório para bancos remotos.");
  process.exit(1);
}

// O nome do banco sai da própria URL, então a confirmação não pode ser
// adivinhada: quem digita precisa saber em que banco está mexendo.
const nomeDoBanco = isLocalFile
  ? "local"
  : (url.match(/\/\/([^.]+)/)?.[1] ?? "desconhecido");

if (confirmacao !== nomeDoBanco) {
  console.error(
    `Este comando APAGA o conteúdo de "${nomeDoBanco}" e o substitui pelo backup.\n` +
      `Para prosseguir, repita o nome do banco:\n\n` +
      `  node scripts/db-restore.mjs ${arquivo} --confirmar=${nomeDoBanco}\n`,
  );
  process.exit(1);
}

const client = createClient(isLocalFile ? { url } : { url, authToken });

try {
  const sql = await readFile(arquivo, "utf8");

  // Derruba tudo antes de recriar: o backup traz os `CREATE TABLE`, que
  // falhariam sobre tabelas existentes. As chaves estrangeiras ficam
  // desligadas durante a operação porque a ordem de remoção viola algumas
  // delas no meio do caminho.
  const { rows: objetos } = await client.execute(
    `SELECT type, name FROM sqlite_master
      WHERE name NOT LIKE 'sqlite_%'
      ORDER BY CASE type WHEN 'index' THEN 0 ELSE 1 END`,
  );

  await client.executeMultiple("PRAGMA foreign_keys=OFF;");
  for (const objeto of objetos) {
    if (objeto.type === "table") {
      await client.execute(`DROP TABLE IF EXISTS "${objeto.name}"`);
    }
  }

  await client.executeMultiple(sql);

  const { rows } = await client.execute(
    `SELECT COUNT(*) AS total FROM sqlite_master WHERE type = 'table'`,
  );

  console.log(
    `\nBanco "${nomeDoBanco}" restaurado de ${arquivo}\n` +
      `  ${rows[0].total} tabelas\n` +
      `  Confira com: npm run db:snapshot\n`,
  );
} catch (error) {
  console.error("Falha ao restaurar:", error.message);
  process.exit(1);
} finally {
  client.close();
}
