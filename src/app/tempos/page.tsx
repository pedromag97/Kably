import Link from "next/link";
import { listArticles } from "@/lib/db";
import { minutesLabel, perDayLabel } from "@/lib/calc";
import type { Article } from "@/lib/types";

export const dynamic = "force-dynamic";

const RULES = [
  {
    t: "O tempo é «porta a porta»",
    d: "Ligar uma tomada são 5 min de gesto técnico — mas com marcar, abrir a caixa, puxar condutores, montar o espelho, testar e arrumar dá ~18 min. Se a intuição diz 10 minutos, a realidade é 1,5× a 2× isso.",
  },
  {
    t: "São horas-HOMEM",
    d: "Se andam 2 pessoas durante 4 horas, isso são 8 horas-homem. É assim que o Kably conta o custo (horas × €/hora).",
  },
  {
    t: "Pensa «quantos num dia»",
    d: "É muito mais fácil estimar «num dia monto ~20 tomadas» do que «uma tomada demora 24 minutos» — e dá o mesmo resultado. Por isso a coluna /dia existe.",
  },
];

const MULTIPLIERS = [
  ["Remodelação com casa habitada (proteger e arrumar todos os dias)", "× 1,2 – 1,4"],
  ["Paredes de betão (vs tijolo) — em roços e furações", "× 1,5 – 2"],
  ["Pladur / teto falso (vs embebido)", "× 0,6 – 0,8  (mais rápido)"],
  ["Trabalho em altura (escadote constante, pés-direitos altos)", "× 1,2 – 1,3"],
  ["Instalação antiga sem esquemas (emendas escondidas)", "× 1,3 – 1,5"],
];

const ROOM_HOURS = [
  ["Quarto", "8 – 12 h"],
  ["Sala", "12 – 18 h"],
  ["Cozinha (muitos circuitos dedicados)", "16 – 24 h"],
  ["Casa de banho", "6 – 10 h"],
  ["Hall / corredor", "4 – 6 h"],
  ["Quadro + alimentações + terras", "12 – 16 h"],
];

