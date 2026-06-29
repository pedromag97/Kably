"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import crypto from "node:crypto";
import * as store from "@/lib/db";
import { DEFAULT_CHAPTERS } from "@/lib/seed-data";
import { endSession, requireOwner, requireUser } from "@/lib/session";
import { emailButton, emailLayout, getBaseUrl, sendEmail } from "@/lib/email";
import type { VatMode } from "@/lib/types";

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function logoutAction() {
  await endSession();
  redirect("/login");
}

/** Apaga a empresa e todos os dados (só dono). Irreversível. */
export async function deleteAccountAction() {
  const user = await requireOwner();
  await store.deleteCompany(user.companyId);
  await endSession();
  redirect("/");
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

/** Resolve o clientId de um formulário de orçamento: usa o escolhido, ou
 *  auto-guarda um cliente novo a partir dos campos (deduplicado por NIF→nome). */
async function resolveClientId(companyId: number, fd: FormData): Promise<number | null> {
  const picked = Math.round(flt(fd, "clientId", 0));
  if (picked > 0) return picked;
  const name = str(fd, "clientName");
  if (!name) return null;
  const nif = str(fd, "clientNif");
  const existing = await store.findClientByNifOrName(companyId, nif, name);
  if (existing) return existing.id;
  return store.createClient(companyId, {
    name,
    nif,
    email: str(fd, "clientEmail"),
    phone: str(fd, "clientPhone"),
    address: str(fd, "siteAddress"),
    notes: "",
  });
}

export async function createBudgetAction(fd: FormData) {
  const user = await requireUser();
  const clientId = await resolveClientId(user.companyId, fd);
  const id = await store.createBudget(
    user.companyId,
    {
      title: str(fd, "title") || "Instalação elétrica",
      clientId,
      clientName: str(fd, "clientName"),
      clientNif: str(fd, "clientNif"),
      clientEmail: str(fd, "clientEmail"),
      clientPhone: str(fd, "clientPhone"),
      siteAddress: str(fd, "siteAddress"),
      vatMode: (str(fd, "vatMode") || "NORMAL") as VatMode,
    },
    DEFAULT_CHAPTERS
  );
  revalidatePath("/orcamentos");
  redirect(`/orcamentos/${id}`);
}

export async function duplicateBudgetAction(budgetId: number) {
  const user = await requireUser();
  const newId = await store.duplicateBudget(user.companyId, budgetId);
  revalidatePath("/orcamentos");
  if (newId) redirect(`/orcamentos/${newId}`);
}

export async function createRevisionAction(budgetId: number) {
  const companyId = await ownedBudget(budgetId);
  if (!companyId) return;
  const newId = await store.createRevision(companyId, budgetId);
  revalidatePath("/orcamentos");
  if (newId) redirect(`/orcamentos/${newId}`);
}

export async function updateBudgetMetaAction(budgetId: number, fd: FormData) {
  const companyId = await ownedBudget(budgetId);
  if (!companyId) return;
  const clientId = await resolveClientId(companyId, fd);
  await store.updateBudget(companyId, budgetId, {
    title: str(fd, "title"),
    clientId,
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
  revalidatePath("/orcamentos");
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

// ── Partilha / envio do orçamento ─────────────────────────────────────

/** Garante o link público (cria token + marca como enviado). */
export async function shareLinkAction(
  budgetId: number
): Promise<{ link: string } | { error: string }> {
  const companyId = await ownedBudget(budgetId);
  if (!companyId) return { error: "Sem acesso." };
  const token = crypto.randomBytes(24).toString("hex");
  const shareToken = await store.prepareBudgetShare(companyId, budgetId, token);
  if (!shareToken) return { error: "Não foi possível preparar o link." };
  revalidatePath(`/orcamentos/${budgetId}`);
  return { link: `${await getBaseUrl()}/p/${shareToken}` };
}

/** Envia o orçamento por email com o PDF (versão cliente) anexado + link. */
export async function sendBudgetAction(
  budgetId: number,
  to: string,
  subject: string,
  message: string
): Promise<{ ok: boolean; error?: string }> {
  const companyId = await ownedBudget(budgetId);
  if (!companyId) return { ok: false, error: "Sem acesso." };
  const cleanTo = to.trim().toLowerCase();
  if (!cleanTo.includes("@")) return { ok: false, error: "Email do cliente inválido." };

  const budget = await store.getBudget(companyId, budgetId);
  if (!budget) return { ok: false, error: "Orçamento não encontrado." };
  const token = crypto.randomBytes(24).toString("hex");
  const shareToken = await store.prepareBudgetShare(companyId, budgetId, token);
  if (!shareToken) return { ok: false, error: "Falha ao preparar a partilha." };

  const company = await store.getCompany(companyId);
  const link = `${await getBaseUrl()}/p/${shareToken}`;

  const { renderToBuffer } = await import("@react-pdf/renderer");
  const { BudgetPdf } = await import("@/lib/pdf");
  const pdf = await renderToBuffer(
    BudgetPdf({ budget: { ...budget, status: "SENT" }, company, internal: false })
  );
  const content = Buffer.from(pdf).toString("base64");

  const html = emailLayout(
    `Orçamento ${budget.number}`,
    `<p>${escapeHtml(message).replace(/\n/g, "<br>")}</p>
     ${emailButton(link, "Ver o orçamento online")}
     <p style="font-size:13px;color:#64748b">Pode também abrir o PDF em anexo. Pelo link consegue aceitar ou recusar.</p>`
  );

  const res = await sendEmail({
    to: cleanTo,
    subject: subject.trim() || `Orçamento ${budget.number}`,
    html,
    replyTo: company.email || undefined,
    attachments: [{ filename: `${budget.number}.pdf`, content }],
  });
  revalidatePath(`/orcamentos/${budgetId}`);
  return res.ok ? { ok: true } : { ok: false, error: res.error };
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

  revalidatePath("/orcamentos");
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

// ── Fornecedores e preços de material ─────────────────────────────────

export async function createSupplierAction(fd: FormData) {
  const user = await requireUser();
  const name = str(fd, "name");
  if (name) await store.createSupplier(user.companyId, name);
  revalidatePath("/fornecedores");
}

export async function deleteSupplierAction(supplierId: number) {
  const user = await requireUser();
  await store.deleteSupplier(user.companyId, supplierId);
  revalidatePath("/fornecedores");
}

/** Adiciona uma cotação datada a um artigo (entrada manual). */
export async function addPriceEntryAction(articleId: number, fd: FormData) {
  const user = await requireUser();
  const supplierId = Math.round(flt(fd, "supplierId", 0)) || null;
  let supplierName = str(fd, "supplierName");
  if (supplierId) {
    const sup = (await store.listSuppliers(user.companyId)).find((s) => s.id === supplierId);
    if (sup) supplierName = sup.name;
  }
  const price = flt(fd, "price", 0);
  const date = str(fd, "date") || new Date().toISOString().slice(0, 10);
  await store.addPriceEntry(user.companyId, articleId, supplierId, supplierName, price, date);
  revalidatePath(`/artigos/${articleId}`);
}

export async function deletePriceEntryAction(articleId: number, entryId: number) {
  const user = await requireUser();
  await store.deletePriceEntry(user.companyId, entryId);
  revalidatePath(`/artigos/${articleId}`);
}

/** Adota um preço como o custo de material do artigo (usado nos orçamentos). */
export async function adoptPriceAction(articleId: number, price: number) {
  const user = await requireUser();
  await store.setArticleCost(user.companyId, articleId, price);
  revalidatePath(`/artigos/${articleId}`);
  revalidatePath("/artigos");
}

// ── Importação de cotação de fornecedor (Excel) ───────────────────────

export type QuoteLine = {
  text: string;
  unit: string;
  price: number;
  choice:
    | { kind: "article"; articleId: number }
    | { kind: "new" }
    | { kind: "ignore" };
};

export type QuoteMeta = { supplierId: number | null; date: string };

/** Cria entradas de preço (cotação datada) a partir de um ficheiro de fornecedor.
 *  Para linhas "new" cria o artigo na base com o preço como custo de material. */
export async function importQuoteAction(
  meta: QuoteMeta,
  lines: QuoteLine[]
): Promise<{ added: number; created: number }> {
  const user = await requireUser();
  const companyId = user.companyId;
  const { normalizeText } = await import("@/lib/matching");

  let supplierName = "";
  const supplierId = meta.supplierId ?? null;
  if (supplierId) {
    const sup = (await store.listSuppliers(companyId)).find((s) => s.id === supplierId);
    if (sup) supplierName = sup.name;
  }
  const date = meta.date || new Date().toISOString().slice(0, 10);

  let added = 0;
  let created = 0;
  for (const line of lines) {
    if (line.choice.kind === "ignore") continue;
    let articleId: number;
    if (line.choice.kind === "article") {
      articleId = line.choice.articleId;
    } else {
      articleId = await store.createArticle(companyId, {
        code: "",
        name: line.text.slice(0, 200),
        category: "Diversos",
        unit: line.unit || "un",
        materialCost: line.price,
        laborHours: 0,
        notes: "Criado por importação de cotação de fornecedor",
      });
      await store.saveAlias(companyId, normalizeText(line.text), articleId);
      created++;
    }
    await store.addPriceEntry(companyId, articleId, supplierId, supplierName, line.price, date);
    added++;
  }

  revalidatePath("/artigos");
  return { added, created };
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
    followUpDays: Math.round(flt(fd, "followUpDays", 5)),
  });
  revalidatePath("/definicoes");
  revalidatePath("/painel");
}

// ── Clientes ──────────────────────────────────────────────────────────

function clientFromForm(fd: FormData) {
  return {
    name: str(fd, "name") || "Cliente",
    nif: str(fd, "nif"),
    email: str(fd, "email"),
    phone: str(fd, "phone"),
    address: str(fd, "address"),
    notes: String(fd.get("notes") ?? ""),
  };
}

export async function createClientAction(fd: FormData) {
  const user = await requireUser();
  await store.createClient(user.companyId, clientFromForm(fd));
  revalidatePath("/clientes");
}

export async function updateClientAction(clientId: number, fd: FormData) {
  const user = await requireUser();
  await store.updateClient(user.companyId, clientId, clientFromForm(fd));
  revalidatePath("/clientes");
  revalidatePath(`/clientes/${clientId}`);
}

export async function deleteClientAction(clientId: number) {
  const user = await requireUser();
  await store.deleteClient(user.companyId, clientId);
  revalidatePath("/clientes");
}

export type ClientImportRow = {
  name: string;
  nif: string;
  email: string;
  phone: string;
  address: string;
};

/** Importa clientes (Excel/CSV), deduplicados por NIF→nome. Devolve contagens. */
export async function importClientsAction(
  rows: ClientImportRow[]
): Promise<{ created: number; skipped: number }> {
  const user = await requireUser();
  let created = 0;
  let skipped = 0;
  for (const row of rows) {
    const name = (row.name || "").trim();
    if (!name) {
      skipped++;
      continue;
    }
    const existing = await store.findClientByNifOrName(user.companyId, row.nif || "", name);
    if (existing) {
      skipped++;
      continue;
    }
    await store.createClient(user.companyId, {
      name,
      nif: (row.nif || "").trim(),
      email: (row.email || "").trim(),
      phone: (row.phone || "").trim(),
      address: (row.address || "").trim(),
      notes: "",
    });
    created++;
  }
  revalidatePath("/clientes");
  return { created, skipped };
}

export type MigrationCandidate = {
  name: string;
  nif: string;
  email: string;
  phone: string;
  address: string;
  budgetIds: number[];
};

/** Migração: cria (ou reaproveita) a ficha de cada candidato confirmado e liga
 *  os orçamentos correspondentes (clientId). */
export async function applyClientMigrationAction(
  candidates: MigrationCandidate[]
): Promise<{ clients: number; linked: number }> {
  const user = await requireUser();
  let clients = 0;
  let linked = 0;
  for (const cand of candidates) {
    const name = (cand.name || "").trim();
    if (!name) continue;
    const existing = await store.findClientByNifOrName(user.companyId, cand.nif || "", name);
    let clientId: number;
    if (existing) {
      clientId = existing.id;
    } else {
      clientId = await store.createClient(user.companyId, {
        name,
        nif: (cand.nif || "").trim(),
        email: (cand.email || "").trim(),
        phone: (cand.phone || "").trim(),
        address: (cand.address || "").trim(),
        notes: "",
      });
      clients++;
    }
    for (const bId of cand.budgetIds) {
      await store.updateBudget(user.companyId, bId, { clientId });
      linked++;
    }
  }
  revalidatePath("/clientes");
  revalidatePath("/orcamentos");
  return { clients, linked };
}
