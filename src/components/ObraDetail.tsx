"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import type { ActualCost } from "@/lib/types";
import { eur, num } from "@/lib/calc";
import { addActualCostAction, deleteActualCostAction } from "@/app/actions";

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
}: {
  budget: { id: number; number: string; title: string; status: string };
  totals: Totals;
  costs: ActualCost[];
}) {
  const [, startTransition] = useTransition();
  const [category, setCategory] = useState("MATERIAL");
  const today = new Date().toISOString().slice(0, 10);
  const pct = totals.faturado > 0 ? Math.round((totals.margemReal / totals.faturado) * 100) : null;

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
