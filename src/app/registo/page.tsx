import Link from "next/link";
import { redirect } from "next/navigation";
import {
  createCompany,
  createUser,
  getUserByEmail,
  seedCompanyArticles,
} from "@/lib/db";
import { getCurrentUser, hashPassword, startSession } from "@/lib/session";

export const dynamic = "force-dynamic";

const inputCls =
  "border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

async function registerAction(fd: FormData) {
  "use server";
  const userName = String(fd.get("name") ?? "").trim();
  const companyName = String(fd.get("companyName") ?? "").trim();
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const password = String(fd.get("password") ?? "");

  if (!companyName || !email.includes("@") || password.length < 8) {
    redirect("/registo?erro=dados");
  }
  // email já em uso? (verificar antes de criar a empresa para não deixar órfãos)
  if (await getUserByEmail(email)) {
    redirect("/registo?erro=email");
  }

  const companyId = await createCompany(companyName);
  await seedCompanyArticles(companyId);
  const userId = await createUser({
    companyId,
    email,
    passwordHash: await hashPassword(password),
    name: userName,
    role: "owner",
  });
  await startSession(userId);
  redirect("/");
}

const ERROS: Record<string, string> = {
  dados: "Preenche o nome da empresa, um email válido e palavra-passe (mín. 8).",
  email: "Já existe uma conta com esse email.",
};

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  if (await getCurrentUser()) redirect("/");
  const { erro } = await searchParams;
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <form
        action={registerAction}
        className="bg-white rounded-xl border border-slate-200 p-8 w-full max-w-sm grid gap-4"
      >
        <div className="text-center">
          <div className="text-3xl">⚡</div>
          <h1 className="text-xl font-bold">Criar conta</h1>
          <p className="text-sm text-slate-500 mt-1">
            Cria a tua empresa no Kably. Ficas como dono.
          </p>
        </div>
        <label className="grid gap-1 text-sm font-medium">
          Nome da empresa
          <input name="companyName" required autoFocus className={inputCls} />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          O teu nome
          <input name="name" className={inputCls} />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Email
          <input name="email" type="email" required className={inputCls} />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Palavra-passe (mín. 8 caracteres)
          <input name="password" type="password" required minLength={8} className={inputCls} />
        </label>
        {erro && ERROS[erro] && (
          <p className="text-sm text-red-600 text-center">{ERROS[erro]}</p>
        )}
        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-medium"
        >
          Criar conta e empresa
        </button>
        <p className="text-sm text-slate-500 text-center">
          Já tens conta?{" "}
          <Link href="/login" className="text-blue-600 hover:underline font-medium">
            Entrar
          </Link>
        </p>
      </form>
    </div>
  );
}
