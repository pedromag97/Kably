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
    laborOnly: fd.get("laborOnly") ? 1 : 0,
    materialFeePct: flt(fd, "materialFeePct", 0),
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

export async function setItemMaterialIncludedAction(
  budgetId: number,
  itemId: number,
  included: boolean
) {
  store.setItemMaterialIncluded(itemId, included);
  revalidatePath(`/orcamentos/${budgetId}`);
}

// ── Importação de MQT ─────────────────────────────────────────────────

export type ImportLine = {
  mqtText: string; // designação original no MQT
  unit: string;
  quantity: number;
  choice:
    | { kind: "article"; articleId: number }
    | { kind: "new" } // criar artigo novo na base (custos a zero, a preencher)
    | { kind: "loose" } // linha avulsa só neste orçamento
    | { kind: "ignore" };
};

export type ImportMeta = {
  title: string;
  clientName: string;
  vatMode: VatMode;
  laborOnly: boolean; // só mão de obra — material fornecido pelo cliente
};

export async function importMqtAction(meta: ImportMeta, lines: ImportLine[]) {
  const { CATEGORY_TO_CHAPTER, FALLBACK_CHAPTER, CHAPTER_ORDER, normalizeText } =
    await import("@/lib/matching");

  const budgetId = store.createBudget(
    {
      title: meta.title.trim() || "Orçamento importado de MQT",
      clientName: meta.clientName.trim(),
      clientNif: "",
      clientEmail: "",
      clientPhone: "",
      siteAddress: "",
      vatMode: meta.vatMode || "NORMAL",
    },
    [] // capítulos criados abaixo, só os que têm itens
  );
  if (meta.laborOnly) {
    store.updateBudget(budgetId, { laborOnly: 1 });
  }

  // Resolver cada linha num item + capítulo de destino
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
      const a = store.getArticle(line.choice.articleId);
      if (!a) continue;
      store.saveAlias(normalizeText(line.mqtText), a.id); // memorizar para o próximo MQT
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
      const articleId = store.createArticle({
        code: "MQT",
        name: line.mqtText.slice(0, 200),
        category: "Diversos",
        unit: line.unit || "un",
        materialCost: 0,
        laborHours: 0,
        notes: "Criado por importação de MQT — preencher custos",
      });
      store.saveAlias(normalizeText(line.mqtText), articleId);
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
      // linha avulsa
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

  // Criar só os capítulos com itens, pela ordem habitual
  const chapters = CHAPTER_ORDER.filter((ch) =>
    resolved.some((r) => r.chapter === ch)
  );
  for (const chName of chapters) {
    const chapterId = store.addChapter(budgetId, chName);
    for (const r of resolved.filter((x) => x.chapter === chName)) {
      store.addItem(chapterId, r.item);
    }
  }

  revalidatePath("/");
  redirect(`/orcamentos/${budgetId}`);
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

// ── Custos da empresa ─────────────────────────────────────────────────

export type CostsPayload = {
  workers: Omit<import("@/lib/types").Worker, "id" | "companyId" | "position">[];
  expenses: Omit<import("@/lib/types").Expense, "id" | "companyId" | "position">[];
  targetProfitPct: number;
};

export async function saveCostsAction(payload: CostsPayload) {
  store.saveCosts(
    payload.workers.map((w, i) => ({ ...w, position: i })),
    payload.expenses.map((e, i) => ({ ...e, position: i })),
    payload.targetProfitPct
  );
  revalidatePath("/custos");
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
