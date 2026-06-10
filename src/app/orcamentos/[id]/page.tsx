import { notFound } from "next/navigation";
import { getBudget, listArticles } from "@/lib/db";
import BudgetEditor from "@/components/BudgetEditor";

export const dynamic = "force-dynamic";

export default async function BudgetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const budget = getBudget(Number(id));
  if (!budget) notFound();
  const articles = listArticles();
  return <BudgetEditor budget={budget} articles={articles} />;
}
