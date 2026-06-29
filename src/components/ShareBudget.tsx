"use client";

import { useState, useTransition, type ReactNode } from "react";
import { sendBudgetAction, shareLinkAction } from "@/app/actions";

const inputCls =
  "border border-slate-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full";

export default function ShareBudget({
  budgetId,
  number,
  clientEmail,
  renderTrigger,
  open: openProp,
  onOpenChange,
}: {
  budgetId: number;
  number: string;
  clientEmail: string;
  /** Permite renderizar o gatilho à medida (ex.: item de menu). `null` = sem gatilho. */
  renderTrigger?: (open: () => void) => ReactNode;
  /** Modo controlado: estado do modal gerido pelo componente-pai. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [openState, setOpenState] = useState(false);
  const open = openProp ?? openState;
  const setOpen = (v: boolean) => (onOpenChange ? onOpenChange(v) : setOpenState(v));
  const [pending, startTransition] = useTransition();
  const [to, setTo] = useState(clientEmail);
  const [subject, setSubject] = useState(`Orçamento ${number}`);
  const [message, setMessage] = useState(
    "Boa tarde,\n\nSegue em anexo o orçamento solicitado. Pelo link consegue ver os detalhes e aceitar ou recusar.\n\nCom os melhores cumprimentos,"
  );
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const sendEmail = () =>
    startTransition(async () => {
      setFeedback(null);
      const r = await sendBudgetAction(budgetId, to, subject, message);
      setFeedback(
        r.ok
          ? { ok: true, msg: "Email enviado ao cliente." }
          : { ok: false, msg: r.error ?? "Não foi possível enviar." }
      );
    });

  const withLink = (fn: (link: string) => void) =>
    startTransition(async () => {
      const r = await shareLinkAction(budgetId);
      if ("link" in r) fn(r.link);
      else setFeedback({ ok: false, msg: r.error });
    });

  const shareWhatsApp = () =>
    withLink((link) => {
      const text = `Orçamento ${number}: ${link}`;
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
    });

  const copyLink = () =>
    withLink(async (link) => {
      try {
        await navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        setFeedback({ ok: true, msg: link });
      }
    });

  return (
    <>
      {renderTrigger ? (
        renderTrigger(() => setOpen(true))
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium"
        >
          Enviar ao cliente
        </button>
      )}

      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-40 flex items-start justify-center p-4 pt-16"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl w-full max-w-md p-5 grid gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-bold">Enviar orçamento {number}</h2>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-700">
                ✕
              </button>
            </div>

            <div className="grid gap-3">
              <label className="grid gap-1 text-sm font-medium">
                Email do cliente
                <input value={to} onChange={(e) => setTo(e.target.value)} className={inputCls} />
              </label>
              <label className="grid gap-1 text-sm font-medium">
                Assunto
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className={inputCls}
                />
              </label>
              <label className="grid gap-1 text-sm font-medium">
                Mensagem
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  className={inputCls}
                />
              </label>
              <button
                onClick={sendEmail}
                disabled={pending}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white py-2 rounded-lg text-sm font-medium"
              >
                {pending ? "A enviar…" : "Enviar por email (PDF + link)"}
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="flex-1 border-t border-slate-100" />
              ou partilhar
              <span className="flex-1 border-t border-slate-100" />
            </div>

            <div className="flex gap-2">
              <button
                onClick={shareWhatsApp}
                disabled={pending}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg text-sm font-medium"
              >
                WhatsApp
              </button>
              <button
                onClick={copyLink}
                disabled={pending}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-lg text-sm font-medium"
              >
                {copied ? "Link copiado ✓" : "Copiar link"}
              </button>
            </div>

            {feedback && (
              <p
                className={`text-sm text-center ${
                  feedback.ok ? "text-emerald-600" : "text-red-600"
                }`}
              >
                {feedback.msg}
              </p>
            )}
            <p className="text-[11px] text-slate-400 text-center">
              O cliente recebe o PDF e um link onde pode aceitar ou recusar — és avisado por
              email da decisão.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
