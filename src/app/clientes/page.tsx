import { listClients, listBudgets } from "@/lib/db";
import ClientsManager from "@/components/ClientsManager";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const user = await requireUser();
  const [clients, budgets] = await Promise.all([
    listClients(user.companyId),
    listBudgets(user.companyId),
  ]);
  // nº de orçamentos por cliente (ligados) para a lista
  const counts: Record<number, number> = {};
  for (const b of budgets) {
    if (b.clientId) counts[b.clientId] = (counts[b.clientId] ?? 0) + 1;
  }
  // candidatos por migrar: orçamentos com cliente escrito mas sem ficha ligada
  const pendingMigration = budgets.some((b) => !b.clientId && (b.clientName ?? "").trim());
  return (
    <ClientsManager clients={clients} counts={counts} pendingMigration={pendingMigration} />
  );
}
