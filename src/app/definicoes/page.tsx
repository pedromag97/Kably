import { getCompany } from "@/lib/db";
import CompanySettings from "@/components/CompanySettings";
import { requireOwner } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  await requireOwner();
  const company = await getCompany();
  return <CompanySettings company={company} />;
}
