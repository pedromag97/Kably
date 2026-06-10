"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import * as store from "@/lib/db";
import { DEFAULT_CHAPTERS } from "@/lib/seed-data";
import type { VatMode } from "@/lib/types";

function str(fd: FormData, key: string): string {
  return String(fd.get(key) ?? "").trim();
}

function flt(fd: FormData, key: string, fallback = 0): number {
  const v = parseFloat(String(fd.get(key) ?? "").replace(",", "."));
  return Number.isFinite(v) ? v : fallback;
}

// ── Orçamentos ────────────────────────────────────────────────────────

export async function createBudgetAction(fd: FormData) {
  const id = store.createBudget(
    {
      title: str(fd, "title") || "Instalação elétrica",
      clientName: str(fd, "clientName"),
      clientNif: str(fd, "clientNif"),
      clientEmail: str(fd, "clientEmail"),
      clientPhone: str(fd, "clientPhone"),
      siteAddress: str(fd, "siteAddress"),
      vatMode: (str(fd, "vatMode") || "NORMAL") as VatMode,
    },
    DEFAULT_CHAPTERS
  );
  revalidatePath("/");
  redirect(`/orcamentos/${id}`);
}

export async function updateBudgetMetaAction(budgetId: number, fd: FormData) {
  store.updateBudget(budgetId, {
    title: str(fd, "title"),
    clientName: str(fd, "clientName"),
    clientNif: str(fd, "clientNif"),
    clientEmail: str(fd, "clientEmail"),
    clientPhone: str(fd, "clientPhone"),
    siteAddress: str(fd, "siteAddress"),
    vatMode: (str(fd, "vatMode") || "NORMAL") as VatMode,
    materialMargin: flt(fd, "materialMargin", 25),
    laborMargin: flt(fd, "laborMargin", 35),
    laborRate: flt(fd, "laborRate", 20),
    validityDays: Math.round(flt(fd, "validityDays", 30)),
    notes: String(fd.get("notes") ?? ""),
  });
  revalidatePath(`/orcamentos/${budgetId}`);
}

export async function deleteBudgetAction(budgetId: number) {
  store.deleteBudget(budgetId);
  revalidatePath("/");
}

// ── Capítulos ─────────────────────────────────────────────────────────

export async function addChapterAction(budgetId: number, name: string) {
  store.addChapter(budgetId, name.trim() || "Novo capítulo");
  revalidatePath(`/orcamentos/${budgetId}`);
}

export async function renameChapterAction(budgetId: number, chapterId: number, name: string) {
  store.renameChapter(chapterId, name.trim() || "Capítulo");
  revalidatePath(`/orcamentos/${budgetId}`);
}

export async function deleteChapterAction(budgetId: number, chapterId: number) {
  store.deleteChapter(chapterId);
  revalidatePath(`/orcamentos/${budgetId}`);
}

// ── Itens ─────────────────────────────────────────────────────────────

export async function addItemFromArticleAction(
  budgetId: number,
  chapterId: number,
  articleId: number,
  quantity: number
) {
  const a = store.getArticle(articleId);
  if (!a) return;
  store.addItem(chapterId, {
    articleId: a.id,
    name: a.name,
    unit: a.unit,
    quantity: quantity > 0 ? quantity : 1,
    materialCost: a.materialCost,
    laborHours: a.laborHours,
  });
  revalidatePath(`/orcamentos/${budgetId}`);
}

export async function addBlankItemAction(budgetId: number, chapterId: number) {
  store.addItem(chapterId, {
    articleId: null,
    name: "",
    unit: "un",
    quantity: 1,
    materialCost: 0,
    laborHours: 0,
  });
  revalidatePath(`/orcamentos/${budgetId}`);
}

export async function updateItemAction(
  budgetId: number,
  itemId: number,
  item: { name: string; unit: string; quantity: number; materialCost: number; laborHours: number }
) {
  store.updateItem(itemId, item);
  revalidatePath(`/orcamentos/${budgetId}`);
}

export async function deleteItemAction(budgetId: number, itemId: number) {
  store.deleteItem(itemId);
  revalidatePath(`/orcamentos/${budgetId}`);
}

// ── Artigos ───────────────────────────────────────────────────────────

export async function createArticleAction(fd: FormData) {
  store.createArticle({
    code: str(fd, "code"),
    name: str(fd, "name") || "Novo artigo",
    category: str(fd, "category") || "Diversos",
    unit: str(fd, "unit") || "un",
    materialCost: flt(fd, "materialCost"),
    laborHours: flt(fd, "laborHours"),
    notes: str(fd, "notes"),
  });
  revalidatePath("/artigos");
}

export async function updateArticleAction(articleId: number, fd: FormData) {
  store.updateArticle(articleId, {
    code: str(fd, "code"),
    name: str(fd, "name") || "Artigo",
    category: str(fd, "category") || "Diversos",
    unit: str(fd, "unit") || "un",
    materialCost: flt(fd, "materialCost"),
    laborHours: flt(fd, "laborHours"),
    notes: str(fd, "notes"),
  });
  revalidatePath("/artigos");
}

export async function deleteArticleAction(articleId: number) {
  store.deleteArticle(articleId);
  revalidatePath("/artigos");
}

// ── Empresa ───────────────────────────────────────────────────────────

export async function saveCompanyAction(fd: FormData) {
  store.saveCompany({
    name: str(fd, "name") || "A Minha Empresa",
    nif: str(fd, "nif"),
    email: str(fd, "email"),
    phone: str(fd, "phone"),
    address: str(fd, "address"),
    logo: String(fd.get("logo") ?? ""),
    materialMargin: flt(fd, "materialMargin", 25),
    laborMargin: flt(fd, "laborMargin", 35),
    laborRate: flt(fd, "laborRate", 20),
    validityDays: Math.round(flt(fd, "validityDays", 30)),
    conditions: String(fd.get("conditions") ?? ""),
  });
  revalidatePath("/definicoes");
}
