// Hash SHA-256 via Web Crypto — funciona no middleware (edge) e no servidor Node.
export async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(`kably:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export const AUTH_COOKIE = "kably_auth";
