"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import * as store from "@/lib/db";
import { DEFAULT_CHAPTERS } from "@/lib/seed-data";
import { endSession, requireOwner, requireUser } from "@/lib/session";
import type { VatMode } from "@/lib/types";

export async function logoutAction() {
  await endSession();
  redirect("/login");
}

function str(fd: FormData, key: string): string {
  return String(fd.get(key) ?? "").trim();
}

function flt(fd: FormData, key: string, fallback = 0): number {
  const v = parseFloat(String(fd.get(key) ?? "").replace(",", "."));
  return Number.isFinite(v) ? v : fallback;
}

/** Verifica sessão + posse do orçamento. Devolve companyId ou null (sem acesso). */
async function ownedBudget(budgetId: number): Promise<number | null> {
  const user = await requireUser();
  const ok = await store.budgetBelongsTo(user.companyId, budgetId);
  return ok ? user.companyId : null;
}

// ── Orçamentos ────────────────────────────────────────────────────────

export async function createBudgetAction(fd: FormData) {
  const user = await requireUser();
  const id = await store.createBudget(
    user.companyId,
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
  const companyId = await ownedBudget(budgetId);
  if (!companyId) return;
  await store.updateBudget(companyId, budgetId, {
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
    laborOnly: fd.get("laborOnly") ? 1 : 0,
    materialFeePct: flt(fd, "materialFeePct", 0),
    notes: String(fd.get("notes") ?? ""),
  });
  revalidatePath(`/orcamentos/${budgetId}`);
}

export async function deleteBudgetAction(budgetId: number) {
  const user = await requireUser();
  await store.deleteBudget(user.companyId, budgetId);
  revalidatePath("/");
}

// ── Capítulos ─────────────────────────────────────────────────────────

export async function addChapterAction(budgetId: number, name: string) {
  if (!(await ownedBudget(budgetId))) return;
  await store.addChapter(budgetId, name.trim() || "Novo capítulo");
  revalidatePath(`/orcamentos/${budgetId}`);
}

export async function renameChapterAction(budgetId: number, chapterId: number, name: string) {
  if (!(await ownedBudget(budgetId))) return;
  await store.renameChapter(budgetId, chapterId, name.trim() || "Capítulo");
  revalidatePath(`/orcamentos/${budgetId}`);
}

export async function deleteChapterAction(budgetId: number, chapterId: number) {
  if (!(await ownedBudget(budgetId))) return;
  await store.deleteChapter(budgetId, chapterId);
  revalidatePath(`/orcamentos/${budgetId}`);
}

// ── Itens ─────────────────────────────────────────────────────────────

export async function addItemFromArticleAction(
  budgetId: number,
  chapterId: number,
  articleId: number,
  quantity: number
) {
  const companyId = await ownedBudget(budgetId);
  if (!companyId) return;
  const a = await store.getArticle(companyId, articleId);
  if (!a) return;
  await store.addItem(budgetId, chapterId, {
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
  if (!(await ownedBudget(budgetId))) return;
  await store.addItem(budgetId, chapterId, {
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
  if (!(await ownedBudget(budgetId))) return;
  await store.updateItem(budgetId, itemId, item);
  revalidatePath(`/orcamentos/${budgetId}`);
}

export async function deleteItemAction(budgetId: number, itemId: number) {
  if (!(await ownedBudget(budgetId))) return;
  await store.deleteItem(budgetId, itemId);
  revalidatePath(`/orcamentos/${budgetId}`);
}

export async function setItemMaterialIncludedAction(
  budgetId: number,
  itemId: number,
  included: boolean
) {
  if (!(await ownedBudget(budgetId))) return;
  await store.setItemMaterialIncluded(budgetId, itemId, included);
  revalidatePath(`/orcamentos/${budgetId}`);
}

// ── Importação de MQT ─────────────────────────────────────────────────

export type ImportLine = {
  mqtText: string;
  unit: string;
  quantity: number;
  choice:
    | { kind: "article"; articleId: number }
    | { kind: "new" }
    | { kind: "loose" }
    | { kind: "ignore" };
};

export type ImportMeta = {
  title: string;
  clientName: string;
  vatMode: VatMode;
  laborOnly: boolean;
};

export async function importMqtAction(meta: ImportMeta, lines: ImportLine[]) {
  const user = await requireUser();
  const companyId = user.companyId;
  const { CATEGORY_TO_CHAPTER, FALLBACK_CHAPTER, CHAPTER_ORDER, normalizeText } =
    await import("@/lib/matching");

  const budgetId = await store.createBudget(
    companyId,
    {
      title: meta.title.trim() || "Orçamento importado de MQT",
      clientName: meta.clientName.trim(),
      clientNif: "",
      clientEmail: "",
      clientPhone: "",
      siteAddress: "",
      vatMode: meta.vatMode || "NORMAL",
    },
    []
  );
  if (meta.laborOnly) {
    await store.updateBudget(companyId, budgetId, { laborOnly: 1 });
  }

  const resolved: {
    chapter: string;
    item: {
      articleId: number | null;
      name: string;
      unit: string;
      quantity: number;
      materialCost: number;
      laborHours: number;
    };
  }[] = [];

  for (const line of lines) {
    if (line.choice.kind === "ignore") continue;
    const quantity = line.quantity > 0 ? line.quantity : 1;

    if (line.choice.kind === "article") {
      const a = await store.getArticle(companyId, line.choice.articleId);
      if (!a) continue;
      await store.saveAlias(companyId, normalizeText(line.mqtText), a.id);
      resolved.push({
        chapter: CATEGORY_TO_CHAPTER[a.category] ?? FALLBACK_CHAPTER,
        item: {
          articleId: a.id,
          name: a.name,
          unit: line.unit || a.unit,
          quantity,
          materialCost: a.materialCost,
          laborHours: a.laborHours,
        },
      });
    } else if (line.choice.kind === "new") {
      const articleId = await store.createArticle(companyId, {
        code: "MQT",
        name: line.mqtText.slice(0, 200),
        category: "Diversos",
        unit: line.unit || "un",
        materialCost: 0,
        laborHours: 0,
        notes: "Criado por importação de MQT — preencher custos",
      });
      await store.saveAlias(companyId, normalizeText(line.mqtText), articleId);
      resolved.push({
        chapter: FALLBACK_CHAPTER,
        item: {
          articleId,
          name: line.mqtText.slice(0, 200),
          unit: line.unit || "un",
          quantity,
          materialCost: 0,
          laborHours: 0,
        },
      });
    } else {
      resolved.push({
        chapter: FALLBACK_CHAPTER,
        item: {
          articleId: null,
          name: line.mqtText.slice(0, 200),
          unit: line.unit || "un",
          quantity,
          materialCost: 0,
          laborHours: 0,
        },
      });
    }
  }

  const chapters = CHAPTER_ORDER.filter((ch) => resolved.some((r) => r.chapter === ch));
  for (const chName of chapters) {
    const chapterId = await store.addChapter(budgetId, chName);
    for (const r of resolved.filter((x) => x.chapter === chName)) {
      await store.addItem(budgetId, chapterId, r.item);
    }
  }

  revalidatePath("/");
  redirect(`/orcamentos/${budgetId}`);
}

// ── Artigos ───────────────────────────────────────────────────────────

export async function createArticleAction(fd: FormData) {
  const user = await requireUser();
  await store.createArticle(user.companyId, {
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
  const user = await requireUser();
  await store.updateArticle(user.companyId, articleId, {
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
  const user = await requireUser();
  await store.deleteArticle(user.companyId, articleId);
  revalidatePath("/artigos");
}

// ── Custos da empresa (só dono) ───────────────────────────────────────

export type CostsPayload = {
  workers: Omit<import("@/lib/types").Worker, "id" | "companyId" | "position">[];
  expenses: Omit<import("@/lib/types").Expense, "id" | "companyId" | "position">[];
  targetProfitPct: number;
};

export async function saveCostsAction(payload: CostsPayload) {
  const user = await requireOwner();
  await store.saveCosts(
    user.companyId,
    payload.workers.map((w, i) => ({ ...w, position: i })),
    payload.expenses.map((e, i) => ({ ...e, position: i })),
    payload.targetProfitPct
  );
  revalidatePath("/custos");
}

// ── Empresa (só dono) ─────────────────────────────────────────────────

export async function saveCompanyAction(fd: FormData) {
  const user = await requireOwner();
  await store.saveCompany(user.companyId, {
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
