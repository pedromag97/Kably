// Limitador simples em memória (janela fixa). O Railway corre uma instância,
// por isso o estado em memória é suficiente para travar força-bruta.
import { headers } from "next/headers";

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

/** Devolve true se permitido; false se já excedeu `limit` pedidos em `windowMs`. */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now > b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (b.count >= limit) return false;
  b.count++;
  return true;
}

/** Chave por IP do cliente (com prefixo da ação). */
export async function clientKey(prefix: string): Promise<string> {
  const h = await headers();
  const ip =
    (h.get("x-forwarded-for") ?? "").split(",")[0].trim() ||
    h.get("x-real-ip") ||
    "local";
  return `${prefix}:${ip}`;
}
