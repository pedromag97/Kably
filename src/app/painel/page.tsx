import Link from "next/link";
import { getCompany, listBudgetsFull, listBillingPhasesForCompany } from "@/lib/db";
import { budgetTotals, eur } from "@/lib/calc";
import { requireUser } from "@/lib/session";
import type { BudgetFull } from "@/lib/types";

export const dynamic = "force-dynamic";

type Period = "mes" | "tri" | "ano" | "tudo";
const PERIODS: { key: Period; label: string }[] = [
  { key: "mes", label: "Mês" },
  { key: "tri", label: "Trimestre" },
  { key: "ano", label: "Ano" },
  { key: "tudo", label: "Tudo" },
];

function parseDate(s: string | null): number | null {
  if (!s) return null;
  const t = new Date(s.replace(" ", "T") + "Z").getTime();
  return Number.isFinite(t) ? t : null;
}

function periodStart(period: Period): number | null {
  const now = new Date();
  if (period === "tudo") return null;
  if (period === "ano") return new Date(now.getFullYear(), 0, 1).getTime();
  if (period === "tri") return new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1).getTime();
  return new Date(now.getFullYear(), now.getMonth(), 1).getTime();
}

const DAY = 86400000;

export default async function PainelPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string }>;
}) {
  const user = await requireUser();
  const { periodo } = await searchParams;
  const period = (["mes", "tri", "ano", "tudo"].includes(periodo ?? "") ? periodo : "mes") as Period;

  const [company, budgets, phases] = await Promise.all([
    getCompany(user.companyId),
    listBudgetsFull(user.companyId),
    listBillingPhasesForCompany(user.companyId),
  ]);
  const followUpDays = company.followUpDays || 5;

  // ── Tesouraria das obras (faturação) ────────────────────────────────
  const phasesByBudget = new Map<number, typeof phases>();
  for (const p of phases) {
    const arr = phasesByBudget.get(p.budgetId) ?? [];
    arr.push(p);
    phasesByBudget.set(p.budgetId, arr);
  }
  const phaseValue = (p: (typeof phases)[number], totalCIva: number) =>
    p.mode === "FIXED" ? p.amount : (totalCIva * p.pct) / 100;

  let toReceive = 0;
  let toBill = 0;
  let received = 0;
  const obrasToReceive: { id: number; number: string; client: string; amount: number }[] = [];
  for (const b of budgets) {
    if (b.status !== "ACCEPTED") continue;
    const totalCIva = budgetTotals(b).total;
    const ph = phasesByBudget.get(b.id) ?? [];
    const billed = ph.filter((p) => p.status === "INVOICED" || p.status === "PAID").reduce((s, p) => s + phaseValue(p, totalCIva), 0);
    const paid = ph.filter((p) => p.status === "PAID").reduce((s, p) => s + phaseValue(p, totalCIva), 0);
    const obraToReceive = billed - paid;
    toReceive += obraToReceive;
    received += paid;
    toBill += Math.max(0, totalCIva - billed);
    if (obraToReceive > 0.005) {
      obrasToReceive.push({ id: b.id, number: b.number, client: b.clientName || "Sem cliente", amount: obraToReceive });
    }
  }
  obrasToReceive.sort((a, b) => b.amount - a.amount);
  const hasTreasury = phases.length > 0;

  const withTotal = budgets.map((b: BudgetFull) => ({
    b,
    total: budgetTotals(b).total,
    created: parseDate(b.createdAt),
    sent: parseDate(b.sentAt),
  }));

  const start = periodStart(period);
  const inPeriod = withTotal.filter((x) => start === null || (x.created ?? 0) >= start);

  const count = (st: string) => inPeriod.filter((x) => x.b.status === st).length;
  const counts = {
    DRAFT: count("DRAFT"),
    SENT: count("SENT"),
    ACCEPTED: count("ACCEPTED"),
    REJECTED: count("REJECTED"),
  };
  const everSent = counts.SENT + counts.ACCEPTED + counts.REJECTED;
  const conversion = everSent > 0 ? Math.round((counts.ACCEPTED / everSent) * 100) : null;

  const pipeline = inPeriod.filter((x) => x.b.status === "SENT").reduce((s, x) => s + x.total, 0);
  const won = inPeriod.filter((x) => x.b.status === "ACCEPTED").reduce((s, x) => s + x.total, 0);
  const avg = inPeriod.length > 0 ? inPeriod.reduce((s, x) => s + x.total, 0) / inPeriod.length : 0;

  const now = Date.now();
  // follow-up e validade: listas de ação, sobre TODOS os enviados (não limitadas ao período)
  const followUp = withTotal
    .filter((x) => x.b.status === "SENT" && x.sent !== null && now - x.sent! > followUpDays * DAY)
    .sort((a, b) => (a.sent ?? 0) - (b.sent ?? 0));
  const expired = withTotal.filter(
    (x) => x.b.status === "SENT" && x.sent !== null && now - x.sent! > (x.b.validityDays || 30) * DAY
  );

  const daysAgo = (ts: number | null) => (ts ? Math.floor((now - ts) / DAY) : 0);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold flex-1">Painel</h1>
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1 text-sm">
          {PERIODS.map((p) => (
            <Link
              key={p.key}
              href={`/painel?periodo=${p.key}`}
              className={`px-3 py-1 rounded-md ${period === p.key ? "bg-white shadow font-medium" : "text-slate-500 hover:text-slate-800"}`}
            >
              {p.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Estado + conversão */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
        <Stat label="Rascunhos" value={String(counts.DRAFT)} />
        <Stat label="Enviados" value={String(counts.SENT)} tone="blue" />
        <Stat label="Aceites" value={String(counts.ACCEPTED)} tone="green" />
        <Stat label="Recusados" value={String(counts.REJECTED)} tone="red" />
        <Stat label="Conversão" value={conversion === null ? "—" : `${conversion}%`} />
      </div>

      {/* Valores */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <Stat label="Ganho no período" value={eur(won)} tone="green" big />
        <Stat label="Pipeline (por decidir)" value={eur(pipeline)} tone="blue" big />
        <Stat label="Valor médio" value={eur(avg)} big />
      </div>

      {/* Tesouraria das obras */}
      {hasTreasury && (
        <section className="mb-6">
          <div className="flex items-baseline justify-between mb-2">
            <h2 className="font-semibold">Tesouraria das obras</h2>
            <Link href="/obras" className="text-sm text-blue-600 hover:underline">
              ver obras
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Stat label="Por receber" value={eur(toReceive)} tone="blue" big />
            <Stat label="Por faturar" value={eur(toBill)} big />
            <Stat label="Recebido (obras)" value={eur(received)} tone="green" big />
          </div>
          {obrasToReceive.length > 0 && (
            <ul className="mt-3 bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
              {obrasToReceive.slice(0, 5).map((o) => (
                <li key={o.id} className="px-4 py-2.5 flex items-center gap-2 text-sm">
                  <Link href={`/obras/${o.id}`} className="flex-1 min-w-0">
                    <span className="font-medium">{o.client}</span>
                    <span className="text-slate-400"> · {o.number}</span>
                  </Link>
                  <span className="text-blue-700 font-medium whitespace-nowrap">{eur(o.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {/* Follow-up */}
        <section className="bg-white rounded-xl border border-slate-200 p-4">
          <h2 className="font-semibold mb-1">A precisar de follow-up</h2>
          <p className="text-xs text-slate-400 mb-3">
            Enviados há mais de {followUpDays} dias sem resposta.
          </p>
          {followUp.length === 0 ? (
            <p className="text-sm text-slate-400">Nada pendente. 👍</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {followUp.map((x) => (
                <li key={x.b.id} className="py-2 flex items-center gap-2 text-sm">
                  <Link href={`/orcamentos/${x.b.id}`} className="flex-1 min-w-0">
                    <span className="font-medium">{x.b.clientName || "Sem cliente"}</span>
                    <span className="text-slate-400"> · {x.b.number}</span>
                  </Link>
                  <span className="text-amber-600 whitespace-nowrap">há {daysAgo(x.sent)} dias</span>
                  <Link
                    href={`/orcamentos/${x.b.id}`}
                    className="text-blue-600 hover:underline whitespace-nowrap"
                  >
                    lembrar
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Validade expirada */}
        <section className="bg-white rounded-xl border border-slate-200 p-4">
          <h2 className="font-semibold mb-1">Validade expirada</h2>
          <p className="text-xs text-slate-400 mb-3">
            Enviados cuja validade já passou — rever ou refazer.
          </p>
          {expired.length === 0 ? (
            <p className="text-sm text-slate-400">Nenhum orçamento expirado.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {expired.map((x) => (
                <li key={x.b.id} className="py-2 flex items-center gap-2 text-sm">
                  <Link href={`/orcamentos/${x.b.id}`} className="flex-1 min-w-0">
                    <span className="font-medium">{x.b.title}</span>
                    <span className="text-slate-400"> · {x.b.number}</span>
                  </Link>
                  <span className="text-red-600 whitespace-nowrap">{eur(x.total)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {budgets.length === 0 && (
        <p className="mt-6 text-sm text-slate-400">
          Sem orçamentos ainda. Cria o primeiro em{" "}
          <Link href="/orcamentos/novo" className="text-blue-600 hover:underline">
            Novo orçamento
          </Link>
          .
        </p>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
  big,
}: {
  label: string;
  value: string;
  tone?: "blue" | "green" | "red";
  big?: boolean;
}) {
  const color =
    tone === "blue" ? "text-blue-700" : tone === "green" ? "text-emerald-700" : tone === "red" ? "text-red-600" : "text-slate-800";
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="text-xs text-slate-400">{label}</div>
      <div className={`${big ? "text-xl" : "text-lg"} font-bold ${color}`}>{value}</div>
    </div>
  );
}
