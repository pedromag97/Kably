import { createClient as createWebClient } from "@libsql/client/web";
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
  Expense,
  User,
  Worker,
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
CREATE TABLE IF NOT EXISTS workers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  companyId INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT '',
  productive INTEGER NOT NULL DEFAULT 1,
  grossSalary REAL NOT NULL DEFAULT 0,
  months REAL NOT NULL DEFAULT 14,
  tsuPct REAL NOT NULL DEFAULT 23.75,
  insurancePct REAL NOT NULL DEFAULT 1.5,
  mealAllowance REAL NOT NULL DEFAULT 6,
  manualAnnualCost REAL NOT NULL DEFAULT 0,
  workDays REAL NOT NULL DEFAULT 210,
  hoursPerDay REAL NOT NULL DEFAULT 8,
  productivityPct REAL NOT NULL DEFAULT 65,
  position INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  companyId INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  amount REAL NOT NULL DEFAULT 0,
  period TEXT NOT NULL DEFAULT 'MONTHLY',
  years REAL NOT NULL DEFAULT 1,
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
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  companyId INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  passwordHash TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'member',
  createdAt TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  userId INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  expiresAt TEXT NOT NULL
);
`;

// ── Ligação ───────────────────────────────────────────────────────────
// Local (qualquer SO, incl. Windows ARM64): node:sqlite sobre ficheiro.
// Produção (Turso): cliente web libSQL puro-JS via HTTP (sem binários nativos).
// As duas implementações expõem a mesma forma (execute/batch/executeMultiple),
// por isso passar à cloud é só definir DATABASE_URL=libsql://… + DATABASE_AUTH_TOKEN.

type SqlArg = string | number | bigint | null;
type Stmt = string | { sql: string; args?: SqlArg[] };
type Res = {
  rows: Record<string, unknown>[];
  columns: string[];
  lastInsertRowid?: number | bigint;
  rowsAffected: number;
};
interface DbClient {
  execute(stmt: Stmt): Promise<Res>;
  batch(stmts: Stmt[], mode?: "write" | "read"): Promise<Res[]>;
  executeMultiple(sql: string): Promise<void>;
}

/** Adaptador node:sqlite com a forma da API libSQL (para desenvolvimento local). */
function makeLocalClient(
  DatabaseSync: typeof import("node:sqlite").DatabaseSync,
  file: string
): DbClient {
  const sdb = new DatabaseSync(file);
  sdb.exec("PRAGMA foreign_keys = ON");
  sdb.exec("PRAGMA journal_mode = WAL");
  const norm = (s: Stmt) =>
    typeof s === "string" ? { sql: s, args: [] as SqlArg[] } : { sql: s.sql, args: s.args ?? [] };
  const isRead = (sql: string) => /^\s*(SELECT|PRAGMA|WITH)/i.test(sql);
  const run1 = ({ sql, args }: { sql: string; args: SqlArg[] }): Res => {
    const stmt = sdb.prepare(sql);
    if (isRead(sql)) {
      const raw = stmt.all(...args) as Record<string, unknown>[];
      const rows = raw.map((r) => ({ ...r }));
      return { rows, columns: rows.length ? Object.keys(rows[0]) : [], rowsAffected: 0 };
    }
    const info = stmt.run(...args);
    return {
      rows: [],
      columns: [],
      lastInsertRowid: info.lastInsertRowid as number | bigint,
      rowsAffected: Number(info.changes),
    };
  };
  return {
    async execute(s) {
      return run1(norm(s));
    },
    async batch(stmts) {
      sdb.exec("BEGIN");
      try {
        const out = stmts.map((s) => run1(norm(s)));
        sdb.exec("COMMIT");
        return out;
      } catch (e) {
        sdb.exec("ROLLBACK");
        throw e;
      }
    },
    async executeMultiple(sql) {
      sdb.exec(sql);
    },
  };
}

declare global {
  // eslint-disable-next-line no-var
  var __kablyReady: Promise<DbClient> | undefined;
}

async function connect(): Promise<DbClient> {
  const url = process.env.DATABASE_URL ?? "file:data/kably.db";
  const authToken = process.env.DATABASE_AUTH_TOKEN;
  if (url.startsWith("file:")) {
    const file = url.slice("file:".length);
    const dir = path.dirname(file);
    if (dir && dir !== ".") fs.mkdirSync(dir, { recursive: true });
    // import dinâmico: node:sqlite só é carregado no modo ficheiro (dev).
    // Em produção (Turso) nunca é tocado — independente da versão de Node do host.
    const { DatabaseSync } = await import("node:sqlite");
    return makeLocalClient(DatabaseSync, file);
  }
  return createWebClient(authToken ? { url, authToken } : { url }) as unknown as DbClient;
}

/** Devolve o cliente, garantindo schema + migração + seed uma única vez. */
async function db(): Promise<DbClient> {
  if (!globalThis.__kablyReady) {
    globalThis.__kablyReady = (async () => {
      const c = await connect();
      await c.executeMultiple(SCHEMA);
      await migrate(c);
      await seed(c);
      return c;
    })();
  }
  return globalThis.__kablyReady;
}

// Colunas acrescentadas após a primeira versão — CREATE TABLE IF NOT EXISTS
// não altera tabelas existentes, por isso adicionam-se aqui se faltarem.
async function migrate(c: DbClient) {
  const addColumn = async (table: string, column: string, ddl: string) => {
    const info = await c.execute(`PRAGMA table_info(${table})`);
    const has = info.rows.some((r) => (r as Record<string, unknown>).name === column);
    if (!has) await c.execute(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
  };
  await addColumn("budgets", "laborOnly", "laborOnly INTEGER NOT NULL DEFAULT 0");
  await addColumn("budgets", "materialFeePct", "materialFeePct REAL NOT NULL DEFAULT 0");
  await addColumn("budget_items", "materialIncluded", "materialIncluded INTEGER NOT NULL DEFAULT 0");
  await addColumn("companies", "targetProfitPct", "targetProfitPct REAL NOT NULL DEFAULT 15");
}

async function seed(c: DbClient) {
  const r = await c.execute("SELECT COUNT(*) AS n FROM companies");
  if (Number((r.rows[0] as Record<string, unknown>).n) > 0) return;
  const ins = await c.execute({
    sql: "INSERT INTO companies (name, nif, email, phone, address, conditions) VALUES (?,?,?,?,?,?)",
    args: [
      "A Minha Empresa, Lda.",
      "500000000",
      "geral@empresa.pt",
      "910 000 000",
      "Rua Exemplo 1, 0000-000 Lisboa",
      DEFAULT_CONDITIONS,
    ],
  });
  const companyId = Number(ins.lastInsertRowid);
  await c.batch(
    SEED_ARTICLES.map(([code, name, category, unit, materialCost, laborHours]) => ({
      sql: "INSERT INTO articles (companyId, code, name, category, unit, materialCost, laborHours) VALUES (?,?,?,?,?,?,?)",
      args: [companyId, code, name, category, unit, materialCost, laborHours],
    })),
    "write"
  );
}

// ── Mapeamento de linhas → objetos simples ────────────────────────────
// (o React Server Components só serializa objetos simples)

function rowsToObjects<T>(rs: Res): T[] {
  // No modo local as linhas já são objetos; no modo web mapeamos por coluna.
  if (rs.columns.length === 0) return rs.rows as T[];
  return rs.rows.map((row) => {
    const o: Record<string, unknown> = {};
    for (const col of rs.columns) o[col] = row[col];
    return o as T;
  });
}

function firstRow<T>(rs: Res): T | undefined {
  return rowsToObjects<T>(rs)[0];
}

// ── Empresa ───────────────────────────────────────────────────────────

export async function getCompany(): Promise<Company> {
  const c = await db();
  const rs = await c.execute("SELECT * FROM companies ORDER BY id LIMIT 1");
  return firstRow<Company>(rs)!;
}

export async function saveCompany(
  data: Omit<Company, "id" | "targetProfitPct">
): Promise<void> {
  const c = await db();
  const company = await getCompany();
  await c.execute({
    sql: `UPDATE companies SET name=?, nif=?, email=?, phone=?, address=?, logo=?,
       materialMargin=?, laborMargin=?, laborRate=?, validityDays=?, conditions=? WHERE id=?`,
    args: [
      data.name, data.nif, data.email, data.phone, data.address, data.logo,
      data.materialMargin, data.laborMargin, data.laborRate, data.validityDays,
      data.conditions, company.id,
    ],
  });
}

// ── Artigos ───────────────────────────────────────────────────────────

export async function listArticles(): Promise<Article[]> {
  const c = await db();
  return rowsToObjects<Article>(
    await c.execute("SELECT * FROM articles ORDER BY category, name")
  );
}

export async function getArticle(id: number): Promise<Article | undefined> {
  const c = await db();
  return firstRow<Article>(
    await c.execute({ sql: "SELECT * FROM articles WHERE id=?", args: [id] })
  );
}

export async function createArticle(a: Omit<Article, "id" | "companyId">): Promise<number> {
  const c = await db();
  const company = await getCompany();
  const r = await c.execute({
    sql: "INSERT INTO articles (companyId, code, name, category, unit, materialCost, laborHours, notes) VALUES (?,?,?,?,?,?,?,?)",
    args: [company.id, a.code, a.name, a.category, a.unit, a.materialCost, a.laborHours, a.notes],
  });
  return Number(r.lastInsertRowid);
}

export async function updateArticle(
  id: number,
  a: Omit<Article, "id" | "companyId">
): Promise<void> {
  const c = await db();
  await c.execute({
    sql: "UPDATE articles SET code=?, name=?, category=?, unit=?, materialCost=?, laborHours=?, notes=? WHERE id=?",
    args: [a.code, a.name, a.category, a.unit, a.materialCost, a.laborHours, a.notes, id],
  });
}

export async function deleteArticle(id: number): Promise<void> {
  const c = await db();
  // cascata explícita (idêntico em local e Turso, sem depender de PRAGMA)
  await c.batch(
    [
      { sql: "UPDATE budget_items SET articleId=NULL WHERE articleId=?", args: [id] },
      { sql: "DELETE FROM mqt_aliases WHERE articleId=?", args: [id] },
      { sql: "DELETE FROM articles WHERE id=?", args: [id] },
    ],
    "write"
  );
}

// ── Custos da empresa (trabalhadores + despesas) ──────────────────────

export async function listWorkers(): Promise<Worker[]> {
  const c = await db();
  return rowsToObjects<Worker>(
    await c.execute("SELECT * FROM workers ORDER BY position, id")
  );
}

export async function listExpenses(): Promise<Expense[]> {
  const c = await db();
  return rowsToObjects<Expense>(
    await c.execute("SELECT * FROM expenses ORDER BY category, position, id")
  );
}

/** Substitui todos os trabalhadores e despesas (replace-all atómico). */
export async function saveCosts(
  workers: Omit<Worker, "id" | "companyId">[],
  expenses: Omit<Expense, "id" | "companyId">[],
  targetProfitPct: number
): Promise<void> {
  const c = await db();
  const company = await getCompany();
  const stmts = [
    { sql: "DELETE FROM workers WHERE companyId=?", args: [company.id] },
    { sql: "DELETE FROM expenses WHERE companyId=?", args: [company.id] },
    ...workers.map((w, i) => ({
      sql: `INSERT INTO workers (companyId, name, role, productive, grossSalary, months,
       tsuPct, insurancePct, mealAllowance, manualAnnualCost, workDays, hoursPerDay,
       productivityPct, position) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      args: [
        company.id, w.name, w.role, w.productive, w.grossSalary, w.months, w.tsuPct,
        w.insurancePct, w.mealAllowance, w.manualAnnualCost, w.workDays, w.hoursPerDay,
        w.productivityPct, i,
      ],
    })),
    ...expenses.map((e, i) => ({
      sql: "INSERT INTO expenses (companyId, category, name, amount, period, years, position) VALUES (?,?,?,?,?,?,?)",
      args: [company.id, e.category, e.name, e.amount, e.period, e.years, i],
    })),
    { sql: "UPDATE companies SET targetProfitPct=? WHERE id=?", args: [targetProfitPct, company.id] },
  ];
  await c.batch(stmts, "write");
}

