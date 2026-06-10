import { getCompany } from "@/lib/db";
import CompanySettings from "@/components/CompanySettings";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  const company = getCompany();
  return <CompanySettings company={company} />;
}
