import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import crypto from "node:crypto";
import {
  createInvite,
  deleteUser,
  getCompany,
  getUserByEmail,
  listInvites,
  listUsers,
  revokeInvite,
} from "@/lib/db";
import { requireOwner } from "@/lib/session";
import { emailButton, emailLayout, getBaseUrl, sendEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

const inputCls =
  "border border-slate-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full";

async function inviteUserAction(fd: FormData) {
  "use server";
  const owner = await requireOwner();
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const role = String(fd.get("role") ?? "member") === "owner" ? "owner" : "member";
  if (!email.includes("@")) redirect("/equipa?erro=dados");
  if (await getUserByEmail(email)) redirect("/equipa?erro=existe");

  const token = crypto.randomBytes(24).toString("hex");
  await createInvite(owner.companyId, token, email, role, 7);
  const company = await getCompany(owner.companyId);
  const link = `${await getBaseUrl()}/convite/${token}`;
  await sendEmail({
    to: email,
    subject: `Convite para a ${company.name} no Kably`,
    html: emailLayout(
      "Foste convidado",
      `<p>Foste convidado para te juntares à <strong>${company.name}</strong> no Kably.</p>
       ${emailButton(link, "Aceitar convite")}
       <p style="font-size:13px;color:#64748b">O convite expira em 7 dias.</p>`
    ),
  });
  revalidatePath("/equipa");
  redirect("/equipa?convidado=1");
}

async function revokeInviteAction(fd: FormData) {
  "use server";
  const owner = await requireOwner();
  await revokeInvite(owner.companyId, String(fd.get("token") ?? ""));
  revalidatePath("/equipa");
  redirect("/equipa");
}

async function removeUserAction(fd: FormData) {
  "use server";
  const me = await requireOwner();
  const userId = Number(fd.get("userId"));
  if (userId === me.id) redirect("/equipa?erro=auto");
  await deleteUser(me.companyId, userId);
  revalidatePath("/equipa");
  redirect("/equipa");
}

const ERROS: Record<string, string> = {
  dados: "Escreve um email válido.",
  existe: "Já existe uma conta com esse email.",
  auto: "Não te podes remover a ti próprio.",
};

export default async function TeamPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; convidado?: string }>;
}) {
  const me = await requireOwner();
  const [users, invites, sp] = await Promise.all([
    listUsers(me.companyId),
    listInvites(me.companyId),
    searchParams,
  ]);

  return (
    <div className="max-w-3xl mx-auto grid gap-6">
      <h1 className="text-2xl font-bold">Equipa</h1>

      {sp.erro && ERROS[sp.erro] && (
        <p className="bg-red-50 text-red-700 text-sm rounded-lg px-4 py-2">{ERROS[sp.erro]}</p>
      )}
      {sp.convidado && (
        <p className="bg-emerald-50 text-emerald-700 text-sm rounded-lg px-4 py-2">
          Convite enviado por email.
        </p>
      )}

      {/* Utilizadores */}
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
                      <button type="submit" className="text-slate-400 hover:text-red-600 text-xs">
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

      {/* Convites pendentes */}
      {invites.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 grid gap-2">
          <h2 className="font-bold text-sm">Convites pendentes</h2>
          {invites.map((inv) => (
            <div key={inv.token} className="flex items-center gap-2 text-sm">
              <span className="flex-1 text-slate-600">{inv.email}</span>
              <span className="text-xs text-slate-400">
                {inv.role === "owner" ? "Dono" : "Membro"}
              </span>
              <form action={revokeInviteAction}>
                <input type="hidden" name="token" value={inv.token} />
                <button type="submit" className="text-slate-400 hover:text-red-600 text-xs">
                  Revogar
                </button>
              </form>
            </div>
          ))}
        </div>
      )}

      {/* Convidar */}
      <form
        action={inviteUserAction}
        className="bg-white rounded-xl border border-slate-200 p-5 grid sm:grid-cols-2 gap-3"
      >
        <h2 className="sm:col-span-2 font-bold">Convidar membro</h2>
        <label className="grid gap-1 text-sm font-medium">
          Email *
          <input name="email" type="email" required className={inputCls} />
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
            Enviar convite
          </button>
          <p className="text-xs text-slate-400 mt-2">
            A pessoa recebe um email com um link para definir a sua própria palavra-passe.
          </p>
        </div>
      </form>
    </div>
  );
}
