import type { NextRequest } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getBudget, getCompany, listBillingPhases } from "@/lib/db";
import { budgetTotals } from "@/lib/calc";
import { AutoMedicaoPdf } from "@/lib/pdf";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; phase: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return new Response("Não autorizado", { status: 401 });

  const { id, phase: phaseParam } = await params;
  const budget = await getBudget(user.companyId, Number(id));
  if (!budget) return new Response("Obra não encontrada", { status: 404 });

  const phases = await listBillingPhases(user.companyId, budget.id);
  const idx = phases.findIndex((p) => p.id === Number(phaseParam));
  if (idx < 0) return new Response("Fase não encontrada", { status: 404 });
  const ph = phases[idx];

  const company = await getCompany(user.companyId);
  const totalCIva = budgetTotals(budget).total;
  const value =
    ph.mode === "FIXED" ? ph.amount : Math.round(totalCIva * (ph.pct / 100) * 100) / 100;
  const emittedAt = new Date().toLocaleDateString("pt-PT");

  const buffer = await renderToBuffer(
    AutoMedicaoPdf({
      budget,
      company,
      phase: {
        label: ph.label,
        mode: ph.mode,
        pct: ph.pct,
        value,
        index: idx + 1,
        total: phases.length,
      },
      emittedAt,
    })
  );

  const filename = `auto-${budget.number}-fase${idx + 1}.pdf`.replace(/[^\w.\-]+/g, "_");
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
    },
  });
}
