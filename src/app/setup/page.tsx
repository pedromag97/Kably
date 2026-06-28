import { redirect } from "next/navigation";
import { countUsers, createUser, firstCompanyId } from "@/lib/db";
import { hashPassword, startSession } from "@/lib/session";

export const dynamic = "force-dynamic";

const inputCls =
  "border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

// Reclamar a empresa existente: só quando há dados mas ainda nenhuma conta
// (migração da fase pré-contas). Novas empresas usam /registo.
async function setupAction(fd: FormData) {
  "use server";
  if ((await countUsers()) > 0) redirect("/login");
  const companyId = await firstCompanyId();
  if (companyId === null) redirect("/registo");
  const name = String(fd.get("name") ?? "").trim();
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const password = String(fd.get("password") ?? "");
  if (!email.includes("@") || password.length < 8) {
    redirect("/setup?erro=1");
  }
  const id = await createUser({
    companyId,
    email,
    passwordHash: await hashPassword(password),
    name,
    role: "owner",
  });
  await startSession(id);
  redirect("/orcamentos");
}

export default async function SetupPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  if ((await countUsers()) > 0) redirect("/login");
  if ((await firstCompanyId()) === null) redirect("/registo");
  const { erro } = await searchParams;
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <form
        action={setupAction}
        className="bg-white rounded-xl border border-slate-200 p-8 w-full max-w-sm grid gap-4"
      >
        <div className="text-center">
          <div className="text-3xl">⚡</div>
          <h1 className="text-xl font-bold">Conta de administrador</h1>
          <p className="text-sm text-slate-500 mt-1">
            Cria a conta de dono para a empresa já existente.
          </p>
        </div>
        <label className="grid gap-1 text-sm font-medium">
          Nome
          <input name="name" required autoFocus className={inputCls} />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Email
          <input name="email" type="email" required className={inputCls} />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Palavra-passe (mín. 8 caracteres)
          <input name="password" type="password" required minLength={8} className={inputCls} />
        </label>
        {erro && (
          <p className="text-sm text-red-600 text-center">
            Verifica o email e usa pelo menos 8 caracteres.
          </p>
        )}
        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-medium"
        >
          Criar conta e entrar
        </button>
      </form>
    </div>
  );
}