// ── Associações MQT memorizadas ───────────────────────────────────────

export async function listAliases(): Promise<{ normText: string; articleId: number }[]> {
  const c = await db();
  return rowsToObjects<{ normText: string; articleId: number }>(
    await c.execute("SELECT normText, articleId FROM mqt_aliases")
  );
}

export async function saveAlias(normText: string, articleId: number): Promise<void> {
  const c = await db();
  const company = await getCompany();
  await c.execute({
    sql: `INSERT INTO mqt_aliases (companyId, normText, articleId) VALUES (?,?,?)
       ON CONFLICT(companyId, normText) DO UPDATE SET articleId=excluded.articleId`,
    args: [company.id, normText, articleId],
  });
}

// ── Orçamentos ────────────────────────────────────────────────────────

export async function listBudgets(): Promise<Budget[]> {
  const c = await db();
  return rowsToObjects<Budget>(await c.execute("SELECT * FROM budgets ORDER BY id DESC"));
}

export async function getBudget(id: number): Promise<BudgetFull | undefined> {
  const c = await db();
  const budget = firstRow<Budget>(
    await c.execute({ sql: "SELECT * FROM budgets WHERE id=?", args: [id] })
  );
  if (!budget) return undefined;
  const chapters = rowsToObjects<BudgetChapter>(
    await c.execute({
      sql: "SELECT * FROM budget_chapters WHERE budgetId=? ORDER BY position, id",
      args: [id],
    })
  );
  const itemsByChapter = rowsToObjects<BudgetItem>(
    await c.execute({
      sql: `SELECT bi.* FROM budget_items bi
       JOIN budget_chapters bc ON bc.id = bi.chapterId
       WHERE bc.budgetId=? ORDER BY bi.position, bi.id`,
      args: [id],
    })
  );
  return {
    ...budget,
    chapters: chapters.map((ch) => ({
      ...ch,
      items: itemsByChapter.filter((i) => i.chapterId === ch.id),
    })),
  };
}

