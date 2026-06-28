import { getCompany } from "@/lib/db";
import CompanySettings from "@/components/CompanySettings";
import { requireOwner } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requireOwner();
  const company = await getCompany(user.companyId);
  return <CompanySettings company={company} />;
}
