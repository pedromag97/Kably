import { listArticles, listAliases, getCompany } from "@/lib/db";
import MqtImporter from "@/components/MqtImporter";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function ImportPage() {
  const user = await requireUser();
  const [articles, aliases, company] = await Promise.all([
    listArticles(user.companyId),
    listAliases(user.companyId),
    getCompany(user.companyId),
  ]);
  return <MqtImporter articles={articles} aliases={aliases} company={company} />;
}
