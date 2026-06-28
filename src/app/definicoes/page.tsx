import { getCompany } from "@/lib/db";
import CompanySettings from "@/components/CompanySettings";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const company = await getCompany();
  return <CompanySettings company={company} />;
}
