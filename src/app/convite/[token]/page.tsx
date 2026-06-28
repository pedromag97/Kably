import Link from "next/link";
import { redirect } from "next/navigation";
import { createUser, deleteInvite, getCompany, getInvite, getUserByEmail } from "@/lib/db";
import { hashPassword, startSession } from "@/lib/session";

export const dynamic = "force-dynamic";

const inputCls =
  "border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

async function acceptAction(fd: FormData) {
  "use server";
  const token = String(fd.get("token") ?? "");
  const name = String(fd.get("name") ?? "").trim();
  const password = String(fd.get("password") ?? "");
  const invite = await getInvite(token);
  if (!invite) redirect(`/convite/${token}?erro=invalido`);
  if (password.length < 8) redirect(`/convite/${token}?erro=dados`);
  if (await getUserByEmail(invite.email)) redirect(`/login?ja=1`);
  const userId = await createUser({
    companyId: invite.companyId,
    email: invite.email,
    passwordHash: await hashPassword(password),
    name,
    role: invite.role,
  });
  await deleteInvite(token);
  await startSession(userId);
  redirect("/orcamentos");
}

export default async function InvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  const { token } = await params;
  const { erro } = await searchParams;
  const invite = await getInvite(token);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="bg-white rounded-xl border border-slate-200 p-8 w-full max-w-sm grid gap-4">
        <div className="text-center">
          <div className="text-3xl">⚡</div>
          <h1 className="text-xl font-bold">Juntar-te à equipa</h1>
        </div>
        {!invite ? (
          <>
            <p className="text-sm text-slate-600 text-center">
              Este convite é inválido ou expirou. Pede um novo ao dono da empresa.
            </p>
            <Link
              href="/login"
              className="text-center bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-medium"
            >
              Ir para o login
            </Link>
          </>
        ) : (
          <form action={acceptAction} className="grid gap-4">
            <input type="hidden" name="token" value={token} />
            <p className="text-sm text-slate-500 text-center">
              Foste convidado para{" "}
              <strong>{(await getCompany(invite.companyId)).name}</strong> com o email{" "}
              <strong>{invite.email}</strong>. Cria a tua palavra-passe para entrar.
            </p>
            <label className="grid gap-1 text-sm font-medium">
              O teu nome
              <input name="name" className={inputCls} />
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Palavra-passe (mín. 8 caracteres)
              <input name="password" type="password" required minLength={8} className={inputCls} />
            </label>
            {erro === "dados" && (
              <p className="text-sm text-red-600 text-center">Usa pelo menos 8 caracteres.</p>
            )}
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-medium"
            >
              Entrar na equipa
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
