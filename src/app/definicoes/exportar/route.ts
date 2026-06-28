import { exportCompanyData } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "owner") {
    return new Response("Não autorizado", { status: 403 });
  }
  const data = await exportCompanyData(user.companyId);
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="kably-dados.json"`,
    },
  });
}
