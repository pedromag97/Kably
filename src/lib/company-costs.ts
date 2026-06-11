// Cálculo da taxa horária de equilíbrio a partir dos custos da empresa.
// Funciona no browser (simulação em tempo real) e no servidor.
import type { Expense, Worker } from "./types";

export const EXPENSE_CATEGORIES = [
  "Viaturas",
  "Instalações e Admin",
  "Ferramenta e Equipamento",
  "Seguros e Licenças",
] as const;

export const PERIOD_LABELS: Record<string, string> = {
  MONTHLY: "€/mês",
  YEARLY: "€/ano",
  ONEOFF: "€ pontual",
};

type WorkerInput = Omit<Worker, "id" | "companyId" | "position">;
type ExpenseInput = Omit<Expense, "id" | "companyId" | "position">;

/** Custo anual de um trabalhador. Se manualAnnualCost > 0, esse valor
 *  (do contabilista) substitui o cálculo automático. */
export function workerAnnualCost(w: WorkerInput): number {
  if (w.manualAnnualCost > 0) return w.manualAnnualCost;
  const salary = w.grossSalary * w.months;
  const charges = salary * ((w.tsuPct + w.insurancePct) / 100);
  const meals = w.mealAllowance * w.workDays;
  return salary + charges + meals;
}

/** Horas faturáveis/ano de um trabalhador (0 se não produtivo). */
export function workerBillableHours(w: WorkerInput): number {
  if (!w.productive) return 0;
  return w.workDays * w.hoursPerDay * (w.productivityPct / 100);
}

/** Custo anual de uma despesa (pontuais amortizadas pelos anos de vida útil). */
export function expenseAnnualCost(e: ExpenseInput): number {
  if (e.period === "MONTHLY") return e.amount * 12;
  if (e.period === "YEARLY") return e.amount;
  return e.amount / Math.max(1, e.years); // ONEOFF
}

export type CostsResult = {
  staffCost: number;
  expensesCost: number;
  expensesByCategory: Map<string, number>;
  totalCost: number;
  billableHours: number;
  productiveCount: number;
  breakEvenRate: number; // €/h para cobrir custos
  targetRate: number; // €/h com lucro-alvo
  annualProfitAtTarget: number; // € de lucro/ano se faturar todas as horas à targetRate
};

export function computeCosts(
  workers: WorkerInput[],
  expenses: ExpenseInput[],
  targetProfitPct: number
): CostsResult {
  const staffCost = workers.reduce((s, w) => s + workerAnnualCost(w), 0);
  const expensesByCategory = new Map<string, number>();
  let expensesCost = 0;
  for (const e of expenses) {
    const v = expenseAnnualCost(e);
    expensesCost += v;
    expensesByCategory.set(e.category, (expensesByCategory.get(e.category) ?? 0) + v);
  }
  const totalCost = staffCost + expensesCost;
  const billableHours = workers.reduce((s, w) => s + workerBillableHours(w), 0);
  const breakEvenRate = billableHours > 0 ? totalCost / billableHours : 0;
  const targetRate = breakEvenRate * (1 + targetProfitPct / 100);
  return {
    staffCost,
    expensesCost,
    expensesByCategory,
    totalCost,
    billableHours,
    productiveCount: workers.filter((w) => w.productive).length,
    breakEvenRate,
    targetRate,
    annualProfitAtTarget: (targetRate - breakEvenRate) * billableHours,
  };
}

export function newWorker(): WorkerInput {
  return {
    name: "",
    role: "Oficial eletricista",
    productive: 1,
    grossSalary: 1100,
    months: 14,
    tsuPct: 23.75,
    insurancePct: 1.5,
    mealAllowance: 6,
    manualAnnualCost: 0,
    workDays: 210,
    hoursPerDay: 8,
    productivityPct: 65,
  };
}

export function newExpense(category: string): ExpenseInput {
  return { category, name: "", amount: 0, period: "MONTHLY", years: 1 };
}
