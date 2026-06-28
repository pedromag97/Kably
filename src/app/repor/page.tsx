import Link from "next/link";
import { redirect } from "next/navigation";
import { deletePasswordReset, getPasswordResetUserId, updateUserPassword } from "@/lib/db";
import { hashPassword, startSession } from "@/lib/session";

export const dynamic = "force-dynamic";

const inputCls =
  "border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

async function resetAction(fd: FormData) {
  "use server";
  const token = String(fd.get("token") ?? "");
  const password = String(fd.get("password") ?? "");
  const userId = await getPasswordResetUserId(token);
  if (!userId || password.length < 8) {
    redirect(`/repor?token=${encodeURIComponent(token)}&erro=1`);
  }
  await updateUserPassword(userId, await hashPassword(password));
  await deletePasswordReset(token);
  await startSession(userId);
  redirect("/orcamentos");
}

export default async function ResetPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; erro?: string }>;
}) {
  const { token = "", erro } = await searchParams;
  const valid = token ? (await getPasswordResetUserId(token)) !== undefined : false;

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="bg-white rounded-xl border border-slate-200 p-8 w-full max-w-sm grid gap-4">
        <div className="text-center">
          <div className="text-3xl">⚡</div>
          <h1 className="text-xl font-bold">Nova palavra-passe</h1>
        </div>
        {valid ? (
          <form action={resetAction} className="grid gap-4">
            <input type="hidden" name="token" value={token} />
            <label className="grid gap-1 text-sm font-medium">
              Palavra-passe (mín. 8 caracteres)
              <input
                name="password"
                type="password"
                required
                minLength={8}
                autoFocus
                className={inputCls}
              />
            </label>
            {erro && (
              <p className="text-sm text-red-600 text-center">
                Usa pelo menos 8 caracteres.
              </p>
            )}
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-medium"
            >
              Guardar e entrar
            </button>
          </form>
        ) : (
          <>
            <p className="text-sm text-slate-600 text-center">
              Este link é inválido ou expirou. Pede um novo.
            </p>
            <Link
              href="/recuperar"
              className="text-center bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-medium"
            >
              Recuperar palavra-passe
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
