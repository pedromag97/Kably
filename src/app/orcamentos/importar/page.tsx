import { listArticles, listAliases, getCompany } from "@/lib/db";
import MqtImporter from "@/components/MqtImporter";

export const dynamic = "force-dynamic";

export default function ImportPage() {
  const articles = listArticles();
  const aliases = listAliases();
  const company = getCompany();
  return <MqtImporter articles={articles} aliases={aliases} company={company} />;
}
