import Link from "next/link";
import {
  listBudgetsFull,
  listActualCostsForCompany,
  listBillingPhasesForCompany,
} from "@/lib/db";
import { budgetTotals, eur } from "@/lib/calc";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function ObrasPage() {
  const user = await requireUser();
  const [budgets, costs, phases] = await Promise.all([
    listBudgetsFull(user.companyId),
    listActualCostsForCompany(user.companyId),
    listBillingPhasesForCompany(user.companyId),
  ]);

  const realByBudget = new Map<number, number>();
  for (const c of costs) {
    realByBudget.set(c.budgetId, (realByBudget.get(c.budgetId) ?? 0) + c.amount);
  }
  const phasesByBudget = new Map<number, typeof phases>();
  for (const p of phases) {
    const arr = phasesByBudget.get(p.budgetId) ?? [];
    arr.push(p);
    phasesByBudget.set(p.budgetId, arr);
  }

  const obras = budgets
    .filter((b) => b.status === "ACCEPTED")
    .map((b) => {
      const bt = budgetTotals(b);
      const faturado = bt.subtotal;
      const real = realByBudget.get(b.id) ?? 0;
      const margem = faturado - real;
      const pct = faturado > 0 ? Math.round((margem / faturado) * 100) : null;
      // por receber: fases faturadas mas não pagas (valor sobre o total c/IVA)
      const toReceive = (phasesByBudget.get(b.id) ?? [])
        .filter((p) => p.status === "INVOICED")
        .reduce((s, p) => s + (p.mode === "FIXED" ? p.amount : (bt.total * p.pct) / 100), 0);
      return { b, faturado, real, margem, pct, toReceive };
    });

  const totalToReceive = obras.reduce((s, o) => s + o.toReceive, 0);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Obras</h1>
      <p className="text-sm text-slate-500 mb-4">
        Orçamentos aceites. Regista os custos reais e a faturação de cada obra.
      </p>

      {totalToReceive > 0.005 && (
        <div className="mb-5 bg-blue-50 border border-blue-200 text-blue-800 rounded-lg px-4 py-3 text-sm">
          <strong>{eur(totalToReceive)}</strong> faturado e ainda por receber no total das obras.
        </div>
      )}

      {obras.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-500">
          <p className="text-lg mb-2">Ainda não há obras.</p>
          <p className="text-sm">
            Um orçamento vira obra quando é <strong>aceite</strong> — pelo cliente (no link
            que lhe envias) ou marcando-o como aceite no editor do orçamento.
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {obras.map(({ b, faturado, real, margem, pct, toReceive }) => (
            <Link
              key={b.id}
              href={`/obras/${b.id}`}
              className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap items-center gap-x-6 gap-y-2 hover:border-blue-300 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-3">
                  <span className="font-mono text-xs text-slate-500">{b.number}</span>
                  <span className="font-semibold truncate">{b.title}</span>
                </div>
                <div className="text-sm text-slate-500 mt-1">
                  {b.clientName || "Sem cliente"}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-400">Faturado</div>
                <div className="font-medium">{eur(faturado)}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-400">Custo real</div>
                <div className="font-medium">{eur(real)}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-400">Por receber</div>
                <div className={`font-medium ${toReceive > 0.005 ? "text-blue-700" : "text-slate-400"}`}>
                  {eur(toReceive)}
                </div>
              </div>
              <div className="text-right min-w-[90px]">
                <div className="text-xs text-slate-400">Margem real</div>
                <div className={`font-bold ${margem >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                  {eur(margem)}
                  {pct !== null && <span className="text-xs font-medium"> ({pct}%)</span>}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
