"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Article, Supplier } from "@/lib/types";
import { guessColumns, suggestArticle, normalizeText } from "@/lib/matching";
import { eur } from "@/lib/calc";
import { importQuoteAction, type QuoteLine } from "@/app/actions";

const inputCls =
  "border border-slate-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

type Cell = string | number | null;
type SheetData = { name: string; rows: Cell[][] };
type Choice = QuoteLine["choice"];

type ReviewLine = {
  text: string;
  unit: string;
  price: number;
  score: number | null;
  fromAlias: boolean;
  choice: Choice;
};

function parsePrice(v: Cell): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const cleaned = v.replace(/[^0-9.,-]/g, "");
    // formato pt: 1.234,56 → remove pontos de milhar, vírgula decimal
    const n = parseFloat(cleaned.replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", "."));
    return Number.isFinite(n) ? n : NaN;
  }
  return NaN;
}

/** Adivinha a coluna de preço pelo cabeçalho. */
function guessPriceCol(headerRow: Cell[]): number | null {
  let price: number | null = null;
  headerRow.forEach((cell, i) => {
    const h = normalizeText(String(cell ?? ""));
    if (price === null && /preco|valor|custo|unitario|pvp|eur|euro/.test(h)) price = i;
  });
  return price;
}

export default function QuoteImporter({
  articles,
  aliases,
  suppliers,
}: {
  articles: Article[];
  aliases: { normText: string; articleId: number }[];
  suppliers: Supplier[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ added: number; created: number } | null>(null);

  const today = new Date().toISOString().slice(0, 10);
  const [supplierId, setSupplierId] = useState<string>(suppliers[0] ? String(suppliers[0].id) : "");
  const [date, setDate] = useState(today);

  const [sheets, setSheets] = useState<SheetData[]>([]);
  const [sheetIdx, setSheetIdx] = useState(0);
  const [colName, setColName] = useState<number | null>(null);
  const [colUnit, setColUnit] = useState<number | null>(null);
  const [colPrice, setColPrice] = useState<number | null>(null);
  const [lines, setLines] = useState<ReviewLine[]>([]);

  const aliasMap = useMemo(
    () => new Map(aliases.map((a) => [a.normText, a.articleId])),
    [aliases]
  );
  const categories = useMemo(
    () => Array.from(new Set(articles.map((a) => a.category))),
    [articles]
  );

  const sheet = sheets[sheetIdx];
  const previewRows = sheet?.rows.slice(0, 12) ?? [];
  const nCols = Math.max(0, ...previewRows.map((r) => r.length));

  // ── Passo 1 ────────────────────────────────────────────────────────

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError("");
    try {
      const XLSX = await import("xlsx");
      const wb = XLSX.read(await file.arrayBuffer());
      const parsed: SheetData[] = wb.SheetNames.map((name) => ({
        name,
        rows: XLSX.utils.sheet_to_json<Cell[]>(wb.Sheets[name], {
          header: 1,
          raw: true,
          defval: null,
        }),
      })).filter((s) => s.rows.length > 0);
      if (parsed.length === 0) {
        setError("O ficheiro não tem folhas com dados.");
        return;
      }
      setSheets(parsed);
      applyGuess(parsed[0]);
      setSheetIdx(0);
    } catch (e) {
      setError(`Não consegui ler o ficheiro: ${e instanceof Error ? e.message : e}`);
    }
  }

  function applyGuess(s: SheetData) {
    let name: number | null = null;
    let unit: number | null = null;
    let price: number | null = null;
    for (const row of s.rows.slice(0, 10)) {
      const g = guessColumns(row);
      const p = guessPriceCol(row);
      if (g.name !== null && p !== null) {
        name = g.name;
        unit = g.unit;
        price = p;
        break;
      }
    }
    setColName(name);
    setColUnit(unit);
    setColPrice(price);
  }

  function setColumnRole(col: number, role: string) {
    if (colName === col) setColName(null);
    if (colUnit === col) setColUnit(null);
    if (colPrice === col) setColPrice(null);
    if (role === "name") setColName(col);
    if (role === "unit") setColUnit(col);
    if (role === "price") setColPrice(col);
  }

  const computeLines = (): ReviewLine[] => {
    if (!sheet || colName === null || colPrice === null) return [];
    const built: ReviewLine[] = [];
    for (const r of sheet.rows) {
      const text = String(r[colName] ?? "").trim();
      if (text.length <= 2) continue;
      const price = parsePrice(r[colPrice]);
      if (!Number.isFinite(price) || price <= 0) continue;
      const unit = colUnit !== null ? String(r[colUnit] ?? "").trim() : "";
      const s = suggestArticle(text, articles, aliasMap);
      built.push({
        text,
        unit,
        price,
        score: s ? s.score : null,
        fromAlias: s?.source === "alias",
        choice: s ? { kind: "article", articleId: s.articleId } : { kind: "new" },
      });
    }
    return built;
  };

  const importable = useMemo(computeLines, [
    sheet,
    colName,
    colUnit,
    colPrice,
    articles,
    aliasMap,
  ]);

  function toReview() {
    if (importable.length === 0) return;
    setLines(importable);
    setStep(2);
  }

  // ── Passo 2 ────────────────────────────────────────────────────────

  function setChoice(i: number, value: string) {
    setLines((prev) =>
      prev.map((l, idx) => {
        if (idx !== i) return l;
        let choice: Choice;
        if (value === "new") choice = { kind: "new" };
        else if (value === "ignore") choice = { kind: "ignore" };
        else choice = { kind: "article", articleId: Number(value) };
        return { ...l, choice };
      })
    );
  }

  const counts = useMemo(() => {
    const c = { article: 0, new: 0, ignore: 0 };
    for (const l of lines) c[l.choice.kind]++;
    return c;
  }, [lines]);

  function create() {
    const payload: QuoteLine[] = lines
      .filter((l) => l.choice.kind !== "ignore")
      .map((l) => ({ text: l.text, unit: l.unit, price: l.price, choice: l.choice }));
    startTransition(async () => {
      const res = await importQuoteAction(
        { supplierId: supplierId ? Number(supplierId) : null, date },
        payload
      );
      setDone(res);
      setStep(3);
      router.refresh();
    });
  }

  const supplierLabel =
    suppliers.find((s) => String(s.id) === supplierId)?.name || "(sem fornecedor)";

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <div className="grid gap-5 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <Link href="/artigos" className="text-slate-400 hover:text-slate-700 text-sm">
          ← Artigos
        </Link>
        <h1 className="text-2xl font-bold">Importar cotação de fornecedor</h1>
        <span className="text-sm text-slate-400">Passo {step} de 3</span>
      </div>

      {error && (
        <p className="bg-red-50 text-red-700 text-sm rounded-lg px-4 py-2">{error}</p>
      )}

      {/* PASSO 1 */}
      {step === 1 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 grid gap-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="grid gap-1 text-sm font-medium">
              Fornecedor
              {suppliers.length > 0 ? (
                <select
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  className={inputCls}
                >
                  <option value="">(sem fornecedor)</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="text-sm text-slate-400">
                  Sem fornecedores —{" "}
                  <Link href="/fornecedores" className="text-blue-600 hover:underline">
                    cria a tua lista
                  </Link>{" "}
                  (podes continuar sem escolher).
                </span>
              )}
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Data da cotação
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={inputCls}
              />
            </label>
          </div>

          <label className="grid gap-2 text-sm font-medium">
            Ficheiro Excel da cotação (.xlsx / .xls)
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => onFile(e.target.files?.[0])}
              className="text-sm"
            />
          </label>

          {sheets.length > 1 && (
            <label className="grid gap-1 text-sm font-medium max-w-xs">
              Folha
              <select
                value={sheetIdx}
                onChange={(e) => {
                  const idx = Number(e.target.value);
                  setSheetIdx(idx);
                  applyGuess(sheets[idx]);
                }}
                className={inputCls}
              >
                {sheets.map((s, i) => (
                  <option key={s.name} value={i}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          {sheet && (
            <>
              <p className="text-sm text-slate-500">
                Indica que coluna tem a <strong>designação</strong> do material, a{" "}
                <strong>unidade</strong> (opcional) e o <strong>preço</strong>.
              </p>
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="text-xs w-full">
                  <thead>
                    <tr>
                      {Array.from({ length: nCols }, (_, c) => (
                        <th key={c} className="p-1 bg-slate-50 border-b border-slate-200">
                          <select
                            value={
                              colName === c
                                ? "name"
                                : colUnit === c
                                ? "unit"
                                : colPrice === c
                                ? "price"
                                : ""
                            }
                            onChange={(e) => setColumnRole(c, e.target.value)}
                            className={`${inputCls} w-full text-xs font-semibold ${
                              colName === c || colUnit === c || colPrice === c
                                ? "bg-blue-50 border-blue-400"
                                : ""
                            }`}
                          >
                            <option value="">—</option>
                            <option value="name">Designação</option>
                            <option value="unit">Unidade</option>
                            <option value="price">Preço</option>
                          </select>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((r, i) => (
                      <tr key={i} className="border-b border-slate-100">
                        {Array.from({ length: nCols }, (_, c) => (
                          <td key={c} className="px-2 py-1 max-w-56 truncate text-slate-600">
                            {String(r[c] ?? "")}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={toReview}
                  disabled={importable.length === 0}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white px-5 py-2 rounded-lg text-sm font-medium"
                >
                  Continuar → rever {importable.length} linhas
                </button>
                {(colName === null || colPrice === null) && (
                  <span className="text-sm text-amber-600">
                    Falta marcar a designação e o preço.
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* PASSO 2 */}
      {step === 2 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 flex flex-wrap items-center gap-3 text-sm">
            <span className="font-semibold">{lines.length} linhas</span>
            <span className="text-emerald-700">{counts.article} associadas</span>
            <span className="text-blue-700">{counts.new} artigos novos</span>
            <span className="text-slate-400">{counts.ignore} ignoradas</span>
            <span className="flex-1" />
            <button
              onClick={() => setStep(1)}
              className="text-slate-500 hover:bg-slate-100 px-3 py-1.5 rounded-lg"
            >
              ← Voltar
            </button>
            <button
              onClick={create}
              disabled={isPending}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white px-4 py-1.5 rounded-lg font-medium"
            >
              {isPending ? "A registar…" : `Registar cotação (${supplierLabel}, ${date})`}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-400 text-left border-b border-slate-200">
                  <th className="px-3 py-2 font-medium">Linha do fornecedor</th>
                  <th className="px-2 py-2 font-medium text-right">Preço</th>
                  <th className="px-2 py-2 font-medium">Artigo no Kably</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l, i) => (
                  <tr
                    key={i}
                    className={`border-b border-slate-100 ${
                      l.choice.kind === "ignore" ? "opacity-40" : ""
                    }`}
                  >
                    <td className="px-3 py-1.5 max-w-md">
                      <div className="truncate" title={l.text}>
                        {l.text}
                      </div>
                      {l.score !== null && l.choice.kind === "article" && (
                        <span
                          className={`text-[10px] font-semibold ${
                            l.fromAlias
                              ? "text-violet-600"
                              : l.score >= 0.8
                              ? "text-emerald-600"
                              : "text-amber-600"
                          }`}
                        >
                          {l.fromAlias ? "memorizado" : `sugestão ${Math.round(l.score * 100)}%`}
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-1.5 text-right whitespace-nowrap font-medium">
                      {eur(l.price)}
                    </td>
                    <td className="px-2 py-1.5 min-w-64">
                      <select
                        value={
                          l.choice.kind === "article" ? String(l.choice.articleId) : l.choice.kind
                        }
                        onChange={(e) => setChoice(i, e.target.value)}
                        className={`${inputCls} w-full ${
                          l.choice.kind === "article"
                            ? "border-emerald-300"
                            : l.choice.kind === "ignore"
                            ? "border-slate-200"
                            : "border-blue-300"
                        }`}
                      >
                        <option value="new">➕ Criar artigo novo na base</option>
                        <option value="ignore">🚫 Ignorar esta linha</option>
                        {categories.map((cat) => (
                          <optgroup key={cat} label={cat}>
                            {articles
                              .filter((a) => a.category === cat)
                              .map((a) => (
                                <option key={a.id} value={a.id}>
                                  {a.name} ({a.unit})
                                </option>
                              ))}
                          </optgroup>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PASSO 3 */}
      {step === 3 && done && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 grid gap-4 max-w-lg">
          <h2 className="font-semibold text-lg">Cotação registada ✓</h2>
          <p className="text-sm text-slate-600">
            {done.added} preços adicionados ({supplierLabel}, {date})
            {done.created > 0 && `, dos quais ${done.created} artigos novos criados`}. O
            histórico de cada artigo já reflete esta cotação.
          </p>
          <div className="flex gap-3">
            <Link
              href="/artigos"
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-medium"
            >
              Ver artigos
            </Link>
            <button
              onClick={() => {
                setDone(null);
                setLines([]);
                setSheets([]);
                setStep(1);
              }}
              className="text-slate-500 hover:bg-slate-100 px-4 py-2 rounded-lg text-sm"
            >
              Importar outra
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
