import { notFound } from "next/navigation";
import Link from "next/link";
import { getBudget, listActualCosts, listBillingPhases } from "@/lib/db";
import { budgetTotals } from "@/lib/calc";
import ObraDetail from "@/components/ObraDetail";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function ObraPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const budgetId = Number(id);
  if (!Number.isFinite(budgetId)) notFound();

  const user = await requireUser();
  const budget = await getBudget(user.companyId, budgetId);
  if (!budget) notFound();
  const [costs, phases] = await Promise.all([
    listActualCosts(user.companyId, budgetId),
    listBillingPhases(user.companyId, budgetId),
  ]);

  const bt = budgetTotals(budget);
  const totalCIva = bt.total;
  const phasesWithValue = phases.map((p) => ({
    ...p,
    value: p.mode === "FIXED" ? p.amount : Math.round(totalCIva * (p.pct / 100) * 100) / 100,
  }));
  const sum = (cat: string) =>
    costs.filter((c) => c.category === cat).reduce((s, c) => s + c.amount, 0);
  const materialReal = sum("MATERIAL");
  const laborReal = sum("LABOR");
  const otherReal = sum("OTHER");
  const hoursReal = costs.reduce((s, c) => s + c.hours, 0);
  const custoReal = materialReal + laborReal + otherReal;

  const totals = {
    faturado: bt.subtotal,
    margemOrcada: bt.profit,
    materialOrcado: bt.materialCost,
    horasOrcadas: bt.laborHours,
    materialReal,
    laborReal,
    otherReal,
    hoursReal,
    custoReal,
    margemReal: bt.subtotal - custoReal,
  };

  return (
    <div>
      <Link href="/obras" className="text-sm text-blue-600 hover:underline">
        ← Voltar às obras
      </Link>
      <ObraDetail
        budget={{ id: budget.id, number: budget.number, title: budget.title, status: budget.status }}
        totals={totals}
        costs={costs}
        phases={phasesWithValue}
        totalCIva={totalCIva}
      />
    </div>
  );
}
