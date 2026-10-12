import type { BudgetFull, BudgetItem, VatMode } from "./types";

export const VAT_MODES: Record<VatMode, { rate: number; label: string; pdfNote: string }> = {
  NORMAL: { rate: 0.23, label: "IVA 23%", pdfNote: "" },
  REDUCED: { rate: 0.06, label: "IVA 6% (reabilitação)", pdfNote: "" },
  REVERSE: {
    rate: 0,
    label: "IVA — autoliquidação",
    pdfNote:
      "IVA — autoliquidação: IVA devido pelo adquirente (artigo 2.º, n.º 1, alínea j) do CIVA).",
  },
};

export type ItemTotals = {
  materialCost: number; // valor total de material (mesmo quando não faturado)
  laborCost: number; // custo total de mão de obra
  cost: number; // custo efetivo (material faturado + MO)
  price: number; // preço de venda (com margens, sem IVA)
  unitPrice: number; // preço de venda unitário
  billsMaterial: boolean; // esta linha fatura material?
  billsLabor: boolean; // esta linha fatura mão de obra?
};

type MarginParams = {
  materialMargin: number;
  laborMargin: number;
  laborRate: number;
  laborOnly?: number; // 1 = orçamento só de mão de obra
  materialOnly?: number; // 1 = orçamento só de fornecimento de material
};

export function itemTotals(item: BudgetItem, b: MarginParams): ItemTotals {
  // Em orçamentos só-MO o material é do cliente — não se fatura,
  // salvo exceção marcada na linha (materialIncluded).
  const billsMaterial = !b.laborOnly || item.materialIncluded === 1;
  // Em orçamentos só-material a montagem é de outrem — as horas ficam como
  // estimativa, mas não entram no preço.
  const billsLabor = !b.materialOnly;
  const materialCost = item.materialCost * item.quantity;
  const billedMaterial = billsMaterial ? materialCost : 0;
  const laborCost = billsLabor ? item.laborHours * b.laborRate * item.quantity : 0;
  const price =
    billedMaterial * (1 + b.materialMargin / 100) + laborCost * (1 + b.laborMargin / 100);
  return {
    materialCost,
    laborCost,
    cost: billedMaterial + laborCost,
    price,
    unitPrice: item.quantity > 0 ? price / item.quantity : 0,
    billsMaterial,
    billsLabor,
  };
}

export type ChapterTotals = { cost: number; price: number };

export type BudgetTotals = {
  materialCost: number; // material faturado (custo)
  suppliedMaterial: number; // material por conta do cliente (estimativa, não faturado)
  materialFee: number; // taxa de gestão sobre o material fornecido
  unbilledLabor: number; // mão de obra não faturada (orçamentos só-material)
  laborCost: number;
  laborHours: number; // total de horas de mão de obra
  cost: number;
  subtotal: number; // sem IVA (inclui taxa de gestão)
  vatRate: number;
  vat: number;
  total: number;
  profit: number; // subtotal - custo
  byChapter: Map<number, ChapterTotals>;
};

export function budgetTotals(b: BudgetFull): BudgetTotals {
  let materialCost = 0;
  let suppliedMaterial = 0;
  let laborCost = 0;
  let unbilledLabor = 0;
  let laborHours = 0;
  let subtotal = 0;
  const byChapter = new Map<number, ChapterTotals>();
  for (const ch of b.chapters) {
    let chCost = 0;
    let chPrice = 0;
    for (const item of ch.items) {
      const t = itemTotals(item, b);
      if (t.billsMaterial) materialCost += t.materialCost;
      else suppliedMaterial += t.materialCost;
      laborCost += t.laborCost;
      if (!t.billsLabor)
        unbilledLabor += item.laborHours * b.laborRate * item.quantity;
      laborHours += item.laborHours * item.quantity;
      chCost += t.cost;
      chPrice += t.price;
    }
    subtotal += chPrice;
    byChapter.set(ch.id, { cost: chCost, price: chPrice });
  }
  const materialFee = b.laborOnly
    ? suppliedMaterial * ((b.materialFeePct ?? 0) / 100)
    : 0;
  subtotal += materialFee;
  const vatRate = VAT_MODES[b.vatMode]?.rate ?? 0.23;
  const vat = subtotal * vatRate;
  return {
    materialCost,
    suppliedMaterial,
    materialFee,
    unbilledLabor,
    laborCost,
    laborHours,
    cost: materialCost + laborCost,
    subtotal,
    vatRate,
    vat,
    total: subtotal + vat,
    profit: subtotal - (materialCost + laborCost),
    byChapter,
  };
}

const eurFmt = new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" });
const numFmt = new Intl.NumberFormat("pt-PT", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function eur(n: number): string {
  return eurFmt.format(Math.round(n * 100) / 100);
}

export function num(n: number): string {
  return numFmt.format(n);
}

// ── Leitura humana dos tempos de mão de obra ──────────────────────────
// As horas/unidade são difíceis de sentir. Estas duas conversões são o que
// permite validar uma estimativa de relance ("27 tomadas num dia? bate certo").

/**
 * h/unidade ⇄ unidades/hora. São inversos: 0,25 h/un = 4 un/h.
 * A BD guarda sempre h/un; isto é só a forma de escrever/ler.
 */
export function invertRate(v: number): number {
  return v > 0 ? 1 / v : 0;
}

/**
 * Texto a mostrar no campo de mão de obra conforme a vista escolhida.
 * O valor exato (h/un) guarda-se à parte — trocar de vista nunca deve
 * alterar o preço por arredondamento do ida-e-volta.
 */
export function laborFieldText(hours: number, mode: "H" | "R"): string {
  if (!hours) return mode === "H" ? String(hours) : "";
  return mode === "H"
    ? String(hours)
    : String(Math.round(invertRate(hours) * 10000) / 10000);
}

/** Unidades por hora, ex.: 0,25 h/un → "4 un/h". */
export function perHourLabel(hours: number): string {
  if (!hours) return "—";
  const n = invertRate(hours);
  return numFmt.format(n >= 10 ? Math.round(n) : Math.round(n * 100) / 100);
}

/** Horas por unidade em minutos, ex.: 0,3 h → "18 min". */
export function minutesLabel(hours: number): string {
  if (!hours) return "—";
  const m = hours * 60;
  return `${numFmt.format(m < 10 ? Math.round(m * 10) / 10 : Math.round(m))} min`;
}

/** Quantas unidades num dia de trabalho, ex.: 0,3 h → "27". */
export function perDayLabel(hours: number, hoursPerDay = 8): string {
  if (!hours) return "—";
  const n = hoursPerDay / hours;
  return numFmt.format(n >= 10 ? Math.round(n) : Math.round(n * 10) / 10);
}
