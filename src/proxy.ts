import { NextResponse, type NextRequest } from "next/server";

// Verificação grosseira no edge: existe cookie de sessão? A validação real
// (sessão na BD, expiração) é feita server-side em requireUser(). Aqui não há
// acesso a BD nem node:crypto — só presença do cookie, para a UX de redirect.
const SESSION_COOKIE = "kably_session";
const PUBLIC_PREFIXES = ["/login", "/registo", "/setup", "/_next", "/favicon.ico"];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  // Landing pública (a própria página reencaminha quem tem sessão para /orcamentos).
  if (pathname === "/") return NextResponse.next();
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }
  if (req.cookies.get(SESSION_COOKIE)?.value) {
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
