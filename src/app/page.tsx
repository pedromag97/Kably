import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

function Icon({ d, className = "w-6 h-6" }: { d: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      className={className}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

const ICONS = {
  bolt: "M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z",
  upload: "M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 7.5 12 3m0 0L7.5 7.5M12 3v13.5",
  clock: "M12 6v6h4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  doc: "M9 12h6m-6 3.75h6M9 17.25h3M6.75 21h10.5A2.25 2.25 0 0019.5 18.75V8.25L14.25 3H6.75A2.25 2.25 0 004.5 5.25v13.5A2.25 2.25 0 006.75 21zM13.5 3v4.5A1.5 1.5 0 0015 9h4.5",
  euro: "M14.25 7.756a4.5 4.5 0 100 8.488M7.5 10.5h5.25m-5.25 3h5.25M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  users: "M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z",
  check: "M4.5 12.75l6 6 9-13.5",
};

const FEATURES = [
  { icon: ICONS.bolt, title: "Orçamentos rápidos", desc: "Por artigos e capítulos, com uma base de preços de referência de eletricidade em Portugal já carregada." },
  { icon: ICONS.upload, title: "Importa MQT em Excel", desc: "Carrega o mapa de quantidades do cliente e o Kably associa automaticamente cada linha aos teus artigos." },
  { icon: ICONS.clock, title: "Modo só mão de obra", desc: "Para subempreitadas em que o material é fornecido — preço só das horas, com margem." },
  { icon: ICONS.doc, title: "PDF profissional", desc: "Uma versão para o cliente e uma interna com custos e margens. Com o teu logótipo." },
  { icon: ICONS.euro, title: "Sabe quanto cobrar", desc: "Calcula a tua taxa horária real a partir dos custos da empresa. Nunca mais orçamentes a perder." },
  { icon: ICONS.users, title: "Equipa com papéis", desc: "Vários utilizadores na mesma empresa. Só o dono vê os custos e os salários." },
];

const OBRAS = ["Residencial", "Comercial", "Industrial", "ITED", "Fotovoltaico", "Carregadores EV"];

type Plan = {
  name: string;
  price: string;
  period: string;
  tagline: string;
  features: string[];
  highlight?: boolean;
};

const PLANS: Plan[] = [
  {
    name: "Grátis",
    price: "0 €",
    period: "para sempre",
    tagline: "Para experimentar",
    features: ["1 utilizador", "3 orçamentos por mês", "Base de artigos de eletricidade PT", "PDF para cliente e interno"],
  },
  {
    name: "Pro",
    price: "14,90 €",
    period: "por mês",
    tagline: "Para o eletricista",
    highlight: true,
    features: ["Orçamentos ilimitados", "Importação de MQT (Excel)", "Modo só mão de obra", "Calculadora de custos e taxa horária", "Exportação para Excel"],
  },
  {
    name: "Equipas",
    price: "29,90 €",
    period: "por mês",
    tagline: "Para empresas",
    features: ["Tudo do Pro", "Vários utilizadores", "Papéis dono e membro", "Gestão de equipa", "Custos visíveis só ao dono"],
  },
];

/** Mini-maqueta de um orçamento, para o hero. */
function BudgetMock() {
  const rows = [
    ["1.1", "Quadro elétrico 24 módulos", "123,75 €"],
    ["2.1", "Tomada schuko · 18 un", "280,80 €"],
    ["3.4", "Downlight LED 18W · 10 un", "258,00 €"],
  ];
  return (
    <div className="relative">
      <div className="absolute -inset-4 bg-blue-500/20 rounded-3xl blur-2xl" />
      <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 p-5 rotate-1">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <div className="font-mono text-[10px] text-slate-400">ORC-2026-014</div>
            <div className="font-semibold text-slate-800 text-sm">Instalação — Moradia T3</div>
          </div>
          <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-700 rounded px-2 py-1">
            PDF
          </span>
        </div>
        <table className="w-full text-xs mt-3">
          <tbody>
            {rows.map(([n, name, total]) => (
              <tr key={n} className="border-b border-slate-50">
                <td className="py-2 text-slate-400 font-mono">{n}</td>
                <td className="py-2 text-slate-600">{name}</td>
                <td className="py-2 text-right font-medium text-slate-800 whitespace-nowrap">{total}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex items-center justify-between mt-3 bg-slate-900 text-white rounded-lg px-3 py-2">
          <span className="text-xs">Total c/ IVA</span>
          <span className="font-bold">2.068,00 €</span>
        </div>
      </div>
      <div className="absolute -bottom-5 -left-5 bg-white rounded-xl shadow-xl border border-slate-200 px-3 py-2 -rotate-3 hidden sm:block">
        <div className="text-[10px] text-slate-400">Taxa recomendada</div>
        <div className="text-sm font-bold text-blue-600">24,17 €/h</div>
      </div>
    </div>
  );
}

export default async function LandingPage() {
  if (await getCurrentUser()) redirect("/painel");

  return (
    <div className="grid gap-16 sm:gap-24 py-6">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-slate-900 text-white px-6 py-14 sm:px-12 sm:py-16">
        <div className="absolute -top-32 -right-20 w-96 h-96 bg-blue-600/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-20 w-96 h-96 bg-amber-500/15 rounded-full blur-3xl" />
        <div className="relative grid lg:grid-cols-2 gap-12 items-center">
          <div className="grid gap-6">
            <span className="w-fit text-xs font-medium bg-white/10 text-amber-300 rounded-full px-3 py-1">
              ⚡ Feito para eletricistas
            </span>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-[1.1]">
              Orçamentos de eletricidade,{" "}
              <span className="bg-gradient-to-r from-blue-400 to-amber-300 bg-clip-text text-transparent">
                sem folhas de cálculo
              </span>
              .
            </h1>
            <p className="text-lg text-slate-300 max-w-md">
              Monta orçamentos profissionais em minutos, importa mapas de quantidades em
              Excel e sabe exatamente quanto cobrar para teres lucro.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/registo"
                className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white px-6 py-3 rounded-xl font-semibold shadow-lg shadow-blue-600/30"
              >
                Criar conta grátis
              </Link>
              <Link
                href="/login"
                className="bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-xl font-semibold"
              >
                Entrar
              </Link>
            </div>
            <p className="text-xs text-slate-400">
              Sem cartão de crédito. Em beta — todas as funcionalidades desbloqueadas.
            </p>
          </div>
          <div className="lg:pl-6">
            <BudgetMock />
          </div>
        </div>
      </section>

      {/* Tipos de obra */}
      <section className="-mt-12">
        <p className="text-center text-xs uppercase tracking-wider text-slate-400 mb-4">
          Para todo o tipo de obra
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {OBRAS.map((o) => (
            <span
              key={o}
              className="text-sm bg-white border border-slate-200 text-slate-600 rounded-full px-4 py-1.5"
            >
              {o}
            </span>
          ))}
        </div>
      </section>

      {/* Funcionalidades */}
      <section className="grid gap-10">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold">Tudo o que precisas para orçamentar</h2>
          <p className="text-slate-500 mt-3">
            Da moradia ao concurso industrial — uma ferramenta pensada para o teu dia a dia.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="bg-white rounded-2xl border border-slate-200 p-6 grid gap-3 hover:border-blue-300 hover:shadow-lg transition-all"
            >
              <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Icon d={f.icon} />
              </div>
              <h3 className="font-semibold text-lg">{f.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Destaque: do MQT ao orçamento */}
      <section className="grid lg:grid-cols-2 gap-10 items-center">
        <div className="grid gap-4">
          <span className="w-fit text-xs font-semibold bg-blue-100 text-blue-700 rounded-full px-3 py-1">
            Importação de MQT
          </span>
          <h2 className="text-3xl font-bold">Do Excel do cliente ao teu orçamento</h2>
          <p className="text-slate-500 leading-relaxed">
            Recebeste o mapa de quantidades de um gabinete? Carrega o ficheiro e o Kably
            associa cada linha aos teus artigos automaticamente — e aprende com as tuas
            escolhas para a próxima vez.
          </p>
          <ul className="grid gap-2 text-sm text-slate-600">
            {["Lê qualquer formato de Excel", "Sugere o artigo certo por semelhança", "Cria o orçamento com um clique"].map(
              (t) => (
                <li key={t} className="flex items-center gap-2">
                  <span className="text-blue-600">
                    <Icon d={ICONS.check} className="w-4 h-4" />
                  </span>
                  {t}
                </li>
              )
            )}
          </ul>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div className="text-xs text-slate-400 mb-3">mapa-de-quantidades.xlsx</div>
          <div className="grid gap-2">
            {[
              ["Fornecimento e montagem de tomada schuko…", "Tomada schuko simples", "memorizado"],
              ["Cabo XV 3G2,5 mm² em tubo embebido", "Cabo XV 3G2,5 mm²", "98%"],
              ["Execução de roços em alvenaria", "Abertura e fecho de roços", "67%"],
            ].map(([mqt, art, tag]) => (
              <div key={mqt} className="flex items-center gap-2 text-xs border border-slate-100 rounded-lg px-3 py-2">
                <span className="flex-1 text-slate-500 truncate">{mqt}</span>
                <span className="text-slate-300">→</span>
                <span className="font-medium text-slate-700 truncate max-w-[40%]">{art}</span>
                <span className="text-[10px] font-semibold text-emerald-600 whitespace-nowrap">{tag}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Como funciona */}
      <section className="grid gap-10">
        <h2 className="text-3xl font-bold text-center">Começar é simples</h2>
        <div className="grid sm:grid-cols-3 gap-6">
          {[
            ["1", "Cria a tua conta", "A base de artigos com preços de referência já vem carregada."],
            ["2", "Monta o orçamento", "Por artigos, ou importando o MQT em Excel do cliente."],
            ["3", "Envia e ganha a obra", "Gera o PDF profissional e apresenta ao cliente."],
          ].map(([n, title, desc]) => (
            <div key={n} className="grid gap-3 text-center px-4">
              <div className="mx-auto w-12 h-12 rounded-2xl bg-slate-900 text-white text-lg font-bold flex items-center justify-center">
                {n}
              </div>
              <h3 className="font-semibold text-lg">{title}</h3>
              <p className="text-sm text-slate-500">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Preços */}
      <section className="grid gap-10">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold">Planos simples</h2>
          <p className="text-slate-500 mt-3">Começa grátis. Faz upgrade quando precisares de mais.</p>
        </div>
        <div className="grid sm:grid-cols-3 gap-5 items-start">
          {PLANS.map((p) => (
            <div
              key={p.name}
              className={`rounded-2xl p-6 grid gap-5 bg-white ${
                p.highlight
                  ? "border-2 border-blue-600 shadow-xl shadow-blue-600/10 sm:-mt-3 sm:mb-3"
                  : "border border-slate-200"
              }`}
            >
              <div className="grid gap-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-lg">{p.name}</h3>
                  {p.highlight && (
                    <span className="text-xs font-semibold bg-blue-100 text-blue-700 rounded-full px-2 py-0.5">
                      Mais popular
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-500">{p.tagline}</p>
              </div>
              <div className="flex flex-wrap items-baseline gap-x-1">
                <span className="text-4xl font-bold whitespace-nowrap">{p.price}</span>
                <span className="text-sm text-slate-500 whitespace-nowrap">/ {p.period}</span>
              </div>
              <ul className="grid gap-2.5 text-sm">
                {p.features.map((feat) => (
                  <li key={feat} className="flex items-start gap-2">
                    <span className="text-emerald-600 mt-0.5">
                      <Icon d={ICONS.check} className="w-4 h-4" />
                    </span>
                    <span className="text-slate-600">{feat}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/registo"
                className={`text-center px-4 py-2.5 rounded-xl font-semibold ${
                  p.highlight
                    ? "bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-800"
                }`}
              >
                Começar
              </Link>
            </div>
          ))}
        </div>
        <p className="text-center text-xs text-slate-400">
          Em beta, todos os planos estão desbloqueados e gratuitos. Os preços entram em
          vigor mais tarde — quem entrar agora é avisado antes.
        </p>
      </section>

      {/* CTA final */}
      <section className="relative overflow-hidden rounded-3xl bg-slate-900 text-white px-6 py-14 text-center grid gap-5">
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-600/25 rounded-full blur-3xl" />
        <div className="relative grid gap-5">
          <h2 className="text-3xl font-bold">Faz o teu próximo orçamento no Kably</h2>
          <p className="text-slate-300 max-w-md mx-auto">
            Cria a conta grátis e experimenta com uma obra real. Demora menos de um minuto.
          </p>
          <div className="flex justify-center">
            <Link
              href="/registo"
              className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white px-7 py-3.5 rounded-xl font-semibold shadow-lg shadow-blue-600/30"
            >
              Criar conta grátis
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
