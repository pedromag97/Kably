import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createUser, deleteUser, getCompany, listUsers } from "@/lib/db";
import { hashPassword, requireOwner } from "@/lib/session";

export const dynamic = "force-dynamic";

const inputCls =
  "border border-slate-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full";

async function addUserAction(fd: FormData) {
  "use server";
  await requireOwner();
  const name = String(fd.get("name") ?? "").trim();
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const password = String(fd.get("password") ?? "");
  const role = String(fd.get("role") ?? "member") === "owner" ? "owner" : "member";
  if (!email.includes("@") || password.length < 8) redirect("/equipa?erro=dados");
  const company = await getCompany();
  let failed = false;
  try {
    await createUser({
      companyId: company.id,
      email,
      passwordHash: await hashPassword(password),
      name,
      role,
    });
  } catch {
    failed = true; // email duplicado (UNIQUE)
  }
  if (failed) redirect("/equipa?erro=email");
  revalidatePath("/equipa");
  redirect("/equipa");
}

async function removeUserAction(fd: FormData) {
  "use server";
  const me = await requireOwner();
  const userId = Number(fd.get("userId"));
  if (userId === me.id) redirect("/equipa?erro=auto");
  await deleteUser(userId);
  revalidatePath("/equipa");
  redirect("/equipa");
}

const ERROS: Record<string, string> = {
  dados: "Verifica o email e usa uma palavra-passe com pelo menos 8 caracteres.",
  email: "Já existe uma conta com esse email.",
  auto: "Não te podes remover a ti próprio.",
};

export default async function TeamPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const me = await requireOwner();
  const [users, { erro }] = await Promise.all([listUsers(), searchParams]);

  return (
    <div className="max-w-3xl mx-auto grid gap-6">
      <h1 className="text-2xl font-bold">Equipa</h1>

      {erro && ERROS[erro] && (
        <p className="bg-red-50 text-red-700 text-sm rounded-lg px-4 py-2">{ERROS[erro]}</p>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-slate-400 text-left border-b border-slate-200">
              <th className="px-3 py-2 font-medium">Nome</th>
              <th className="px-2 py-2 font-medium">Email</th>
              <th className="px-2 py-2 font-medium">Papel</th>
              <th className="px-2 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-slate-100">
                <td className="px-3 py-2">
                  {u.name || "—"}
                  {u.id === me.id && <span className="text-slate-400"> (tu)</span>}
                </td>
                <td className="px-2 py-2 text-slate-600">{u.email}</td>
                <td className="px-2 py-2">
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded ${
                      u.role === "owner"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {u.role === "owner" ? "Dono" : "Membro"}
                  </span>
                </td>
                <td className="px-2 py-2 text-right">
                  {u.id !== me.id && (
                    <form action={removeUserAction}>
                      <input type="hidden" name="userId" value={u.id} />
                      <button
                        type="submit"
                        className="text-slate-400 hover:text-red-600 text-xs"
                      >
                        Remover
                      </button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <form
        action={addUserAction}
        className="bg-white rounded-xl border border-slate-200 p-5 grid sm:grid-cols-2 gap-3"
      >
        <h2 className="sm:col-span-2 font-bold">Adicionar membro</h2>
        <label className="grid gap-1 text-sm font-medium">
          Nome
          <input name="name" className={inputCls} />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Email *
          <input name="email" type="email" required className={inputCls} />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Palavra-passe (mín. 8) *
          <input name="password" type="password" required minLength={8} className={inputCls} />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Papel
          <select name="role" defaultValue="member" className={inputCls}>
            <option value="member">Membro (sem acesso a Custos)</option>
            <option value="owner">Dono (acesso total)</option>
          </select>
        </label>
        <div className="sm:col-span-2">
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            Adicionar
          </button>
          <p className="text-xs text-slate-400 mt-2">
            Define-lhe uma palavra-passe inicial e partilha-a; o membro entra com o email
            e essa palavra-passe.
          </p>
        </div>
      </form>
    </div>
  );
}
