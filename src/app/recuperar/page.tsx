import Link from "next/link";
import { redirect } from "next/navigation";
import crypto from "node:crypto";
import { createPasswordReset, getUserByEmail } from "@/lib/db";
import { emailButton, emailLayout, getBaseUrl, sendEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

const inputCls =
  "border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

async function requestResetAction(fd: FormData) {
  "use server";
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const user = await getUserByEmail(email);
  if (user) {
    const token = crypto.randomBytes(32).toString("hex");
    await createPasswordReset(token, user.id, 60);
    const link = `${await getBaseUrl()}/repor?token=${token}`;
    await sendEmail({
      to: user.email,
      subject: "Repor a tua palavra-passe — Kably",
      html: emailLayout(
        "Repor palavra-passe",
        `<p>Recebemos um pedido para repores a tua palavra-passe no Kably.</p>
         ${emailButton(link, "Definir nova palavra-passe")}
         <p style="font-size:13px;color:#64748b">O link expira em 1 hora. Se não foste tu, ignora este email.</p>`
      ),
    });
  }
  // Mesma resposta exista ou não a conta (não revelar quem tem conta).
  redirect("/recuperar?enviado=1");
}

export default async function RecoverPage({
  searchParams,
}: {
  searchParams: Promise<{ enviado?: string }>;
}) {
  const { enviado } = await searchParams;
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="bg-white rounded-xl border border-slate-200 p-8 w-full max-w-sm grid gap-4">
        <div className="text-center">
          <div className="text-3xl">⚡</div>
          <h1 className="text-xl font-bold">Recuperar palavra-passe</h1>
        </div>
        {enviado ? (
          <>
            <p className="text-sm text-slate-600 text-center">
              Se existir uma conta com esse email, enviámos um link para definires uma
              nova palavra-passe. Verifica a tua caixa de entrada.
            </p>
            <Link
              href="/login"
              className="text-center bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-medium"
            >
              Voltar a entrar
            </Link>
          </>
        ) : (
          <form action={requestResetAction} className="grid gap-4">
            <p className="text-sm text-slate-500 text-center">
              Escreve o teu email e enviamos-te um link para repor a palavra-passe.
            </p>
            <label className="grid gap-1 text-sm font-medium">
              Email
              <input name="email" type="email" required autoFocus className={inputCls} />
            </label>
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-medium"
            >
              Enviar link
            </button>
            <Link href="/login" className="text-sm text-slate-500 text-center hover:underline">
              Voltar a entrar
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
