"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import type { Client } from "@/lib/types";
import { eur } from "@/lib/calc";
import { updateClientAction } from "@/app/actions";

const inputCls =
  "border border-slate-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full";

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  DRAFT: { label: "Rascunho", cls: "bg-slate-100 text-slate-600" },
  SENT: { label: "Enviado", cls: "bg-blue-100 text-blue-700" },
  ACCEPTED: { label: "Aceite", cls: "bg-emerald-100 text-emerald-700" },
  REJECTED: { label: "Recusado", cls: "bg-red-100 text-red-700" },
};

type BudgetRow = {
  id: number;
  number: string;
  title: string;
  status: string;
  createdAt: string;
  total: number;
};

export default function ClientDetail({
  client,
  budgets,
  totals,
}: {
  client: Client;
  budgets: BudgetRow[];
  totals: { won: number; pending: number; conversion: number | null };
}) {
  const [, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);

  return (
    <div className="mt-3">
      <div className="flex flex-wrap items-start gap-3 mb-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold">{client.name}</h1>
          <p className="text-sm text-slate-500 mt-1">
            {[
              client.nif && `NIF ${client.nif}`,
              client.email,
              client.phone,
              client.address,
            ]
              .filter(Boolean)
              .join(" · ") || "Sem contactos registados"}
          </p>
        </div>
        <button
          onClick={() => setEditing(true)}
          className="border border-slate-300 hover:bg-slate-100 px-3 py-1.5 rounded-lg text-sm"
        >
          Editar
        </button>
        <Link
          href={`/orcamentos/novo?cliente=${client.id}`}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg text-sm font-medium"
        >
          + Novo orçamento
        </Link>
      </div>

      {/* Totais */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-xs text-slate-400">Ganho</div>
          <div className="text-lg font-bold text-emerald-700">{eur(totals.won)}</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-xs text-slate-400">Por decidir</div>
          <div className="text-lg font-bold text-blue-700">{eur(totals.pending)}</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-xs text-slate-400">Conversão</div>
          <div className="text-lg font-bold">
            {totals.conversion === null ? "—" : `${totals.conversion}%`}
          </div>
        </div>
      </div>

      {client.notes && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5 text-sm whitespace-pre-wrap">
          {client.notes}
        </div>
      )}

      {/* Orçamentos */}
      <h2 className="font-semibold mb-2">Orçamentos ({budgets.length})</h2>
      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        {budgets.length === 0 ? (
          <p className="px-4 py-6 text-sm text-slate-400 text-center">
            Ainda não há orçamentos para este cliente.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-400 text-left border-b border-slate-200">
                <th className="px-3 py-2 font-medium">Nº</th>
                <th className="px-2 py-2 font-medium">Título</th>
                <th className="px-2 py-2 font-medium">Estado</th>
                <th className="px-2 py-2 font-medium">Data</th>
                <th className="px-2 py-2 font-medium text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {budgets.map((b) => (
                <tr key={b.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-3 py-2 font-mono text-xs text-slate-500">
                    <Link href={`/orcamentos/${b.id}`} className="hover:underline">
                      {b.number}
                    </Link>
                  </td>
                  <td className="px-2 py-2">
                    <Link href={`/orcamentos/${b.id}`} className="text-blue-700 hover:underline">
                      {b.title}
                    </Link>
                  </td>
                  <td className="px-2 py-2">
                    <span
                      className={`text-[10px] font-semibold rounded px-1.5 py-0.5 ${STATUS_BADGE[b.status]?.cls ?? ""}`}
                    >
                      {STATUS_BADGE[b.status]?.label ?? b.status}
                    </span>
                  </td>
                  <td className="px-2 py-2 text-slate-500">
                    {new Date(b.createdAt + "Z").toLocaleDateString("pt-PT")}
                  </td>
                  <td className="px-2 py-2 text-right font-medium">{eur(b.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editing && (
        <div
          className="fixed inset-0 bg-black/40 z-30 flex items-start justify-center p-4 pt-16"
          onClick={() => setEditing(false)}
        >
          <form
            onClick={(e) => e.stopPropagation()}
            action={(fd) =>
              startTransition(async () => {
                await updateClientAction(client.id, fd);
                setEditing(false);
              })
            }
            className="bg-white rounded-xl shadow-xl w-full max-w-lg p-5 grid grid-cols-2 gap-3 text-sm"
          >
            <h2 className="col-span-2 font-bold text-base">Editar cliente</h2>
            <label className="grid gap-1 font-medium col-span-2">
              Nome *
              <input name="name" required defaultValue={client.name} className={inputCls} />
            </label>
            <label className="grid gap-1 font-medium">
              NIF
              <input name="nif" defaultValue={client.nif} className={inputCls} />
            </label>
            <label className="grid gap-1 font-medium">
              Telefone
              <input name="phone" defaultValue={client.phone} className={inputCls} />
            </label>
            <label className="grid gap-1 font-medium col-span-2">
              Email
              <input name="email" type="email" defaultValue={client.email} className={inputCls} />
            </label>
            <label className="grid gap-1 font-medium col-span-2">
              Morada
              <input name="address" defaultValue={client.address} className={inputCls} />
            </label>
            <label className="grid gap-1 font-medium col-span-2">
              Notas
              <textarea name="notes" defaultValue={client.notes} rows={3} className={inputCls} />
            </label>
            <div className="col-span-2 flex gap-2 justify-end">
              <button type="button" onClick={() => setEditing(false)} className="px-4 py-2 rounded-lg text-sm hover:bg-slate-100">
                Cancelar
              </button>
              <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
                Guardar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
