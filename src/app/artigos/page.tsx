import { listArticles } from "@/lib/db";
import ArticlesManager from "@/components/ArticlesManager";

export const dynamic = "force-dynamic";

export default async function ArticlesPage() {
  const articles = await listArticles();
  return <ArticlesManager articles={articles} />;
}
