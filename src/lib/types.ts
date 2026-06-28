export type Company = {
  id: number;
  name: string;
  nif: string;
  email: string;
  phone: string;
  address: string;
  logo: string; // data URL (base64)
  materialMargin: number; // % sobre custo de material
  laborMargin: number; // % sobre custo de mão de obra
  laborRate: number; // €/hora
  validityDays: number;
  conditions: string;
  targetProfitPct: number; // lucro-alvo usado na página de custos
};

export type UserRole = "owner" | "member";

export type User = {
  id: number;
  companyId: number;
  email: string;
  passwordHash: string;
  name: string;
  role: UserRole;
  createdAt: string;
};

export type Article = {
  id: number;
  companyId: number;
  code: string;
  name: string;
  category: string;
  unit: string;
  materialCost: number; // € por unidade
  laborHours: number; // horas por unidade
  notes: string;
};

export type VatMode = "NORMAL" | "REDUCED" | "REVERSE";

export type Budget = {
  id: number;
  companyId: number;
  number: string;
  title: string;
  clientName: string;
  clientNif: string;
  clientEmail: string;
  clientPhone: string;
  siteAddress: string;
  vatMode: VatMode;
  materialMargin: number;
  laborMargin: number;
  laborRate: number;
  validityDays: number;
  laborOnly: number; // 1 = só mão de obra (material fornecido pelo cliente)
  materialFeePct: number; // % de gestão sobre o material fornecido (só-MO)
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type BudgetChapter = {
  id: number;
  budgetId: number;
  name: string;
  position: number;
};

export type BudgetItem = {
  id: number;
  chapterId: number;
  articleId: number | null;
  name: string;
  unit: string;
  quantity: number;
  materialCost: number; // € por unidade
  laborHours: number; // horas por unidade
  materialIncluded: number; // exceção em orçamentos só-MO: 1 = esta linha fatura material
  position: number;
};

export type ChapterFull = BudgetChapter & { items: BudgetItem[] };
export type BudgetFull = Budget & { chapters: ChapterFull[] };

// ── Custos da empresa ─────────────────────────────────────────────────

export type Worker = {
  id: number;
  companyId: number;
  name: string;
  role: string;
  productive: number; // 1 = fatura horas em obra
  grossSalary: number; // bruto mensal €
  months: number; // meses pagos/ano (14 com subsídios)
  tsuPct: number; // % segurança social entidade patronal
  insurancePct: number; // % seguro acidentes de trabalho
  mealAllowance: number; // €/dia de subsídio de alimentação
  manualAnnualCost: number; // se > 0, substitui o cálculo automático
  workDays: number; // dias de trabalho/ano
  hoursPerDay: number;
  productivityPct: number; // % das horas que são faturáveis
  position: number;
};

export type ExpensePeriod = "MONTHLY" | "YEARLY" | "ONEOFF";

export type Expense = {
  id: number;
  companyId: number;
  category: string;
  name: string;
  amount: number;
  period: ExpensePeriod; // ONEOFF = pontual, amortizada em `years`
  years: number;
  position: number;
};
