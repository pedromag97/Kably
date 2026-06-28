import { getCompany, listExpenses, listWorkers } from "@/lib/db";
import CompanyCosts from "@/components/CompanyCosts";
import { requireOwner } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function CostsPage() {
  const user = await requireOwner();
  const [company, workers, expenses] = await Promise.all([
    getCompany(user.companyId),
    listWorkers(user.companyId),
    listExpenses(user.companyId),
  ]);
  return <CompanyCosts company={company} savedWorkers={workers} savedExpenses={expenses} />;
}
