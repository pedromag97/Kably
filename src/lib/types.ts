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
  position: number;
};

export type ChapterFull = BudgetChapter & { items: BudgetItem[] };
export type BudgetFull = Budget & { chapters: ChapterFull[] };
