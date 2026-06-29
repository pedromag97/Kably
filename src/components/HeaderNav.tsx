"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { logoutAction } from "@/app/actions";

type NavLink = { href: string; label: string };

export default function HeaderNav({
  links,
  userLabel,
}: {
  links: NavLink[];
  userLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <>
      {/* Navegação — ecrãs grandes (desktop) */}
      <nav className="hidden lg:flex gap-1 text-sm">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              isActive(l.href) ? "bg-slate-700 text-white" : "hover:bg-slate-700"
            }`}
          >
            {l.label}
          </Link>
        ))}
      </nav>
      <div className="ml-auto hidden lg:flex items-center gap-3 text-sm">
        <span className="text-slate-300 hidden xl:inline max-w-[14ch] truncate">{userLabel}</span>
        <form action={logoutAction}>
          <button type="submit" className="px-3 py-1.5 rounded-md bg-slate-700 hover:bg-slate-600">
            Sair
          </button>
        </form>
      </div>

      {/* Botão de menu — telemóvel */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Menu"
        aria-expanded={open}
        className="ml-auto lg:hidden inline-flex items-center justify-center w-10 h-10 rounded-md hover:bg-slate-700"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-6 h-6">
          {open ? (
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      {/* Painel do menu — telemóvel */}
      {open && (
        <div className="lg:hidden absolute left-0 right-0 top-full bg-slate-900 border-t border-slate-700 shadow-lg">
          <nav className="flex flex-col p-2 gap-0.5 text-sm">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className={`px-3 py-2.5 rounded-md ${
                  isActive(l.href) ? "bg-slate-700 text-white" : "hover:bg-slate-700"
                }`}
              >
                {l.label}
              </Link>
            ))}
            <div className="border-t border-slate-700 mt-1 pt-2 flex items-center justify-between px-3">
              <span className="text-slate-300 text-xs truncate">{userLabel}</span>
              <form action={logoutAction}>
                <button type="submit" className="px-3 py-1.5 rounded-md bg-slate-700 hover:bg-slate-600">
                  Sair
                </button>
              </form>
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
