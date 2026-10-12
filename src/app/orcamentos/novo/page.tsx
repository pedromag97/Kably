import { createBudgetAction } from "@/app/actions";
import { VAT_MODES } from "@/lib/calc";
import SubmitButton from "@/components/SubmitButton";

const inputCls =
  "w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

const SCOPES = [
  {
    value: "BOTH",
    label: "Material + mão de obra",
    hint: "O habitual: fornecimento e montagem por tua conta.",
  },
  {
    value: "LABOR",
    label: "Só mão de obra",
    hint: "O material é fornecido pelo dono de obra. Podes cobrar uma taxa de gestão sobre esse material.",
  },
  {
    value: "MATERIAL",
    label: "Só material",
    hint: "Só fornecimento — a montagem é de outrem. As horas ficam como estimativa, mas não entram no preço.",
  },
] as const;

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

        <fieldset className="grid gap-2">
          <legend className="text-sm font-medium mb-1">O que vais faturar?</legend>
          {SCOPES.map((s) => (
            <label
              key={s.value}
              className="flex items-start gap-2.5 border border-slate-200 rounded-lg p-3 cursor-pointer hover:bg-slate-50 has-checked:border-blue-500 has-checked:bg-blue-50"
            >
              <input
                type="radio"
                name="scope"
                value={s.value}
                defaultChecked={s.value === "BOTH"}
                className="mt-0.5"
              />
              <span className="grid gap-0.5">
                <span className="text-sm font-medium">{s.label}</span>
                <span className="text-xs text-slate-500">{s.hint}</span>
              </span>
            </label>
          ))}
        </fieldset>

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

        <SubmitButton
          pendingLabel="A criar orçamento…"
          className="bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-medium w-full"
        >
          Criar orçamento
        </SubmitButton>
      </form>
    </div>
  );
}
