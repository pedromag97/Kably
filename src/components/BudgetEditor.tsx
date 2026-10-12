"use client";

import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import Link from "next/link";
import type { Article, BudgetFull, BudgetItem } from "@/lib/types";
import {
  budgetTotals,
  eur,
  invertRate,
  itemTotals,
  laborFieldText,
  num,
  VAT_MODES,
} from "@/lib/calc";
import {
  addBlankItemAction,
  addChapterAction,
  addItemFromArticleAction,
  deleteChapterAction,
  deleteItemAction,
  renameChapterAction,
  setItemMaterialIncludedAction,
  updateBudgetMetaAction,
  updateItemAction,
} from "@/app/actions";

const inputCls =
  "border border-slate-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full";

function parseNum(v: string): number {
  const n = parseFloat(v.replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

// Ids negativos para as linhas otimistas, até o servidor devolver o id real.
let tempIdSeq = -1;
function nextTempId(): number {
  return tempIdSeq--;
}

// ── Linha de item ─────────────────────────────────────────────────────

const ItemRow = memo(function ItemRow({
  budget,
  item,
  onDraft,
  onRemove,
  laborMode,
}: {
  budget: BudgetFull;
  item: BudgetItem;
  /** Reporta o valor em edição para o Resumo recalcular sem esperar pelo servidor. */
  onDraft: (id: number, live: BudgetItem) => void;
  onRemove: (id: number) => void;
  /** "H" = horas por unidade · "R" = unidades por hora (rendimento). */
  laborMode: "H" | "R";
}) {
  const [, startTransition] = useTransition();
  const [name, setName] = useState(item.name);
  const [unit, setUnit] = useState(item.unit);
  const [quantity, setQuantity] = useState(String(item.quantity));
  const [materialCost, setMaterialCost] = useState(String(item.materialCost));
  // O valor exato (h/un) vive à parte do texto que se vê. Assim trocar de
  // vista h/un ⇄ un/h nunca altera o preço por arredondamento.
  const [hoursValue, setHoursValue] = useState(item.laborHours);
  const [laborText, setLaborText] = useState(laborFieldText(item.laborHours, laborMode));

  // Re-sincroniza com o servidor sem effect (evita renders em cascata).
  const [lastItem, setLastItem] = useState(item);
  if (lastItem !== item) {
    setLastItem(item);
    setName(item.name);
    setUnit(item.unit);
    setQuantity(String(item.quantity));
    setMaterialCost(String(item.materialCost));
    setHoursValue(item.laborHours);
    setLaborText(laborFieldText(item.laborHours, laborMode));
  }

  // Trocar de vista só reescreve o texto — o valor exato fica intacto.
  const [lastMode, setLastMode] = useState(laborMode);
  if (lastMode !== laborMode) {
    setLastMode(laborMode);
    setLaborText(laborFieldText(hoursValue, laborMode));
  }

  const setLabor = (text: string) => {
    setLaborText(text);
    const n = parseNum(text);
    setHoursValue(laborMode === "H" ? n : invertRate(n));
  };

  const live: BudgetItem = {
    ...item,
    name,
    unit,
    quantity: parseNum(quantity),
    materialCost: parseNum(materialCost),
    laborHours: hoursValue,
  };
  const t = itemTotals(live, budget);

  // Empurra o valor em edição para o pai, mas SÓ quando difere do servidor.
  // Reportar ao montar faria N re-renders do editor (um por linha), cada um a
  // recalcular o orçamento todo — O(n²) e a página a arrastar-se.
  const hasDraft = useRef(false);
  useEffect(() => {
    const changed =
      name !== item.name ||
      unit !== item.unit ||
      parseNum(quantity) !== item.quantity ||
      parseNum(materialCost) !== item.materialCost ||
      hoursValue !== item.laborHours;
    if (changed || hasDraft.current) {
      hasDraft.current = changed;
      onDraft(item.id, live);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, unit, quantity, materialCost, hoursValue]);

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
        <div className="flex items-center gap-1">
          {budget.laborOnly === 1 && (
            <label
              className="flex items-center shrink-0 cursor-pointer"
              title={
                item.materialIncluded === 1
                  ? "Esta linha FATURA o material (exceção ao modo só mão de obra). Desmarca para voltar a material do cliente."
                  : "Material fornecido pelo cliente — não faturado. Marca para faturares o material nesta linha."
              }
            >
              <input
                type="checkbox"
                checked={item.materialIncluded === 1}
                onChange={(e) =>
                  startTransition(() =>
                    setItemMaterialIncludedAction(budget.id, item.id, e.target.checked)
                  )
                }
                className="peer sr-only"
              />
              <span className="text-[10px] leading-none font-bold px-1 py-0.5 rounded border border-slate-300 text-slate-400 peer-checked:bg-emerald-600 peer-checked:border-emerald-600 peer-checked:text-white">
                €
              </span>
            </label>
          )}
          <input
            value={materialCost}
            onChange={(e) => setMaterialCost(e.target.value)}
            onBlur={save}
            inputMode="decimal"
            title={
              t.billsMaterial
                ? "Custo de material por unidade (€)"
                : "Material por conta do cliente — não faturado (valor só para estimativa)"
            }
            className={`${inputCls} text-right ${
              t.billsMaterial ? "" : "opacity-40 line-through"
            }`}
          />
        </div>
      </td>
      <td className="p-1.5 w-20">
        <input
          value={laborText}
          onChange={(e) => setLabor(e.target.value)}
          onBlur={save}
          inputMode="decimal"
          title={
            laborMode === "H"
              ? "Horas de mão de obra por unidade"
              : "Unidades feitas numa hora (rendimento)"
          }
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
          onClick={() => onRemove(item.id)}
          className="text-slate-300 hover:text-red-600"
          title="Remover item"
        >
          ✕
        </button>
      </td>
    </tr>
  );
});

// ── Pesquisa de artigos (integrada no capítulo) ───────────────────────

/** Quantos resultados desenhar. Mais do que isto só atrasa a escrita. */
const MAX_RESULTS = 8;

function ArticleSearch({
  budget,
  articles,
  chapterId,
  onClose,
  onOptimisticAdd,
}: {
  budget: BudgetFull;
  articles: Article[];
  chapterId: number;
  onClose: () => void;
  onOptimisticAdd: (item: BudgetItem) => void;
}) {
  const [, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [count, setCount] = useState(0);
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const categories = useMemo(
    () => Array.from(new Set(articles.map((a) => a.category))),
    [articles]
  );

  // Limitar o que se desenha mantém a lista instantânea a cada tecla.
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const out: Article[] = [];
    for (const a of articles) {
      if (category && a.category !== category) continue;
      if (q && !a.name.toLowerCase().includes(q)) continue;
      out.push(a);
      if (out.length === MAX_RESULTS) break;
    }
    return out;
  }, [articles, category, query]);

  const active = Math.min(highlight, Math.max(results.length - 1, 0));

  // Entra com quantidade 1; os detalhes editas na própria linha do orçamento.
  const add = (a: Article) => {
    onOptimisticAdd({
      id: nextTempId(),
      chapterId,
      articleId: a.id,
      name: a.name,
      unit: a.unit,
      quantity: 1,
      materialCost: a.materialCost,
      laborHours: a.laborHours,
      materialIncluded: 0,
      position: Number.MAX_SAFE_INTEGER,
    });
    setCount((c) => c + 1);
    setQuery("");
    setHighlight(0);
    inputRef.current?.focus(); // pronto para o próximo, sem tirar as mãos do teclado
    startTransition(() => addItemFromArticleAction(budget.id, chapterId, a.id, 1));
  };

  return (
    <div className="border-t-2 border-blue-500 bg-blue-50/40 p-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          autoFocus
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setHighlight(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setHighlight((h) => Math.min(h + 1, results.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setHighlight((h) => Math.max(h - 1, 0));
            } else if (e.key === "Enter") {
              e.preventDefault();
              if (results[active]) add(results[active]);
            } else if (e.key === "Escape") {
              onClose();
            }
          }}
          placeholder="Escreve o material e carrega Enter…"
          className={`${inputCls} flex-1 min-w-[12rem] bg-white`}
        />
        <select
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setHighlight(0);
          }}
          className={`${inputCls} w-auto bg-white`}
        >
          <option value="">Todas as categorias</option>
          {categories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        {count > 0 && (
          <span className="text-xs font-medium text-emerald-700 bg-emerald-100 rounded-full px-2.5 py-1">
            ✓ {count} {count === 1 ? "linha" : "linhas"}
          </span>
        )}
        <button
          onClick={onClose}
          className="text-sm text-slate-500 hover:bg-slate-200 rounded-md px-2.5 py-1"
        >
          Fechar
        </button>
      </div>

      {results.length > 0 ? (
        <ul className="mt-2 bg-white rounded-lg border border-slate-200 overflow-hidden">
          {results.map((a, i) => {
            const t = itemTotals(
              {
                ...a,
                id: 0,
                chapterId: 0,
                articleId: a.id,
                quantity: 1,
                materialIncluded: 0,
                position: 0,
              },
              budget
            );
            return (
              <li key={a.id}>
                <button
                  onMouseEnter={() => setHighlight(i)}
                  onClick={() => add(a)}
                  className={`w-full text-left px-3 py-2 border-b border-slate-100 last:border-0 flex items-center gap-3 ${
                    i === active ? "bg-blue-100" : "hover:bg-blue-50"
                  }`}
                >
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-medium truncate">{a.name}</span>
                    <span className="block text-xs text-slate-500">{a.category}</span>
                  </span>
                  <span className="text-xs text-slate-500 shrink-0">{a.unit}</span>
                  <span className="text-sm font-semibold w-20 text-right shrink-0">
                    {eur(t.unitPrice)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-slate-500 px-1">
          Sem resultados — cria o artigo em <strong>Artigos</strong> ou usa uma linha
          em branco.
        </p>
      )}
      <p className="mt-1.5 text-xs text-slate-400 px-1">
        ↑ ↓ para escolher · Enter adiciona · Esc fecha. Entra com quantidade 1 —
        ajusta os detalhes na linha.
      </p>
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
  const [isSaving, startTransition] = useTransition();
  const [picker, setPicker] = useState<number | null>(null);
  // Como escreves a mão de obra: horas por unidade ou unidades por hora.
  const [laborMode, setLaborMode] = useState<"H" | "R">("H");

  // ── Camada "ao vivo" ────────────────────────────────────────────────
  // O servidor continua a ser a verdade, mas o ecrã não espera por ele:
  // `drafts` = valores a serem escritos, `removed`/`pendingAdds` = linhas otimistas.
  const [drafts, setDrafts] = useState<Map<number, BudgetItem>>(new Map());
  const [removed, setRemoved] = useState<Set<number>>(new Set());
  const [pendingAdds, setPendingAdds] = useState<BudgetItem[]>([]);

  // Chegaram dados frescos do servidor: a camada local já não é precisa.
  // (padrão React de ajustar estado quando uma prop muda, sem effect)
  const [lastServerBudget, setLastServerBudget] = useState(budget);
  if (lastServerBudget !== budget) {
    setLastServerBudget(budget);
    if (drafts.size) setDrafts(new Map());
    if (removed.size) setRemoved(new Set());
    if (pendingAdds.length) setPendingAdds([]);
  }

  const setDraft = useCallback((id: number, live: BudgetItem) => {
    setDrafts((prev) => new Map(prev).set(id, live));
  }, []);

  const removeItem = useCallback(
    (id: number) => {
      setRemoved((prev) => new Set(prev).add(id));
      if (id < 0) return; // linha otimista ainda sem id no servidor
      startTransition(() => deleteItemAction(budget.id, id));
    },
    [budget.id]
  );

  const addOptimistic = useCallback((item: BudgetItem) => {
    setPendingAdds((prev) => [...prev, item]);
  }, []);

  // Lista visível: itens do servidor (identidade preservada, para não estragar
  // o que estás a escrever) menos os removidos, mais os que estão a entrar.
  const visibleChapters = useMemo(
    () =>
      budget.chapters.map((ch) => ({
        ...ch,
        items: [
          ...ch.items.filter((i) => !removed.has(i.id)),
          ...pendingAdds.filter((p) => p.chapterId === ch.id && !removed.has(p.id)),
        ],
      })),
    [budget.chapters, removed, pendingAdds]
  );

  // Só para as contas: aplica por cima os valores em edição.
  const liveBudget = useMemo<BudgetFull>(
    () => ({
      ...budget,
      chapters: visibleChapters.map((ch) => ({
        ...ch,
        items: ch.items.map((i) => drafts.get(i.id) ?? i),
      })),
    }),
    [budget, visibleChapters, drafts]
  );

  const totals = useMemo(() => budgetTotals(liveBudget), [liveBudget]);
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
        {budget.laborOnly === 1 && (
          <span className="text-xs font-semibold bg-amber-100 text-amber-800 rounded px-2 py-1">
            SÓ MÃO DE OBRA
          </span>
        )}
        {budget.materialOnly === 1 && (
          <span className="text-xs font-semibold bg-sky-100 text-sky-800 rounded px-2 py-1">
            SÓ MATERIAL
          </span>
        )}
        <h1 className="text-xl font-bold flex-1 min-w-0 truncate">{budget.title}</h1>
        {isSaving && (
          <span
            aria-live="polite"
            className="text-xs text-blue-800 bg-blue-50 border border-blue-200 rounded-full px-2.5 py-1 flex items-center gap-1.5 whitespace-nowrap"
          >
            <span className="inline-block w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            A guardar…
          </span>
        )}
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
          <label className="grid gap-1 font-medium col-span-2">
            O que é faturado
            <select
              name="scope"
              defaultValue={
                budget.laborOnly === 1
                  ? "LABOR"
                  : budget.materialOnly === 1
                    ? "MATERIAL"
                    : "BOTH"
              }
              className={inputCls}
            >
              <option value="BOTH">Material + mão de obra</option>
              <option value="LABOR">Só mão de obra (material do cliente)</option>
              <option value="MATERIAL">Só material (montagem de outrem)</option>
            </select>
          </label>
          <label className="grid gap-1 font-medium">
            Taxa gestão material (%)
            <input
              name="materialFeePct"
              defaultValue={budget.materialFeePct}
              inputMode="decimal"
              title="Percentagem cobrada sobre o valor estimado do material fornecido pelo cliente (receção, conferência, movimentação). 0 = não cobrar."
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
          {visibleChapters.map((ch) => {
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
                        <th className="px-1 pt-2 font-medium text-right">
                          {budget.laborOnly === 1 ? (
                            <span title="Marca o € para faturares o material desta linha">
                              <span className="text-emerald-600">€</span> = faturar ·
                              Mat. €/un
                            </span>
                          ) : (
                            "Mat. €/un"
                          )}
                        </th>
                        <th className="px-1 pt-2 font-medium text-right">
                          <button
                            onClick={() =>
                              setLaborMode((m) => (m === "H" ? "R" : "H"))
                            }
                            className="hover:text-blue-600 underline decoration-dotted underline-offset-2"
                            title="Trocar entre horas por unidade e unidades por hora (rendimento)"
                          >
                            {laborMode === "H" ? "MO h/un" : "MO un/h"} ⇄
                          </button>
                        </th>
                        <th className="px-1 pt-2 font-medium text-right">P. Unit.</th>
                        <th className="px-1 pt-2 font-medium text-right">Total</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {ch.items.map((item) => (
                        <ItemRow
                          key={item.id}
                          budget={budget}
                          item={item}
                          onDraft={setDraft}
                          onRemove={removeItem}
                          laborMode={laborMode}
                        />
                      ))}
                    </tbody>
                  </table>
                )}

                {picker === ch.id && (
                  <ArticleSearch
                    budget={budget}
                    articles={articles}
                    chapterId={ch.id}
                    onClose={() => setPicker(null)}
                    onOptimisticAdd={addOptimistic}
                  />
                )}

                <div className="flex gap-2 p-2.5">
                  <button
                    onClick={() => setPicker(picker === ch.id ? null : ch.id)}
                    className={`text-sm px-2.5 py-1 rounded-md font-medium ${
                      picker === ch.id
                        ? "bg-blue-600 text-white"
                        : "text-blue-600 hover:bg-blue-50"
                    }`}
                  >
                    + Da base de artigos
                  </button>
                  <button
                    onClick={() => {
                      addOptimistic({
                        id: nextTempId(),
                        chapterId: ch.id,
                        articleId: null,
                        name: "",
                        unit: "un",
                        quantity: 1,
                        materialCost: 0,
                        laborHours: 0,
                        materialIncluded: 0,
                        position: Number.MAX_SAFE_INTEGER,
                      });
                      startTransition(() => addBlankItemAction(budget.id, ch.id));
                    }}
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
          {budget.laborOnly === 1 && (
            <div className="text-xs bg-amber-50 text-amber-800 rounded-md px-2 py-1.5 -mt-1">
              Só mão de obra — material por conta do cliente
              {totals.suppliedMaterial > 0 && (
                <> (estimativa: {eur(totals.suppliedMaterial)})</>
              )}
            </div>
          )}
          {budget.materialOnly === 1 && (
            <div className="text-xs bg-sky-50 text-sky-800 rounded-md px-2 py-1.5 -mt-1">
              Só material — montagem não faturada
              {totals.unbilledLabor > 0 && (
                <> (estimativa: {eur(totals.unbilledLabor)})</>
              )}
            </div>
          )}
          <div className="flex justify-between text-slate-500">
            <span>Custo material{budget.laborOnly === 1 ? " (faturado)" : ""}</span>
            <span>{eur(totals.materialCost)}</span>
          </div>
          <div className="flex justify-between text-slate-500">
            <span>
              Custo mão de obra ({num(totals.laborHours)} h)
              {budget.materialOnly === 1 && " — não faturada"}
            </span>
            <span className={budget.materialOnly === 1 ? "line-through opacity-50" : ""}>
              {eur(budget.materialOnly === 1 ? totals.unbilledLabor : totals.laborCost)}
            </span>
          </div>
          {totals.materialFee > 0 && (
            <div className="flex justify-between text-slate-500">
              <span>Gestão material ({num(budget.materialFeePct)}%)</span>
              <span>{eur(totals.materialFee)}</span>
            </div>
          )}
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

    </div>
  );
}


