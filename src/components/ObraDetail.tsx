"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import type { ActualCost, BillingPhase } from "@/lib/types";
import { eur, num } from "@/lib/calc";
import {
  addActualCostAction,
  addBillingPhaseAction,
  applyBillingPresetAction,
  deleteActualCostAction,
  deleteBillingPhaseAction,
  setBillingPhaseStatusAction,
} from "@/app/actions";

type PhaseWithValue = BillingPhase & { value: number };

const PHASE_BADGE: Record<string, { label: string; cls: string }> = {
  PENDING: { label: "Por faturar", cls: "bg-slate-100 text-slate-600" },
  INVOICED: { label: "Faturado", cls: "bg-blue-100 text-blue-700" },
  PAID: { label: "Pago", cls: "bg-emerald-100 text-emerald-700" },
};

const inputCls =
  "border border-slate-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full";

const CAT_LABEL: Record<string, string> = {
  MATERIAL: "Material",
  LABOR: "Mão de obra",
  OTHER: "Outros",
};

type Totals = {
  faturado: number;
  margemOrcada: number;
  materialOrcado: number;
  horasOrcadas: number;
  materialReal: number;
  laborReal: number;
  otherReal: number;
  hoursReal: number;
  custoReal: number;
  margemReal: number;
};

function Stat({ label, value, tone, hint }: { label: string; value: string; tone?: "green" | "red"; hint?: string }) {
  const color = tone === "green" ? "text-emerald-700" : tone === "red" ? "text-red-600" : "text-slate-800";
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="text-xs text-slate-400">{label}</div>
      <div className={`text-xl font-bold ${color}`}>{value}</div>
      {hint && <div className="text-xs text-slate-400 mt-0.5">{hint}</div>}
    </div>
  );
}

function CompareRow({
  label,
  orc,
  real,
  unit,
}: {
  label: string;
  orc: number;
  real: number;
  unit: "eur" | "h";
}) {
  const fmt = (n: number) => (unit === "eur" ? eur(n) : `${num(n)} h`);
  const desvio = real - orc;
  const over = desvio > 0.0001;
  return (
    <tr className="border-b border-slate-100">
      <td className="px-3 py-2 font-medium">{label}</td>
      <td className="px-2 py-2 text-right text-slate-600">{fmt(orc)}</td>
      <td className="px-2 py-2 text-right font-medium">{fmt(real)}</td>
      <td className={`px-2 py-2 text-right font-medium ${over ? "text-red-600" : "text-emerald-700"}`}>
        {desvio > 0 ? "+" : ""}
        {fmt(desvio)}
      </td>
    </tr>
  );
}

