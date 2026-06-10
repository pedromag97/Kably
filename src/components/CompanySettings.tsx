"use client";

import { useState, useTransition } from "react";
import type { Company } from "@/lib/types";
import { saveCompanyAction } from "@/app/actions";

const inputCls =
  "border border-slate-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full";

export default function CompanySettings({ company }: { company: Company }) {
  const [, startTransition] = useTransition();
  const [logo, setLogo] = useState(company.logo);
  const [saved, setSaved] = useState(false);

  const onLogoChange = (file: File | undefined) => {
    if (!file) return;
    if (file.size > 1_000_000) {
      alert("Imagem demasiado grande (máx. 1 MB). Usa um logotipo mais pequeno.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setLogo(String(reader.result));
    reader.readAsDataURL(file);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Definições da empresa</h1>
      <form
        action={(fd) =>
          startTransition(async () => {
            await saveCompanyAction(fd);
            setSaved(true);
            setTimeout(() => setSaved(false), 2500);
          })
        }
        className="bg-white rounded-xl border border-slate-200 p-6 grid grid-cols-2 gap-4 text-sm"
      >
        <label className="grid gap-1 font-medium col-span-2">
          Nome da empresa *
          <input name="name" required defaultValue={company.name} className={inputCls} />
        </label>
        <label className="grid gap-1 font-medium">
          NIF
          <input name="nif" defaultValue={company.nif} className={inputCls} />
        </label>
        <label className="grid gap-1 font-medium">
          Telefone
          <input name="phone" defaultValue={company.phone} className={inputCls} />
        </label>
        <label className="grid gap-1 font-medium col-span-2">
          Email
          <input name="email" type="email" defaultValue={company.email} className={inputCls} />
        </label>
        <label className="grid gap-1 font-medium col-span-2">
          Morada
          <input name="address" defaultValue={company.address} className={inputCls} />
        </label>

        <div className="col-span-2 grid gap-2">
          <span className="font-medium">Logotipo (aparece no PDF)</span>
          <div className="flex items-center gap-4">
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logo}
                alt="Logotipo"
                className="h-16 w-auto border border-slate-200 rounded-lg p-1 bg-white"
              />
            ) : (
              <div className="h-16 w-28 border border-dashed border-slate-300 rounded-lg flex items-center justify-center text-xs text-slate-400">
                Sem logotipo
              </div>
            )}
            <input
              type="file"
              accept="image/png,image/jpeg"
              onChange={(e) => onLogoChange(e.target.files?.[0])}
              className="text-xs"
            />
            {logo && (
              <button
                type="button"
                onClick={() => setLogo("")}
                className="text-xs text-slate-400 hover:text-red-600"
              >
                Remover
              </button>
            )}
          </div>
          <input type="hidden" name="logo" value={logo} />
        </div>

        <hr className="col-span-2 border-slate-100" />
        <p className="col-span-2 text-xs text-slate-500 -mb-2">
          Valores por defeito para novos orçamentos (ajustáveis em cada orçamento):
        </p>
        <label className="grid gap-1 font-medium">
          Margem material (%)
          <input
            name="materialMargin"
            inputMode="decimal"
            defaultValue={company.materialMargin}
            className={inputCls}
          />
        </label>
        <label className="grid gap-1 font-medium">
          Margem mão de obra (%)
          <input
            name="laborMargin"
            inputMode="decimal"
            defaultValue={company.laborMargin}
            className={inputCls}
          />
        </label>
        <label className="grid gap-1 font-medium">
          Mão de obra (€/hora)
          <input
            name="laborRate"
            inputMode="decimal"
            defaultValue={company.laborRate}
            className={inputCls}
          />
        </label>
        <label className="grid gap-1 font-medium">
          Validade (dias)
          <input
            name="validityDays"
            inputMode="numeric"
            defaultValue={company.validityDays}
            className={inputCls}
          />
        </label>
        <label className="grid gap-1 font-medium col-span-2">
          Condições (aparecem no PDF)
          <textarea
            name="conditions"
            rows={4}
            defaultValue={company.conditions}
            className={inputCls}
          />
        </label>

        <div className="col-span-2 flex items-center gap-3">
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-medium"
          >
            Guardar
          </button>
          {saved && <span className="text-emerald-600 text-sm">✓ Guardado</span>}
        </div>
      </form>
    </div>
  );
}
