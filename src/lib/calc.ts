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
};

type MarginParams = {
  materialMargin: number;
  laborMargin: number;
  laborRate: number;
  laborOnly?: number; // 1 = orçamento só de mão de obra
};

export function itemTotals(item: BudgetItem, b: MarginParams): ItemTotals {
  // Em orçamentos só-MO o material é do cliente — não se fatura,
  // salvo exceção marcada na linha (materialIncluded).
  const billsMaterial = !b.laborOnly || item.materialIncluded === 1;
  const materialCost = item.materialCost * item.quantity;
  const billedMaterial = billsMaterial ? materialCost : 0;
  const laborCost = item.laborHours * b.laborRate * item.quantity;
  const price =
    billedMaterial * (1 + b.materialMargin / 100) + laborCost * (1 + b.laborMargin / 100);
  return {
    materialCost,
    laborCost,
    cost: billedMaterial + laborCost,
    price,
    unitPrice: item.quantity > 0 ? price / item.quantity : 0,
    billsMaterial,
  };
}

export type ChapterTotals = { cost: number; price: number };

export type BudgetTotals = {
  materialCost: number; // material faturado (custo)
  suppliedMaterial: number; // material por conta do cliente (estimativa, não faturado)
  materialFee: number; // taxa de gestão sobre o material fornecido
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
