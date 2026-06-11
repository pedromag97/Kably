"use client";

import { useMemo, useState, useTransition } from "react";
import type { Company, Expense, ExpensePeriod, Worker } from "@/lib/types";
import {
  computeCosts,
  EXPENSE_CATEGORIES,
  expenseAnnualCost,
  newExpense,
  newWorker,
  PERIOD_LABELS,
  workerAnnualCost,
  workerBillableHours,
} from "@/lib/company-costs";
import { eur, num } from "@/lib/calc";
import { saveCostsAction } from "@/app/actions";

const inputCls =
  "border border-slate-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full";

type WorkerDraft = Omit<Worker, "id" | "companyId" | "position">;
type ExpenseDraft = Omit<Expense, "id" | "companyId" | "position">;

function parseNum(v: string): number {
  const n = parseFloat(v.replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

/** Input numérico controlado por texto (aceita vírgula). */
function NumField({
  value,
  onChange,
  className = "",
  title,
}: {
  value: number;
  onChange: (n: number) => void;
  className?: string;
  title?: string;
}) {
  const [text, setText] = useState(String(value));
  return (
    <input
      value={text}
      title={title}
      inputMode="decimal"
      onChange={(e) => {
        setText(e.target.value);
        onChange(parseNum(e.target.value));
      }}
      onBlur={() => setText(String(value))}
      className={`${inputCls} text-right ${className}`}
    />
  );
}

export default function CompanyCosts({
  company,
  savedWorkers,
  savedExpenses,
}: {
  company: Company;
  savedWorkers: Worker[];
  savedExpenses: Expense[];
}) {
  const [isPending, startTransition] = useTransition();
  const strip = <T extends { id: number; companyId: number; position: number }>(
    rows: T[]
  ) => rows.map(({ id, companyId, position, ...rest }) => rest);

  const [workers, setWorkers] = useState<WorkerDraft[]>(strip(savedWorkers));
  const [expenses, setExpenses] = useState<ExpenseDraft[]>(strip(savedExpenses));
  const [profitPct, setProfitPct] = useState(company.targetProfitPct);
  const [saved, setSaved] = useState(false);
  const [resetKey, setResetKey] = useState(0); // força remount dos NumField ao repor

  const result = useMemo(
    () => computeCosts(workers, expenses, profitPct),
    [workers, expenses, profitPct]
  );

  const dirty =
    JSON.stringify({ workers, expenses, profitPct }) !==
    JSON.stringify({
      workers: strip(savedWorkers),
      expenses: strip(savedExpenses),
      profitPct: company.targetProfitPct,
    });

  const setWorker = (i: number, patch: Partial<WorkerDraft>) =>
    setWorkers((prev) => prev.map((w, idx) => (idx === i ? { ...w, ...patch } : w)));
  const setExpense = (i: number, patch: Partial<ExpenseDraft>) =>
    setExpenses((prev) => prev.map((e, idx) => (idx === i ? { ...e, ...patch } : e)));

  const save = () =>
    startTransition(async () => {
      await saveCostsAction({ workers, expenses, targetProfitPct: profitPct });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    });

  const reset = () => {
    setWorkers(strip(savedWorkers));
    setExpenses(strip(savedExpenses));
    setProfitPct(company.targetProfitPct);
    setResetKey((k) => k + 1);
  };

  const belowBreakEven =
    result.breakEvenRate > 0 && company.laborRate < result.breakEvenRate;

  return (
    <div className="grid lg:grid-cols-[1fr_300px] gap-5 items-start">
      <div className="grid gap-5 min-w-0">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold flex-1">Custos da empresa</h1>
          {dirty && (
            <span className="text-xs text-amber-600 font-medium">
              simulação — alterações por guardar
            </span>
          )}
          <button
            onClick={reset}
            disabled={!dirty}
            className="text-sm text-slate-500 hover:bg-slate-100 disabled:opacity-40 px-3 py-1.5 rounded-lg"
          >
            ↩ Repor guardados
          </button>
          <button
            onClick={save}
            disabled={isPending || !dirty}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white px-4 py-1.5 rounded-lg text-sm font-medium"
          >
            {isPending ? "A guardar…" : "Guardar"}
          </button>
          {saved && <span className="text-emerald-600 text-sm">✓ Guardado</span>}
        </div>

        {/* ── Equipa ── */}
        <section className="bg-white rounded-xl border border-slate-200 p-4 grid gap-3">
          <div className="flex items-center gap-3">
            <h2 className="font-bold flex-1">Equipa</h2>
            <button
              onClick={() => setWorkers((prev) => [...prev, newWorker()])}
              className="text-sm text-blue-600 hover:bg-blue-50 px-2.5 py-1 rounded-md font-medium"
            >
              + Trabalhador
            </button>
          </div>
          {workers.length === 0 && (
            <p className="text-sm text-slate-400">
              Adiciona os trabalhadores — incluindo tu. Quem anda na obra é
              «produtivo»; escritório/gestão entra nos custos mas não nas horas.
            </p>
          )}
          {workers.map((w, i) => {
            const cost = workerAnnualCost(w);
            const hours = workerBillableHours(w);
            return (
              <details
                key={`${resetKey}-${i}`}
                className="border border-slate-200 rounded-lg"
              >
                <summary className="px-3 py-2 cursor-pointer flex flex-wrap items-center gap-2 text-sm">
                  <input
                    value={w.name}
                    placeholder="Nome"
                    onClick={(e) => e.preventDefault()}
                    onChange={(e) => setWorker(i, { name: e.target.value })}
                    className={`${inputCls} max-w-44`}
                  />
                  <input
                    value={w.role}
                    placeholder="Função"
                    onClick={(e) => e.preventDefault()}
                    onChange={(e) => setWorker(i, { role: e.target.value })}
                    className={`${inputCls} max-w-40`}
                  />
                  <label className="flex items-center gap-1 text-xs font-medium">
                    <input
                      type="checkbox"
                      checked={w.productive === 1}
                      onChange={(e) =>
                        setWorker(i, { productive: e.target.checked ? 1 : 0 })
                      }
                    />
                    produtivo
                  </label>
                  <span className="flex-1" />
                  <span className="text-xs text-slate-500 whitespace-nowrap">
                    {eur(cost)}/ano{w.productive === 1 && <> · {num(hours)} h fat.</>}
                  </span>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      setWorkers((prev) => prev.filter((_, idx) => idx !== i));
                    }}
                    className="text-slate-300 hover:text-red-600 px-1"
                    title="Remover"
                  >
                    ✕
                  </button>
                </summary>
                <div className="px-3 pb-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <label className="grid gap-1 font-medium">
                    Salário bruto (€/mês)
                    <NumField value={w.grossSalary} onChange={(n) => setWorker(i, { grossSalary: n })} />
                  </label>
                  <label className="grid gap-1 font-medium">
                    Meses/ano
                    <NumField value={w.months} onChange={(n) => setWorker(i, { months: n })} title="14 = inclui subsídios de férias e Natal" />
                  </label>
                  <label className="grid gap-1 font-medium">
                    TSU (%)
                    <NumField value={w.tsuPct} onChange={(n) => setWorker(i, { tsuPct: n })} />
                  </label>
                  <label className="grid gap-1 font-medium">
                    Seguro AT (%)
                    <NumField value={w.insurancePct} onChange={(n) => setWorker(i, { insurancePct: n })} />
                  </label>
                  <label className="grid gap-1 font-medium">
                    Subs. alimentação (€/dia)
                    <NumField value={w.mealAllowance} onChange={(n) => setWorker(i, { mealAllowance: n })} />
                  </label>
                  <label className="grid gap-1 font-medium">
                    Custo anual manual (€)
                    <NumField
                      value={w.manualAnnualCost}
                      onChange={(n) => setWorker(i, { manualAnnualCost: n })}
                      title="Se > 0, substitui o cálculo automático (valor do contabilista)"
                      className={w.manualAnnualCost > 0 ? "border-violet-400" : ""}
                    />
                  </label>
                  {w.productive === 1 && (
                    <>
                      <label className="grid gap-1 font-medium">
                        Dias de obra/ano
                        <NumField value={w.workDays} onChange={(n) => setWorker(i, { workDays: n })} title="~210 = úteis − férias − feriados − baixas" />
                      </label>
                      <label className="grid gap-1 font-medium">
                        Horas/dia
                        <NumField value={w.hoursPerDay} onChange={(n) => setWorker(i, { hoursPerDay: n })} />
                      </label>
                      <label className="grid gap-1 font-medium">
                        Produtividade (%)
                        <NumField value={w.productivityPct} onChange={(n) => setWorker(i, { productivityPct: n })} title="% das horas realmente faturáveis (60–75% é típico)" />
                      </label>
                    </>
                  )}
                </div>
              </details>
            );
          })}
        </section>

        {/* ── Despesas ── */}
        {EXPENSE_CATEGORIES.map((cat) => {
          const rows = expenses
            .map((e, i) => ({ e, i }))
            .filter(({ e }) => e.category === cat);
          const catTotal = result.expensesByCategory.get(cat) ?? 0;
          return (
            <section key={cat} className="bg-white rounded-xl border border-slate-200 p-4 grid gap-2">
              <div className="flex items-center gap-3">
                <h2 className="font-bold flex-1">{cat}</h2>
                <span className="text-xs text-slate-500">{eur(catTotal)}/ano</span>
                <button
                  onClick={() => setExpenses((prev) => [...prev, newExpense(cat)])}
                  className="text-sm text-blue-600 hover:bg-blue-50 px-2.5 py-1 rounded-md font-medium"
                >
                  + Despesa
                </button>
              </div>
              {rows.map(({ e, i }) => (
                <div key={`${resetKey}-${i}`} className="flex flex-wrap items-center gap-2">
                  <input
                    value={e.name}
                    placeholder="Descrição (ex.: Combustível carrinha 1)"
                    onChange={(ev) => setExpense(i, { name: ev.target.value })}
                    className={`${inputCls} flex-1 min-w-40`}
                  />
                  <div className="w-24">
                    <NumField value={e.amount} onChange={(n) => setExpense(i, { amount: n })} />
                  </div>
                  <select
                    value={e.period}
                    onChange={(ev) => setExpense(i, { period: ev.target.value as ExpensePeriod })}
                    className={`${inputCls} w-28`}
                  >
                    {Object.entries(PERIOD_LABELS).map(([k, label]) => (
                      <option key={k} value={k}>
                        {label}
                      </option>
                    ))}
                  </select>
                  {e.period === "ONEOFF" && (
                    <label className="flex items-center gap-1 text-xs">
                      em
                      <div className="w-14">
                        <NumField value={e.years} onChange={(n) => setExpense(i, { years: n })} title="Anos de vida útil (amortização)" />
                      </div>
                      anos
                    </label>
                  )}
                  <span className="text-xs text-slate-400 w-24 text-right">
                    {eur(expenseAnnualCost(e))}/ano
                  </span>
                  <button
                    onClick={() => setExpenses((prev) => prev.filter((_, idx) => idx !== i))}
                    className="text-slate-300 hover:text-red-600 px-1"
                    title="Remover"
                  >
                    ✕
                  </button>
                </div>
              ))}
              {rows.length === 0 && (
                <p className="text-xs text-slate-400">Sem despesas nesta categoria.</p>
              )}
            </section>
          );
        })}
      </div>

      {/* ── Resultado ── */}
      <aside className="bg-white rounded-xl border border-slate-200 p-4 grid gap-2 text-sm lg:sticky lg:top-20">
        <h2 className="font-bold text-base">Resultado</h2>
        <div className="flex justify-between text-slate-500">
          <span>Pessoal</span>
          <span>{eur(result.staffCost)}/ano</span>
        </div>
        <div className="flex justify-between text-slate-500 border-b border-slate-100 pb-2">
          <span>Despesas gerais</span>
          <span>{eur(result.expensesCost)}/ano</span>
        </div>
        <div className="flex justify-between font-medium">
          <span>Custo total</span>
          <span>{eur(result.totalCost)}/ano</span>
        </div>
        <div className="flex justify-between text-slate-500 border-b border-slate-100 pb-2">
          <span>Horas faturáveis ({result.productiveCount} produtivos)</span>
          <span>{num(result.billableHours)} h</span>
        </div>

        <div className="flex justify-between items-baseline">
          <span className="font-medium">Taxa de equilíbrio</span>
          <span className="font-bold text-lg">
            {result.breakEvenRate > 0 ? eur(result.breakEvenRate) : "—"}/h
          </span>
        </div>
        <p className="text-xs text-slate-400 -mt-1">
          Abaixo disto, cada hora vendida dá prejuízo.
        </p>

        <label className="flex items-center justify-between gap-2 font-medium">
          Lucro-alvo (%)
          <div className="w-20">
            <NumField key={resetKey} value={profitPct} onChange={setProfitPct} />
          </div>
        </label>
        <div className="flex justify-between items-baseline bg-emerald-50 rounded-lg px-3 py-2">
          <span className="font-medium text-emerald-800">Taxa recomendada</span>
          <span className="font-bold text-xl text-emerald-700">
            {result.targetRate > 0 ? eur(result.targetRate) : "—"}/h
          </span>
        </div>
        {result.annualProfitAtTarget > 0 && (
          <p className="text-xs text-slate-400 -mt-1">
            ≈ {eur(result.annualProfitAtTarget)} de lucro/ano se faturares todas as
            horas a esta taxa.
          </p>
        )}

        <div
          className={`rounded-lg px-3 py-2 text-xs ${
            belowBreakEven
              ? "bg-red-50 text-red-700 font-medium"
              : "bg-slate-50 text-slate-500"
          }`}
        >
          Taxa em uso nas Definições: <strong>{eur(company.laborRate)}/h</strong>
          {belowBreakEven && (
            <> — ⚠ abaixo do equilíbrio! Cada hora vendida perde{" "}
            {eur(result.breakEvenRate - company.laborRate)}.</>
          )}
        </div>
        <p className="text-xs text-slate-400">
          Nota: a margem de mão de obra dos orçamentos já acrescenta lucro sobre a
          taxa — se usares a taxa recomendada (que já tem lucro-alvo), a margem MO é
          lucro adicional/almofada de risco.
        </p>
      </aside>
    </div>
  );
}
