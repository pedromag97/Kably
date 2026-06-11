import { getCompany, listExpenses, listWorkers } from "@/lib/db";
import CompanyCosts from "@/components/CompanyCosts";

export const dynamic = "force-dynamic";

export default function CostsPage() {
  const company = getCompany();
  const workers = listWorkers();
  const expenses = listExpenses();
  return <CompanyCosts company={company} savedWorkers={workers} savedExpenses={expenses} />;
}
