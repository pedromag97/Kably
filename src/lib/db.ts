import { createClient as createWebClient } from "@libsql/client/web";
import fs from "node:fs";
import path from "node:path";
import { SEED_ARTICLES, DEFAULT_CONDITIONS } from "./seed-data";
import type {
  ActualCost,
  Article,
  Budget,
  BudgetFull,
  BudgetItem,
  BudgetChapter,
  Client,
  Company,
  Expense,
  PriceEntry,
  Supplier,
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
  conditions TEXT NOT NULL DEFAULT '',
  followUpDays INTEGER NOT NULL DEFAULT 5
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
  clientId INTEGER REFERENCES clients(id) ON DELETE SET NULL,
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
  revisionOf INTEGER,
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
CREATE TABLE IF NOT EXISTS password_resets (
  token TEXT PRIMARY KEY,
  userId INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expiresAt TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS invites (
  token TEXT PRIMARY KEY,
  companyId INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  expiresAt TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS suppliers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  companyId INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS price_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  companyId INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  articleId INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  supplierId INTEGER REFERENCES suppliers(id) ON DELETE SET NULL,
  supplierName TEXT NOT NULL DEFAULT '',
  price REAL NOT NULL DEFAULT 0,
  date TEXT NOT NULL,
  createdAt TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS clients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  companyId INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  nif TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  createdAt TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS actual_costs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  companyId INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  budgetId INTEGER NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'MATERIAL',
  description TEXT NOT NULL DEFAULT '',
  amount REAL NOT NULL DEFAULT 0,
  hours REAL NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

// ── Ligação ───────────────────────────────────────────────────────────
// Local (qualquer SO, incl. Windows ARM64): node:sqlite sobre ficheiro.
// Produção (Turso): cliente web libSQL puro-JS via HTTP (sem binários nativos).

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
    const { DatabaseSync } = await import("node:sqlite");
    return makeLocalClient(DatabaseSync, file);
  }
  return createWebClient(authToken ? { url, authToken } : { url }) as unknown as DbClient;
}

/** Cliente pronto (schema + migração) uma única vez. Sem auto-seed: as empresas
 *  são criadas no registo (cada uma com a sua base de artigos). */
async function db(): Promise<DbClient> {
  if (!globalThis.__kablyReady) {
    globalThis.__kablyReady = (async () => {
      const c = await connect();
      await c.executeMultiple(SCHEMA);
      await migrate(c);
      return c;
    })();
  }
  return globalThis.__kablyReady;
}

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
  // Partilha de orçamentos com o cliente (Fase 5)
  await addColumn("budgets", "shareToken", "shareToken TEXT");
  await addColumn("budgets", "status", "status TEXT NOT NULL DEFAULT 'DRAFT'");
  await addColumn("budgets", "sentAt", "sentAt TEXT");
  await addColumn("budgets", "decidedAt", "decidedAt TEXT");
  // Clientes + follow-up (gestão de clientes e painel)
  await addColumn("budgets", "clientId", "clientId INTEGER");
  await addColumn("companies", "followUpDays", "followUpDays INTEGER NOT NULL DEFAULT 5");
  await addColumn("budgets", "revisionOf", "revisionOf INTEGER");
}

// ── Mapeamento de linhas → objetos simples ────────────────────────────

