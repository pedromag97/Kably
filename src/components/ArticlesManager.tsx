"use client";

import { useMemo, useState, useTransition } from "react";
import type { Article } from "@/lib/types";
import { eur } from "@/lib/calc";
import {
  createArticleAction,
  deleteArticleAction,
  updateArticleAction,
} from "@/app/actions";

const inputCls =
  "border border-slate-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full";

function ArticleForm({
  article,
  categories,
  onDone,
}: {
  article: Article | null;
  categories: string[];
  onDone: () => void;
}) {
  const [, startTransition] = useTransition();

  return (
    <div className="fixed inset-0 bg-black/40 z-30 flex items-start justify-center p-4 pt-16" onClick={onDone}>
      <form
        onClick={(e) => e.stopPropagation()}
        action={(fd) =>
          startTransition(async () => {
            if (article) await updateArticleAction(article.id, fd);
            else await createArticleAction(fd);
            onDone();
          })
        }
        className="bg-white rounded-xl shadow-xl w-full max-w-lg p-5 grid grid-cols-2 gap-3 text-sm"
      >
        <h2 className="col-span-2 font-bold text-base">
          {article ? "Editar artigo" : "Novo artigo"}
        </h2>
        <label className="grid gap-1 font-medium col-span-2">
          Designação *
          <input name="name" required defaultValue={article?.name} className={inputCls} />
        </label>
        <label className="grid gap-1 font-medium">
          Categoria
          <input
            name="category"
            list="categorias"
            defaultValue={article?.category ?? "Diversos"}
            className={inputCls}
          />
          <datalist id="categorias">
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </datalist>
        </label>
        <label className="grid gap-1 font-medium">
          Unidade
          <select name="unit" defaultValue={article?.unit ?? "un"} className={inputCls}>
            <option value="un">un</option>
            <option value="m">m</option>
            <option value="h">h</option>
            <option value="vg">vg (valor global)</option>
            <option value="m2">m²</option>
          </select>
        </label>
        <label className="grid gap-1 font-medium">
          Custo material (€/un)
          <input
            name="materialCost"
            inputMode="decimal"
            defaultValue={article?.materialCost ?? 0}
            className={inputCls}
          />
        </label>
        <label className="grid gap-1 font-medium">
          Mão de obra (horas/un)
          <input
            name="laborHours"
            inputMode="decimal"
            defaultValue={article?.laborHours ?? 0}
            className={inputCls}
          />
        </label>
        <label className="grid gap-1 font-medium col-span-2">
          Código (opcional)
          <input name="code" defaultValue={article?.code} className={inputCls} />
        </label>
        <label className="grid gap-1 font-medium col-span-2">
          Notas
          <input name="notes" defaultValue={article?.notes} className={inputCls} />
        </label>
        <div className="col-span-2 flex gap-2 justify-end">
          <button type="button" onClick={onDone} className="px-4 py-2 rounded-lg text-sm hover:bg-slate-100">
            Cancelar
          </button>
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            Guardar
          </button>
        </div>
      </form>
    </div>
  );
}

export default function ArticlesManager({ articles }: { articles: Article[] }) {
  const [, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [editing, setEditing] = useState<Article | null>(null);
  const [creating, setCreating] = useState(false);

  const categories = useMemo(
    () => Array.from(new Set(articles.map((a) => a.category))),
    [articles]
  );

  const filtered = articles.filter(
    (a) =>
      (!category || a.category === category) &&
      (!query || a.name.toLowerCase().includes(query.toLowerCase()))
  );

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <h1 className="text-2xl font-bold flex-1">Base de artigos</h1>
        <button
          onClick={() => setCreating(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          + Novo artigo
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Pesquisar…"
          className={`${inputCls} max-w-xs`}
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className={`${inputCls} max-w-xs`}
        >
          <option value="">Todas as categorias</option>
          {categories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <span className="text-sm text-slate-400 self-center">
          {filtered.length} artigos
        </span>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-slate-400 text-left border-b border-slate-200">
              <th className="px-3 py-2 font-medium">Designação</th>
              <th className="px-2 py-2 font-medium">Categoria</th>
              <th className="px-2 py-2 font-medium text-center">Un</th>
              <th className="px-2 py-2 font-medium text-right">Material €</th>
              <th className="px-2 py-2 font-medium text-right">MO (h)</th>
              <th className="px-2 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((a) => (
              <tr key={a.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-3 py-2">{a.name}</td>
                <td className="px-2 py-2 text-slate-500">{a.category}</td>
                <td className="px-2 py-2 text-center text-slate-500">{a.unit}</td>
                <td className="px-2 py-2 text-right">{eur(a.materialCost)}</td>
                <td className="px-2 py-2 text-right">{a.laborHours}</td>
                <td className="px-2 py-2 text-right whitespace-nowrap">
                  <button
                    onClick={() => setEditing(a)}
                    className="text-blue-600 hover:underline mr-3"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Apagar "${a.name}"?`))
                        startTransition(() => deleteArticleAction(a.id));
                    }}
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

      {(creating || editing) && (
        <ArticleForm
          article={editing}
          categories={categories}
          onDone={() => {
            setCreating(false);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}
