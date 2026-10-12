"use client";

import { useFormStatus } from "react-dom";

/**
 * Botão de submissão que mostra que está a trabalhar.
 * Sem isto, entre o clique e a resposta do servidor o ecrã parece congelado.
 */
export default function SubmitButton({
  children,
  pendingLabel,
  className = "",
}: {
  children: React.ReactNode;
  pendingLabel: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={`${className} disabled:opacity-70 disabled:cursor-wait inline-flex items-center justify-center gap-2`}
    >
      {pending && (
        <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
      )}
      {pending ? pendingLabel : children}
    </button>
  );
}
