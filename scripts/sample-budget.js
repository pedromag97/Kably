/* Cria um orçamento de exemplo diretamente na BD, para testes. */
const { DatabaseSync } = require("node:sqlite");
const path = require("node:path");

const db = new DatabaseSync(path.join(__dirname, "..", "data", "kably.db"));
db.exec("PRAGMA foreign_keys = ON");

const company = db.prepare("SELECT * FROM companies LIMIT 1").get();
if (!company) {
  console.error("Empresa não encontrada — abre primeiro a app para o seed correr.");
  process.exit(1);
}

const r = db
  .prepare(
    `INSERT INTO budgets (companyId, number, title, clientName, clientNif, clientPhone, siteAddress, vatMode, materialMargin, laborMargin, laborRate, validityDays)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`
  )
  .run(
    company.id,
    "ORC-2026-001",
    "Remodelação elétrica — Apartamento T2",
    "João Silva",
    "123456789",
    "912 345 678",
    "Rua das Flores 23, 2.º Esq., Lisboa",
    "NORMAL",
    company.materialMargin,
    company.laborMargin,
    company.laborRate,
    30
  );
const budgetId = Number(r.lastInsertRowid);

const chapters = [
  ["Quadros e Proteções", [
    ["Quadro elétrico de encastrar 24 módulos", "un", 1],
    ["Disjuntor 1P+N 16A curva C", "un", 8],
    ["Interruptor diferencial 2P 40A 30mA", "un", 2],
  ]],
  ["Tubagem e Cablagem", [
    ["Tubo VD 20 mm embebido", "m", 120],
    ["Cabo XV 3G1,5 mm²", "m", 80],
    ["Cabo XV 3G2,5 mm²", "m", 90],
  ]],
  ["Aparelhagem e Iluminação", [
    ["Tomada schuko simples", "un", 18],
    ["Interruptor simples", "un", 6],
    ["Comutador de escada", "un", 4],
    ["Downlight LED 18W de encastrar", "un", 10],
  ]],
];

const insCh = db.prepare("INSERT INTO budget_chapters (budgetId, name, position) VALUES (?,?,?)");
const insItem = db.prepare(
  "INSERT INTO budget_items (chapterId, articleId, name, unit, quantity, materialCost, laborHours, position) VALUES (?,?,?,?,?,?,?,?)"
);
const findArticle = db.prepare("SELECT * FROM articles WHERE name=? LIMIT 1");

chapters.forEach(([name, items], ci) => {
  const ch = insCh.run(budgetId, name, ci);
  const chapterId = Number(ch.lastInsertRowid);
  items.forEach(([artName, unit, qty], ii) => {
    const art = findArticle.get(artName);
    if (!art) throw new Error(`Artigo não encontrado: ${artName}`);
    insItem.run(chapterId, art.id, art.name, art.unit || unit, qty, art.materialCost, art.laborHours, ii);
  });
});

console.log(`Orçamento de exemplo criado: id=${budgetId}`);
