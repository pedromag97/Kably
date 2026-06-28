export const metadata = { title: "Política de Privacidade — Kably" };

export default function PrivacyPage() {
  return (
    <article className="max-w-2xl mx-auto prose-sm grid gap-4 text-sm text-slate-700 leading-relaxed">
      <h1 className="text-2xl font-bold">Política de Privacidade</h1>
      <p className="text-slate-400">Última atualização: [DATA]</p>

      <p>
        Esta política explica como o Kably trata os dados pessoais ao abrigo do
        Regulamento Geral de Proteção de Dados (RGPD).
      </p>

      <h2 className="text-lg font-bold mt-2">1. Responsável pelo tratamento</h2>
      <p>
        <strong>[NOME / EMPRESA]</strong>, NIF <strong>[NIF]</strong>, com morada em{" "}
        <strong>[MORADA]</strong>. Contacto: <strong>[EMAIL]</strong>.
      </p>

      <h2 className="text-lg font-bold mt-2">2. Que dados recolhemos</h2>
      <ul className="list-disc pl-5 grid gap-1">
        <li>Dados de conta: nome e email do utilizador, palavra-passe (guardada cifrada).</li>
        <li>Dados da empresa: nome, NIF, contactos, logótipo, definições.</li>
        <li>Conteúdos que crias: orçamentos, artigos, custos e dados de clientes (nome, email, morada da obra) que insiras.</li>
        <li>Dados técnicos mínimos de funcionamento (registos de erro e sessão).</li>
      </ul>

      <h2 className="text-lg font-bold mt-2">3. Finalidades e base legal</h2>
      <p>
        Tratamos os dados para te prestar o serviço (execução do contrato), gerir a tua
        conta e enviar comunicações relacionadas (ex.: link de orçamento ao teu cliente,
        recuperação de palavra-passe). Os dados de clientes que inseres são tratados por
        ti — és o responsável por esses dados e o Kably atua como subcontratante.
      </p>

      <h2 className="text-lg font-bold mt-2">4. Subcontratantes</h2>
      <p>Para prestar o serviço recorremos a:</p>
      <ul className="list-disc pl-5 grid gap-1">
        <li><strong>Turso</strong> — base de dados;</li>
        <li><strong>Railway</strong> — alojamento da aplicação;</li>
        <li><strong>Resend</strong> — envio de emails.</li>
      </ul>

      <h2 className="text-lg font-bold mt-2">5. Conservação</h2>
      <p>
        Mantemos os dados enquanto a conta estiver ativa. Quando apagas a conta, a empresa
        e todos os dados associados são eliminados.
      </p>

      <h2 className="text-lg font-bold mt-2">6. Os teus direitos</h2>
      <p>
        Tens direito de acesso, retificação, apagamento, portabilidade, limitação e
        oposição. Podes exportar os teus dados e apagar a conta nas Definições, ou
        contactar-nos em <strong>[EMAIL]</strong>. Tens ainda o direito de reclamar junto
        da CNPD (www.cnpd.pt).
      </p>

      <h2 className="text-lg font-bold mt-2">7. Cookies</h2>
      <p>
        Usamos apenas um cookie essencial de sessão para te manter autenticado. Não usamos
        cookies de publicidade ou rastreio.
      </p>

      <p className="text-xs text-slate-400 mt-4">
        Documento de referência — substitui os campos entre [ ] pelos teus dados e revê com
        apoio jurídico antes do lançamento público.
      </p>
    </article>
  );
}
