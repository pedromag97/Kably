import { notFound } from "next/navigation";
import { getBudget, listArticles } from "@/lib/db";
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
  const articles = await listArticles(user.companyId);
  return <BudgetEditor budget={budget} articles={articles} />;
}
