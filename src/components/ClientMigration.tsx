"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { applyClientMigrationAction } from "@/app/actions";
import type { MigrationCandidateView } from "@/app/clientes/migrar/page";

const inputCls =
  "border border-slate-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

export default function ClientMigration({
  candidates,
}: {
  candidates: MigrationCandidateView[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState<{ clients: number; linked: number } | null>(null);
  const [picked, setPicked] = useState<Record<string, boolean>>(
    Object.fromEntries(candidates.map((c) => [c.key, true]))
  );
  const [names, setNames] = useState<Record<string, string>>(
    Object.fromEntries(candidates.map((c) => [c.key, c.name]))
  );

  const chosen = candidates.filter((c) => picked[c.key]);

  function apply() {
    const payload = chosen.map((c) => ({
      name: names[c.key] ?? c.name,
      nif: c.nif,
      email: c.email,
      phone: c.phone,
      address: c.address,
      budgetIds: c.budgetIds,
    }));
    startTransition(async () => {
      const res = await applyClientMigrationAction(payload);
      setDone(res);
      router.refresh();
    });
  }

  if (done) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 text-sm grid gap-3">
        <p className="text-emerald-800">
          {done.clients} fichas criadas e {done.linked} orçamentos ligados.
        </p>
        <a href="/clientes" className="justify-self-start bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium">
          Ver clientes
        </a>
      </div>
    );
  }

  if (candidates.length === 0) {
    return (
      <p className="bg-white border border-slate-200 rounded-xl p-6 text-sm text-slate-500 text-center">
        Não há clientes por importar — todos os orçamentos já têm ficha ligada.
      </p>
    );
  }

  return (
    <div className="grid gap-4">
      <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
        {candidates.map((c) => (
          <label key={c.key} className="flex items-start gap-3 px-4 py-3 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={!!picked[c.key]}
              onChange={(e) => setPicked((p) => ({ ...p, [c.key]: e.target.checked }))}
              className="mt-1.5"
            />
            <div className="flex-1 min-w-0">
              <input
                value={names[c.key] ?? c.name}
                onChange={(e) => setNames((n) => ({ ...n, [c.key]: e.target.value }))}
                className={`${inputCls} w-full max-w-sm font-medium`}
              />
              <div className="text-xs text-slate-500 mt-1">
                {[c.nif && `NIF ${c.nif}`, c.email, c.phone].filter(Boolean).join(" · ") || "sem contactos"}
                {" · "}
                {c.budgetIds.length} orçamento{c.budgetIds.length !== 1 ? "s" : ""} ({c.budgetNumbers.slice(0, 3).join(", ")}
                {c.budgetNumbers.length > 3 ? "…" : ""})
              </div>
            </div>
            {c.matchesExisting && (
              <span className="text-[10px] font-semibold text-violet-600 whitespace-nowrap mt-1">
                liga a ficha existente
              </span>
            )}
          </label>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={apply}
          disabled={isPending || chosen.length === 0}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white px-5 py-2 rounded-lg text-sm font-medium"
        >
          {isPending ? "A importar…" : `Importar ${chosen.length} clientes`}
        </button>
        <span className="text-sm text-slate-400">
          {candidates.length} candidatos encontrados
        </span>
      </div>
    </div>
  );
}
