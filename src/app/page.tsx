import Link from "next/link";
import { listBudgets, getBudget } from "@/lib/db";
import { budgetTotals, eur, VAT_MODES } from "@/lib/calc";
import { deleteBudgetAction } from "./actions";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  await requireUser();
  const budgets = await listBudgets();
  const withTotals = await Promise.all(
    budgets.map(async (b) => ({ b, totals: budgetTotals((await getBudget(b.id))!) }))
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Orçamentos</h1>
        <div className="flex gap-2">
          <Link
            href="/orcamentos/importar"
            className="bg-white border border-slate-300 hover:border-blue-400 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium"
          >
            ⬆ Importar MQT
          </Link>
          <Link
            href="/orcamentos/novo"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            + Novo orçamento
          </Link>
        </div>
      </div>

      {budgets.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-500">
          <p className="text-lg mb-2">Ainda não há orçamentos.</p>
          <p className="text-sm">
            Cria o primeiro em <strong>+ Novo orçamento</strong>. A base de artigos com
            preços de referência já está carregada.
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {withTotals.map(({ b, totals: t }) => {
            return (
              <div
                key={b.id}
                className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4 hover:border-blue-300 transition-colors"
              >
                <Link href={`/orcamentos/${b.id}`} className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-3">
                    <span className="font-mono text-xs text-slate-500">{b.number}</span>
                    <span className="font-semibold truncate">{b.title}</span>
                  </div>
                  <div className="text-sm text-slate-500 mt-1">
                    {b.clientName || "Sem cliente"} ·{" "}
                    {VAT_MODES[b.vatMode]?.label ?? b.vatMode} ·{" "}
                    {new Date(b.createdAt + "Z").toLocaleDateString("pt-PT")}
                  </div>
                </Link>
                <div className="text-right">
                  <div className="font-bold">{eur(t.total)}</div>
                  <div className="text-xs text-slate-500">c/ IVA</div>
                </div>
                <form
                  action={async () => {
                    "use server";
                    await deleteBudgetAction(b.id);
                  }}
                >
                  <button
                    type="submit"
                    className="text-slate-400 hover:text-red-600 px-2 py-1 text-sm"
                    title="Apagar orçamento"
                  >
                    ✕
                  </button>
                </form>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
