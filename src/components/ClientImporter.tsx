"use client";

import { useMemo, useState, useTransition } from "react";
import { normalizeText } from "@/lib/matching";
import { importClientsAction, type ClientImportRow } from "@/app/actions";

const inputCls =
  "border border-slate-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

type Cell = string | number | null;
type Field = "name" | "nif" | "email" | "phone" | "address" | "";

const FIELD_LABEL: Record<Exclude<Field, "">, string> = {
  name: "Nome",
  nif: "NIF",
  email: "Email",
  phone: "Telefone",
  address: "Morada",
};

function guessField(header: string): Field {
  const h = normalizeText(header);
  if (/nome|cliente|designac/.test(h)) return "name";
  if (/nif|contribuinte|nipc/.test(h)) return "nif";
  if (/email|mail|correio/.test(h)) return "email";
  if (/tele|tlf|tlm|contacto|telemovel|telefone/.test(h)) return "phone";
  if (/morada|endereco|address|local/.test(h)) return "address";
  return "";
}

export default function ClientImporter({ onDone }: { onDone: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [rows, setRows] = useState<Cell[][]>([]);
  const [cols, setCols] = useState<Field[]>([]);
  const [hasHeader, setHasHeader] = useState(true);
  const [done, setDone] = useState<{ created: number; skipped: number } | null>(null);

  const nCols = rows.length ? Math.max(...rows.map((r) => r.length)) : 0;

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError("");
    try {
      const XLSX = await import("xlsx");
      const wb = XLSX.read(await file.arrayBuffer());
      const first = wb.SheetNames[0];
      const data = XLSX.utils.sheet_to_json<Cell[]>(wb.Sheets[first], {
        header: 1,
        raw: true,
        defval: null,
      });
      const clean = data.filter((r) => r.some((cell) => String(cell ?? "").trim()));
      if (clean.length === 0) {
        setError("O ficheiro não tem dados.");
        return;
      }
      setRows(clean);
      const header = clean[0];
      const n = Math.max(...clean.map((r) => r.length));
      const guessed: Field[] = Array.from({ length: n }, (_, i) => guessField(String(header[i] ?? "")));
      // se nada foi adivinhado, assume 1.ª coluna = nome
      if (!guessed.includes("name") && guessed.length) guessed[0] = "name";
      setCols(guessed);
    } catch (e) {
      setError(`Não consegui ler o ficheiro: ${e instanceof Error ? e.message : e}`);
    }
  }

  const dataRows = useMemo(() => (hasHeader ? rows.slice(1) : rows), [rows, hasHeader]);

  const parsed: ClientImportRow[] = useMemo(() => {
    const idx = (f: Field) => cols.indexOf(f);
    const get = (r: Cell[], f: Field) => {
      const i = idx(f);
      return i >= 0 ? String(r[i] ?? "").trim() : "";
    };
    return dataRows
      .map((r) => ({
        name: get(r, "name"),
        nif: get(r, "nif"),
        email: get(r, "email"),
        phone: get(r, "phone"),
        address: get(r, "address"),
      }))
      .filter((c) => c.name);
  }, [dataRows, cols]);

  function setCol(i: number, f: Field) {
    setCols((prev) => {
      const next = [...prev];
      // cada campo (exceto vazio) usado no máximo numa coluna
      if (f) next.forEach((v, j) => { if (v === f && j !== i) next[j] = ""; });
      next[i] = f;
      return next;
    });
  }

  function run() {
    startTransition(async () => {
      const res = await importClientsAction(parsed);
      setDone(res);
    });
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-30 flex items-start justify-center p-4 pt-12" onClick={onDone}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-xl shadow-xl w-full max-w-3xl p-5 grid gap-4 text-sm max-h-[85vh] overflow-auto"
      >
        <div className="flex items-center">
          <h2 className="font-bold text-base flex-1">Importar clientes (Excel / CSV)</h2>
          <button onClick={onDone} className="text-slate-400 hover:text-slate-700">✕</button>
        </div>

        {error && <p className="bg-red-50 text-red-700 rounded-lg px-3 py-2">{error}</p>}

        {done ? (
          <div className="grid gap-3">
            <p className="bg-emerald-50 text-emerald-800 rounded-lg px-3 py-2">
              {done.created} clientes importados{done.skipped > 0 && `, ${done.skipped} ignorados (sem nome ou já existentes)`}.
            </p>
            <button onClick={onDone} className="justify-self-end bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium">
              Fechar
            </button>
          </div>
        ) : rows.length === 0 ? (
          <label className="grid gap-2 font-medium">
            Ficheiro com a lista de clientes
            <input type="file" accept=".xlsx,.xls,.csv" onChange={(e) => onFile(e.target.files?.[0])} />
            <span className="text-xs text-slate-500 font-normal">
              Uma coluna com o nome é obrigatória. NIF, email, telefone e morada são opcionais.
              Deduplicado por NIF e, na sua falta, por nome.
            </span>
          </label>
        ) : (
          <>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={hasHeader} onChange={(e) => setHasHeader(e.target.checked)} />
              A primeira linha é cabeçalho
            </label>
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="text-xs w-full">
                <thead>
                  <tr>
                    {Array.from({ length: nCols }, (_, i) => (
                      <th key={i} className="p-1 bg-slate-50 border-b border-slate-200">
                        <select
                          value={cols[i] ?? ""}
                          onChange={(e) => setCol(i, e.target.value as Field)}
                          className={`${inputCls} w-full text-xs font-semibold ${cols[i] ? "bg-blue-50 border-blue-400" : ""}`}
                        >
                          <option value="">— ignorar —</option>
                          {Object.entries(FIELD_LABEL).map(([k, label]) => (
                            <option key={k} value={k}>{label}</option>
                          ))}
                        </select>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(hasHeader ? rows.slice(1, 7) : rows.slice(0, 6)).map((r, ri) => (
                    <tr key={ri} className="border-b border-slate-100">
                      {Array.from({ length: nCols }, (_, ci) => (
                        <td key={ci} className="px-2 py-1 max-w-48 truncate text-slate-600">
                          {String(r[ci] ?? "")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={run}
                disabled={isPending || parsed.length === 0 || !cols.includes("name")}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white px-5 py-2 rounded-lg font-medium"
              >
                {isPending ? "A importar…" : `Importar ${parsed.length} clientes`}
              </button>
              {!cols.includes("name") && (
                <span className="text-amber-600">Marca a coluna do nome.</span>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
