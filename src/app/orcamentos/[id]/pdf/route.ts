import type { NextRequest } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getBudget, getCompany } from "@/lib/db";
import { BudgetPdf } from "@/lib/pdf";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await getCurrentUser())) {
    return new Response("Não autorizado", { status: 401 });
  }
  const { id } = await params;
  const budget = await getBudget(Number(id));
  if (!budget) return new Response("Orçamento não encontrado", { status: 404 });

  const company = await getCompany();
  const internal = req.nextUrl.searchParams.get("v") === "interna";
  const buffer = await renderToBuffer(BudgetPdf({ budget, company, internal }));

  const filename = `${budget.number}${internal ? "-interno" : ""}.pdf`;
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
    },
  });
}
