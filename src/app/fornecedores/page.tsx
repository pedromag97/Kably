import { listSuppliers } from "@/lib/db";
import SuppliersManager from "@/components/SuppliersManager";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function SuppliersPage() {
  const user = await requireUser();
  const suppliers = await listSuppliers(user.companyId);
  return <SuppliersManager suppliers={suppliers} />;
}
