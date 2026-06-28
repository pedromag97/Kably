"use client";

import { useState } from "react";
import type { Client } from "@/lib/types";
import { VAT_MODES } from "@/lib/calc";
import { createBudgetAction } from "@/app/actions";

const inputCls =
  "w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

export default function NewBudgetForm({
  clients,
  prefillClientId,
}: {
  clients: Client[];
  prefillClientId: number | null;
}) {
  const prefill = clients.find((c) => c.id === prefillClientId) ?? null;
  const [clientId, setClientId] = useState<string>(prefill ? String(prefill.id) : "");
  const [name, setName] = useState(prefill?.name ?? "");
  const [nif, setNif] = useState(prefill?.nif ?? "");
  const [email, setEmail] = useState(prefill?.email ?? "");
  const [phone, setPhone] = useState(prefill?.phone ?? "");
  const [address, setAddress] = useState(prefill?.address ?? "");

  function pickClient(value: string) {
    setClientId(value);
    if (!value) {
      // "Novo cliente": limpa para preencheres à mão (será auto-guardado)
      setName("");
      setNif("");
      setEmail("");
      setPhone("");
      setAddress("");
      return;
    }
    const c = clients.find((x) => String(x.id) === value);
    if (c) {
      setName(c.name);
      setNif(c.nif);
      setEmail(c.email);
      setPhone(c.phone);
      setAddress(c.address);
    }
  }

  return (
    <form action={createBudgetAction} className="bg-white rounded-xl border border-slate-200 p-6 grid gap-4">
      <input type="hidden" name="clientId" value={clientId} />

      <label className="grid gap-1 text-sm font-medium">
        Título da obra *
        <input
          name="title"
          required
          placeholder="Ex.: Instalação elétrica — Moradia Cascais"
          className={inputCls}
        />
      </label>

      {clients.length > 0 && (
        <label className="grid gap-1 text-sm font-medium">
          Cliente
          <select value={clientId} onChange={(e) => pickClient(e.target.value)} className={inputCls}>
            <option value="">+ Novo cliente (preenche abaixo)</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.nif ? ` — ${c.nif}` : ""}
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="grid gap-1 text-sm font-medium">
          Nome do cliente
          <input name="clientName" value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          NIF do cliente
          <input name="clientNif" value={nif} onChange={(e) => setNif(e.target.value)} className={inputCls} />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Email
          <input name="clientEmail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Telefone
          <input name="clientPhone" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} />
        </label>
      </div>

      <label className="grid gap-1 text-sm font-medium">
        Morada da obra
        <input name="siteAddress" value={address} onChange={(e) => setAddress(e.target.value)} className={inputCls} />
      </label>

      <label className="grid gap-1 text-sm font-medium">
        Regime de IVA
        <select name="vatMode" className={inputCls} defaultValue="NORMAL">
          {Object.entries(VAT_MODES).map(([k, v]) => (
            <option key={k} value={k}>
              {v.label}
            </option>
          ))}
        </select>
      </label>

      <p className="text-xs text-slate-500">
        Se escreveres um cliente novo, fica guardado automaticamente na tua lista de{" "}
        <strong>Clientes</strong>. O orçamento é criado com os capítulos típicos e as margens
        das <strong>Definições</strong> — tudo ajustável depois.
      </p>

      <button
        type="submit"
        className="bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-medium"
      >
        Criar orçamento
      </button>
    </form>
  );
}
