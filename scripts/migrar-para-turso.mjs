/* Migração única: copia a base de dados local (data/kably.db) para a Turso.
 * Lê DATABASE_URL + DATABASE_AUTH_TOKEN do .env.local (ou do ambiente).
 * Corre: node scripts/migrar-para-turso.mjs
 *
 * Recria o schema EXACTO a partir do SQLite local (sqlite_master) e copia
 * todas as linhas, preservando os IDs e a ordem de dependência (FK).
 * Aborta se a Turso já tiver dados (evita duplicar). */
import { DatabaseSync } from "node:sqlite";
import { createClient } from "@libsql/client/web";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

// .env.local → process.env (apenas para esta execução)
const envPath = path.join(root, ".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

const url = process.env.DATABASE_URL;
const authToken = process.env.DATABASE_AUTH_TOKEN;
if (!url || !url.startsWith("libsql") && !url.startsWith("http")) {
  console.error("Falta DATABASE_URL (libsql://…) no .env.local");
  process.exit(1);
}
if (!authToken) {
  console.error("Falta DATABASE_AUTH_TOKEN no .env.local");
  process.exit(1);
}

const local = new DatabaseSync(path.join(root, "data", "kably.db"));
const turso = createClient({ url, authToken });

// Ordem de dependência (pais antes de filhos)
const TABLES = [
  "companies",
  "articles",
  "workers",
  "expenses",
  "budgets",
  "budget_chapters",
  "budget_items",
  "mqt_aliases",
];

async function main() {
  // 0) Turso já tem dados? abortar.
  try {
    const r = await turso.execute("SELECT COUNT(*) AS n FROM companies");
    if (Number(r.rows[0].n) > 0) {
      console.error(
        "A Turso já tem dados (companies > 0). Migração abortada para não duplicar."
      );
      process.exit(1);
    }
  } catch {
    // tabela ainda não existe — normal numa BD nova
  }

  // 1) Recriar schema idêntico ao local
  const ddl = local
    .prepare(
      "SELECT sql FROM sqlite_master WHERE type IN ('table','index') AND name NOT LIKE 'sqlite_%' AND sql IS NOT NULL"
    )
    .all();
  for (const { sql } of ddl) {
    await turso.execute(sql.replace(/^CREATE TABLE/i, "CREATE TABLE IF NOT EXISTS")
      .replace(/^CREATE INDEX/i, "CREATE INDEX IF NOT EXISTS")
      .replace(/^CREATE UNIQUE INDEX/i, "CREATE UNIQUE INDEX IF NOT EXISTS"));
  }
  console.log(`Schema recriado (${ddl.length} objetos).`);

  // 2) Copiar dados, tabela a tabela
  for (const table of TABLES) {
    const rows = local.prepare(`SELECT * FROM ${table}`).all();
    if (rows.length === 0) {
      console.log(`  ${table}: 0 linhas`);
      continue;
    }
    const cols = Object.keys(rows[0]);
    const placeholders = cols.map(() => "?").join(",");
    const sql = `INSERT INTO ${table} (${cols.join(",")}) VALUES (${placeholders})`;
    const stmts = rows.map((r) => ({ sql, args: cols.map((c) => r[c]) }));
    // batches de 100 para não exceder limites de pedido
    for (let i = 0; i < stmts.length; i += 100) {
      await turso.batch(stmts.slice(i, i + 100), "write");
    }
    console.log(`  ${table}: ${rows.length} linhas`);
  }

  // 3) Verificação de contagens
  console.log("\nVerificação:");
  let ok = true;
  for (const table of TABLES) {
    const localN = local.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n;
    const remoteN = Number((await turso.execute(`SELECT COUNT(*) AS n FROM ${table}`)).rows[0].n);
    const mark = localN === remoteN ? "✓" : "✗";
    if (localN !== remoteN) ok = false;
    console.log(`  ${mark} ${table}: local ${localN} | turso ${remoteN}`);
  }
  console.log(ok ? "\nMigração concluída com sucesso." : "\nATENÇÃO: contagens diferentes — rever.");
}

main().catch((e) => {
  console.error("Erro na migração:", e);
  process.exit(1);
});