export default function ObraDetail({
  budget,
  totals,
  costs,
  phases,
  totalCIva,
}: {
  budget: { id: number; number: string; title: string; status: string };
  totals: Totals;
  costs: ActualCost[];
  phases: PhaseWithValue[];
  totalCIva: number;
}) {
  const [, startTransition] = useTransition();
  const [category, setCategory] = useState("MATERIAL");
  const [phaseMode, setPhaseMode] = useState("PCT");
  const today = new Date().toISOString().slice(0, 10);
  const pct = totals.faturado > 0 ? Math.round((totals.margemReal / totals.faturado) * 100) : null;

  // Agregados de faturação
  const billed = phases.filter((p) => p.status === "INVOICED" || p.status === "PAID").reduce((s, p) => s + p.value, 0);
  const paid = phases.filter((p) => p.status === "PAID").reduce((s, p) => s + p.value, 0);
  const billedPct = totalCIva > 0 ? Math.round((billed / totalCIva) * 100) : 0;
  const toReceive = billed - paid;
  const toBill = totalCIva - billed;

  return (
    <div className="mt-3">
      <div className="flex flex-wrap items-baseline gap-3 mb-1">
        <span className="font-mono text-xs bg-slate-200 rounded px-2 py-1">{budget.number}</span>
        <h1 className="text-2xl font-bold">{budget.title}</h1>
        <Link href={`/orcamentos/${budget.id}`} className="text-sm text-blue-600 hover:underline">
          ver orçamento
        </Link>
      </div>

      {/* Resumo financeiro */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-5">
        <Stat label="Faturado (s/ IVA)" value={eur(totals.faturado)} />
        <Stat label="Custo real" value={eur(totals.custoReal)} />
        <Stat
          label="Margem real"
          value={`${eur(totals.margemReal)}${pct !== null ? ` (${pct}%)` : ""}`}
          tone={totals.margemReal >= 0 ? "green" : "red"}
        />
        <Stat label="Margem orçada" value={eur(totals.margemOrcada)} hint="referência do orçamento" />
      </div>

      {/* Orçado vs real */}
      <section className="bg-white rounded-xl border border-slate-200 p-4 mb-5 overflow-x-auto">
        <h2 className="font-semibold mb-3">Orçado vs. real</h2>
        <table className="w-full text-sm min-w-[420px]">
          <thead>
            <tr className="text-xs text-slate-400 text-left border-b border-slate-200">
              <th className="px-3 py-2 font-medium"></th>
              <th className="px-2 py-2 font-medium text-right">Orçado</th>
              <th className="px-2 py-2 font-medium text-right">Real</th>
              <th className="px-2 py-2 font-medium text-right">Desvio</th>
            </tr>
          </thead>
          <tbody>
            <CompareRow label="Material" orc={totals.materialOrcado} real={totals.materialReal} unit="eur" />
            <CompareRow label="Mão de obra (horas)" orc={totals.horasOrcadas} real={totals.hoursReal} unit="h" />
            <tr className="border-b border-slate-100">
              <td className="px-3 py-2 font-medium">Mão de obra (custo)</td>
              <td className="px-2 py-2 text-right text-slate-400">—</td>
              <td className="px-2 py-2 text-right font-medium">{eur(totals.laborReal)}</td>
              <td className="px-2 py-2"></td>
            </tr>
            <tr>
              <td className="px-3 py-2 font-medium">Outros custos</td>
              <td className="px-2 py-2 text-right text-slate-400">—</td>
              <td className="px-2 py-2 text-right font-medium">{eur(totals.otherReal)}</td>
              <td className="px-2 py-2"></td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* Faturação por fases */}
      <section className="bg-white rounded-xl border border-slate-200 p-4 mb-5">
        <h2 className="font-semibold mb-1">Faturação por fases</h2>
        <p className="text-xs text-slate-400 mb-3">Total da obra (c/ IVA): {eur(totalCIva)}</p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
          <Stat label={`Faturado (${billedPct}%)`} value={eur(billed)} />
          <Stat label="Recebido" value={eur(paid)} tone="green" />
          <Stat label="Por receber" value={eur(toReceive)} />
          <Stat label="Por faturar" value={eur(toBill)} tone={toBill < -0.005 ? "red" : undefined} />
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden flex mb-4">
          <div className="bg-emerald-500" style={{ width: `${totalCIva > 0 ? Math.min(100, (paid / totalCIva) * 100) : 0}%` }} />
          <div className="bg-blue-400" style={{ width: `${totalCIva > 0 ? Math.min(100, (toReceive / totalCIva) * 100) : 0}%` }} />
        </div>

        {phases.length === 0 ? (
          <div className="grid gap-2">
            <p className="text-sm text-slate-500">Sem fases. Começa por um plano:</p>
            <div className="flex flex-wrap gap-2">
              {[
                { key: "30-40-30", label: "30 / 40 / 30" },
                { key: "50-50", label: "50 / 50" },
                { key: "100", label: "100% no fim" },
              ].map((p) => (
                <button
                  key={p.key}
                  onClick={() => startTransition(() => applyBillingPresetAction(budget.id, p.key))}
                  className="border border-slate-300 hover:bg-slate-100 px-3 py-1.5 rounded-lg text-sm font-medium"
                >
                  {p.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-400">…ou adiciona fases à mão abaixo.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[520px]">
              <thead>
                <tr className="text-xs text-slate-400 text-left border-b border-slate-200">
                  <th className="px-3 py-2 font-medium">Fase</th>
                  <th className="px-2 py-2 font-medium text-right">Valor</th>
                  <th className="px-2 py-2 font-medium">Estado</th>
                  <th className="px-2 py-2 font-medium">Nº fatura</th>
                  <th className="px-2 py-2 font-medium text-right">Ações</th>
                  <th className="px-2 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {phases.map((p) => (
                  <tr key={p.id} className="border-b border-slate-100">
                    <td className="px-3 py-2 font-medium">
                      {p.label}
                      {p.mode === "PCT" && <span className="text-slate-400 font-normal"> · {num(p.pct)}%</span>}
                    </td>
                    <td className="px-2 py-2 text-right font-medium">{eur(p.value)}</td>
                    <td className="px-2 py-2">
                      <span className={`text-[10px] font-semibold rounded px-1.5 py-0.5 ${PHASE_BADGE[p.status]?.cls ?? ""}`}>
                        {PHASE_BADGE[p.status]?.label ?? p.status}
                      </span>
                      {p.paidAt && <span className="text-[10px] text-slate-400 ml-1">{p.paidAt.slice(0, 10)}</span>}
                    </td>
                    <td className="px-2 py-2">
                      <input
                        defaultValue={p.invoiceRef}
                        placeholder="—"
                        onBlur={(e) => {
                          if (e.target.value !== p.invoiceRef)
                            startTransition(() => setBillingPhaseStatusAction(budget.id, p.id, p.status, e.target.value));
                        }}
                        className="border border-slate-200 rounded px-1.5 py-1 text-xs w-20 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-2 py-2 text-right whitespace-nowrap">
                      <a
                        href={`/obras/${budget.id}/fatura/${p.id}`}
                        target="_blank"
                        className="text-slate-500 hover:underline mr-3"
                      >
                        PDF
                      </a>
                      {p.status === "PENDING" && (
                        <button onClick={() => startTransition(() => setBillingPhaseStatusAction(budget.id, p.id, "INVOICED"))} className="text-blue-600 hover:underline">
                          Faturar
                        </button>
                      )}
                      {p.status === "INVOICED" && (
                        <>
                          <button onClick={() => startTransition(() => setBillingPhaseStatusAction(budget.id, p.id, "PAID"))} className="text-emerald-600 hover:underline mr-2">
                            Pago
                          </button>
                          <button onClick={() => startTransition(() => setBillingPhaseStatusAction(budget.id, p.id, "PENDING"))} className="text-slate-400 hover:underline">
                            Reabrir
                          </button>
                        </>
                      )}
                      {p.status === "PAID" && (
                        <button onClick={() => startTransition(() => setBillingPhaseStatusAction(budget.id, p.id, "INVOICED"))} className="text-slate-400 hover:underline">
                          Reabrir
                        </button>
                      )}
                    </td>
                    <td className="px-2 py-2 text-right">
                      <button onClick={() => startTransition(() => deleteBillingPhaseAction(budget.id, p.id))} className="text-slate-400 hover:text-red-600">
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <form
          id="phase-form"
          action={(fd) =>
            startTransition(async () => {
              await addBillingPhaseAction(budget.id, fd);
              (document.getElementById("phase-form") as HTMLFormElement)?.reset();
              setPhaseMode("PCT");
            })
          }
          className="grid grid-cols-2 sm:grid-cols-4 gap-2 items-end mt-4 pt-4 border-t border-slate-100"
        >
          <label className="grid gap-1 text-xs font-medium col-span-2">
            Nova fase
            <input name="label" placeholder="Ex.: Adiantamento" className={inputCls} />
          </label>
          <label className="grid gap-1 text-xs font-medium">
            Tipo
            <select name="mode" value={phaseMode} onChange={(e) => setPhaseMode(e.target.value)} className={inputCls}>
              <option value="PCT">% do total</option>
              <option value="FIXED">Valor (€)</option>
            </select>
          </label>
          <div className="flex gap-2 items-end">
            <label className="grid gap-1 text-xs font-medium flex-1">
              {phaseMode === "PCT" ? "%" : "€"}
              <input name="value" inputMode="decimal" className={inputCls} />
            </label>
            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-medium">
              +
            </button>
          </div>
        </form>
      </section>

      {/* Diário de custos */}
      <section className="bg-white rounded-xl border border-slate-200 p-4">
        <h2 className="font-semibold mb-3">Diário de custos</h2>
        <form
          id="cost-form"
          action={(fd) =>
            startTransition(async () => {
              await addActualCostAction(budget.id, fd);
              (document.getElementById("cost-form") as HTMLFormElement)?.reset();
              setCategory("MATERIAL");
            })
          }
          className="grid grid-cols-2 sm:grid-cols-6 gap-2 items-end mb-4"
        >
          <label className="grid gap-1 text-xs font-medium">
            Data
            <input type="date" name="date" defaultValue={today} className={inputCls} />
          </label>
          <label className="grid gap-1 text-xs font-medium">
            Categoria
            <select name="category" value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls}>
              <option value="MATERIAL">Material</option>
              <option value="LABOR">Mão de obra</option>
              <option value="OTHER">Outros</option>
            </select>
          </label>
          <label className="grid gap-1 text-xs font-medium col-span-2">
            Descrição
            <input name="description" placeholder="Ex.: cabo + tubo Rexel" className={inputCls} />
          </label>
          <label className="grid gap-1 text-xs font-medium">
            Valor (€)
            <input name="amount" inputMode="decimal" className={inputCls} />
          </label>
          <label className="grid gap-1 text-xs font-medium">
            Horas
            <input
              name="hours"
              inputMode="decimal"
              disabled={category !== "LABOR"}
              placeholder={category === "LABOR" ? "" : "—"}
              className={`${inputCls} disabled:bg-slate-100 disabled:text-slate-400`}
            />
          </label>
          <button
            type="submit"
            className="col-span-2 sm:col-span-6 sm:justify-self-start bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            + Registar custo
          </button>
        </form>

        {costs.length === 0 ? (
          <p className="text-sm text-slate-400">Sem custos registados ainda.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[480px]">
              <thead>
                <tr className="text-xs text-slate-400 text-left border-b border-slate-200">
                  <th className="px-3 py-2 font-medium">Data</th>
                  <th className="px-2 py-2 font-medium">Categoria</th>
                  <th className="px-2 py-2 font-medium">Descrição</th>
                  <th className="px-2 py-2 font-medium text-right">Horas</th>
                  <th className="px-2 py-2 font-medium text-right">Valor</th>
                  <th className="px-2 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {costs.map((c) => (
                  <tr key={c.id} className="border-b border-slate-100">
                    <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{c.date}</td>
                    <td className="px-2 py-2">{CAT_LABEL[c.category] ?? c.category}</td>
                    <td className="px-2 py-2">{c.description || "—"}</td>
                    <td className="px-2 py-2 text-right text-slate-500">
                      {c.hours > 0 ? num(c.hours) : "—"}
                    </td>
                    <td className="px-2 py-2 text-right font-medium">{eur(c.amount)}</td>
                    <td className="px-2 py-2 text-right">
                      <button
                        onClick={() => startTransition(() => deleteActualCostAction(budget.id, c.id))}
                        className="text-slate-400 hover:text-red-600"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
