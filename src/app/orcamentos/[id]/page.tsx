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
  await requireUser();
  const { id } = await params;
  const budget = await getBudget(Number(id));
  if (!budget) notFound();
  const articles = await listArticles();
  return <BudgetEditor budget={budget} articles={articles} />;
}
