import { notFound } from "next/navigation";
import { getBudget, listArticles, listClients } from "@/lib/db";
import BudgetEditor from "@/components/BudgetEditor";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function BudgetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const budget = await getBudget(user.companyId, Number(id));
  if (!budget) notFound();
  const [articles, clients] = await Promise.all([
    listArticles(user.companyId),
    listClients(user.companyId),
  ]);
  // se for revisão, carrega o número do orçamento base para o crachá
  let revisionBase: { id: number; number: string } | null = null;
  if (budget.revisionOf) {
    const base = await getBudget(user.companyId, budget.revisionOf);
    if (base) revisionBase = { id: base.id, number: base.number };
  }
  return (
    <BudgetEditor
      budget={budget}
      articles={articles}
      clients={clients}
      revisionBase={revisionBase}
    />
  );
}
