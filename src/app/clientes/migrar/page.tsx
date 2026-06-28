import Link from "next/link";
import { listBudgets, listClients } from "@/lib/db";
import { normalizeText } from "@/lib/matching";
import ClientMigration from "@/components/ClientMigration";
import { requireUser } from "@/lib/session";
import type { MigrationCandidate } from "@/app/actions";

export const dynamic = "force-dynamic";

export type MigrationCandidateView = MigrationCandidate & {
  key: string;
  budgetNumbers: string[];
  matchesExisting: boolean;
};

export default async function MigrateClientsPage() {
  const user = await requireUser();
  const [budgets, clients] = await Promise.all([
    listBudgets(user.companyId),
    listClients(user.companyId),
  ]);

  const existingByNif = new Map(clients.filter((c) => c.nif.trim()).map((c) => [c.nif.trim(), c]));
  const existingByName = new Map(clients.map((c) => [normalizeText(c.name), c]));

  const groups = new Map<string, MigrationCandidateView>();
  for (const b of budgets) {
    const name = (b.clientName ?? "").trim();
    if (b.clientId || !name) continue;
    const nif = (b.clientNif ?? "").trim();
    const key = nif ? `nif:${nif}` : `name:${normalizeText(name)}`;
    let cand = groups.get(key);
    if (!cand) {
      const matchesExisting = (nif && existingByNif.has(nif)) || existingByName.has(normalizeText(name));
      cand = {
        key,
        name,
        nif,
        email: (b.clientEmail ?? "").trim(),
        phone: (b.clientPhone ?? "").trim(),
        address: (b.siteAddress ?? "").trim(),
        budgetIds: [],
        budgetNumbers: [],
        matchesExisting: Boolean(matchesExisting),
      };
      groups.set(key, cand);
    }
    // completa campos em falta a partir de orçamentos seguintes
    if (!cand.email) cand.email = (b.clientEmail ?? "").trim();
    if (!cand.phone) cand.phone = (b.clientPhone ?? "").trim();
    if (!cand.address) cand.address = (b.siteAddress ?? "").trim();
    cand.budgetIds.push(b.id);
    cand.budgetNumbers.push(b.number);
  }

  const candidates = Array.from(groups.values()).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="max-w-3xl">
      <Link href="/clientes" className="text-sm text-blue-600 hover:underline">
        ← Voltar aos clientes
      </Link>
      <h1 className="text-2xl font-bold mt-2 mb-1">Importar clientes dos orçamentos</h1>
      <p className="text-sm text-slate-500 mb-5">
        Estes clientes aparecem nos teus orçamentos mas ainda não têm ficha. Confirma os que
        queres criar — cada um fica ligado aos seus orçamentos. Podes corrigir o nome antes.
      </p>
      <ClientMigration candidates={candidates} />
    </div>
  );
}
