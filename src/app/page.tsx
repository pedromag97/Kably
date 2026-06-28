import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

const FEATURES = [
  {
    icon: "⚡",
    title: "Orçamentos rápidos",
    desc: "Por artigos e capítulos, com uma base de preços de referência de eletricidade em Portugal já carregada.",
  },
  {
    icon: "📊",
    title: "Importa MQT em Excel",
    desc: "Carrega o mapa de quantidades do cliente e o Kably associa automaticamente cada linha aos teus artigos.",
  },
  {
    icon: "🔧",
    title: "Modo só mão de obra",
    desc: "Para subempreitadas em que o material é fornecido — preço só das horas, com margem.",
  },
  {
    icon: "📄",
    title: "PDF profissional",
    desc: "Uma versão para o cliente e uma versão interna com custos e margens. Com o teu logótipo.",
  },
  {
    icon: "💶",
    title: "Sabe quanto cobrar",
    desc: "Calcula a tua taxa horária real a partir dos custos da empresa. Nunca mais orçamentes a perder.",
  },
  {
    icon: "👥",
    title: "Equipa com papéis",
    desc: "Vários utilizadores na mesma empresa. Só o dono vê os custos e os salários.",
  },
];

const STEPS = [
  { n: "1", title: "Cria a tua conta", desc: "A base de artigos com preços de referência já vem carregada." },
  { n: "2", title: "Monta o orçamento", desc: "Por artigos, ou importando o MQT em Excel do cliente." },
  { n: "3", title: "Envia e ganha a obra", desc: "Gera o PDF profissional e apresenta ao cliente." },
];

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
    features: [
      "1 utilizador",
      "3 orçamentos por mês",
      "Base de artigos de eletricidade PT",
      "PDF para cliente e interno",
    ],
  },
  {
    name: "Pro",
    price: "14,90 €",
    period: "por mês",
    tagline: "Para o eletricista",
    highlight: true,
    features: [
      "Orçamentos ilimitados",
      "Importação de MQT (Excel)",
      "Modo só mão de obra",
      "Calculadora de custos e taxa horária",
      "Exportação para Excel",
    ],
  },
  {
    name: "Equipas",
    price: "29,90 €",
    period: "por mês",
    tagline: "Para empresas",
    features: [
      "Tudo do Pro",
      "Vários utilizadores",
      "Papéis dono e membro",
      "Gestão de equipa",
      "Custos visíveis só ao dono",
    ],
  },
];

export default async function LandingPage() {
  if (await getCurrentUser()) redirect("/orcamentos");

  return (
    <div className="grid gap-20 py-6">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-slate-900 text-white px-6 py-16 sm:px-12 sm:py-20 text-center">
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-blue-600/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-amber-500/20 rounded-full blur-3xl" />
        <div className="relative max-w-2xl mx-auto grid gap-6">
          <span className="mx-auto text-xs font-medium bg-white/10 text-amber-300 rounded-full px-3 py-1">
            ⚡ Feito para eletricistas
          </span>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-tight">
            Orçamentos de eletricidade,
            <br className="hidden sm:block" /> sem folhas de cálculo.
          </h1>
          <p className="text-lg text-slate-300">
            Monta orçamentos profissionais em minutos, importa mapas de quantidades em
            Excel e sabe exatamente quanto cobrar para teres lucro.
          </p>
          <div className="flex flex-wrap gap-3 justify-center pt-2">
            <Link
              href="/registo"
              className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-semibold"
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
      </section>

      {/* Funcionalidades */}
      <section className="grid gap-8">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold">Tudo o que precisas para orçamentar</h2>
          <p className="text-slate-500 mt-2">
            Desde a moradia ao concurso industrial — residencial, comercial, ITED e
            fotovoltaico.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="bg-white rounded-2xl border border-slate-200 p-6 grid gap-2"
            >
              <div className="text-2xl">{f.icon}</div>
              <h3 className="font-semibold text-lg">{f.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Como funciona */}
      <section className="grid gap-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-center">Como funciona</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {STEPS.map((s) => (
            <div key={s.n} className="grid gap-2 text-center px-4">
              <div className="mx-auto w-10 h-10 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center">
                {s.n}
              </div>
              <h3 className="font-semibold text-lg">{s.title}</h3>
              <p className="text-sm text-slate-500">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Preços */}
      <section className="grid gap-8">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold">Planos simples</h2>
          <p className="text-slate-500 mt-2">
            Começa grátis. Faz upgrade quando precisares de mais.
          </p>
        </div>
        <div className="grid sm:grid-cols-3 gap-4 items-start">
          {PLANS.map((p) => (
            <div
              key={p.name}
              className={`rounded-2xl border p-6 grid gap-4 bg-white ${
                p.highlight
                  ? "border-blue-600 border-2 shadow-lg sm:-mt-2"
                  : "border-slate-200"
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
                <span className="text-3xl font-bold whitespace-nowrap">{p.price}</span>
                <span className="text-sm text-slate-500 whitespace-nowrap">/ {p.period}</span>
              </div>
              <ul className="grid gap-2 text-sm">
                {p.features.map((feat) => (
                  <li key={feat} className="flex items-start gap-2">
                    <span className="text-emerald-600 mt-0.5">✓</span>
                    <span className="text-slate-600">{feat}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/registo"
                className={`text-center px-4 py-2.5 rounded-xl font-semibold ${
                  p.highlight
                    ? "bg-blue-600 hover:bg-blue-500 text-white"
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
      <section className="rounded-3xl bg-slate-900 text-white px-6 py-12 text-center grid gap-4">
        <h2 className="text-2xl sm:text-3xl font-bold">Faz o teu próximo orçamento no Kably</h2>
        <p className="text-slate-300">Cria a conta grátis e experimenta com uma obra real.</p>
        <div className="flex justify-center">
          <Link
            href="/registo"
            className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-semibold"
          >
            Criar conta grátis
          </Link>
        </div>
      </section>
    </div>
  );
}
