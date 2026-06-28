import { getCompany } from "@/lib/db";
import CompanySettings from "@/components/CompanySettings";
import DangerZone from "@/components/DangerZone";
import { requireOwner } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requireOwner();
  const company = await getCompany(user.companyId);
  return (
    <div className="grid gap-2">
      <CompanySettings company={company} />
      <div className="max-w-2xl mx-auto w-full">
        <DangerZone companyName={company.name} />
      </div>
    </div>
  );
}
