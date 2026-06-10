"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import type { Article, BudgetFull, BudgetItem } from "@/lib/types";
import { budgetTotals, eur, itemTotals, VAT_MODES } from "@/lib/calc";
import {
  addBlankItemAction,
  addChapterAction,
  addItemFromArticleAction,
  deleteChapterAction,
  deleteItemAction,
  renameChapterAction,
  updateBudgetMetaAction,
  updateItemAction,
} from "@/app/actions";

const inputCls =
  "border border-slate-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full";

function parseNum(v: string): number {
  const n = parseFloat(v.replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

// ── Linha de item ─────────────────────────────────────────────────────

function ItemRow({
  budget,
  item,
}: {
  budget: BudgetFull;
  item: BudgetItem;
}) {
  const [, startTransition] = useTransition();
  const [name, setName] = useState(item.name);
  const [unit, setUnit] = useState(item.unit);
  const [quantity, setQuantity] = useState(String(item.quantity));
  const [materialCost, setMaterialCost] = useState(String(item.materialCost));
  const [laborHours, setLaborHours] = useState(String(item.laborHours));

  useEffect(() => {
    setName(item.name);
    setUnit(item.unit);
    setQuantity(String(item.quantity));
    setMaterialCost(String(item.materialCost));
    setLaborHours(String(item.laborHours));
  }, [item]);

  const live: BudgetItem = {
    ...item,
    name,
    unit,
    quantity: parseNum(quantity),
    materialCost: parseNum(materialCost),
    laborHours: parseNum(laborHours),
  };
  const t = itemTotals(live, budget);

  const save = () =>
    startTransition(() =>
      updateItemAction(budget.id, item.id, {
        name: live.name,
        unit: live.unit,
        quantity: live.quantity,
        materialCost: live.materialCost,
        laborHours: live.laborHours,
      })
    );

  return (
    <tr className="border-t border-slate-100 hover:bg-slate-50">
      <td className="p-1.5">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={save}
          placeholder="Designação do trabalho/material"
          className={inputCls}
        />
      </td>
      <td className="p-1.5 w-16">
        <input
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          onBlur={save}
          className={`${inputCls} text-center`}
        />
      </td>
      <td className="p-1.5 w-20">
        <input
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          onBlur={save}
          inputMode="decimal"
          className={`${inputCls} text-right`}
        />
      </td>
      <td className="p-1.5 w-24">
        <input
          value={materialCost}
          onChange={(e) => setMaterialCost(e.target.value)}
          onBlur={save}
          inputMode="decimal"
          title="Custo de material por unidade (€)"
          className={`${inputCls} text-right`}
        />
      </td>
      <td className="p-1.5 w-20">
        <input
          value={laborHours}
          onChange={(e) => setLaborHours(e.target.value)}
          onBlur={save}
          inputMode="decimal"
          title="Horas de mão de obra por unidade"
          className={`${inputCls} text-right`}
        />
      </td>
      <td className="p-1.5 w-24 text-right text-sm text-slate-600 whitespace-nowrap">
        {eur(t.unitPrice)}
      </td>
      <td className="p-1.5 w-28 text-right text-sm font-semibold whitespace-nowrap">
        {eur(t.price)}
      </td>
      <td className="p-1.5 w-8 text-center">
        <button
          onClick={() => startTransition(() => deleteItemAction(budget.id, item.id))}
          className="text-slate-300 hover:text-red-600"
          title="Remover item"
        >
          ✕
        </button>
      </td>
    </tr>
  );
}

// ── Seletor de artigos ────────────────────────────────────────────────

function ArticlePicker({
  budget,
  articles,
  chapterId,
  onClose,
}: {
  budget: BudgetFull;
  articles: Article[];
  chapterId: number;
  onClose: () => void;
}) {
  const [, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [qty, setQty] = useState("1");

  const categories = useMemo(
    () => Array.from(new Set(articles.map((a) => a.category))),
    [articles]
  );

  const filtered = articles.filter(
    (a) =>
      (!category || a.category === category) &&
      (!query || a.name.toLowerCase().includes(query.toLowerCase()))
  );

  const add = (a: Article) =>
    startTransition(() =>
      addItemFromArticleAction(budget.id, chapterId, a.id, parseNum(qty) || 1)
    );

  return (
    <div
      className="fixed inset-0 bg-black/40 z-30 flex items-start justify-center p-4 pt-16"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[75vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-[1fr_auto_auto_auto] gap-2 items-center">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pesquisar artigo…"
            className={inputCls}
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={inputCls}
          >
            <option value="">Todas as categorias</option>
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <label className="text-sm flex items-center gap-1">
            Qtd.
            <input
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              inputMode="decimal"
              className={`${inputCls} w-16 text-right`}
            />
          </label>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-800 px-2">
            ✕
          </button>
        </div>
        <div className="overflow-y-auto">
          {filtered.map((a) => {
            const t = itemTotals(
              { ...a, id: 0, chapterId: 0, articleId: a.id, quantity: 1, position: 0 },
              budget
            );
            return (
              <button
                key={a.id}
                onClick={() => add(a)}
                className="w-full text-left px-4 py-2.5 border-b border-slate-100 hover:bg-blue-50 flex items-center gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{a.name}</div>
                  <div className="text-xs text-slate-500">{a.category}</div>
                </div>
                <div className="text-xs text-slate-500">{a.unit}</div>
                <div className="text-sm font-semibold w-24 text-right">
                  {eur(t.unitPrice)}
                </div>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <p className="p-6 text-center text-sm text-slate-500">
              Sem resultados — podes criar o artigo em <strong>Artigos</strong> ou usar
              uma linha em branco.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Editor principal ──────────────────────────────────────────────────

export default function BudgetEditor({
  budget,
  articles,
}: {
  budget: BudgetFull;
  articles: Article[];
}) {
  const [, startTransition] = useTransition();
  const [picker, setPicker] = useState<number | null>(null);
  const totals = budgetTotals(budget);
  const vat = VAT_MODES[budget.vatMode];

  return (
    <div className="grid gap-5">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/" className="text-slate-400 hover:text-slate-700 text-sm">
          ← Orçamentos
        </Link>
        <span className="font-mono text-xs bg-slate-200 rounded px-2 py-1">
          {budget.number}
        </span>
        <h1 className="text-xl font-bold flex-1 min-w-0 truncate">{budget.title}</h1>
        <a
          href={`/orcamentos/${budget.id}/pdf?v=cliente`}
          target="_blank"
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium"
        >
          PDF Cliente
        </a>
        <a
          href={`/orcamentos/${budget.id}/pdf?v=interna`}
          target="_blank"
          className="bg-slate-700 hover:bg-slate-800 text-white px-3 py-1.5 rounded-lg text-sm font-medium"
        >
          PDF Interno
        </a>
      </div>

      {/* Dados do orçamento */}
      <details className="bg-white rounded-xl border border-slate-200">
        <summary className="px-4 py-3 cursor-pointer text-sm font-semibold text-slate-700">
          Dados do cliente, IVA e margens
        </summary>
        <form
          action={(fd) => startTransition(() => updateBudgetMetaAction(budget.id, fd))}
          className="p-4 pt-0 grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm"
        >
          <label className="grid gap-1 col-span-2 sm:col-span-3 font-medium">
            Título
            <input name="title" defaultValue={budget.title} className={inputCls} />
          </label>
          <label className="grid gap-1 font-medium">
            Cliente
            <input name="clientName" defaultValue={budget.clientName} className={inputCls} />
          </label>
          <label className="grid gap-1 font-medium">
            NIF
            <input name="clientNif" defaultValue={budget.clientNif} className={inputCls} />
          </label>
          <label className="grid gap-1 font-medium">
            Email
            <input name="clientEmail" defaultValue={budget.clientEmail} className={inputCls} />
          </label>
          <label className="grid gap-1 font-medium">
            Telefone
            <input name="clientPhone" defaultValue={budget.clientPhone} className={inputCls} />
          </label>
          <label className="grid gap-1 font-medium col-span-2">
            Morada da obra
            <input name="siteAddress" defaultValue={budget.siteAddress} className={inputCls} />
          </label>
          <label className="grid gap-1 font-medium">
            Regime de IVA
            <select name="vatMode" defaultValue={budget.vatMode} className={inputCls}>
              {Object.entries(VAT_MODES).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 font-medium">
            Margem material (%)
            <input
              name="materialMargin"
              defaultValue={budget.materialMargin}
              inputMode="decimal"
              className={inputCls}
            />
          </label>
          <label className="grid gap-1 font-medium">
            Margem mão de obra (%)
            <input
              name="laborMargin"
              defaultValue={budget.laborMargin}
              inputMode="decimal"
              className={inputCls}
            />
          </label>
          <label className="grid gap-1 font-medium">
            Mão de obra (€/hora)
            <input
              name="laborRate"
              defaultValue={budget.laborRate}
              inputMode="decimal"
              className={inputCls}
            />
          </label>
          <label className="grid gap-1 font-medium">
            Validade (dias)
            <input
              name="validityDays"
              defaultValue={budget.validityDays}
              inputMode="numeric"
              className={inputCls}
            />
          </label>
          <label className="grid gap-1 font-medium col-span-2 sm:col-span-3">
            Notas (aparecem no PDF)
            <textarea name="notes" defaultValue={budget.notes} rows={2} className={inputCls} />
          </label>
          <div className="col-span-2 sm:col-span-3">
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
            >
              Guardar dados
            </button>
          </div>
        </form>
      </details>

      <div className="grid lg:grid-cols-[1fr_260px] gap-5 items-start">
        {/* Capítulos */}
        <div className="grid gap-4 min-w-0">
          {budget.chapters.map((ch) => {
            const chT = totals.byChapter.get(ch.id);
            return (
              <section
                key={ch.id}
                className="bg-white rounded-xl border border-slate-200 overflow-hidden"
              >
                <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border-b border-slate-200">
                  <input
                    defaultValue={ch.name}
                    onBlur={(e) => {
                      if (e.target.value !== ch.name)
                        startTransition(() =>
                          renameChapterAction(budget.id, ch.id, e.target.value)
                        );
                    }}
                    className="font-semibold text-sm bg-transparent flex-1 min-w-0 px-1 py-0.5 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm font-semibold text-slate-600 whitespace-nowrap">
                    {eur(chT?.price ?? 0)}
                  </span>
                  <button
                    onClick={() => {
                      if (
                        ch.items.length === 0 ||
                        confirm(`Apagar o capítulo "${ch.name}" e os seus itens?`)
                      )
                        startTransition(() => deleteChapterAction(budget.id, ch.id));
                    }}
                    className="text-slate-300 hover:text-red-600 px-1"
                    title="Apagar capítulo"
                  >
                    ✕
                  </button>
                </div>

                {ch.items.length > 0 && (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-slate-400 text-left">
                        <th className="px-3 pt-2 font-medium">Designação</th>
                        <th className="px-1 pt-2 font-medium text-center">Un</th>
                        <th className="px-1 pt-2 font-medium text-right">Qtd</th>
                        <th className="px-1 pt-2 font-medium text-right">Mat. €/un</th>
                        <th className="px-1 pt-2 font-medium text-right">MO h/un</th>
                        <th className="px-1 pt-2 font-medium text-right">P. Unit.</th>
                        <th className="px-1 pt-2 font-medium text-right">Total</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {ch.items.map((item) => (
                        <ItemRow key={item.id} budget={budget} item={item} />
                      ))}
                    </tbody>
                  </table>
                )}

                <div className="flex gap-2 p-2.5">
                  <button
                    onClick={() => setPicker(ch.id)}
                    className="text-sm text-blue-600 hover:bg-blue-50 px-2.5 py-1 rounded-md font-medium"
                  >
                    + Da base de artigos
                  </button>
                  <button
                    onClick={() =>
                      startTransition(() => addBlankItemAction(budget.id, ch.id))
                    }
                    className="text-sm text-slate-500 hover:bg-slate-100 px-2.5 py-1 rounded-md"
                  >
                    + Linha em branco
                  </button>
                </div>
              </section>
            );
          })}

          <button
            onClick={() => {
              const name = prompt("Nome do novo capítulo:");
              if (name !== null)
                startTransition(() => addChapterAction(budget.id, name));
            }}
            className="border-2 border-dashed border-slate-300 rounded-xl py-3 text-sm text-slate-500 hover:border-blue-400 hover:text-blue-600"
          >
            + Adicionar capítulo
          </button>
        </div>

        {/* Resumo */}
        <aside className="bg-white rounded-xl border border-slate-200 p-4 grid gap-2 text-sm lg:sticky lg:top-20">
          <h2 className="font-bold text-base mb-1">Resumo</h2>
          <div className="flex justify-between text-slate-500">
            <span>Custo material</span>
            <span>{eur(totals.materialCost)}</span>
          </div>
          <div className="flex justify-between text-slate-500">
            <span>Custo mão de obra</span>
            <span>{eur(totals.laborCost)}</span>
          </div>
          <div className="flex justify-between text-slate-500 border-b border-slate-100 pb-2">
            <span>Custo total</span>
            <span>{eur(totals.cost)}</span>
          </div>
          <div className="flex justify-between font-medium text-emerald-700">
            <span>Margem (lucro)</span>
            <span>{eur(totals.profit)}</span>
          </div>
          <div className="flex justify-between font-medium">
            <span>Subtotal s/ IVA</span>
            <span>{eur(totals.subtotal)}</span>
          </div>
          <div className="flex justify-between text-slate-500">
            <span>{vat?.label ?? "IVA"}</span>
            <span>{eur(totals.vat)}</span>
          </div>
          <div className="flex justify-between font-bold text-lg border-t border-slate-200 pt-2">
            <span>Total</span>
            <span>{eur(totals.total)}</span>
          </div>
          {budget.vatMode === "REVERSE" && (
            <p className="text-xs text-slate-400">{VAT_MODES.REVERSE.pdfNote}</p>
          )}
        </aside>
      </div>

      {picker !== null && (
        <ArticlePicker
          budget={budget}
          articles={articles}
          chapterId={picker}
          onClose={() => setPicker(null)}
        />
      )}
    </div>
  );
}
