import { listArticles, listAliases, getCompany } from "@/lib/db";
import MqtImporter from "@/components/MqtImporter";

export const dynamic = "force-dynamic";

export default async function ImportPage() {
  const [articles, aliases, company] = await Promise.all([
    listArticles(),
    listAliases(),
    getCompany(),
  ]);
  return <MqtImporter articles={articles} aliases={aliases} company={company} />;
}
