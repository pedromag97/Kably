import { notFound } from "next/navigation";
import Link from "next/link";
import { getArticle, listPriceEntries, listSuppliers } from "@/lib/db";
import ArticleDetail from "@/components/ArticleDetail";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function ArticleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const articleId = Number(id);
  if (!Number.isFinite(articleId)) notFound();

  const user = await requireUser();
  const article = await getArticle(user.companyId, articleId);
  if (!article) notFound();

  const [entries, suppliers] = await Promise.all([
    listPriceEntries(user.companyId, articleId),
    listSuppliers(user.companyId),
  ]);

  return (
    <div>
      <Link href="/artigos" className="text-sm text-blue-600 hover:underline">
        ← Voltar aos artigos
      </Link>
      <ArticleDetail article={article} entries={entries} suppliers={suppliers} />
    </div>
  );
}
