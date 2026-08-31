/**
 * Gera um backup completo do banco em SQL, dentro de `backups/`.
 *
 * Não depende da CLI do Turso: usa o mesmo cliente libSQL que a aplicação usa,
 * então funciona no arquivo local e no banco remoto sem instalar nada.
 *
 * O arquivo resultante recria o banco do zero. É o que permite voltar atrás
 * depois de uma migration — que aqui é de mão única, porque não escrevemos
 * migrations de reversão. Sem este arquivo, "desfazer" não existe.
 *
 * Uso:  node scripts/db-backup.mjs
 *       TURSO_DATABASE_URL="libsql://..." TURSO_AUTH_TOKEN="..." node scripts/db-backup.mjs
 */
import { mkdir, writeFile } from "node:fs/promises";
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

/**
 * Converte um valor lido do banco em literal SQL.
 *
 * `Uint8Array` aparece nas colunas BLOB e precisa virar `X'...'`: escrito como
 * texto, o conteúdo binário corromperia na volta.
 */
function literal(value) {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number") return String(value);
  if (typeof value === "bigint") return String(value);
  if (value instanceof Uint8Array) {
    return `X'${Buffer.from(value).toString("hex")}'`;
  }
  return `'${String(value).replace(/'/g, "''")}'`;
}

const client = createClient(isLocalFile ? { url } : { url, authToken });

try {
  // O `sqlite_master` guarda o SQL de criação de cada objeto — é a forma de
  // reproduzir o schema exatamente como está, sem depender das migrations.
  const { rows: objetos } = await client.execute(
    `SELECT type, name, sql FROM sqlite_master
      WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%'
      ORDER BY CASE type WHEN 'table' THEN 0 ELSE 1 END, name`,
  );

  const tabelas = objetos.filter((objeto) => objeto.type === "table");

  const partes = [
    `-- Backup de ${url}`,
    `-- Gerado em ${new Date().toISOString()}`,
    "--",
    "-- Para restaurar:  node scripts/db-restore.mjs <este-arquivo>",
    "",
    "PRAGMA foreign_keys=OFF;",
    "BEGIN TRANSACTION;",
    "",
  ];

  let totalLinhas = 0;

  // Estrutura primeiro, e as tabelas antes dos índices: um índice criado antes
  // da tabela dele falharia na restauração.
  for (const objeto of objetos) {
    partes.push(`${objeto.sql};`);
  }
  partes.push("");

  for (const tabela of tabelas) {
    const { rows, columns } = await client.execute(
      `SELECT * FROM "${tabela.name}"`,
    );
    if (rows.length === 0) continue;

    partes.push(`-- ${tabela.name} (${rows.length})`);
    const colunas = columns.map((coluna) => `"${coluna}"`).join(", ");
    for (const linha of rows) {
      const valores = columns
        .map((coluna) => literal(linha[coluna]))
        .join(", ");
      partes.push(
        `INSERT INTO "${tabela.name}" (${colunas}) VALUES (${valores});`,
      );
    }
    partes.push("");
    totalLinhas += rows.length;
  }

  partes.push("COMMIT;", "PRAGMA foreign_keys=ON;", "");

  await mkdir("backups", { recursive: true });
  const marca = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const alvo = `backups/${isLocalFile ? "local" : "producao"}-${marca}.sql`;
  await writeFile(alvo, partes.join("\n"), "utf8");

  console.log(
    `\nBackup gravado em ${alvo}\n` +
      `  ${tabelas.length} tabelas · ${totalLinhas} linhas\n`,
  );
} catch (error) {
  console.error("Falha ao gerar o backup:", error.message);
  process.exit(1);
} finally {
  client.close();
}
