import { listClients } from "@/lib/db";
import NewBudgetForm from "@/components/NewBudgetForm";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function NewBudgetPage({
  searchParams,
}: {
  searchParams: Promise<{ cliente?: string }>;
}) {
  const user = await requireUser();
  const clients = await listClients(user.companyId);
  const { cliente } = await searchParams;
  const prefillClientId = cliente && Number.isFinite(Number(cliente)) ? Number(cliente) : null;
  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Novo orçamento</h1>
      <NewBudgetForm clients={clients} prefillClientId={prefillClientId} />
    </div>
  );
}
