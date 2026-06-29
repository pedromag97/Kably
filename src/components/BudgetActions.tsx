"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import ShareBudget from "./ShareBudget";
import { createRevisionAction } from "@/app/actions";

/** Menu "Ações" do editor: agrupa PDFs e envio ao cliente num só botão. */
export default function BudgetActions({
  budgetId,
  number,
  clientEmail,
}: {
  budgetId: number;
  number: string;
  clientEmail: string;
}) {
  const [open, setOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const itemCls = "block w-full text-left px-3 py-2 text-sm hover:bg-slate-100";

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium"
      >
        Ações
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-1 w-56 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-30"
        >
          <a
            href={`/orcamentos/${budgetId}/pdf?v=cliente`}
            target="_blank"
            onClick={() => setOpen(false)}
            className={itemCls}
          >
            PDF para cliente
          </a>
          <a
            href={`/orcamentos/${budgetId}/pdf?v=interna`}
            target="_blank"
            onClick={() => setOpen(false)}
            className={itemCls}
          >
            PDF interno (com custos)
          </a>
          <div className="border-t border-slate-100 my-1" />
          <button
            onClick={() => {
              setOpen(false);
              startTransition(() => createRevisionAction(budgetId));
            }}
            className={itemCls}
          >
            Nova revisão
          </button>
          <button
            onClick={() => {
              setOpen(false);
              setShareOpen(true);
            }}
            className={`${itemCls} text-emerald-700 font-medium`}
          >
            Enviar ao cliente
          </button>
        </div>
      )}

      {/* Sempre montado para o modal poder abrir mesmo com o menu fechado. */}
      <ShareBudget
        budgetId={budgetId}
        number={number}
        clientEmail={clientEmail}
        open={shareOpen}
        onOpenChange={setShareOpen}
        renderTrigger={() => null}
      />
    </div>
  );
}
