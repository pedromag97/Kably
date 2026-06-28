import { listArticles } from "@/lib/db";
import ArticlesManager from "@/components/ArticlesManager";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function ArticlesPage() {
  const user = await requireUser();
  const articles = await listArticles(user.companyId);
  return <ArticlesManager articles={articles} />;
}
