import { listArticles } from "@/lib/db";
import ArticlesManager from "@/components/ArticlesManager";

export const dynamic = "force-dynamic";

export default function ArticlesPage() {
  const articles = listArticles();
  return <ArticlesManager articles={articles} />;
}
