import { createBudgetAction } from "@/app/actions";
import { VAT_MODES } from "@/lib/calc";

const inputCls =
  "w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

export default function NewBudgetPage() {
  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Novo orçamento</h1>
      <form
        action={createBudgetAction}
        className="bg-white rounded-xl border border-slate-200 p-6 grid gap-4"
      >
        <label className="grid gap-1 text-sm font-medium">
          Título da obra *
          <input
            name="title"
            required
            placeholder="Ex.: Instalação elétrica — Moradia Cascais"
            className={inputCls}
          />
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="grid gap-1 text-sm font-medium">
            Nome do cliente
            <input name="clientName" className={inputCls} />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            NIF do cliente
            <input name="clientNif" className={inputCls} />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Email
            <input name="clientEmail" type="email" className={inputCls} />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Telefone
            <input name="clientPhone" className={inputCls} />
          </label>
        </div>

        <label className="grid gap-1 text-sm font-medium">
          Morada da obra
          <input name="siteAddress" className={inputCls} />
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
          O orçamento é criado com os capítulos típicos de eletricidade e as margens
          definidas em <strong>Definições</strong> — tudo ajustável depois.
        </p>

        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-medium"
        >
          Criar orçamento
        </button>
      </form>
    </div>
  );
}
