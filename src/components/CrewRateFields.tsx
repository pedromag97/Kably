"use client";

import { useState } from "react";
import { eur } from "@/lib/calc";

function parseNum(v: string): number {
  const n = parseFloat(v.replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

/**
 * €/hora da mão de obra, por pessoa ou por equipa. Mostra e aceita o valor da
 * equipa quando `crewSize` > 1, mas grava sempre o €/hora POR PESSOA (campo
 * escondido `laborRate`) — mudar a equipa nunca altera o preço de nada.
 * Com `selectable`, mostra também a escolha da equipa (campo `crewSize`).
 */
export default function CrewRateFields({
  crewSize,
  laborRate,
  selectable = false,
  selectLabel = "Mão de obra calculada",
  inputClassName,
}: {
  crewSize: number;
  laborRate: number;
  selectable?: boolean;
  selectLabel?: string;
  inputClassName: string;
}) {
  const [crew, setCrew] = useState(Math.max(1, crewSize || 1));
  const [personRate, setPersonRate] = useState(laborRate);
  const [text, setText] = useState(String(Math.round(laborRate * crew * 100) / 100));

  return (
    <>
      {selectable && (
        <label className="grid gap-1 font-medium">
          {selectLabel}
          <select
            name="crewSize"
            // defaultValue (não value): ao repor o formulário depois de guardar, o React 19
            // volta à opção por defeito — que assim é a gravada, e não a primeira da lista
            defaultValue={crew}
            onChange={(e) => {
              const n = Number(e.target.value);
              setCrew(n);
              setText(String(Math.round(personRate * n * 100) / 100));
            }}
            className={inputClassName}
          >
            <option value={1}>Por homem (hora-homem)</option>
            {[2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>
                Por equipa de {n} pessoas
              </option>
            ))}
          </select>
        </label>
      )}
      <label className="grid gap-1 font-medium">
        {crew > 1 ? `Mão de obra (€/hora da equipa de ${crew})` : "Mão de obra (€/hora por pessoa)"}
        <input
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setPersonRate(parseNum(e.target.value) / crew);
          }}
          inputMode="decimal"
          className={inputClassName}
        />
        <input type="hidden" name="laborRate" value={personRate} />
        {crew > 1 && (
          <span className="text-xs font-normal text-slate-500">
            = {eur(personRate)}/h por pessoa
          </span>
        )}
      </label>
    </>
  );
}
