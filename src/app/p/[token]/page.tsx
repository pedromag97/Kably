import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  decideBudget,
  getBudgetByToken,
  getCompany,
  listOwnerEmails,
} from "@/lib/db";
import { budgetTotals, eur, itemTotals, num, VAT_MODES } from "@/lib/calc";
import { emailLayout, sendEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

async function decideAction(fd: FormData) {
  "use server";
  const token = String(fd.get("token") ?? "");
  const decision = String(fd.get("decision")) === "ACCEPTED" ? "ACCEPTED" : "REJECTED";
  const budget = await decideBudget(token, decision);
  if (budget) {
    const label = decision === "ACCEPTED" ? "aceite" : "recusado";
    const emails = await listOwnerEmails(budget.companyId);
    await Promise.all(
      emails.map((to) =>
        sendEmail({
          to,
          subject: `Orçamento ${budget.number} ${label}`,
          html: emailLayout(
            `Orçamento ${label}`,
            `<p>O cliente <strong>${label === "aceite" ? "aceitou" : "recusou"}</strong> o orçamento <strong>${budget.number}</strong>${budget.title ? ` — ${budget.title}` : ""}.</p>`
          ),
        })
      )
    );
  }
  revalidatePath(`/p/${token}`);
  redirect(`/p/${token}`);
}

export default async function PublicBudgetPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const budget = await getBudgetByToken(token);
  if (!budget) notFound();
  const company = await getCompany(budget.companyId);
  const totals = budgetTotals(budget);
  const vat = VAT_MODES[budget.vatMode] ?? VAT_MODES.NORMAL;
  const decided = budget.status === "ACCEPTED" || budget.status === "REJECTED";

  return (
    <div className="max-w-3xl mx-auto grid gap-5">
      {/* Estado */}
      {budget.status === "ACCEPTED" && (
        <div className="bg-emerald-50 text-emerald-800 rounded-xl px-4 py-3 text-sm font-medium">
          ✓ Orçamento aceite. Obrigado!
        </div>
      )}
      {budget.status === "REJECTED" && (
        <div className="bg-red-50 text-red-700 rounded-xl px-4 py-3 text-sm font-medium">
          Orçamento recusado.
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 grid gap-6">
        {/* Cabeçalho da empresa */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="grid gap-1">
            {company.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={company.logo} alt={company.name} className="h-12 w-auto mb-1" />
            ) : null}
            <div className="font-bold text-slate-800">{company.name}</div>
            <div className="text-xs text-slate-500">
              {[company.nif && `NIF ${company.nif}`, company.phone, company.email]
                .filter(Boolean)
                .join(" · ")}
            </div>
          </div>
          <div className="text-right">
            <div className="text-blue-700 font-bold text-lg">ORÇAMENTO</div>
            <div className="font-mono text-sm">{budget.number}</div>
            <div className="text-xs text-slate-500 mt-1">
              Validade: {budget.validityDays} dias
            </div>
          </div>
        </div>

        {/* Cliente + título */}
        <div>
          <div className="text-xs text-slate-400 uppercase">Cliente</div>
          <div className="font-semibold">{budget.clientName || "—"}</div>
          {budget.siteAddress ? (
            <div className="text-sm text-slate-500">Local: {budget.siteAddress}</div>
          ) : null}
          <h1 className="text-xl font-bold mt-3">{budget.title}</h1>
          {budget.laborOnly === 1 && (
            <p className="text-xs bg-amber-50 text-amber-800 rounded-md px-2 py-1 mt-2 inline-block">
              Orçamento de mão de obra — material por conta do cliente.
            </p>
          )}
        </div>

        {/* Capítulos */}
        <div className="grid gap-4">
          {budget.chapters
            .filter((ch) => ch.items.length > 0)
            .map((ch, ci) => {
              const chT = totals.byChapter.get(ch.id);
              return (
                <div key={ch.id}>
                  <div className="flex justify-between bg-slate-900 text-white rounded-t-md px-3 py-2 text-sm font-semibold">
                    <span>
                      {ci + 1}. {ch.name}
                    </span>
                    <span>{eur(chT?.price ?? 0)}</span>
                  </div>
                  <table className="w-full text-sm border border-t-0 border-slate-100">
                    <tbody>
                      {ch.items.map((item, ii) => {
                        const t = itemTotals(item, budget);
                        return (
                          <tr key={item.id} className="border-b border-slate-50">
                            <td className="px-3 py-2 text-slate-600">
                              {ci + 1}.{ii + 1} {item.name || "—"}
                            </td>
                            <td className="px-2 py-2 text-right text-slate-400 whitespace-nowrap">
                              {num(item.quantity)} {item.unit}
                            </td>
                            <td className="px-3 py-2 text-right font-medium whitespace-nowrap">
                              {eur(t.price)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })}
        </div>

        {/* Totais */}
        <div className="grid gap-1 justify-self-end w-full sm:w-72 text-sm">
          {totals.materialFee > 0 && (
            <div className="flex justify-between text-slate-500">
              <span>Gestão de material</span>
              <span>{eur(totals.materialFee)}</span>
            </div>
          )}
          <div className="flex justify-between text-slate-500">
            <span>Subtotal (s/ IVA)</span>
            <span>{eur(totals.subtotal)}</span>
          </div>
          <div className="flex justify-between text-slate-500">
            <span>{vat.label}</span>
            <span>{eur(totals.vat)}</span>
          </div>
          <div className="flex justify-between font-bold text-lg bg-blue-600 text-white rounded-md px-3 py-2 mt-1">
            <span>Total</span>
            <span>{eur(totals.total)}</span>
          </div>
        </div>

        {vat.pdfNote ? <p className="text-xs text-slate-400">{vat.pdfNote}</p> : null}
        {budget.notes ? (
          <div>
            <div className="font-semibold text-sm">Notas</div>
            <p className="text-sm text-slate-500 whitespace-pre-line">{budget.notes}</p>
          </div>
        ) : null}
        {company.conditions ? (
          <div>
            <div className="font-semibold text-sm">Condições</div>
            <p className="text-sm text-slate-500 whitespace-pre-line">{company.conditions}</p>
          </div>
        ) : null}

        <a
          href={`/p/${token}/pdf`}
          target="_blank"
          className="text-sm text-blue-600 hover:underline justify-self-start"
        >
          ⬇ Descarregar PDF
        </a>
      </div>

      {/* Aceitar / recusar */}
      {!decided && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 grid gap-3 text-center">
          <p className="text-sm text-slate-600">Que decisão tomas sobre este orçamento?</p>
          <div className="flex gap-3 justify-center">
            <form action={decideAction}>
              <input type="hidden" name="token" value={token} />
              <input type="hidden" name="decision" value="ACCEPTED" />
              <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-lg font-semibold">
                Aceitar orçamento
              </button>
            </form>
            <form action={decideAction}>
              <input type="hidden" name="token" value={token} />
              <input type="hidden" name="decision" value="REJECTED" />
              <button className="bg-white border border-slate-300 hover:border-red-400 text-slate-600 px-5 py-2.5 rounded-lg font-medium">
                Recusar
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
