import { notFound } from "next/navigation";
import Link from "next/link";
import { getClient, listBudgetsForClient, getBudget } from "@/lib/db";
import { budgetTotals } from "@/lib/calc";
import ClientDetail from "@/components/ClientDetail";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const clientId = Number(id);
  if (!Number.isFinite(clientId)) notFound();

  const user = await requireUser();
  const client = await getClient(user.companyId, clientId);
  if (!client) notFound();

  const budgetRows = await listBudgetsForClient(user.companyId, clientId);
  const budgets = await Promise.all(
    budgetRows.map(async (b) => {
      const full = await getBudget(user.companyId, b.id);
      return {
        id: b.id,
        number: b.number,
        title: b.title,
        status: b.status,
        createdAt: b.createdAt,
        total: full ? budgetTotals(full).total : 0,
      };
    })
  );

  const won = budgets.filter((b) => b.status === "ACCEPTED").reduce((s, b) => s + b.total, 0);
  const pending = budgets.filter((b) => b.status === "SENT").reduce((s, b) => s + b.total, 0);
  const everSent = budgets.filter((b) => ["SENT", "ACCEPTED", "REJECTED"].includes(b.status)).length;
  const accepted = budgets.filter((b) => b.status === "ACCEPTED").length;
  const conversion = everSent > 0 ? Math.round((accepted / everSent) * 100) : null;

  return (
    <div>
      <Link href="/clientes" className="text-sm text-blue-600 hover:underline">
        ← Voltar aos clientes
      </Link>
      <ClientDetail
        client={client}
        budgets={budgets}
        totals={{ won, pending, conversion }}
      />
    </div>
  );
}
