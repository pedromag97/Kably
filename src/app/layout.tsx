import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { getCurrentUser } from "@/lib/session";
import { logoutAction } from "./actions";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Kably — Orçamentos de Eletricidade",
  description:
    "Plataforma de orçamentação para obras de eletricidade: orçamentos rápidos, importação de MQT, e a tua taxa horária real.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();
  const links = [
    { href: "/orcamentos", label: "Orçamentos" },
    { href: "/artigos", label: "Artigos" },
    ...(user?.role === "owner"
      ? [
          { href: "/custos", label: "Custos" },
          { href: "/equipa", label: "Equipa" },
        ]
      : []),
    { href: "/definicoes", label: "Definições" },
  ];

  return (
    <html
      lang="pt-PT"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="bg-slate-900 text-white sticky top-0 z-20 shadow">
          <div className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-4">
            <Link
              href={user ? "/orcamentos" : "/"}
              className="text-xl font-bold tracking-tight"
            >
              ⚡ Kably
            </Link>
            {user ? (
              <>
                <nav className="flex gap-1 text-sm">
                  {links.map((l) => (
                    <Link
                      key={l.href}
                      href={l.href}
                      className="px-3 py-1.5 rounded-md hover:bg-slate-700 transition-colors"
                    >
                      {l.label}
                    </Link>
                  ))}
                </nav>
                <div className="ml-auto flex items-center gap-3 text-sm">
                  <span className="text-slate-300 hidden sm:inline">
                    {user.name || user.email}
                  </span>
                  <form action={logoutAction}>
                    <button
                      type="submit"
                      className="px-3 py-1.5 rounded-md bg-slate-700 hover:bg-slate-600"
                    >
                      Sair
                    </button>
                  </form>
                </div>
              </>
            ) : (
              <div className="ml-auto flex items-center gap-2 text-sm">
                <Link
                  href="/login"
                  className="px-3 py-1.5 rounded-md hover:bg-slate-700 transition-colors"
                >
                  Entrar
                </Link>
                <Link
                  href="/registo"
                  className="px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 font-medium"
                >
                  Criar conta
                </Link>
              </div>
            )}
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl px-4 py-6 flex-1">{children}</main>
        <footer className="text-center text-xs text-slate-400 py-4">
          Kably — orçamentação de obras de eletricidade
        </footer>
      </body>
    </html>
  );
}
