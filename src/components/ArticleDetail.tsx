"use client";

import { useState, useTransition } from "react";
import type { Article, PriceEntry, Supplier } from "@/lib/types";
import { eur } from "@/lib/calc";
import {
  addPriceEntryAction,
  adoptPriceAction,
  deletePriceEntryAction,
} from "@/app/actions";

const inputCls =
  "border border-slate-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full";

/** Mini-gráfico (sparkline) da evolução de preço. */
function Sparkline({ entries }: { entries: PriceEntry[] }) {
  if (entries.length < 2) return null;
  const w = 520;
  const h = 90;
  const pad = 8;
  const prices = entries.map((e) => e.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const span = max - min || 1;
  const n = entries.length;
  const pts = entries.map((e, i) => {
    const x = pad + (i / (n - 1)) * (w - 2 * pad);
    const y = pad + (1 - (e.price - min) / span) * (h - 2 * pad);
    return [x, y] as const;
  });
  const path = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-24 mt-2" preserveAspectRatio="none">
      <path d={path} fill="none" stroke="#2563eb" strokeWidth={2} />
      {pts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={2.5} fill="#2563eb" />
      ))}
    </svg>
  );
}

export default function ArticleDetail({
  article,
  entries,
  suppliers,
}: {
  article: Article;
  entries: PriceEntry[];
  suppliers: Supplier[];
}) {
  const [, startTransition] = useTransition();
  const today = new Date().toISOString().slice(0, 10);

  // Última cotação por fornecedor (entries vêm ordenadas por data asc).
  const latestBySupplier = new Map<string, PriceEntry>();
  for (const e of entries) {
    const key = e.supplierName || "(sem fornecedor)";
    latestBySupplier.set(key, e); // a última iteração ganha = mais recente
  }
  const comparison = Array.from(latestBySupplier.values());
  const cheapest =
    comparison.length > 0 ? Math.min(...comparison.map((e) => e.price)) : null;

  return (
    <div className="mt-3">
      <div className="flex flex-wrap items-end gap-3 mb-1">
        <h1 className="text-2xl font-bold">{article.name}</h1>
        <span className="text-sm text-slate-400">{article.category}</span>
      </div>
      <p className="text-sm text-slate-500 mb-5">
        Custo de material atual no artigo:{" "}
        <strong className="text-slate-800">{eur(article.materialCost)}</strong> / {article.unit}
        <span className="text-slate-400"> — é este valor que entra nos orçamentos.</span>
      </p>

      {/* Comparação entre fornecedores */}
      <section className="bg-white rounded-xl border border-slate-200 p-4 mb-5">
        <h2 className="font-semibold mb-3">Comparar fornecedores</h2>
        {comparison.length === 0 ? (
          <p className="text-sm text-slate-400">
            Ainda não há cotações para este artigo. Adiciona uma abaixo.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-400 text-left border-b border-slate-200">
                  <th className="px-2 py-2 font-medium">Fornecedor</th>
                  <th className="px-2 py-2 font-medium text-right">Última cotação</th>
                  <th className="px-2 py-2 font-medium">Data</th>
                  <th className="px-2 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {comparison
                  .slice()
                  .sort((a, b) => a.price - b.price)
                  .map((e) => {
                    const isCheapest = e.price === cheapest;
                    return (
                      <tr
                        key={e.supplierName || "none"}
                        className={`border-b border-slate-100 ${isCheapest ? "bg-green-50" : ""}`}
                      >
                        <td className="px-2 py-2 font-medium">
                          {e.supplierName || "(sem fornecedor)"}
                          {isCheapest && (
                            <span className="ml-2 text-xs text-green-700 font-semibold">
                              mais barato
                            </span>
                          )}
                        </td>
                        <td className="px-2 py-2 text-right font-semibold">{eur(e.price)}</td>
                        <td className="px-2 py-2 text-slate-500">{e.date}</td>
                        <td className="px-2 py-2 text-right">
                          <button
                            onClick={() => {
                              if (
                                confirm(
                                  `Adotar ${eur(e.price)} como custo de material deste artigo?`
                                )
                              )
                                startTransition(() => adoptPriceAction(article.id, e.price));
                            }}
                            className="text-blue-600 hover:underline whitespace-nowrap"
                          >
                            Adotar preço
                          </button>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Histórico + gráfico */}
      <section className="bg-white rounded-xl border border-slate-200 p-4 mb-5">
        <h2 className="font-semibold mb-1">Histórico de preço</h2>
        <Sparkline entries={entries} />
        {entries.length === 0 ? (
          <p className="text-sm text-slate-400 mt-2">Sem registos.</p>
        ) : (
          <div className="overflow-x-auto mt-2">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-400 text-left border-b border-slate-200">
                  <th className="px-2 py-2 font-medium">Data</th>
                  <th className="px-2 py-2 font-medium">Fornecedor</th>
                  <th className="px-2 py-2 font-medium text-right">Preço</th>
                  <th className="px-2 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {entries
                  .slice()
                  .reverse()
                  .map((e) => (
                    <tr key={e.id} className="border-b border-slate-100">
                      <td className="px-2 py-2 text-slate-500">{e.date}</td>
                      <td className="px-2 py-2">{e.supplierName || "(sem fornecedor)"}</td>
                      <td className="px-2 py-2 text-right font-medium">{eur(e.price)}</td>
                      <td className="px-2 py-2 text-right">
                        <button
                          onClick={() =>
                            startTransition(() => deletePriceEntryAction(article.id, e.id))
                          }
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

      {/* Adicionar cotação manual */}
      <section className="bg-white rounded-xl border border-slate-200 p-4">
        <h2 className="font-semibold mb-3">Adicionar cotação</h2>
        <form
          action={(fd) =>
            startTransition(async () => {
              await addPriceEntryAction(article.id, fd);
              (document.getElementById("price-form") as HTMLFormElement)?.reset();
            })
          }
          id="price-form"
          className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-end"
        >
          <label className="grid gap-1 text-sm font-medium col-span-2 sm:col-span-1">
            Fornecedor
            {suppliers.length > 0 ? (
              <select name="supplierId" className={inputCls} defaultValue="">
                <option value="">— escolher —</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            ) : (
              <input name="supplierName" placeholder="Nome" className={inputCls} />
            )}
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Preço (€)
            <input name="price" inputMode="decimal" required className={inputCls} />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Data
            <input name="date" type="date" defaultValue={today} className={inputCls} />
          </label>
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium h-[38px]"
          >
            Registar
          </button>
        </form>
        {suppliers.length === 0 && (
          <p className="text-xs text-slate-400 mt-2">
            Dica: cria a tua lista em{" "}
            <a href="/fornecedores" className="text-blue-600 hover:underline">
              Fornecedores
            </a>{" "}
            para escolheres por nome.
          </p>
        )}
      </section>
    </div>
  );
}
