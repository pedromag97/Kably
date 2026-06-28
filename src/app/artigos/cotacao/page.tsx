import { listArticles, listAliases, listSuppliers } from "@/lib/db";
import QuoteImporter from "@/components/QuoteImporter";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function QuoteImportPage() {
  const user = await requireUser();
  const [articles, aliases, suppliers] = await Promise.all([
    listArticles(user.companyId),
    listAliases(user.companyId),
    listSuppliers(user.companyId),
  ]);
  return <QuoteImporter articles={articles} aliases={aliases} suppliers={suppliers} />;
}
