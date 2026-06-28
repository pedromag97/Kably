import { getCompany, listExpenses, listWorkers } from "@/lib/db";
import CompanyCosts from "@/components/CompanyCosts";

export const dynamic = "force-dynamic";

export default async function CostsPage() {
  const [company, workers, expenses] = await Promise.all([
    getCompany(),
    listWorkers(),
    listExpenses(),
  ]);
  return <CompanyCosts company={company} savedWorkers={workers} savedExpenses={expenses} />;
}
