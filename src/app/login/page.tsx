import { redirect } from "next/navigation";
import { countUsers, getUserByEmail } from "@/lib/db";
import { startSession, verifyPassword } from "@/lib/session";

export const dynamic = "force-dynamic";

const inputCls =
  "border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

async function loginAction(fd: FormData) {
  "use server";
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const password = String(fd.get("password") ?? "");
  const user = await getUserByEmail(email);
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    redirect("/login?erro=1");
  }
  await startSession(user.id);
  redirect("/");
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  // Primeira utilização (sem contas) → criar conta de administrador.
  if ((await countUsers()) === 0) redirect("/setup");
  const { erro } = await searchParams;
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <form
        action={loginAction}
        className="bg-white rounded-xl border border-slate-200 p-8 w-full max-w-sm grid gap-4"
      >
        <div className="text-center">
          <div className="text-3xl">⚡</div>
          <h1 className="text-xl font-bold">Kably</h1>
          <p className="text-sm text-slate-500 mt-1">Entra com a tua conta.</p>
        </div>
        <label className="grid gap-1 text-sm font-medium">
          Email
          <input name="email" type="email" required autoFocus className={inputCls} />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Palavra-passe
          <input name="password" type="password" required className={inputCls} />
        </label>
        {erro && (
          <p className="text-sm text-red-600 text-center">
            Email ou palavra-passe incorretos.
          </p>
        )}
        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-medium"
        >
          Entrar
        </button>
      </form>
    </div>
  );
}
