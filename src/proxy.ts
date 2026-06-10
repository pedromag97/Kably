import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE, hashPassword } from "@/lib/auth";

const PUBLIC_PREFIXES = ["/login", "/_next", "/favicon.ico"];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Sem KABLY_PASSWORD definida não há autenticação (uso local).
  // Define-a sempre antes de expor a app à internet.
  const password = process.env.KABLY_PASSWORD;
  if (!password) return NextResponse.next();

  const cookie = req.cookies.get(AUTH_COOKIE)?.value;
  if (cookie === (await hashPassword(password))) {
    return NextResponse.next();
  }

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