function rowsToObjects<T>(rs: Res): T[] {
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

function scalar(rs: Res, col: string): number {
  return Number((rs.rows[0] as Record<string, unknown>)?.[col] ?? 0);
}

// ── Empresa (registo + leitura) ───────────────────────────────────────

/** id da 1.ª empresa — usado só pelo /setup legado (reclamar empresa existente). */
export async function firstCompanyId(): Promise<number | null> {
  const c = await db();
  const row = firstRow<{ id: number }>(
    await c.execute("SELECT id FROM companies ORDER BY id LIMIT 1")
  );
  return row ? Number(row.id) : null;
}

export async function createCompany(name: string): Promise<number> {
  const c = await db();
  const r = await c.execute({
    sql: "INSERT INTO companies (name, conditions) VALUES (?,?)",
    args: [name, DEFAULT_CONDITIONS],
  });
  return Number(r.lastInsertRowid);
}

/** Carrega a base de artigos de referência numa empresa (no registo). */
export async function seedCompanyArticles(companyId: number): Promise<void> {
  const c = await db();
  await c.batch(
    SEED_ARTICLES.map(([code, name, category, unit, materialCost, laborHours]) => ({
      sql: "INSERT INTO articles (companyId, code, name, category, unit, materialCost, laborHours) VALUES (?,?,?,?,?,?,?)",
      args: [companyId, code, name, category, unit, materialCost, laborHours],
    })),
    "write"
  );
}

export async function getCompany(companyId: number): Promise<Company> {
  const c = await db();
  return firstRow<Company>(
    await c.execute({ sql: "SELECT * FROM companies WHERE id=?", args: [companyId] })
  )!;
}

export async function saveCompany(
  companyId: number,
  data: Omit<Company, "id" | "targetProfitPct">
): Promise<void> {
  const c = await db();
  await c.execute({
    sql: `UPDATE companies SET name=?, nif=?, email=?, phone=?, address=?, logo=?,
       materialMargin=?, laborMargin=?, laborRate=?, validityDays=?, conditions=?,
       followUpDays=? WHERE id=?`,
    args: [
      data.name, data.nif, data.email, data.phone, data.address, data.logo,
      data.materialMargin, data.laborMargin, data.laborRate, data.validityDays,
      data.conditions, Math.max(1, Math.round(data.followUpDays || 5)), companyId,
    ],
  });
}

// ── Artigos ───────────────────────────────────────────────────────────

export async function listArticles(companyId: number): Promise<Article[]> {
  const c = await db();
  return rowsToObjects<Article>(
    await c.execute({
      sql: "SELECT * FROM articles WHERE companyId=? ORDER BY category, name",
      args: [companyId],
    })
  );
}

export async function getArticle(
  companyId: number,
  id: number
): Promise<Article | undefined> {
  const c = await db();
  return firstRow<Article>(
    await c.execute({
      sql: "SELECT * FROM articles WHERE id=? AND companyId=?",
      args: [id, companyId],
    })
  );
}

export async function createArticle(
  companyId: number,
  a: Omit<Article, "id" | "companyId">
): Promise<number> {
  const c = await db();
  const r = await c.execute({
    sql: "INSERT INTO articles (companyId, code, name, category, unit, materialCost, laborHours, notes) VALUES (?,?,?,?,?,?,?,?)",
    args: [companyId, a.code, a.name, a.category, a.unit, a.materialCost, a.laborHours, a.notes],
  });
  return Number(r.lastInsertRowid);
}

export async function updateArticle(
  companyId: number,
  id: number,
  a: Omit<Article, "id" | "companyId">
): Promise<void> {
  const c = await db();
  await c.execute({
    sql: "UPDATE articles SET code=?, name=?, category=?, unit=?, materialCost=?, laborHours=?, notes=? WHERE id=? AND companyId=?",
    args: [a.code, a.name, a.category, a.unit, a.materialCost, a.laborHours, a.notes, id, companyId],
  });
}

export async function deleteArticle(companyId: number, id: number): Promise<void> {
  const c = await db();
  await c.batch(
    [
      {
        sql: `UPDATE budget_items SET articleId=NULL WHERE articleId=? AND chapterId IN
              (SELECT bc.id FROM budget_chapters bc JOIN budgets b ON b.id=bc.budgetId WHERE b.companyId=?)`,
        args: [id, companyId],
      },
      { sql: "DELETE FROM mqt_aliases WHERE articleId=? AND companyId=?", args: [id, companyId] },
      { sql: "DELETE FROM articles WHERE id=? AND companyId=?", args: [id, companyId] },
    ],
    "write"
  );
}

// ── Custos da empresa (trabalhadores + despesas) ──────────────────────

export async function listWorkers(companyId: number): Promise<Worker[]> {
  const c = await db();
  return rowsToObjects<Worker>(
    await c.execute({
      sql: "SELECT * FROM workers WHERE companyId=? ORDER BY position, id",
      args: [companyId],
    })
  );
}

export async function listExpenses(companyId: number): Promise<Expense[]> {
  const c = await db();
  return rowsToObjects<Expense>(
    await c.execute({
      sql: "SELECT * FROM expenses WHERE companyId=? ORDER BY category, position, id",
      args: [companyId],
    })
  );
}

/** Substitui todos os trabalhadores e despesas da empresa (replace-all atómico). */
export async function saveCosts(
  companyId: number,
  workers: Omit<Worker, "id" | "companyId">[],
  expenses: Omit<Expense, "id" | "companyId">[],
  targetProfitPct: number
): Promise<void> {
  const c = await db();
  const stmts = [
    { sql: "DELETE FROM workers WHERE companyId=?", args: [companyId] },
    { sql: "DELETE FROM expenses WHERE companyId=?", args: [companyId] },
    ...workers.map((w, i) => ({
      sql: `INSERT INTO workers (companyId, name, role, productive, grossSalary, months,
       tsuPct, insurancePct, mealAllowance, manualAnnualCost, workDays, hoursPerDay,
       productivityPct, position) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      args: [
        companyId, w.name, w.role, w.productive, w.grossSalary, w.months, w.tsuPct,
        w.insurancePct, w.mealAllowance, w.manualAnnualCost, w.workDays, w.hoursPerDay,
        w.productivityPct, i,
      ],
    })),
    ...expenses.map((e, i) => ({
      sql: "INSERT INTO expenses (companyId, category, name, amount, period, years, position) VALUES (?,?,?,?,?,?,?)",
      args: [companyId, e.category, e.name, e.amount, e.period, e.years, i],
    })),
    { sql: "UPDATE companies SET targetProfitPct=? WHERE id=?", args: [targetProfitPct, companyId] },
  ];
  await c.batch(stmts, "write");
}

// ── Associações MQT memorizadas ───────────────────────────────────────

export async function listAliases(
  companyId: number
): Promise<{ normText: string; articleId: number }[]> {
  const c = await db();
  return rowsToObjects<{ normText: string; articleId: number }>(
    await c.execute({
      sql: "SELECT normText, articleId FROM mqt_aliases WHERE companyId=?",
      args: [companyId],
    })
  );
}

export async function saveAlias(
  companyId: number,
  normText: string,
  articleId: number
): Promise<void> {
  const c = await db();
  await c.execute({
    sql: `INSERT INTO mqt_aliases (companyId, normText, articleId) VALUES (?,?,?)
       ON CONFLICT(companyId, normText) DO UPDATE SET articleId=excluded.articleId`,
    args: [companyId, normText, articleId],
  });
}

// ── Orçamentos ────────────────────────────────────────────────────────

export async function listBudgets(companyId: number): Promise<Budget[]> {
  const c = await db();
  return rowsToObjects<Budget>(
    await c.execute({
      sql: "SELECT * FROM budgets WHERE companyId=? ORDER BY id DESC",
      args: [companyId],
    })
  );
}

/** True se o orçamento pertence à empresa — guarda para mutações. */
export async function budgetBelongsTo(
  companyId: number,
  budgetId: number
): Promise<boolean> {
  const c = await db();
  const rs = await c.execute({
    sql: "SELECT 1 AS ok FROM budgets WHERE id=? AND companyId=?",
    args: [budgetId, companyId],
  });
  return rs.rows.length > 0;
}

export async function getBudget(
  companyId: number,
  id: number
): Promise<BudgetFull | undefined> {
  const c = await db();
  const budget = firstRow<Budget>(
    await c.execute({
      sql: "SELECT * FROM budgets WHERE id=? AND companyId=?",
      args: [id, companyId],
    })
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

async function nextBudgetNumber(c: DbClient, companyId: number): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `ORC-${year}-`;
  const rs = await c.execute({
    sql: "SELECT COUNT(*) AS n FROM budgets WHERE companyId=? AND number LIKE ?",
    args: [companyId, `${prefix}%`],
  });
  return `${prefix}${String(scalar(rs, "n") + 1).padStart(3, "0")}`;
}

export async function createBudget(
  companyId: number,
  data: Pick<
    Budget,
    | "title" | "clientName" | "clientNif" | "clientEmail" | "clientPhone"
    | "siteAddress" | "vatMode"
  > & { clientId?: number | null },
  chapterNames: string[]
): Promise<number> {
  const c = await db();
  const company = await getCompany(companyId);
  const number = await nextBudgetNumber(c, companyId);
  const r = await c.execute({
    sql: `INSERT INTO budgets (companyId, number, title, clientId, clientName, clientNif, clientEmail,
       clientPhone, siteAddress, vatMode, materialMargin, laborMargin, laborRate, validityDays)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    args: [
      companyId, number, data.title, data.clientId ?? null, data.clientName, data.clientNif,
      data.clientEmail, data.clientPhone, data.siteAddress, data.vatMode, company.materialMargin,
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

export async function updateBudget(
  companyId: number,
  id: number,
  fields: Partial<Budget>
): Promise<void> {
  const c = await db();
  const allowed = [
    "title", "clientId", "clientName", "clientNif", "clientEmail", "clientPhone", "siteAddress",
    "vatMode", "materialMargin", "laborMargin", "laborRate", "validityDays",
    "laborOnly", "materialFeePct", "notes",
  ] as const;
  const keys = allowed.filter((k) => fields[k] !== undefined);
  if (keys.length === 0) return;
  const sets = keys.map((k) => `${k}=?`).join(", ");
  const values = keys.map((k) => fields[k] as string | number);
  await c.execute({
    sql: `UPDATE budgets SET ${sets}, updatedAt=datetime('now') WHERE id=? AND companyId=?`,
    args: [...values, id, companyId],
  });
}

export async function deleteBudget(companyId: number, id: number): Promise<void> {
  const c = await db();
  await c.batch(
    [
      {
        sql: `DELETE FROM budget_items WHERE chapterId IN
              (SELECT bc.id FROM budget_chapters bc JOIN budgets b ON b.id=bc.budgetId
               WHERE bc.budgetId=? AND b.companyId=?)`,
        args: [id, companyId],
      },
      {
        sql: `DELETE FROM budget_chapters WHERE budgetId IN
              (SELECT id FROM budgets WHERE id=? AND companyId=?)`,
        args: [id, companyId],
      },
      { sql: "DELETE FROM actual_costs WHERE budgetId=? AND companyId=?", args: [id, companyId] },
      { sql: "DELETE FROM budgets WHERE id=? AND companyId=?", args: [id, companyId] },
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

// ── Capítulos (scoped pelo budgetId; a ação verifica posse do orçamento) ──

export async function addChapter(budgetId: number, name: string): Promise<number> {
  const c = await db();
  const pr = await c.execute({
    sql: "SELECT COALESCE(MAX(position),-1)+1 AS p FROM budget_chapters WHERE budgetId=?",
    args: [budgetId],
  });
  const r = await c.execute({
    sql: "INSERT INTO budget_chapters (budgetId, name, position) VALUES (?,?,?)",
    args: [budgetId, name, scalar(pr, "p")],
  });
  await touchBudget(c, budgetId);
  return Number(r.lastInsertRowid);
}

export async function renameChapter(
  budgetId: number,
  chapterId: number,
  name: string
): Promise<void> {
  const c = await db();
  await c.execute({
    sql: "UPDATE budget_chapters SET name=? WHERE id=? AND budgetId=?",
    args: [name, chapterId, budgetId],
  });
}

export async function deleteChapter(budgetId: number, chapterId: number): Promise<void> {
  const c = await db();
  await c.batch(
    [
      {
        sql: `DELETE FROM budget_items WHERE chapterId IN
              (SELECT id FROM budget_chapters WHERE id=? AND budgetId=?)`,
        args: [chapterId, budgetId],
      },
      { sql: "DELETE FROM budget_chapters WHERE id=? AND budgetId=?", args: [chapterId, budgetId] },
    ],
    "write"
  );
}

// ── Itens (scoped pelo budgetId via capítulo) ─────────────────────────

export async function addItem(
  budgetId: number,
  chapterId: number,
  item: Pick<BudgetItem, "articleId" | "name" | "unit" | "quantity" | "materialCost" | "laborHours">
): Promise<number> {
  const c = await db();
  // o capítulo tem de pertencer ao orçamento indicado
  const chk = await c.execute({
    sql: "SELECT 1 AS ok FROM budget_chapters WHERE id=? AND budgetId=?",
    args: [chapterId, budgetId],
  });
  if (chk.rows.length === 0) return 0;
  const pr = await c.execute({
    sql: "SELECT COALESCE(MAX(position),-1)+1 AS p FROM budget_items WHERE chapterId=?",
    args: [chapterId],
  });
  const r = await c.execute({
    sql: "INSERT INTO budget_items (chapterId, articleId, name, unit, quantity, materialCost, laborHours, position) VALUES (?,?,?,?,?,?,?,?)",
    args: [
      chapterId, item.articleId, item.name, item.unit, item.quantity,
      item.materialCost, item.laborHours, scalar(pr, "p"),
    ],
  });
  await touchBudget(c, budgetId);
  return Number(r.lastInsertRowid);
}

const ITEM_IN_BUDGET =
  "chapterId IN (SELECT id FROM budget_chapters WHERE budgetId=?)";

export async function updateItem(
  budgetId: number,
  id: number,
  item: Pick<BudgetItem, "name" | "unit" | "quantity" | "materialCost" | "laborHours">
): Promise<void> {
  const c = await db();
  await c.execute({
    sql: `UPDATE budget_items SET name=?, unit=?, quantity=?, materialCost=?, laborHours=?
          WHERE id=? AND ${ITEM_IN_BUDGET}`,
    args: [item.name, item.unit, item.quantity, item.materialCost, item.laborHours, id, budgetId],
  });
}

export async function setItemMaterialIncluded(
  budgetId: number,
  id: number,
  included: boolean
): Promise<void> {
  const c = await db();
  await c.execute({
    sql: `UPDATE budget_items SET materialIncluded=? WHERE id=? AND ${ITEM_IN_BUDGET}`,
    args: [included ? 1 : 0, id, budgetId],
  });
}

export async function deleteItem(budgetId: number, id: number): Promise<void> {
  const c = await db();
  await c.execute({
    sql: `DELETE FROM budget_items WHERE id=? AND ${ITEM_IN_BUDGET}`,
    args: [id, budgetId],
  });
}

// ── Utilizadores e sessões ────────────────────────────────────────────

export async function countUsers(): Promise<number> {
  const c = await db();
  return scalar(await c.execute("SELECT COUNT(*) AS n FROM users"), "n");
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

export async function listUsers(companyId: number): Promise<User[]> {
  const c = await db();
  return rowsToObjects<User>(
    await c.execute({
      sql: "SELECT * FROM users WHERE companyId=? ORDER BY (role='owner') DESC, email",
      args: [companyId],
    })
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

export async function deleteUser(companyId: number, id: number): Promise<void> {
  const c = await db();
  await c.batch(
    [
      {
        sql: "DELETE FROM sessions WHERE userId IN (SELECT id FROM users WHERE id=? AND companyId=?)",
        args: [id, companyId],
      },
      { sql: "DELETE FROM users WHERE id=? AND companyId=?", args: [id, companyId] },
    ],
    "write"
  );
}

/** Cria sessão a expirar daqui a `days` dias (formato datetime do SQLite,
 *  para comparar corretamente com datetime('now')). */
export async function createSession(
  id: string,
  userId: number,
  days: number
): Promise<void> {
  const c = await db();
  await c.execute({
    sql: `INSERT INTO sessions (id, userId, expiresAt) VALUES (?,?, datetime('now', ?))`,
    args: [id, userId, `+${Math.round(days)} days`],
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

// ── Recuperação de palavra-passe ──────────────────────────────────────

export async function updateUserPassword(
  userId: number,
  passwordHash: string
): Promise<void> {
  const c = await db();
  await c.execute({
    sql: "UPDATE users SET passwordHash=? WHERE id=?",
    args: [passwordHash, userId],
  });
}

export async function createPasswordReset(
  token: string,
  userId: number,
  minutes: number
): Promise<void> {
  const c = await db();
  await c.batch(
    [
      { sql: "DELETE FROM password_resets WHERE userId=?", args: [userId] },
      {
        sql: "INSERT INTO password_resets (token, userId, expiresAt) VALUES (?,?, datetime('now', ?))",
        args: [token, userId, `+${Math.round(minutes)} minutes`],
      },
    ],
    "write"
  );
}

export async function getPasswordResetUserId(token: string): Promise<number | undefined> {
  const c = await db();
  const r = firstRow<{ userId: number }>(
    await c.execute({
      sql: "SELECT userId FROM password_resets WHERE token=? AND expiresAt > datetime('now')",
      args: [token],
    })
  );
  return r ? Number(r.userId) : undefined;
}

export async function deletePasswordReset(token: string): Promise<void> {
  const c = await db();
  await c.execute({ sql: "DELETE FROM password_resets WHERE token=?", args: [token] });
}

// ── Partilha de orçamento com o cliente ───────────────────────────────

/** Garante token de partilha + marca como enviado. Devolve o token (ou null). */
export async function prepareBudgetShare(
  companyId: number,
  budgetId: number,
  newToken: string
): Promise<string | null> {
  const c = await db();
  await c.execute({
    sql: `UPDATE budgets SET shareToken=COALESCE(shareToken, ?), status='SENT',
          sentAt=datetime('now') WHERE id=? AND companyId=?`,
    args: [newToken, budgetId, companyId],
  });
  const r = firstRow<{ shareToken: string | null }>(
    await c.execute({
      sql: "SELECT shareToken FROM budgets WHERE id=? AND companyId=?",
      args: [budgetId, companyId],
    })
  );
  return r ? r.shareToken ?? null : null;
}

/** Orçamento por token público (sem sessão) — para a página /p/[token]. */
export async function getBudgetByToken(token: string): Promise<BudgetFull | undefined> {
  const c = await db();
  const budget = firstRow<Budget>(
    await c.execute({ sql: "SELECT * FROM budgets WHERE shareToken=?", args: [token] })
  );
  if (!budget) return undefined;
  const chapters = rowsToObjects<BudgetChapter>(
    await c.execute({
      sql: "SELECT * FROM budget_chapters WHERE budgetId=? ORDER BY position, id",
      args: [budget.id],
    })
  );
  const items = rowsToObjects<BudgetItem>(
    await c.execute({
      sql: `SELECT bi.* FROM budget_items bi JOIN budget_chapters bc ON bc.id=bi.chapterId
            WHERE bc.budgetId=? ORDER BY bi.position, bi.id`,
      args: [budget.id],
    })
  );
  return {
    ...budget,
    chapters: chapters.map((ch) => ({ ...ch, items: items.filter((i) => i.chapterId === ch.id) })),
  };
}

/** Cliente aceita/recusa (só se ainda estiver SENT). Devolve o orçamento ou null. */
export async function decideBudget(
  token: string,
  decision: "ACCEPTED" | "REJECTED"
): Promise<Budget | undefined> {
  const c = await db();
  await c.execute({
    sql: "UPDATE budgets SET status=?, decidedAt=datetime('now') WHERE shareToken=? AND status='SENT'",
    args: [decision, token],
  });
  return firstRow<Budget>(
    await c.execute({ sql: "SELECT * FROM budgets WHERE shareToken=?", args: [token] })
  );
}

export async function listOwnerEmails(companyId: number): Promise<string[]> {
  const c = await db();
  return rowsToObjects<{ email: string }>(
    await c.execute({
      sql: "SELECT email FROM users WHERE companyId=? AND role='owner'",
      args: [companyId],
    })
  ).map((r) => r.email);
}

// ── Convites de equipa ────────────────────────────────────────────────

export type Invite = { token: string; companyId: number; email: string; role: string; expiresAt: string };

export async function createInvite(
  companyId: number,
  token: string,
  email: string,
  role: string,
  days: number
): Promise<void> {
  const c = await db();
  await c.batch(
    [
      {
        sql: "DELETE FROM invites WHERE companyId=? AND email=?",
        args: [companyId, email.trim().toLowerCase()],
      },
      {
        sql: "INSERT INTO invites (token, companyId, email, role, expiresAt) VALUES (?,?,?,?, datetime('now', ?))",
        args: [token, companyId, email.trim().toLowerCase(), role, `+${Math.round(days)} days`],
      },
    ],
    "write"
  );
}

export async function getInvite(token: string): Promise<Invite | undefined> {
  const c = await db();
  return firstRow<Invite>(
    await c.execute({
      sql: "SELECT * FROM invites WHERE token=? AND expiresAt > datetime('now')",
      args: [token],
    })
  );
}

export async function listInvites(companyId: number): Promise<Invite[]> {
  const c = await db();
  return rowsToObjects<Invite>(
    await c.execute({
      sql: "SELECT * FROM invites WHERE companyId=? ORDER BY email",
      args: [companyId],
    })
  );
}

export async function deleteInvite(token: string): Promise<void> {
  const c = await db();
  await c.execute({ sql: "DELETE FROM invites WHERE token=?", args: [token] });
}

export async function revokeInvite(companyId: number, token: string): Promise<void> {
  const c = await db();
  await c.execute({
    sql: "DELETE FROM invites WHERE token=? AND companyId=?",
    args: [token, companyId],
  });
}

// ── Exportar / apagar empresa (RGPD) ──────────────────────────────────

export async function exportCompanyData(companyId: number): Promise<unknown> {
  const [company, articles, budgetList, workers, expenses, users, clients] = await Promise.all([
    getCompany(companyId),
    listArticles(companyId),
    listBudgets(companyId),
    listWorkers(companyId),
    listExpenses(companyId),
    listUsers(companyId),
    listClients(companyId),
  ]);
  const budgets = await Promise.all(budgetList.map((b) => getBudget(companyId, b.id)));
  return {
    exportadoEm: new Date().toISOString(),
    empresa: company,
    utilizadores: users.map(({ passwordHash, ...u }) => u),
    clientes: clients,
    artigos: articles,
    orcamentos: budgets,
    trabalhadores: workers,
    despesas: expenses,
  };
}

/** Apaga a empresa e TODOS os dados associados (cascata explícita, atómica). */
export async function deleteCompany(companyId: number): Promise<void> {
  const c = await db();
  const a = [companyId];
  await c.batch(
    [
      {
        sql: `DELETE FROM budget_items WHERE chapterId IN
              (SELECT bc.id FROM budget_chapters bc JOIN budgets b ON b.id=bc.budgetId WHERE b.companyId=?)`,
        args: a,
      },
      { sql: "DELETE FROM budget_chapters WHERE budgetId IN (SELECT id FROM budgets WHERE companyId=?)", args: a },
      { sql: "DELETE FROM actual_costs WHERE companyId=?", args: a },
      { sql: "DELETE FROM budgets WHERE companyId=?", args: a },
      { sql: "DELETE FROM clients WHERE companyId=?", args: a },
      { sql: "DELETE FROM price_entries WHERE companyId=?", args: a },
      { sql: "DELETE FROM suppliers WHERE companyId=?", args: a },
      { sql: "DELETE FROM mqt_aliases WHERE companyId=?", args: a },
      { sql: "DELETE FROM articles WHERE companyId=?", args: a },
      { sql: "DELETE FROM workers WHERE companyId=?", args: a },
      { sql: "DELETE FROM expenses WHERE companyId=?", args: a },
      { sql: "DELETE FROM sessions WHERE userId IN (SELECT id FROM users WHERE companyId=?)", args: a },
      { sql: "DELETE FROM password_resets WHERE userId IN (SELECT id FROM users WHERE companyId=?)", args: a },
      { sql: "DELETE FROM invites WHERE companyId=?", args: a },
      { sql: "DELETE FROM users WHERE companyId=?", args: a },
      { sql: "DELETE FROM companies WHERE id=?", args: a },
    ],
    "write"
  );
}

// ── Fornecedores e preços ─────────────────────────────────────────────

export async function listSuppliers(companyId: number): Promise<Supplier[]> {
  const c = await db();
  return rowsToObjects<Supplier>(
    await c.execute({ sql: "SELECT * FROM suppliers WHERE companyId=? ORDER BY name", args: [companyId] })
  );
}

export async function createSupplier(companyId: number, name: string): Promise<number> {
  const c = await db();
  const r = await c.execute({
    sql: "INSERT INTO suppliers (companyId, name) VALUES (?,?)",
    args: [companyId, name.trim()],
  });
  return Number(r.lastInsertRowid);
}

export async function deleteSupplier(companyId: number, id: number): Promise<void> {
  const c = await db();
  // mantém o histórico (preserva supplierName), só desliga a referência
  await c.batch(
    [
      { sql: "UPDATE price_entries SET supplierId=NULL WHERE supplierId=? AND companyId=?", args: [id, companyId] },
      { sql: "DELETE FROM suppliers WHERE id=? AND companyId=?", args: [id, companyId] },
    ],
    "write"
  );
}

export async function listPriceEntries(
  companyId: number,
  articleId: number
): Promise<PriceEntry[]> {
  const c = await db();
  return rowsToObjects<PriceEntry>(
    await c.execute({
      sql: "SELECT * FROM price_entries WHERE companyId=? AND articleId=? ORDER BY date, id",
      args: [companyId, articleId],
    })
  );
}

export async function addPriceEntry(
  companyId: number,
  articleId: number,
  supplierId: number | null,
  supplierName: string,
  price: number,
  date: string
): Promise<number> {
  const c = await db();
  const r = await c.execute({
    sql: "INSERT INTO price_entries (companyId, articleId, supplierId, supplierName, price, date) VALUES (?,?,?,?,?,?)",
    args: [companyId, articleId, supplierId, supplierName, price, date],
  });
  return Number(r.lastInsertRowid);
}

export async function deletePriceEntry(companyId: number, id: number): Promise<void> {
  const c = await db();
  await c.execute({
    sql: "DELETE FROM price_entries WHERE id=? AND companyId=?",
    args: [id, companyId],
  });
}

/** Adota um custo no artigo (atualiza o materialCost usado nos orçamentos). */
export async function setArticleCost(
  companyId: number,
  articleId: number,
  materialCost: number
): Promise<void> {
  const c = await db();
  await c.execute({
    sql: "UPDATE articles SET materialCost=? WHERE id=? AND companyId=?",
    args: [materialCost, articleId, companyId],
  });
}

// ── Clientes ──────────────────────────────────────────────────────────

export async function listClients(companyId: number): Promise<Client[]> {
  const c = await db();
  return rowsToObjects<Client>(
    await c.execute({
      sql: "SELECT * FROM clients WHERE companyId=? ORDER BY name COLLATE NOCASE",
      args: [companyId],
    })
  );
}

export async function getClient(companyId: number, id: number): Promise<Client | undefined> {
  const c = await db();
  return firstRow<Client>(
    await c.execute({ sql: "SELECT * FROM clients WHERE id=? AND companyId=?", args: [id, companyId] })
  );
}

export type ClientInput = Pick<Client, "name" | "nif" | "email" | "phone" | "address" | "notes">;

export async function createClient(companyId: number, data: ClientInput): Promise<number> {
  const c = await db();
  const r = await c.execute({
    sql: "INSERT INTO clients (companyId, name, nif, email, phone, address, notes) VALUES (?,?,?,?,?,?,?)",
    args: [companyId, data.name, data.nif, data.email, data.phone, data.address, data.notes],
  });
  return Number(r.lastInsertRowid);
}

export async function updateClient(
  companyId: number,
  id: number,
  data: ClientInput
): Promise<void> {
  const c = await db();
  await c.execute({
    sql: "UPDATE clients SET name=?, nif=?, email=?, phone=?, address=?, notes=? WHERE id=? AND companyId=?",
    args: [data.name, data.nif, data.email, data.phone, data.address, data.notes, id, companyId],
  });
}

/** Apaga o cliente; os orçamentos ficam (clientId passa a NULL, guardam a cópia dos dados). */
export async function deleteClient(companyId: number, id: number): Promise<void> {
  const c = await db();
  await c.batch(
    [
      { sql: "UPDATE budgets SET clientId=NULL WHERE clientId=? AND companyId=?", args: [id, companyId] },
      { sql: "DELETE FROM clients WHERE id=? AND companyId=?", args: [id, companyId] },
    ],
    "write"
  );
}

/** Procura um cliente existente por NIF (se houver) e, em alternativa, por nome.
 *  Usado na deduplicação da migração e do import. */
export async function findClientByNifOrName(
  companyId: number,
  nif: string,
  name: string
): Promise<Client | undefined> {
  const c = await db();
  const cleanNif = nif.trim();
  if (cleanNif) {
    const byNif = firstRow<Client>(
      await c.execute({
        sql: "SELECT * FROM clients WHERE companyId=? AND nif<>'' AND nif=? LIMIT 1",
        args: [companyId, cleanNif],
      })
    );
    if (byNif) return byNif;
  }
  const cleanName = name.trim();
  if (!cleanName) return undefined;
  return firstRow<Client>(
    await c.execute({
      sql: "SELECT * FROM clients WHERE companyId=? AND name=? COLLATE NOCASE LIMIT 1",
      args: [companyId, cleanName],
    })
  );
}

/** Orçamentos de um cliente (ligados por clientId). */
export async function listBudgetsForClient(
  companyId: number,
  clientId: number
): Promise<Budget[]> {
  const c = await db();
  return rowsToObjects<Budget>(
    await c.execute({
      sql: "SELECT * FROM budgets WHERE companyId=? AND clientId=? ORDER BY id DESC",
      args: [companyId, clientId],
    })
  );
}

// ── Duplicar orçamento ────────────────────────────────────────────────

/** Cria uma cópia em rascunho de um orçamento (novo número, sem link/estado/datas). */
export async function duplicateBudget(
  companyId: number,
  budgetId: number
): Promise<number | null> {
  const src = await getBudget(companyId, budgetId);
  if (!src) return null;
  const c = await db();
  const number = await nextBudgetNumber(c, companyId);
  const r = await c.execute({
    sql: `INSERT INTO budgets (companyId, number, title, clientId, clientName, clientNif,
       clientEmail, clientPhone, siteAddress, vatMode, materialMargin, laborMargin, laborRate,
       validityDays, laborOnly, materialFeePct, notes)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    args: [
      companyId, number, `${src.title} (cópia)`, src.clientId ?? null, src.clientName,
      src.clientNif, src.clientEmail, src.clientPhone, src.siteAddress, src.vatMode,
      src.materialMargin, src.laborMargin, src.laborRate, src.validityDays, src.laborOnly,
      src.materialFeePct, src.notes,
    ],
  });
  const newId = Number(r.lastInsertRowid);
  for (const ch of src.chapters) {
    const chId = await addChapter(newId, ch.name);
    if (ch.items.length > 0) {
      await c.batch(
        ch.items.map((it, i) => ({
          sql: "INSERT INTO budget_items (chapterId, articleId, name, unit, quantity, materialCost, laborHours, materialIncluded, position) VALUES (?,?,?,?,?,?,?,?,?)",
          args: [chId, it.articleId, it.name, it.unit, it.quantity, it.materialCost, it.laborHours, it.materialIncluded, i],
        })),
        "write"
      );
    }
  }
  return newId;
}

/** Cria uma nova revisão de um orçamento: cópia em rascunho ligada ao
 *  orçamento base (revisionOf), numerada «BASE (Rev.N)». */
export async function createRevision(
  companyId: number,
  budgetId: number
): Promise<number | null> {
  const src = await getBudget(companyId, budgetId);
  if (!src) return null;
  const c = await db();
  const rootId = src.revisionOf ?? src.id;
  const root = firstRow<{ number: string }>(
    await c.execute({ sql: "SELECT number FROM budgets WHERE id=? AND companyId=?", args: [rootId, companyId] })
  );
  const baseNumber = root?.number ?? src.number;
  const existing = scalar(
    await c.execute({ sql: "SELECT COUNT(*) AS n FROM budgets WHERE companyId=? AND revisionOf=?", args: [companyId, rootId] }),
    "n"
  );
  const number = `${baseNumber} (Rev.${existing + 1})`;
  const r = await c.execute({
    sql: `INSERT INTO budgets (companyId, number, title, clientId, clientName, clientNif,
       clientEmail, clientPhone, siteAddress, vatMode, materialMargin, laborMargin, laborRate,
       validityDays, laborOnly, materialFeePct, notes, revisionOf)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    args: [
      companyId, number, src.title, src.clientId ?? null, src.clientName, src.clientNif,
      src.clientEmail, src.clientPhone, src.siteAddress, src.vatMode, src.materialMargin,
      src.laborMargin, src.laborRate, src.validityDays, src.laborOnly, src.materialFeePct,
      src.notes, rootId,
    ],
  });
  const newId = Number(r.lastInsertRowid);
  for (const ch of src.chapters) {
    const chId = await addChapter(newId, ch.name);
    if (ch.items.length > 0) {
      await c.batch(
        ch.items.map((it, i) => ({
          sql: "INSERT INTO budget_items (chapterId, articleId, name, unit, quantity, materialCost, laborHours, materialIncluded, position) VALUES (?,?,?,?,?,?,?,?,?)",
          args: [chId, it.articleId, it.name, it.unit, it.quantity, it.materialCost, it.laborHours, it.materialIncluded, i],
        })),
        "write"
      );
    }
  }
  return newId;
}

// ── Painel: orçamentos completos para cálculo de valores ──────────────

/** Todos os orçamentos da empresa com capítulos+itens (para somar valores no painel). */
export async function listBudgetsFull(companyId: number): Promise<BudgetFull[]> {
  const c = await db();
  const budgets = rowsToObjects<Budget>(
    await c.execute({ sql: "SELECT * FROM budgets WHERE companyId=? ORDER BY id DESC", args: [companyId] })
  );
  if (budgets.length === 0) return [];
  const chapters = rowsToObjects<BudgetChapter>(
    await c.execute({
      sql: `SELECT bc.* FROM budget_chapters bc JOIN budgets b ON b.id=bc.budgetId
            WHERE b.companyId=? ORDER BY bc.position, bc.id`,
      args: [companyId],
    })
  );
  const items = rowsToObjects<BudgetItem>(
    await c.execute({
      sql: `SELECT bi.* FROM budget_items bi
            JOIN budget_chapters bc ON bc.id=bi.chapterId
            JOIN budgets b ON b.id=bc.budgetId
            WHERE b.companyId=? ORDER BY bi.position, bi.id`,
      args: [companyId],
    })
  );
  const chaptersByBudget = new Map<number, BudgetChapter[]>();
  for (const ch of chapters) {
    const arr = chaptersByBudget.get(ch.budgetId) ?? [];
    arr.push(ch);
    chaptersByBudget.set(ch.budgetId, arr);
  }
  const itemsByChapter = new Map<number, BudgetItem[]>();
  for (const it of items) {
    const arr = itemsByChapter.get(it.chapterId) ?? [];
    arr.push(it);
    itemsByChapter.set(it.chapterId, arr);
  }
  return budgets.map((b) => ({
    ...b,
    chapters: (chaptersByBudget.get(b.id) ?? []).map((ch) => ({
      ...ch,
      items: itemsByChapter.get(ch.id) ?? [],
    })),
  }));
}

// ── Obras: custos reais (orçado vs. real) ─────────────────────────────

/** Muda o estado de um orçamento (ex.: marcar como aceite/ganho). */
export async function setBudgetStatus(
  companyId: number,
  budgetId: number,
  status: string
): Promise<void> {
  const c = await db();
  const decided = status === "ACCEPTED" || status === "REJECTED";
  await c.execute({
    sql: `UPDATE budgets SET status=?, decidedAt=${decided ? "COALESCE(decidedAt, datetime('now'))" : "decidedAt"}
          WHERE id=? AND companyId=?`,
    args: [status, budgetId, companyId],
  });
}

export async function listActualCosts(
  companyId: number,
  budgetId: number
): Promise<ActualCost[]> {
  const c = await db();
  return rowsToObjects<ActualCost>(
    await c.execute({
      sql: "SELECT * FROM actual_costs WHERE companyId=? AND budgetId=? ORDER BY date DESC, id DESC",
      args: [companyId, budgetId],
    })
  );
}

/** Todos os custos reais da empresa (para somar por obra na lista). */
export async function listActualCostsForCompany(companyId: number): Promise<ActualCost[]> {
  const c = await db();
  return rowsToObjects<ActualCost>(
    await c.execute({ sql: "SELECT * FROM actual_costs WHERE companyId=?", args: [companyId] })
  );
}

export async function addActualCost(
  companyId: number,
  budgetId: number,
  data: { date: string; category: string; description: string; amount: number; hours: number }
): Promise<number> {
  const c = await db();
  const r = await c.execute({
    sql: "INSERT INTO actual_costs (companyId, budgetId, date, category, description, amount, hours) VALUES (?,?,?,?,?,?,?)",
    args: [companyId, budgetId, data.date, data.category, data.description, data.amount, data.hours],
  });
  return Number(r.lastInsertRowid);
}

export async function deleteActualCost(companyId: number, id: number): Promise<void> {
  const c = await db();
  await c.execute({
    sql: "DELETE FROM actual_costs WHERE id=? AND companyId=?",
    args: [id, companyId],
  });
}
