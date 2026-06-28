"use client";

import { useState, useTransition } from "react";
import type { Supplier } from "@/lib/types";
import { createSupplierAction, deleteSupplierAction } from "@/app/actions";

const inputCls =
  "border border-slate-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

export default function SuppliersManager({ suppliers }: { suppliers: Supplier[] }) {
  const [, startTransition] = useTransition();
  const [name, setName] = useState("");

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold mb-2">Fornecedores</h1>
      <p className="text-sm text-slate-500 mb-5">
        A tua lista de vendedores de material (ex.: Rexel, Sonepar, CEF). Usas estes
        nomes ao registar cotações e ao comparar preços por artigo.
      </p>

      <form
        action={(fd) =>
          startTransition(async () => {
            await createSupplierAction(fd);
            setName("");
          })
        }
        className="flex gap-2 mb-5"
      >
        <input
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome do fornecedor"
          required
          className={`${inputCls} flex-1`}
        />
        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          + Adicionar
        </button>
      </form>

      <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
        {suppliers.length === 0 && (
          <p className="px-4 py-6 text-sm text-slate-400 text-center">
            Ainda não tens fornecedores. Adiciona o primeiro acima.
          </p>
        )}
        {suppliers.map((s) => (
          <div key={s.id} className="flex items-center px-4 py-2.5 text-sm">
            <span className="flex-1 font-medium">{s.name}</span>
            <button
              onClick={() => {
                if (
                  confirm(
                    `Apagar "${s.name}"? O histórico de preços fica, mas deixa de estar associado a este fornecedor.`
                  )
                )
                  startTransition(() => deleteSupplierAction(s.id));
              }}
              className="text-slate-400 hover:text-red-600"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
