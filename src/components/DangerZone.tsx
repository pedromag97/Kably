"use client";

import { useState, useTransition } from "react";
import { deleteAccountAction } from "@/app/actions";

export default function DangerZone({ companyName }: { companyName: string }) {
  const [confirm, setConfirm] = useState("");
  const [pending, startTransition] = useTransition();
  const armed = confirm.trim() === companyName.trim();

  return (
    <div className="bg-white rounded-xl border border-red-200 p-6 grid gap-4 max-w-2xl mt-6">
      <h2 className="font-bold text-red-700">Zona de perigo</h2>

      <div className="flex flex-wrap items-center gap-3">
        <a
          href="/definicoes/exportar"
          className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium"
        >
          ⬇ Exportar todos os dados (JSON)
        </a>
        <span className="text-xs text-slate-400">Descarrega uma cópia antes de apagar.</span>
      </div>

      <div className="border-t border-slate-100 pt-4 grid gap-3">
        <p className="text-sm text-slate-600">
          Apagar a empresa remove <strong>todos</strong> os dados (orçamentos, artigos,
          custos, utilizadores) de forma irreversível.
        </p>
        <label className="grid gap-1 text-sm font-medium max-w-xs">
          Escreve <span className="font-bold">{companyName}</span> para confirmar
          <input
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="border border-slate-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </label>
        <button
          onClick={() => {
            if (armed && confirm && window.confirm("Apagar a empresa e todos os dados? Esta ação é irreversível.")) {
              startTransition(() => deleteAccountAction());
            }
          }}
          disabled={!armed || pending}
          className="bg-red-600 hover:bg-red-700 disabled:bg-slate-300 text-white px-4 py-2 rounded-lg text-sm font-medium w-fit"
        >
          {pending ? "A apagar…" : "Apagar empresa definitivamente"}
        </button>
      </div>
    </div>
  );
}
