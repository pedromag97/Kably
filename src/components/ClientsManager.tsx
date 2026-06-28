"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import type { Client } from "@/lib/types";
import {
  createClientAction,
  deleteClientAction,
  updateClientAction,
} from "@/app/actions";
import ClientImporter from "./ClientImporter";

const inputCls =
  "border border-slate-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full";

function ClientForm({ client, onDone }: { client: Client | null; onDone: () => void }) {
  const [, startTransition] = useTransition();
  return (
    <div
      className="fixed inset-0 bg-black/40 z-30 flex items-start justify-center p-4 pt-16"
      onClick={onDone}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        action={(fd) =>
          startTransition(async () => {
            if (client) await updateClientAction(client.id, fd);
            else await createClientAction(fd);
            onDone();
          })
        }
        className="bg-white rounded-xl shadow-xl w-full max-w-lg p-5 grid grid-cols-2 gap-3 text-sm"
      >
        <h2 className="col-span-2 font-bold text-base">
          {client ? "Editar cliente" : "Novo cliente"}
        </h2>
        <label className="grid gap-1 font-medium col-span-2">
          Nome *
          <input name="name" required defaultValue={client?.name} className={inputCls} />
        </label>
        <label className="grid gap-1 font-medium">
          NIF
          <input name="nif" defaultValue={client?.nif} className={inputCls} />
        </label>
        <label className="grid gap-1 font-medium">
          Telefone
          <input name="phone" defaultValue={client?.phone} className={inputCls} />
        </label>
        <label className="grid gap-1 font-medium col-span-2">
          Email
          <input name="email" type="email" defaultValue={client?.email} className={inputCls} />
        </label>
        <label className="grid gap-1 font-medium col-span-2">
          Morada
          <input name="address" defaultValue={client?.address} className={inputCls} />
        </label>
        <label className="grid gap-1 font-medium col-span-2">
          Notas
          <textarea name="notes" defaultValue={client?.notes} rows={3} className={inputCls} />
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

export default function ClientsManager({
  clients,
  counts,
  pendingMigration,
}: {
  clients: Client[];
  counts: Record<number, number>;
  pendingMigration: boolean;
}) {
  const [, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Client | null>(null);
  const [creating, setCreating] = useState(false);
  const [importing, setImporting] = useState(false);

  const filtered = clients.filter(
    (c) =>
      !query ||
      c.name.toLowerCase().includes(query.toLowerCase()) ||
      c.nif.includes(query)
  );

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <h1 className="text-2xl font-bold flex-1">Clientes</h1>
        <button
          onClick={() => setImporting(true)}
          className="border border-slate-300 hover:bg-slate-100 px-4 py-2 rounded-lg text-sm font-medium"
        >
          ↥ Importar
        </button>
        <button
          onClick={() => setCreating(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          + Novo cliente
        </button>
      </div>

      {pendingMigration && (
        <div className="mb-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-4 py-3 text-sm flex flex-wrap items-center gap-2">
          <span>
            Há orçamentos com clientes ainda sem ficha. Podes criar as fichas a partir deles.
          </span>
          <Link
            href="/clientes/migrar"
            className="ml-auto bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-md font-medium"
          >
            Rever e importar
          </Link>
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Pesquisar por nome ou NIF…"
          className={`${inputCls} max-w-xs`}
        />
        <span className="text-sm text-slate-400 self-center">{filtered.length} clientes</span>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        {filtered.length === 0 ? (
          <p className="px-4 py-8 text-sm text-slate-400 text-center">
            {clients.length === 0
              ? "Ainda não tens clientes. Cria o primeiro ou importa de um ficheiro."
              : "Nenhum cliente corresponde à pesquisa."}
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-400 text-left border-b border-slate-200">
                <th className="px-3 py-2 font-medium">Nome</th>
                <th className="px-2 py-2 font-medium">NIF</th>
                <th className="px-2 py-2 font-medium">Email</th>
                <th className="px-2 py-2 font-medium">Telefone</th>
                <th className="px-2 py-2 font-medium text-center">Orç.</th>
                <th className="px-2 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-3 py-2">
                    <Link href={`/clientes/${c.id}`} className="text-blue-700 hover:underline font-medium">
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-2 py-2 text-slate-500">{c.nif || "—"}</td>
                  <td className="px-2 py-2 text-slate-500">{c.email || "—"}</td>
                  <td className="px-2 py-2 text-slate-500">{c.phone || "—"}</td>
                  <td className="px-2 py-2 text-center text-slate-500">{counts[c.id] ?? 0}</td>
                  <td className="px-2 py-2 text-right whitespace-nowrap">
                    <button onClick={() => setEditing(c)} className="text-blue-600 hover:underline mr-3">
                      Editar
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Apagar "${c.name}"? Os orçamentos mantêm os dados, só deixam de estar ligados à ficha.`))
                          startTransition(() => deleteClientAction(c.id));
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
        )}
      </div>

      {(creating || editing) && (
        <ClientForm
          client={editing}
          onDone={() => {
            setCreating(false);
            setEditing(null);
          }}
        />
      )}
      {importing && <ClientImporter onDone={() => setImporting(false)} />}
    </div>
  );
}
