"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import type { Article, Company, VatMode } from "@/lib/types";
import { guessColumns, suggestArticle, normalizeText } from "@/lib/matching";
import { itemTotals, eur, VAT_MODES } from "@/lib/calc";
import { importMqtAction, type ImportLine } from "@/app/actions";

const inputCls =
  "border border-slate-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

type Cell = string | number | null;
type SheetData = { name: string; rows: Cell[][] };

type Choice = ImportLine["choice"];

type ReviewLine = {
  mqtText: string;
  unit: string;
  quantity: number;
  score: number | null; // null = sem sugestão
  fromAlias: boolean; // sugestão veio da memória de importações anteriores
  choice: Choice;
};

function parseQty(v: Cell): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = parseFloat(v.replace(/\./g, "").replace(",", "."));
    if (Number.isFinite(n)) return n;
    const n2 = parseFloat(v.replace(",", "."));
    return Number.isFinite(n2) ? n2 : NaN;
  }
  return NaN;
}

export default function MqtImporter({
  articles,
  aliases,
  company,
}: {
  articles: Article[];
  aliases: { normText: string; articleId: number }[];
  company: Company;
}) {
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");
  const [sheets, setSheets] = useState<SheetData[]>([]);
  const [sheetIdx, setSheetIdx] = useState(0);
  const [colName, setColName] = useState<number | null>(null);
  const [colUnit, setColUnit] = useState<number | null>(null);
  const [colQty, setColQty] = useState<number | null>(null);
  const [lines, setLines] = useState<ReviewLine[]>([]);
  const [title, setTitle] = useState("");
  const [clientName, setClientName] = useState("");
  const [vatMode, setVatMode] = useState<VatMode>("NORMAL");

  const aliasMap = useMemo(
    () => new Map(aliases.map((a) => [a.normText, a.articleId])),
    [aliases]
  );
  const articleById = useMemo(
    () => new Map(articles.map((a) => [a.id, a])),
    [articles]
  );
  const categories = useMemo(
    () => Array.from(new Set(articles.map((a) => a.category))),
    [articles]
  );

  const sheet = sheets[sheetIdx];
  const previewRows = sheet?.rows.slice(0, 12) ?? [];
  const nCols = Math.max(0, ...previewRows.map((r) => r.length));

  // ── Passo 1: ficheiro + mapeamento de colunas ──────────────────────

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
      setFileName(file.name);
      setSheets(parsed);
      applyGuess(parsed[0]);
      setSheetIdx(0);
    } catch (e) {
      setError(`Não consegui ler o ficheiro: ${e instanceof Error ? e.message : e}`);
    }
  }

  function applyGuess(s: SheetData) {
    for (const row of s.rows.slice(0, 10)) {
      const g = guessColumns(row);
      if (g.name !== null && g.quantity !== null && g.name !== g.quantity) {
        setColName(g.name);
        setColUnit(g.unit);
        setColQty(g.quantity);
        return;
      }
    }
    setColName(null);
    setColUnit(null);
    setColQty(null);
  }

  function setColumnRole(col: number, role: string) {
    if (colName === col) setColName(null);
    if (colUnit === col) setColUnit(null);
    if (colQty === col) setColQty(null);
    if (role === "name") setColName(col);
    if (role === "unit") setColUnit(col);
    if (role === "qty") setColQty(col);
  }

  const importableCount = useMemo(() => {
    if (!sheet || colName === null || colQty === null) return 0;
    return sheet.rows.filter((r) => {
      const name = String(r[colName] ?? "").trim();
      const qty = parseQty(r[colQty!]);
      return name.length > 2 && Number.isFinite(qty) && qty > 0;
    }).length;
  }, [sheet, colName, colQty]);

  function toReview() {
    if (!sheet || colName === null || colQty === null) return;
    const built: ReviewLine[] = [];
    for (const r of sheet.rows) {
      const mqtText = String(r[colName] ?? "").trim();
      const quantity = parseQty(r[colQty]);
      if (mqtText.length <= 2 || !Number.isFinite(quantity) || quantity <= 0) continue;
      const unit = colUnit !== null ? String(r[colUnit] ?? "").trim() : "";
      const s = suggestArticle(mqtText, articles, aliasMap);
      built.push({
        mqtText,
        unit,
        quantity,
        score: s ? s.score : null,
        fromAlias: s?.source === "alias",
        choice: s ? { kind: "article", articleId: s.articleId } : { kind: "loose" },
      });
    }
    setLines(built);
    setTitle(fileName.replace(/\.(xlsx?|xls)$/i, ""));
    setStep(2);
  }

  // ── Passo 2: revisão ───────────────────────────────────────────────

  function setChoice(i: number, value: string) {
    setLines((prev) =>
      prev.map((l, idx) => {
        if (idx !== i) return l;
        let choice: Choice;
        if (value === "new") choice = { kind: "new" };
        else if (value === "loose") choice = { kind: "loose" };
        else if (value === "ignore") choice = { kind: "ignore" };
        else choice = { kind: "article", articleId: Number(value) };
        return { ...l, choice };
      })
    );
  }

  const counts = useMemo(() => {
    const c = { article: 0, new: 0, loose: 0, ignore: 0 };
    for (const l of lines) c[l.choice.kind]++;
    return c;
  }, [lines]);

  function previewPrice(l: ReviewLine): string {
    if (l.choice.kind !== "article") return "—";
    const a = articleById.get(l.choice.articleId);
    if (!a) return "—";
    const t = itemTotals(
      {
        id: 0,
        chapterId: 0,
        articleId: a.id,
        name: a.name,
        unit: a.unit,
        quantity: l.quantity,
        materialCost: a.materialCost,
        laborHours: a.laborHours,
        position: 0,
      },
      company
    );
    return eur(t.price);
  }

  function unitMismatch(l: ReviewLine): boolean {
    if (l.choice.kind !== "article" || !l.unit) return false;
    const a = articleById.get(l.choice.articleId);
    if (!a?.unit) return false;
    return normalizeText(l.unit) !== normalizeText(a.unit);
  }

  // ── Passo 3: criar ─────────────────────────────────────────────────

  function create() {
    const payload: ImportLine[] = lines
      .filter((l) => l.choice.kind !== "ignore")
      .map((l) => ({
        mqtText: l.mqtText,
        unit: l.unit,
        quantity: l.quantity,
        choice: l.choice,
      }));
    startTransition(() => importMqtAction({ title, clientName, vatMode }, payload));
  }

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <div className="grid gap-5 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <Link href="/" className="text-slate-400 hover:text-slate-700 text-sm">
          ← Orçamentos
        </Link>
        <h1 className="text-2xl font-bold">Importar MQT</h1>
        <span className="text-sm text-slate-400">
          Passo {step} de 3 —{" "}
          {step === 1 ? "Ficheiro e colunas" : step === 2 ? "Associação de artigos" : "Criar orçamento"}
        </span>
      </div>

      {error && (
        <p className="bg-red-50 text-red-700 text-sm rounded-lg px-4 py-2">{error}</p>
      )}

      {/* ─── PASSO 1 ─── */}
      {step === 1 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 grid gap-4">
          <label className="grid gap-2 text-sm font-medium">
            Ficheiro Excel do MQT (.xlsx / .xls)
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
                Indica que coluna contém a <strong>designação</strong>, a{" "}
                <strong>unidade</strong> (opcional) e a <strong>quantidade</strong>.
                Tentei adivinhar pelo cabeçalho — confirma.
              </p>
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="text-xs w-full">
                  <thead>
                    <tr>
                      {Array.from({ length: nCols }, (_, c) => (
                        <th key={c} className="p-1 bg-slate-50 border-b border-slate-200">
                          <select
                            value={
                              colName === c ? "name" : colUnit === c ? "unit" : colQty === c ? "qty" : ""
                            }
                            onChange={(e) => setColumnRole(c, e.target.value)}
                            className={`${inputCls} w-full text-xs font-semibold ${
                              colName === c || colUnit === c || colQty === c
                                ? "bg-blue-50 border-blue-400"
                                : ""
                            }`}
                          >
                            <option value="">—</option>
                            <option value="name">Designação</option>
                            <option value="unit">Unidade</option>
                            <option value="qty">Quantidade</option>
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
                  disabled={colName === null || colQty === null || importableCount === 0}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white px-5 py-2 rounded-lg text-sm font-medium"
                >
                  Continuar → rever {importableCount} linhas
                </button>
                {colName === null || colQty === null ? (
                  <span className="text-sm text-amber-600">
                    Falta marcar a designação e a quantidade.
                  </span>
                ) : (
                  <span className="text-sm text-slate-400">
                    Linhas sem designação ou sem quantidade válida são ignoradas
                    (cabeçalhos, títulos de capítulo…).
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ─── PASSO 2 ─── */}
      {step === 2 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 flex flex-wrap items-center gap-3 text-sm">
            <span className="font-semibold">{lines.length} linhas</span>
            <span className="text-emerald-700">{counts.article} associadas</span>
            <span className="text-blue-700">{counts.new} artigos novos</span>
            <span className="text-amber-700">{counts.loose} avulsas</span>
            <span className="text-slate-400">{counts.ignore} ignoradas</span>
            <span className="flex-1" />
            <button
              onClick={() => setStep(1)}
              className="text-slate-500 hover:bg-slate-100 px-3 py-1.5 rounded-lg"
            >
              ← Voltar
            </button>
            <button
              onClick={() => setStep(3)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg font-medium"
            >
              Continuar →
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-400 text-left border-b border-slate-200">
                  <th className="px-3 py-2 font-medium">Linha do MQT</th>
                  <th className="px-2 py-2 font-medium text-right">Qtd</th>
                  <th className="px-2 py-2 font-medium text-center">Un</th>
                  <th className="px-2 py-2 font-medium">Destino no Kably</th>
                  <th className="px-2 py-2 font-medium text-right">Preço est.</th>
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
                      <div className="truncate" title={l.mqtText}>
                        {l.mqtText}
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
                          {l.fromAlias
                            ? "memorizado"
                            : `sugestão ${Math.round(l.score * 100)}%`}
                        </span>
                      )}
                      {unitMismatch(l) && (
                        <span className="text-[10px] font-semibold text-red-600 ml-2">
                          ⚠ unidade difere do artigo
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-1.5 text-right whitespace-nowrap">{l.quantity}</td>
                    <td className="px-2 py-1.5 text-center text-slate-500">{l.unit || "—"}</td>
                    <td className="px-2 py-1.5 min-w-64">
                      <select
                        value={l.choice.kind === "article" ? String(l.choice.articleId) : l.choice.kind}
                        onChange={(e) => setChoice(i, e.target.value)}
                        className={`${inputCls} w-full ${
                          l.choice.kind === "article"
                            ? "border-emerald-300"
                            : l.choice.kind === "ignore"
                            ? "border-slate-200"
                            : "border-amber-300"
                        }`}
                      >
                        <option value="loose">📄 Linha avulsa (preço manual no orçamento)</option>
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
                    <td className="px-2 py-1.5 text-right whitespace-nowrap text-slate-600">
                      {previewPrice(l)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── PASSO 3 ─── */}
      {step === 3 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 grid gap-4 max-w-xl">
          <p className="text-sm text-slate-500">
            Vai ser criado um orçamento com{" "}
            <strong>{lines.length - counts.ignore} itens</strong> organizados nos teus
            capítulos: {counts.article} com preços da base de artigos, {counts.new} artigos
            novos e {counts.loose} linhas avulsas <strong>com preço a zero</strong> — preenche-os
            no editor.
          </p>
          <label className="grid gap-1 text-sm font-medium">
            Título da obra *
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={inputCls}
            />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Nome do cliente
            <input
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className={inputCls}
            />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Regime de IVA
            <select
              value={vatMode}
              onChange={(e) => setVatMode(e.target.value as VatMode)}
              className={inputCls}
            >
              {Object.entries(VAT_MODES).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </select>
          </label>
          <div className="flex gap-3">
            <button
              onClick={() => setStep(2)}
              className="text-slate-500 hover:bg-slate-100 px-4 py-2 rounded-lg text-sm"
            >
              ← Voltar
            </button>
            <button
              onClick={create}
              disabled={isPending || !title.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white px-5 py-2 rounded-lg text-sm font-medium"
            >
              {isPending ? "A criar…" : "Criar orçamento"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
