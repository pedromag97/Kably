export const metadata = { title: "Termos e Condições — Kably" };

export default function TermsPage() {
  return (
    <article className="max-w-2xl mx-auto grid gap-4 text-sm text-slate-700 leading-relaxed">
      <h1 className="text-2xl font-bold">Termos e Condições</h1>
      <p className="text-slate-400">Última atualização: [DATA]</p>

      <h2 className="text-lg font-bold mt-2">1. O serviço</h2>
      <p>
        O Kably é uma ferramenta de orçamentação de obras de eletricidade, fornecida por{" "}
        <strong>[NOME / EMPRESA]</strong>, NIF <strong>[NIF]</strong>. Ao criar uma conta,
        aceitas estes termos.
      </p>

      <h2 className="text-lg font-bold mt-2">2. Conta</h2>
      <p>
        És responsável por manter a tua palavra-passe segura e por toda a atividade na tua
        conta. Cada empresa é responsável pelos seus utilizadores e pelos dados que insere.
      </p>

      <h2 className="text-lg font-bold mt-2">3. Uso aceitável</h2>
      <p>
        Não podes usar o Kably para fins ilícitos, nem tentar aceder a dados de outras
        empresas. Os dados de cada empresa são isolados dos das restantes.
      </p>

      <h2 className="text-lg font-bold mt-2">4. Planos e fase beta</h2>
      <p>
        O Kably está em fase beta. Durante esta fase, todas as funcionalidades estão
        disponíveis gratuitamente. Os preços indicados entrarão em vigor mais tarde e serás
        avisado com antecedência antes de qualquer cobrança.
      </p>

      <h2 className="text-lg font-bold mt-2">5. Os teus conteúdos</h2>
      <p>
        Os orçamentos, artigos e dados que crias são teus. Não reclamamos qualquer
        propriedade sobre eles e podes exportá-los ou apagá-los a qualquer momento.
      </p>

      <h2 className="text-lg font-bold mt-2">6. Responsabilidade</h2>
      <p>
        O Kably é fornecido &quot;tal como está&quot;. Esforçamo-nos por garantir
        disponibilidade e exatidão, mas não nos responsabilizamos por decisões comerciais
        tomadas com base nos cálculos da plataforma — confirma sempre os teus números.
      </p>

      <h2 className="text-lg font-bold mt-2">7. Alterações e cessação</h2>
      <p>
        Podemos atualizar estes termos e o serviço. Podes deixar de usar e apagar a conta a
        qualquer momento nas Definições.
      </p>

      <h2 className="text-lg font-bold mt-2">8. Lei aplicável</h2>
      <p>Estes termos regem-se pela lei portuguesa.</p>

      <p className="text-xs text-slate-400 mt-4">
        Documento de referência — substitui os campos entre [ ] e revê com apoio jurídico
        antes do lançamento público.
      </p>
    </article>
  );
}
