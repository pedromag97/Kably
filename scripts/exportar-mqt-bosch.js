/* Devolve o MQT original da BOSCH preenchido com os preços do orçamento
   Kably (id 3). Escreve "mqt - BOSCH - preenchido.xlsx" no Desktop, com a
   formatação original preservada (exceljs). Pode correr-se as vezes que for
   preciso — reflete sempre os preços atuais do orçamento.

   Correspondência linha ↔ item: pelos aliases memorizados na importação
   (texto do MQT → artigo) e, para linhas avulsas, pelo próprio texto. */
const ExcelJS = require("exceljs");
const { DatabaseSync } = require("node:sqlite");
const path = require("node:path");

const BUDGET_ID = 3;
const SRC = "C:/Users/pedro/OneDrive/Desktop/mqt - BOSCH.xlsx";
const OUT = "C:/Users/pedro/OneDrive/Desktop/mqt - BOSCH - preenchido.xlsx";
// Colunas no ficheiro original (1-based no exceljs)
const COL_ART = 2; // nº de artigo (4.1.1.1)
const COL_DESC = 3; // designação
const COL_QTY = 5; // quantidade
const COL_PU = 6; // preço unitário (a escrever)
const COL_TOTAL = 7; // total (a escrever)

function norm(s) {
  return String(s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/mm²|mm2/g, "mm2")
    .replace(/m²|m2/g, "m2")
    .replace(/(\d),(\d)/g, "$1.$2")
    .replace(/[^a-z0-9.]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

const db = new DatabaseSync(path.join(__dirname, "..", "data", "kably.db"));
const budget = db.prepare("SELECT * FROM budgets WHERE id=?").get(BUDGET_ID);
if (!budget) throw new Error("Orçamento não encontrado");

const items = db
  .prepare(
    `SELECT bi.* FROM budget_items bi
     JOIN budget_chapters bc ON bc.id = bi.chapterId
     WHERE bc.budgetId=? ORDER BY bi.id`
  )
  .all(BUDGET_ID);

const aliasByText = new Map(
  db.prepare("SELECT normText, articleId FROM mqt_aliases").all().map((a) => [a.normText, a.articleId])
);

function unitPrice(item) {
  const billsMaterial = !budget.laborOnly || item.materialIncluded === 1;
  return (
    (billsMaterial ? item.materialCost * (1 + budget.materialMargin / 100) : 0) +
    item.laborHours * budget.laborRate * (1 + budget.laborMargin / 100)
  );
}

// multiset de itens por chave de correspondência
const byArticle = new Map(); // articleId -> [items]
const byName = new Map(); // norm(name) -> [items]
for (const it of items) {
  if (it.articleId !== null) {
    if (!byArticle.has(it.articleId)) byArticle.set(it.articleId, []);
    byArticle.get(it.articleId).push(it);
  }
  const n = norm(it.name);
  if (!byName.has(n)) byName.set(n, []);
  byName.get(n).push(it);
}

function takeItem(text, qty) {
  const n = norm(text);
  // 1) via alias → artigo
  const articleId = aliasByText.get(n);
  if (articleId !== undefined && byArticle.has(articleId)) {
    const list = byArticle.get(articleId);
    let idx = list.findIndex((it) => Math.abs(it.quantity - qty) < 1e-9);
    if (idx === -1 && list.length > 0) idx = 0;
    if (idx !== -1) {
      const it = list.splice(idx, 1)[0];
      const ln = norm(it.name);
      const nl = byName.get(ln);
      if (nl) byName.set(ln, nl.filter((x) => x.id !== it.id));
      return it;
    }
  }
  // 2) linha avulsa: nome = texto do MQT (truncado a 200 ao importar)
  for (const [key, list] of byName) {
    if (list.length === 0) continue;
    if (key === n || (key.length >= 30 && n.startsWith(key.slice(0, 60)))) {
      let idx = list.findIndex((it) => Math.abs(it.quantity - qty) < 1e-9);
      if (idx === -1) idx = 0;
      const it = list.splice(idx, 1)[0];
      if (it.articleId !== null && byArticle.has(it.articleId)) {
        byArticle.set(it.articleId, byArticle.get(it.articleId).filter((x) => x.id !== it.id));
      }
      return it;
    }
  }
  return null;
}

(async () => {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(SRC);
  const ws = wb.getWorksheet("Folha1");

  // tarefas-folha na numeração (para linhas sem quantidade)
  const arts = [];
  ws.eachRow((row) => {
    const a = String(row.getCell(COL_ART).text ?? "").trim();
    if (/^\d+(\.\d+)*$/.test(a)) arts.push(a);
  });
  const parents = new Set();
  for (const a of arts) {
    const segs = a.split(".");
    for (let i = 1; i < segs.length; i++) parents.add(segs.slice(0, i).join("."));
  }

  // cabeçalho das novas colunas (linha do cabeçalho original)
  const headerRow = ws.getRow(1);
  headerRow.getCell(COL_PU).value = "P. Unitário (€)";
  headerRow.getCell(COL_TOTAL).value = "Total (€)";

  let priced = 0;
  let zero = 0;
  let unmatchedRows = 0;
  let grandTotal = 0;

  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const text = String(row.getCell(COL_DESC).text ?? "").trim();
    if (text.length <= 2) return;
    const qcell = row.getCell(COL_QTY).value;
    const qty = typeof qcell === "number" ? qcell : parseFloat(String(qcell ?? "").replace(",", "."));
    const hasQty = Number.isFinite(qty) && qty > 0;
    const art = String(row.getCell(COL_ART).text ?? "").trim();
    const isLeafTask = /^\d+(\.\d+)+$/.test(art) && !parents.has(art);
    if (!hasQty && !isLeafTask) return; // título de secção ou nota

    const item = takeItem(text, hasQty ? qty : 1);
    if (!item) {
      unmatchedRows++;
      return;
    }
    const pu = Math.round(unitPrice(item) * 100) / 100;
    const total = Math.round(pu * (hasQty ? qty : 1) * 100) / 100;
    row.getCell(COL_PU).value = pu;
    row.getCell(COL_PU).numFmt = '#,##0.00" €"';
    row.getCell(COL_TOTAL).value = total;
    row.getCell(COL_TOTAL).numFmt = '#,##0.00" €"';
    grandTotal += total;
    if (pu > 0) priced++;
    else zero++;
  });

  await wb.xlsx.writeFile(OUT);
  console.log(`Exportado: ${OUT}`);
  console.log(`Linhas com preço > 0: ${priced}`);
  console.log(`Linhas a 0,00 € (por avaliar no Kably): ${zero}`);
  console.log(`Linhas do mapa sem correspondência no orçamento: ${unmatchedRows}`);
  console.log(`TOTAL atual (s/ IVA): ${grandTotal.toFixed(2)} €`);
})();
