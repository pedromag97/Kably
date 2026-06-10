import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { AUTH_COOKIE, hashPassword } from "@/lib/auth";

async function loginAction(fd: FormData) {
  "use server";
  const attempt = String(fd.get("password") ?? "");
  const password = process.env.KABLY_PASSWORD ?? "";
  if (!password || attempt !== password) {
    redirect("/login?erro=1");
  }
  const jar = await cookies();
  jar.set(AUTH_COOKIE, await hashPassword(password), {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365, // 1 ano
    path: "/",
  });
  redirect("/");
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <form
        action={loginAction}
        className="bg-white rounded-xl border border-slate-200 p-8 w-full max-w-sm grid gap-4 text-center"
      >
        <div className="text-3xl">⚡</div>
        <h1 className="text-xl font-bold">Kably</h1>
        <p className="text-sm text-slate-500">
          Introduz a palavra-passe para aceder.
        </p>
        <input
          type="password"
          name="password"
          required
          autoFocus
          placeholder="Palavra-passe"
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {erro && (
          <p className="text-sm text-red-600">Palavra-passe incorreta.</p>
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
