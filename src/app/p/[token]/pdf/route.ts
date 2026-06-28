import { renderToBuffer } from "@react-pdf/renderer";
import { getBudgetByToken, getCompany } from "@/lib/db";
import { BudgetPdf } from "@/lib/pdf";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const budget = await getBudgetByToken(token);
  if (!budget) return new Response("Não encontrado", { status: 404 });
  const company = await getCompany(budget.companyId);
  const buffer = await renderToBuffer(BudgetPdf({ budget, company, internal: false }));
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${budget.number}.pdf"`,
    },
  });
}
