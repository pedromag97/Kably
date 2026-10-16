/* Importa para a base de artigos os artigos extraídos dos orçamentos reais
 * (data/artigos-reais.json — fica fora do git: são preços de obras de clientes).
 *
 * Corre:  node scripts/importar-artigos-reais.mjs [--ensaio] [--empresa 1] [--turso]
 *   --ensaio   mostra o que faria, sem gravar
 *   --empresa  id da empresa de destino (por defeito 1)
 *   --turso    escreve na base Turso (DATABASE_URL/DATABASE_AUTH_TOKEN do .env.local)
 *              em vez do ficheiro local data/kably.db
 *
 * Os orçamentos reais só dão o PREÇO DE VENDA. Para cada artigo encontrar esse
 * preço no Kably, o custo é deduzido com a taxa horária e as margens ATUAIS da
 * empresa:
 *   - preço só de MO      → material 0;  horas = preço ÷ (taxa × (1 + margem MO))
 *   - preço material + MO → custo repartido 50/50 entre material e MO (estimativa)
 * O preço real e a obra ficam nas Notas. Artigos já existentes (mesmo nome) são
 * ignorados, por isso pode correr-se mais de uma vez. */
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const args = process.argv.slice(2);
const dryRun = args.includes("--ensaio");
const useTurso = args.includes("--turso");
const companyId = Number(args[args.indexOf("--empresa") + 1]) || 1;

// Categorias da base do Kably (decidem o capítulo ao importar MQT).
const CATEGORY = {
  Quadros: "Quadros e Proteções",
  "UPS / Energia socorrida": "Quadros e Proteções",
  "Média tensão / alimentação": "Quadros e Proteções",
  "Cabos e condutores": "Cabos e Condutores",
  Tubagem: "Tubagem e Caminhos de Cabos",
  "Caminhos de cabos": "Tubagem e Caminhos de Cabos",
  Caixas: "Tubagem e Caminhos de Cabos",
  Aparelhagem: "Aparelhagem",
  Iluminação: "Iluminação",
  "Iluminação de segurança": "Iluminação",
  "ITED / Telecomunicações": "ITED / Telecomunicações",
  "Terras e para-raios": "Terras e Proteção",
  "Mobilidade elétrica": "Mobilidade Elétrica",
  "Deteção de incêndio": "Segurança e SCIE",
  Intrusão: "Segurança e SCIE",
  CCTV: "Segurança e SCIE",
  "Controlo de acessos": "Segurança e SCIE",
  "Chamada de emergência": "Segurança e SCIE",
  "Sinalética de segurança": "Segurança e SCIE",
  "Extinção (SCIE)": "Segurança e SCIE",
  "Construção civil / selagens": "Mão de Obra e Diversos",
  "Ensaios / certificação / diversos": "Mão de Obra e Diversos",
  Diversos: "Mão de Obra e Diversos",
};
const SOURCE = {
  IEFP: ["IEFP", "IEFP Castelo de Paiva"],
  Continente: ["CNT", "Continente Cacia"],
  Pampilhosa: ["PAMP", "Estação Pampilhosa (EP/CTC)"],
  SSajuda: ["SSAJ", "SmartStudio Ajuda"],
  Nexovolt: ["NEXO", "Habitação coletiva (Nexovolt)"],
  Porto: ["PRT", "Moradia Porto"],
  Valongo: ["VLG", "Moradia Valongo"],
};

// ── ligação: ficheiro local (por defeito) ou Turso ────────────────────
async function connect() {
  if (!useTurso) {
    const local = new DatabaseSync(path.join(root, "data", "kably.db"));
    return {
      all: async (sql, a = []) => local.prepare(sql).all(...a),
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
    batch: async (stmts) => turso.batch(stmts, "write"),
    label: `Turso ${new URL(url.replace("libsql:", "https:")).host}`,
  };
}

const fmt = (n) => n.toFixed(2).replace(".", ",");

const items = JSON.parse(fs.readFileSync(path.join(root, "data", "artigos-reais.json"), "utf8"));
const conn = await connect();

const [company] = await conn.all(
  "SELECT id, name, laborRate, materialMargin, laborMargin FROM companies WHERE id = ?",
  [companyId]
);
if (!company) {
  console.error(`Não existe a empresa ${companyId} em ${conn.label}.`);
  process.exit(1);
}
const rate = Number(company.laborRate);
const mm = Number(company.materialMargin) / 100;
const mmo = Number(company.laborMargin) / 100;
if (!(rate > 0)) {
  console.error("A taxa horária da empresa é 0 — define-a nas Definições antes de importar.");
  process.exit(1);
}

const existing = new Set(
  (await conn.all("SELECT name FROM articles WHERE companyId = ?", [companyId])).map((r) =>
    String(r.name).trim().toLowerCase()
  )
);

const stmts = [];
const perCategory = {};
let skipped = 0;
for (const a of items) {
  const name = a.display.trim();
  if (existing.has(name.toLowerCase())) {
    skipped++;
    continue;
  }
  existing.add(name.toLowerCase());
  const src = a.tag.split("·")[1];
  const [code, obra] = SOURCE[src] ?? ["REAL", src];
  const category = CATEGORY[a.category] ?? "Mão de Obra e Diversos";
  let materialCost, laborHours, how;
  if (a.tipo === "MO") {
    materialCost = 0;
    laborHours = a.price / (rate * (1 + mmo));
    how = "só mão de obra";
  } else {
    const cost = a.price / (1 + mm + (1 + mmo)); // metade material, metade MO
    materialCost = cost;
    laborHours = cost / rate;
    how = "material + MO, repartido 50/50 (estimativa)";
  }
  const notes =
    `Preço real ${fmt(a.price)} €/${a.unit} (${how}) — ${obra}. ` +
    `Custo deduzido com ${fmt(rate)} €/h e margens ${Math.round(mm * 100)}%/${Math.round(mmo * 100)}%.` +
    (a.extra ? ` ${a.extra}` : "");
  stmts.push({
    sql: "INSERT INTO articles (companyId, code, name, category, unit, materialCost, laborHours, notes) VALUES (?,?,?,?,?,?,?,?)",
    // horas: 3 casas, sempre para cima (mais horas = mais €, nunca menos)
    args: [companyId, code, name, category, a.unit,
           Math.round(materialCost * 10000) / 10000, Math.ceil(laborHours * 1000 - 1e-9) / 1000, notes],
  });
  perCategory[category] = (perCategory[category] ?? 0) + 1;
}

console.log(`Destino: ${conn.label} · empresa ${company.id} «${company.name}»`);
console.log(`Taxa ${fmt(rate)} €/h · margem material ${Math.round(mm * 100)}% · margem MO ${Math.round(mmo * 100)}%`);
console.log(`A importar: ${stmts.length} · já existiam (ignorados): ${skipped}`);
for (const [k, v] of Object.entries(perCategory).sort()) console.log(`  ${String(v).padStart(4)}  ${k}`);

if (dryRun) {
  console.log("\nEnsaio — nada foi gravado.");
} else if (stmts.length) {
  await conn.batch(stmts);
  console.log(`\n✓ ${stmts.length} artigos gravados.`);
}