export default function TemposPage() {
  const articles = listArticles();

  // A base já vem ordenada por categoria; agrupar preserva essa ordem.
  const byCategory = new Map<string, Article[]>();
  for (const a of articles) {
    const list = byCategory.get(a.category);
    if (list) list.push(a);
    else byCategory.set(a.category, [a]);
  }

  const withHours = articles.filter((a) => a.laborHours > 0);
  const totalHours = withHours.reduce((s, a) => s + a.laborHours, 0);

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-bold">Tempos de mão de obra</h1>
        <p className="text-sm text-slate-500 mt-1 max-w-3xl">
          Quanto tempo leva <strong>1 pessoa</strong> em cada tarefa. É o número que
          decide se ganhas ou perdes dinheiro — e o que o Kably usa para calcular o
          custo de mão de obra de cada artigo.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {RULES.map((r, i) => (
          <div key={r.t} className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                {i + 1}
              </span>
              <h2 className="font-semibold text-sm">{r.t}</h2>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">{r.d}</p>
          </div>
        ))}
      </div>

      <div>
        <div className="flex flex-wrap items-baseline gap-3 mb-2">
          <h2 className="text-lg font-bold">Tabela da tua base de artigos</h2>
          <span className="text-sm text-slate-400">
            {withHours.length} artigos com tempo definido
          </span>
          <Link
            href="/artigos"
            className="text-sm text-blue-600 hover:underline ml-auto"
          >
            Editar tempos em Artigos →
          </Link>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-400 text-left border-b border-slate-200">
                <th className="px-3 py-2 font-medium">Tarefa</th>
                <th className="px-2 py-2 font-medium text-center">Un</th>
                <th className="px-2 py-2 font-medium text-right">h/un</th>
                <th className="px-2 py-2 font-medium text-right">≈ tempo</th>
                <th className="px-2 py-2 font-medium text-right">/dia (8h)</th>
              </tr>
            </thead>
            <tbody>
              {Array.from(byCategory.entries()).map(([category, list]) => (
                <CategoryRows key={category} category={category} list={list} />
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-slate-400 mt-2">
          Soma dos tempos unitários de todos os artigos: {totalHours.toFixed(2)} h
          (indicador de calibração, não de obra).
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="text-lg font-bold mb-2">Multiplicadores de condições</h2>
          <p className="text-xs text-slate-500 mb-2">
            Os tempos acima são «condições normais». A realidade multiplica:
          </p>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <tbody>
                {MULTIPLIERS.map(([cond, mult]) => (
                  <tr key={cond} className="border-b border-slate-100 last:border-0">
                    <td className="px-3 py-2">{cond}</td>
                    <td className="px-3 py-2 text-right font-medium whitespace-nowrap">
                      {mult}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Atalho: em vez de mexer linha a linha, sobe a margem de mão de obra do
            orçamento (ex.: 35% → 45%) quando a obra inteira é difícil.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-bold mb-2">Estimativa rápida por divisão</h2>
          <p className="text-xs text-slate-500 mb-2">
            Para validar um orçamento detalhado antes de o enviar (remodelação
            completa):
          </p>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <tbody>
                {ROOM_HOURS.map(([room, hours]) => (
                  <tr key={room} className="border-b border-slate-100 last:border-0">
                    <td className="px-3 py-2">{room}</td>
                    <td className="px-3 py-2 text-right font-medium whitespace-nowrap">
                      {hours}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Um T2 completo dá ~70–100 h. Se as tuas linhas somam 60 h num T2, falta
            alguma coisa.
          </p>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
        <h2 className="text-lg font-bold mb-1">
          O ciclo que te torna bom nisto
        </h2>
        <p className="text-sm text-slate-600 mb-3">
          Nenhuma tabela substitui os <strong>teus</strong> números. Ao fim de 3–4
          obras, os teus tempos valem mais do que qualquer referência.
        </p>
        <ol className="grid gap-2 text-sm list-decimal list-inside marker:text-amber-600 marker:font-bold">
          <li>
            <strong>Aponta o dia em 3 linhas</strong> no telemóvel: «hoje: 14
            tomadas, 8 h, 1 pessoa».
          </li>
          <li>
            <strong>Divide:</strong> 8 h ÷ 14 tomadas = 0,57 h/tomada (e não 0,3!).
          </li>
          <li>
            <strong>Corrige aqui:</strong> vai a{" "}
            <Link href="/artigos" className="text-blue-600 hover:underline">
              Artigos
            </Link>{" "}
            e edita o campo «Mão de obra (horas/un)» desse artigo.
          </li>
          <li>
            <strong>Compara no fim da obra:</strong> o <em>PDF Interno</em> mostra as
            horas totais orçamentadas. A diferença para as horas reais é o teu erro
            de estimativa — e deve encolher de obra para obra.
          </li>
        </ol>
      </div>
    </div>
  );
}

function CategoryRows({
  category,
  list,
}: {
  category: string;
  list: Article[];
}) {
  return (
    <>
      <tr className="bg-slate-50 border-b border-slate-200">
        <td colSpan={5} className="px-3 py-1.5 text-xs font-semibold text-slate-600">
          {category}
        </td>
      </tr>
      {list.map((a) => (
        <tr key={a.id} className="border-b border-slate-100 hover:bg-slate-50">
          <td className="px-3 py-2">{a.name}</td>
          <td className="px-2 py-2 text-center text-slate-500">{a.unit}</td>
          <td className="px-2 py-2 text-right">{a.laborHours || "—"}</td>
          <td className="px-2 py-2 text-right text-slate-500 whitespace-nowrap">
            {minutesLabel(a.laborHours)}
          </td>
          <td className="px-2 py-2 text-right text-slate-500">
            {perDayLabel(a.laborHours)}
          </td>
        </tr>
      ))}
    </>
  );
}
