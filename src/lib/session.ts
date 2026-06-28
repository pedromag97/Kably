// Autenticação por sessão (servidor). Hashing com bcrypt; sessão guardada na
// BD com token aleatório em cookie httpOnly. Usado em páginas/ações (runtime
// Node) — NÃO no proxy (edge), que faz só a verificação grosseira do cookie.
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import * as store from "./db";
import type { User } from "./types";

export const SESSION_COOKIE = "kably_session";
const MAX_AGE_DAYS = 30;
const MAX_AGE_S = 60 * 60 * 24 * MAX_AGE_DAYS;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export async function startSession(userId: number): Promise<void> {
  const id = crypto.randomBytes(32).toString("hex");
  await store.createSession(id, userId, MAX_AGE_DAYS);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: MAX_AGE_S,
    path: "/",
  });
}

export async function getCurrentUser(): Promise<User | null> {
  const jar = await cookies();
  const id = jar.get(SESSION_COOKIE)?.value;
  if (!id) return null;
  return (await store.getSessionUser(id)) ?? null;
}

/** Garante sessão válida; senão redireciona para /login. */
export async function requireUser(): Promise<User> {
  const u = await getCurrentUser();
  if (!u) redirect("/login");
  return u;
}

/** Garante que o utilizador é dono; senão volta à página inicial. */
export async function requireOwner(): Promise<User> {
  const u = await requireUser();
  if (u.role !== "owner") redirect("/");
  return u;
}

export async function endSession(): Promise<void> {
  const jar = await cookies();
  const id = jar.get(SESSION_COOKIE)?.value;
  if (id) await store.deleteSession(id);
  jar.delete(SESSION_COOKIE);
}
