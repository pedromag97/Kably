import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { SEED_ARTICLES, DEFAULT_CONDITIONS } from "./seed-data";
import type {
  Article,
  Budget,
  BudgetFull,
  BudgetItem,
  BudgetChapter,
  Company,
} from "./types";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS companies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  nif TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  logo TEXT NOT NULL DEFAULT '',
  materialMargin REAL NOT NULL DEFAULT 25,
  laborMargin REAL NOT NULL DEFAULT 35,
  laborRate REAL NOT NULL DEFAULT 20,
  validityDays INTEGER NOT NULL DEFAULT 30,
  conditions TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS articles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  companyId INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  code TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'un',
  materialCost REAL NOT NULL DEFAULT 0,
  laborHours REAL NOT NULL DEFAULT 0,
  notes TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS budgets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  companyId INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  number TEXT NOT NULL,
  title TEXT NOT NULL,
  clientName TEXT NOT NULL DEFAULT '',
  clientNif TEXT NOT NULL DEFAULT '',
  clientEmail TEXT NOT NULL DEFAULT '',
  clientPhone TEXT NOT NULL DEFAULT '',
  siteAddress TEXT NOT NULL DEFAULT '',
  vatMode TEXT NOT NULL DEFAULT 'NORMAL',
  materialMargin REAL NOT NULL DEFAULT 25,
  laborMargin REAL NOT NULL DEFAULT 35,
  laborRate REAL NOT NULL DEFAULT 20,
  validityDays INTEGER NOT NULL DEFAULT 30,
  laborOnly INTEGER NOT NULL DEFAULT 0,
  materialFeePct REAL NOT NULL DEFAULT 0,
  notes TEXT NOT NULL DEFAULT '',
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS budget_chapters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  budgetId INTEGER NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS mqt_aliases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  companyId INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  normText TEXT NOT NULL,
  articleId INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  UNIQUE(companyId, normText)
);
CREATE TABLE IF NOT EXISTS budget_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chapterId INTEGER NOT NULL REFERENCES budget_chapters(id) ON DELETE CASCADE,
  articleId INTEGER REFERENCES articles(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'un',
  quantity REAL NOT NULL DEFAULT 1,
  materialCost REAL NOT NULL DEFAULT 0,
  laborHours REAL NOT NULL DEFAULT 0,
  materialIncluded INTEGER NOT NULL DEFAULT 0,
  position INTEGER NOT NULL DEFAULT 0
);
`;

// Colunas acrescentadas após a primeira versão — CREATE TABLE IF NOT EXISTS
// não altera tabelas existentes, por isso adicionam-se aqui se faltarem.
function migrate(conn: DatabaseSync) {
  const addColumn = (table: string, column: string, ddl: string) => {
    const cols = conn.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
    if (!cols.some((c) => c.name === column)) {
      conn.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
    }
  };
  addColumn("budgets", "laborOnly", "laborOnly INTEGER NOT NULL DEFAULT 0");
  addColumn("budgets", "materialFeePct", "materialFeePct REAL NOT NULL DEFAULT 0");
  addColumn("budget_items", "materialIncluded", "materialIncluded INTEGER NOT NULL DEFAULT 0");
}

declare global {
  // eslint-disable-next-line no-var
  var __kablyDb: DatabaseSync | undefined;
}

export function db(): DatabaseSync {
  if (globalThis.__kablyDb) return globalThis.__kablyDb;
  const dir = path.join(process.cwd(), "data");
  fs.mkdirSync(dir, { recursive: true });
  const conn = new DatabaseSync(path.join(dir, "kably.db"));
  conn.exec("PRAGMA foreign_keys = ON");
  conn.exec("PRAGMA journal_mode = WAL");
  conn.exec(SCHEMA);
  migrate(conn);
  seed(conn);
  globalThis.__kablyDb = conn;
  return conn;
}

function seed(conn: DatabaseSync) {
  const row = conn.prepare("SELECT COUNT(*) AS n FROM companies").get() as { n: number };
  if (row.n > 0) return;
  const r = conn
    .prepare(
      "INSERT INTO companies (name, nif, email, phone, address, conditions) VALUES (?,?,?,?,?,?)"
    )
    .run(
      "A Minha Empresa, Lda.",
      "500000000",
      "geral@empresa.pt",
      "910 000 000",
      "Rua Exemplo 1, 0000-000 Lisboa",
      DEFAULT_CONDITIONS
    );
  const companyId = Number(r.lastInsertRowid);
  const ins = conn.prepare(
    "INSERT INTO articles (companyId, code, name, category, unit, materialCost, laborHours) VALUES (?,?,?,?,?,?,?)"
  );
  for (const [code, name, category, unit, materialCost, laborHours] of SEED_ARTICLES) {
    ins.run(companyId, code, name, category, unit, materialCost, laborHours);
  }
}

// node:sqlite devolve linhas com protótipo nulo; o React Server Components
// só serializa objetos simples — normalizar antes de devolver.
function plain<T>(row: unknown): T {
  return { ...(row as object) } as T;
}

function plainAll<T>(rows: unknown[]): T[] {
  return rows.map((r) => plain<T>(r));
}

// ── Empresa ───────────────────────────────────────────────────────────

export function getCompany(): Company {
  return plain<Company>(db().prepare("SELECT * FROM companies ORDER BY id LIMIT 1").get());
}

export function saveCompany(data: Omit<Company, "id">): void {
  const c = getCompany();
  db()
    .prepare(
      `UPDATE companies SET name=?, nif=?, email=?, phone=?, address=?, logo=?,
       materialMargin=?, laborMargin=?, laborRate=?, validityDays=?, conditions=? WHERE id=?`
    )
    .run(
      data.name,
      data.nif,
      data.email,
      data.phone,
      data.address,
      data.logo,
      data.materialMargin,
      data.laborMargin,
      data.laborRate,
      data.validityDays,
      data.conditions,
      c.id
    );
}

// ── Artigos ───────────────────────────────────────────────────────────

export function listArticles(): Article[] {
  return plainAll<Article>(
    db().prepare("SELECT * FROM articles ORDER BY category, name").all()
  );
}

export function getArticle(id: number): Article | undefined {
  const row = db().prepare("SELECT * FROM articles WHERE id=?").get(id);
  return row ? plain<Article>(row) : undefined;
}

export function createArticle(a: Omit<Article, "id" | "companyId">): number {
  const c = getCompany();
  const r = db()
    .prepare(
      "INSERT INTO articles (companyId, code, name, category, unit, materialCost, laborHours, notes) VALUES (?,?,?,?,?,?,?,?)"
    )
    .run(c.id, a.code, a.name, a.category, a.unit, a.materialCost, a.laborHours, a.notes);
  return Number(r.lastInsertRowid);
}

export function updateArticle(id: number, a: Omit<Article, "id" | "companyId">): void {
  db()
    .prepare(
      "UPDATE articles SET code=?, name=?, category=?, unit=?, materialCost=?, laborHours=?, notes=? WHERE id=?"
    )
    .run(a.code, a.name, a.category, a.unit, a.materialCost, a.laborHours, a.notes, id);
}

export function deleteArticle(id: number): void {
  db().prepare("DELETE FROM articles WHERE id=?").run(id);
}

// ── Associações MQT memorizadas ───────────────────────────────────────

export function listAliases(): { normText: string; articleId: number }[] {
  return plainAll<{ normText: string; articleId: number }>(
    db().prepare("SELECT normText, articleId FROM mqt_aliases").all()
  );
}

export function saveAlias(normText: string, articleId: number): void {
  const c = getCompany();
  db()
    .prepare(
      `INSERT INTO mqt_aliases (companyId, normText, articleId) VALUES (?,?,?)
       ON CONFLICT(companyId, normText) DO UPDATE SET articleId=excluded.articleId`
    )
    .run(c.id, normText, articleId);
}

// ── Orçamentos ────────────────────────────────────────────────────────

export function listBudgets(): Budget[] {
  return plainAll<Budget>(db().prepare("SELECT * FROM budgets ORDER BY id DESC").all());
}

export function getBudget(id: number): BudgetFull | undefined {
  const row = db().prepare("SELECT * FROM budgets WHERE id=?").get(id);
  if (!row) return undefined;
  const budget = plain<Budget>(row);
  const chapters = plainAll<BudgetChapter>(
    db()
      .prepare("SELECT * FROM budget_chapters WHERE budgetId=? ORDER BY position, id")
      .all(id)
  );
  const itemsByChapter = plainAll<BudgetItem>(
    db()
      .prepare(
        `SELECT bi.* FROM budget_items bi
       JOIN budget_chapters bc ON bc.id = bi.chapterId
       WHERE bc.budgetId=? ORDER BY bi.position, bi.id`
      )
      .all(id)
  );
  return {
    ...budget,
    chapters: chapters.map((ch) => ({
      ...ch,
      items: itemsByChapter.filter((i) => i.chapterId === ch.id),
    })),
  };
}

export function nextBudgetNumber(): string {
  const year = new Date().getFullYear();
  const prefix = `ORC-${year}-`;
  const row = db()
    .prepare("SELECT COUNT(*) AS n FROM budgets WHERE number LIKE ?")
    .get(`${prefix}%`) as { n: number };
  return `${prefix}${String(row.n + 1).padStart(3, "0")}`;
}

export function createBudget(
  data: Pick<
    Budget,
    | "title"
    | "clientName"
    | "clientNif"
    | "clientEmail"
    | "clientPhone"
    | "siteAddress"
    | "vatMode"
  >,
  chapterNames: string[]
): number {
  const c = getCompany();
  const r = db()
    .prepare(
      `INSERT INTO budgets (companyId, number, title, clientName, clientNif, clientEmail,
       clientPhone, siteAddress, vatMode, materialMargin, laborMargin, laborRate, validityDays)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`
    )
    .run(
      c.id,
      nextBudgetNumber(),
      data.title,
      data.clientName,
      data.clientNif,
      data.clientEmail,
      data.clientPhone,
      data.siteAddress,
      data.vatMode,
      c.materialMargin,
      c.laborMargin,
      c.laborRate,
      c.validityDays
    );
  const budgetId = Number(r.lastInsertRowid);
  const ins = db().prepare(
    "INSERT INTO budget_chapters (budgetId, name, position) VALUES (?,?,?)"
  );
  chapterNames.forEach((name, i) => ins.run(budgetId, name, i));
  return budgetId;
}

export function updateBudget(id: number, fields: Partial<Budget>): void {
  const allowed = [
    "title",
    "clientName",
    "clientNif",
    "clientEmail",
    "clientPhone",
    "siteAddress",
    "vatMode",
    "materialMargin",
    "laborMargin",
    "laborRate",
    "validityDays",
    "laborOnly",
    "materialFeePct",
    "notes",
  ] as const;
  const keys = allowed.filter((k) => fields[k] !== undefined);
  if (keys.length === 0) return;
  const sets = keys.map((k) => `${k}=?`).join(", ");
  const values = keys.map((k) => fields[k] as string | number);
  db()
    .prepare(`UPDATE budgets SET ${sets}, updatedAt=datetime('now') WHERE id=?`)
    .run(...values, id);
}

export function deleteBudget(id: number): void {
  db().prepare("DELETE FROM budgets WHERE id=?").run(id);
}

function touchBudget(budgetId: number): void {
  db().prepare("UPDATE budgets SET updatedAt=datetime('now') WHERE id=?").run(budgetId);
}

// ── Capítulos ─────────────────────────────────────────────────────────

export function addChapter(budgetId: number, name: string): number {
  const row = db()
    .prepare("SELECT COALESCE(MAX(position),-1)+1 AS p FROM budget_chapters WHERE budgetId=?")
    .get(budgetId) as { p: number };
  const r = db()
    .prepare("INSERT INTO budget_chapters (budgetId, name, position) VALUES (?,?,?)")
    .run(budgetId, name, row.p);
  touchBudget(budgetId);
  return Number(r.lastInsertRowid);
}

export function renameChapter(id: number, name: string): void {
  db().prepare("UPDATE budget_chapters SET name=? WHERE id=?").run(name, id);
}

export function deleteChapter(id: number): void {
  db().prepare("DELETE FROM budget_chapters WHERE id=?").run(id);
}

// ── Itens ─────────────────────────────────────────────────────────────

export function addItem(
  chapterId: number,
  item: Pick<BudgetItem, "articleId" | "name" | "unit" | "quantity" | "materialCost" | "laborHours">
): number {
  const row = db()
    .prepare("SELECT COALESCE(MAX(position),-1)+1 AS p FROM budget_items WHERE chapterId=?")
    .get(chapterId) as { p: number };
  const r = db()
    .prepare(
      "INSERT INTO budget_items (chapterId, articleId, name, unit, quantity, materialCost, laborHours, position) VALUES (?,?,?,?,?,?,?,?)"
    )
    .run(
      chapterId,
      item.articleId,
      item.name,
      item.unit,
      item.quantity,
      item.materialCost,
      item.laborHours,
      row.p
    );
  return Number(r.lastInsertRowid);
}

export function updateItem(
  id: number,
  item: Pick<BudgetItem, "name" | "unit" | "quantity" | "materialCost" | "laborHours">
): void {
  db()
    .prepare(
      "UPDATE budget_items SET name=?, unit=?, quantity=?, materialCost=?, laborHours=? WHERE id=?"
    )
    .run(item.name, item.unit, item.quantity, item.materialCost, item.laborHours, id);
}

export function setItemMaterialIncluded(id: number, included: boolean): void {
  db()
    .prepare("UPDATE budget_items SET materialIncluded=? WHERE id=?")
    .run(included ? 1 : 0, id);
}

export function deleteItem(id: number): void {
  db().prepare("DELETE FROM budget_items WHERE id=?").run(id);
}
