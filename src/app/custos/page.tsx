import { getCompany, listExpenses, listWorkers } from "@/lib/db";
import CompanyCosts from "@/components/CompanyCosts";
import { requireOwner } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function CostsPage() {
  await requireOwner();
  const [company, workers, expenses] = await Promise.all([
    getCompany(),
    listWorkers(),
    listExpenses(),
  ]);
  return <CompanyCosts company={company} savedWorkers={workers} savedExpenses={expenses} />;
}