export async function nextBudgetNumber(): Promise<string> {
  const c = await db();
  const year = new Date().getFullYear();
  const prefix = `ORC-${year}-`;
  const rs = await c.execute({
    sql: "SELECT COUNT(*) AS n FROM budgets WHERE number LIKE ?",
    args: [`${prefix}%`],
  });
  const n = Number((rs.rows[0] as Record<string, unknown>).n);
  return `${prefix}${String(n + 1).padStart(3, "0")}`;
}

export async function createBudget(
  data: Pick<
    Budget,
    | "title" | "clientName" | "clientNif" | "clientEmail" | "clientPhone"
    | "siteAddress" | "vatMode"
  >,
  chapterNames: string[]
): Promise<number> {
  const c = await db();
  const company = await getCompany();
  const number = await nextBudgetNumber();
  const r = await c.execute({
    sql: `INSERT INTO budgets (companyId, number, title, clientName, clientNif, clientEmail,
       clientPhone, siteAddress, vatMode, materialMargin, laborMargin, laborRate, validityDays)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    args: [
      company.id, number, data.title, data.clientName, data.clientNif, data.clientEmail,
      data.clientPhone, data.siteAddress, data.vatMode, company.materialMargin,
      company.laborMargin, company.laborRate, company.validityDays,
    ],
  });
  const budgetId = Number(r.lastInsertRowid);
  if (chapterNames.length > 0) {
    await c.batch(
      chapterNames.map((name, i) => ({
        sql: "INSERT INTO budget_chapters (budgetId, name, position) VALUES (?,?,?)",
        args: [budgetId, name, i],
      })),
      "write"
    );
  }
  return budgetId;
}

export async function updateBudget(id: number, fields: Partial<Budget>): Promise<void> {
  const c = await db();
  const allowed = [
    "title", "clientName", "clientNif", "clientEmail", "clientPhone", "siteAddress",
    "vatMode", "materialMargin", "laborMargin", "laborRate", "validityDays",
    "laborOnly", "materialFeePct", "notes",
  ] as const;
  const keys = allowed.filter((k) => fields[k] !== undefined);
  if (keys.length === 0) return;
  const sets = keys.map((k) => `${k}=?`).join(", ");
  const values = keys.map((k) => fields[k] as string | number);
  await c.execute({
    sql: `UPDATE budgets SET ${sets}, updatedAt=datetime('now') WHERE id=?`,
    args: [...values, id],
  });
}

export async function deleteBudget(id: number): Promise<void> {
  const c = await db();
  await c.batch(
    [
      {
        sql: `DELETE FROM budget_items WHERE chapterId IN
              (SELECT id FROM budget_chapters WHERE budgetId=?)`,
        args: [id],
      },
      { sql: "DELETE FROM budget_chapters WHERE budgetId=?", args: [id] },
      { sql: "DELETE FROM budgets WHERE id=?", args: [id] },
    ],
    "write"
  );
}

async function touchBudget(c: DbClient, budgetId: number): Promise<void> {
  await c.execute({
    sql: "UPDATE budgets SET updatedAt=datetime('now') WHERE id=?",
    args: [budgetId],
  });
}

// ── Capítulos ─────────────────────────────────────────────────────────

export async function addChapter(budgetId: number, name: string): Promise<number> {
  const c = await db();
  const pr = await c.execute({
    sql: "SELECT COALESCE(MAX(position),-1)+1 AS p FROM budget_chapters WHERE budgetId=?",
    args: [budgetId],
  });
  const p = Number((pr.rows[0] as Record<string, unknown>).p);
  const r = await c.execute({
    sql: "INSERT INTO budget_chapters (budgetId, name, position) VALUES (?,?,?)",
    args: [budgetId, name, p],
  });
  await touchBudget(c, budgetId);
  return Number(r.lastInsertRowid);
}

export async function renameChapter(id: number, name: string): Promise<void> {
  const c = await db();
  await c.execute({ sql: "UPDATE budget_chapters SET name=? WHERE id=?", args: [name, id] });
}

export async function deleteChapter(id: number): Promise<void> {
  const c = await db();
  await c.batch(
    [
      { sql: "DELETE FROM budget_items WHERE chapterId=?", args: [id] },
      { sql: "DELETE FROM budget_chapters WHERE id=?", args: [id] },
    ],
    "write"
  );
}

// ── Itens ─────────────────────────────────────────────────────────────

export async function addItem(
  chapterId: number,
  item: Pick<BudgetItem, "articleId" | "name" | "unit" | "quantity" | "materialCost" | "laborHours">
): Promise<number> {
  const c = await db();
  const pr = await c.execute({
    sql: "SELECT COALESCE(MAX(position),-1)+1 AS p FROM budget_items WHERE chapterId=?",
    args: [chapterId],
  });
  const p = Number((pr.rows[0] as Record<string, unknown>).p);
  const r = await c.execute({
    sql: "INSERT INTO budget_items (chapterId, articleId, name, unit, quantity, materialCost, laborHours, position) VALUES (?,?,?,?,?,?,?,?)",
    args: [
      chapterId, item.articleId, item.name, item.unit, item.quantity,
      item.materialCost, item.laborHours, p,
    ],
  });
  return Number(r.lastInsertRowid);
}

export async function updateItem(
  id: number,
  item: Pick<BudgetItem, "name" | "unit" | "quantity" | "materialCost" | "laborHours">
): Promise<void> {
  const c = await db();
  await c.execute({
    sql: "UPDATE budget_items SET name=?, unit=?, quantity=?, materialCost=?, laborHours=? WHERE id=?",
    args: [item.name, item.unit, item.quantity, item.materialCost, item.laborHours, id],
  });
}

export async function setItemMaterialIncluded(id: number, included: boolean): Promise<void> {
  const c = await db();
  await c.execute({
    sql: "UPDATE budget_items SET materialIncluded=? WHERE id=?",
    args: [included ? 1 : 0, id],
  });
}

export async function deleteItem(id: number): Promise<void> {
  const c = await db();
  await c.execute({ sql: "DELETE FROM budget_items WHERE id=?", args: [id] });
}

// ── Utilizadores e sessões ────────────────────────────────────────────

export async function countUsers(): Promise<number> {
  const c = await db();
  const r = await c.execute("SELECT COUNT(*) AS n FROM users");
  return Number((r.rows[0] as Record<string, unknown>).n);
}

export async function getUserByEmail(email: string): Promise<User | undefined> {
  const c = await db();
  return firstRow<User>(
    await c.execute({
      sql: "SELECT * FROM users WHERE email=?",
      args: [email.trim().toLowerCase()],
    })
  );
}

export async function listUsers(): Promise<User[]> {
  const c = await db();
  return rowsToObjects<User>(
    await c.execute("SELECT * FROM users ORDER BY (role='owner') DESC, email")
  );
}

export async function createUser(u: {
  companyId: number;
  email: string;
  passwordHash: string;
  name: string;
  role: string;
}): Promise<number> {
  const c = await db();
  const r = await c.execute({
    sql: "INSERT INTO users (companyId, email, passwordHash, name, role) VALUES (?,?,?,?,?)",
    args: [u.companyId, u.email.trim().toLowerCase(), u.passwordHash, u.name, u.role],
  });
  return Number(r.lastInsertRowid);
}

export async function deleteUser(id: number): Promise<void> {
  const c = await db();
  await c.batch(
    [
      { sql: "DELETE FROM sessions WHERE userId=?", args: [id] },
      { sql: "DELETE FROM users WHERE id=?", args: [id] },
    ],
    "write"
  );
}

export async function createSession(
  id: string,
  userId: number,
  expiresAt: string
): Promise<void> {
  const c = await db();
  await c.execute({
    sql: "INSERT INTO sessions (id, userId, expiresAt) VALUES (?,?,?)",
    args: [id, userId, expiresAt],
  });
}

/** Devolve o utilizador da sessão (se válida e não expirada). */
export async function getSessionUser(sessionId: string): Promise<User | undefined> {
  const c = await db();
  return firstRow<User>(
    await c.execute({
      sql: `SELECT u.* FROM sessions s JOIN users u ON u.id = s.userId
            WHERE s.id=? AND s.expiresAt > datetime('now')`,
      args: [sessionId],
    })
  );
}

export async function deleteSession(id: string): Promise<void> {
  const c = await db();
  await c.execute({ sql: "DELETE FROM sessions WHERE id=?", args: [id] });
}
