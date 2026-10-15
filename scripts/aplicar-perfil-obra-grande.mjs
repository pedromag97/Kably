/* Carrega na base de artigos os tempos de «obra grande por fases»
 * (articles.laborHoursLarge) a partir de scripts/perfil-obra-grande.json.
 *
 * Corre:  node scripts/aplicar-perfil-obra-grande.mjs [--ensaio] [--empresa 1] [--forcar] [--turso]
 *   --ensaio   mostra o que faria, sem gravar
 *   --empresa  id da empresa de destino (por defeito 1)
 *   --forcar   substitui também os artigos que já têm tempo de obra grande
 *   --turso    escreve na base Turso (DATABASE_URL/DATABASE_AUTH_TOKEN do .env.local)
 *
 * Os tempos vêm do comparador de obras reais (Comparacao_Obras.xlsx): mediana do
 * preço só-MO de cada tarefa ÷ 26,78 €/h. A associação é pelo NOME do artigo, por
 * isso serve para a base genérica (seed) — artigos renomeados ficam de fora e
 * aparecem na lista «não encontrados». Pode correr-se mais de uma vez. */
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const args = process.argv.slice(2);
const dryRun = args.includes("--ensaio");
const force = args.includes("--forcar");
const useTurso = args.includes("--turso");
const companyId = Number(args[args.indexOf("--empresa") + 1]) || 1;

async function connect() {
  if (!useTurso) {
    const local = new DatabaseSync(path.join(root, "data", "kably.db"));
    return {
      all: async (sql, a = []) => local.prepare(sql).all(...a),
      run: async (sql, a = []) => local.prepare(sql).run(...a),
      batch: async (stmts) => {
        local.exec("BEGIN");
        try {
          for (const s of stmts) local.prepare(s.sql).run(...s.args);
          local.exec("COMMIT");
        } catch (e) {
          local.exec("ROLLBACK");
          throw e;
        }
      },
      label: "base local data/kably.db",
    };
  }
  const envPath = path.join(root, ".env.local");
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  }
  const { DATABASE_URL: url, DATABASE_AUTH_TOKEN: authToken } = process.env;
  if (!url?.startsWith("libsql") || !authToken) {
    console.error("--turso precisa de DATABASE_URL (libsql://…) e DATABASE_AUTH_TOKEN no .env.local");
    process.exit(1);
  }
  const { createClient } = await import("@libsql/client/web");
  const turso = createClient({ url, authToken });
  return {
    all: async (sql, a = []) => (await turso.execute({ sql, args: a })).rows,
    run: async (sql, a = []) => turso.execute({ sql, args: a }),
    batch: async (stmts) => turso.batch(stmts, "write"),
    label: `Turso ${new URL(url.replace("libsql:", "https:")).host}`,
  };
}

const profile = JSON.parse(
  fs.readFileSync(path.join(root, "scripts", "perfil-obra-grande.json"), "utf8")
);
const conn = await connect();

// A coluna é criada pela app no arranque (migrate); se o script correr antes, cria-a aqui.
const cols = await conn.all("PRAGMA table_info(articles)");
if (!cols.some((c) => c.name === "laborHoursLarge")) {
  if (dryRun) console.log("(ensaio) faltaria criar a coluna articles.laborHoursLarge");
  else await conn.run("ALTER TABLE articles ADD COLUMN laborHoursLarge REAL NOT NULL DEFAULT 0");
}

const rows = await conn.all(
  "SELECT id, name, laborHours, laborHoursLarge FROM articles WHERE companyId = ?",
  [companyId]
);
const byName = new Map(rows.map((r) => [String(r.name).trim().toLowerCase(), r]));

const stmts = [];
const missing = [];
let kept = 0;
for (const a of profile.artigos) {
  const row = byName.get(a.name.trim().toLowerCase());
  if (!row) {
    missing.push(a.name);
    continue;
  }
  const current = Number(row.laborHoursLarge ?? 0);
  if (current > 0 && !force) {
    kept++;
    continue;
  }
  stmts.push({
    sql: "UPDATE articles SET laborHoursLarge = ? WHERE id = ? AND companyId = ?",
    args: [a.laborHoursLarge, row.id, companyId],
  });
  console.log(
    `  ${a.name.padEnd(42).slice(0, 42)} ${String(row.laborHours).padStart(6)} h → ${String(a.laborHoursLarge).padStart(6)} h` +
      `  (${a.unPerHour} un/h)`
  );
}

console.log(`\nDestino: ${conn.label} · empresa ${companyId}`);
console.log(`A gravar: ${stmts.length} · já tinham tempo (mantidos): ${kept} · não encontrados: ${missing.length}`);
for (const n of missing) console.log("   ? " + n);
if (dryRun) {
  console.log("\nEnsaio — nada foi gravado.");
} else if (stmts.length) {
  await conn.batch(stmts);
  console.log(`\n✓ ${stmts.length} artigos atualizados.`);
}
