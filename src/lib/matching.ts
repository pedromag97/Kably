// Correspondência de texto entre linhas de MQT e artigos da base.
// Funciona no browser e no servidor (sem dependências).
import type { Article } from "./types";

// Palavras que não distinguem artigos em descrições de MQT
const STOPWORDS = new Set([
  "de", "da", "do", "das", "dos", "e", "em", "com", "para", "a", "o", "as", "os",
  "no", "na", "nos", "nas", "ao", "aos", "por", "um", "uma", "ate", "sobre",
  "fornecimento", "montagem", "execucao", "instalacao", "colocacao", "aplicacao",
  "assentamento", "incluindo", "inclui", "incluido", "incluidos", "todos",
  "todas", "trabalhos", "acessorios", "necessarios", "necessarias", "conforme",
  "projeto", "tipo", "ou", "equivalente", "marca", "modelo", "ref", "cor",
]);

export function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // remover acentos (combinantes apos NFD)
    .replace(/mm²|mm2/g, "mm2")
    .replace(/m²|m2/g, "m2")
    .replace(/(\d),(\d)/g, "$1.$2") // 1,5 -> 1.5
    .replace(/[^a-z0-9.]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function tokens(s: string): string[] {
  return normalizeText(s)
    .split(" ")
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

function tokensMatch(a: string, b: string): boolean {
  if (a === b) return true;
  // plurais e variações: "tomadas" vs "tomada"
  if (a.length >= 4 && b.length >= 4 && (a.startsWith(b) || b.startsWith(a))) return true;
  return false;
}

/**
 * Pontuação 0..1: que fração do NOME DO ARTIGO está coberta pelo texto do MQT.
 * As descrições de MQT são longas ("Fornecimento e montagem de tomada schuko
 * simples, incluindo ligações...") e os artigos curtos ("Tomada schuko simples"),
 * por isso medimos a cobertura do lado do artigo.
 * Tokens numéricos (secções de cabo: 1.5, 2.5, 16) pesam a dobrar — distinguem
 * artigos quase iguais.
 */
export function matchScore(mqtText: string, articleName: string): number {
  const mqtTokens = tokens(mqtText);
  const artTokens = tokens(articleName);
  if (artTokens.length === 0 || mqtTokens.length === 0) return 0;

  let weightTotal = 0;
  let weightMatched = 0;
  for (const at of artTokens) {
    const isNumeric = /\d/.test(at);
    const w = isNumeric ? 2 : 1;
    weightTotal += w;
    if (mqtTokens.some((mt) => tokensMatch(mt, at))) weightMatched += w;
  }
  return weightMatched / weightTotal;
}

export type Suggestion = {
  articleId: number;
  score: number;
  source: "alias" | "text";
};

/** Melhor artigo para um texto de MQT. `aliases` são associações memorizadas
 *  (texto normalizado → articleId) de importações anteriores — têm prioridade. */
export function suggestArticle(
  mqtText: string,
  articles: Article[],
  aliases: Map<string, number>,
  minScore = 0.55
): Suggestion | null {
  const norm = normalizeText(mqtText);
  const aliasId = aliases.get(norm);
  if (aliasId !== undefined && articles.some((a) => a.id === aliasId)) {
    return { articleId: aliasId, score: 1, source: "alias" };
  }
  let best: Suggestion | null = null;
  for (const a of articles) {
    const score = matchScore(mqtText, a.name);
    if (score >= minScore && (!best || score > best.score)) {
      best = { articleId: a.id, score, source: "text" };
    }
  }
  return best;
}

/** Tenta adivinhar o papel de cada coluna a partir da linha de cabeçalho. */
export function guessColumns(headerRow: (string | number | null)[]): {
  name: number | null;
  unit: number | null;
  quantity: number | null;
} {
  let name: number | null = null;
  let unit: number | null = null;
  let quantity: number | null = null;
  headerRow.forEach((cell, i) => {
    const h = normalizeText(String(cell ?? ""));
    // cada coluna recebe no máximo um papel (o primeiro que corresponder)
    if (name === null && /designac|descric|trabalho|artigo|tarefa/.test(h)) {
      name = i;
      return;
    }
    if (unit === null && /^un(id|\.)?(ade)?s?$|^und$|^u\.?$/.test(h)) {
      unit = i;
      return;
    }
    if (quantity === null && /quant|qtd|qt\b|^qts?$/.test(h)) quantity = i;
  });
  return { name, unit, quantity };
}

// Mapa categoria do artigo → capítulo do Kably onde a linha deve cair
export const CATEGORY_TO_CHAPTER: Record<string, string> = {
  "Quadros e Proteções": "Quadros e Proteções",
  "Cabos e Condutores": "Tubagem e Cablagem",
  "Tubagem e Caminhos de Cabos": "Tubagem e Cablagem",
  Aparelhagem: "Aparelhagem e Iluminação",
  Iluminação: "Aparelhagem e Iluminação",
  "ITED / Telecomunicações": "ITED / Telecomunicações",
  "Terras e Proteção": "Terras e Proteção",
  Fotovoltaico: "Fotovoltaico",
  "Mobilidade Elétrica": "Mobilidade Elétrica",
  "Mão de Obra e Diversos": "Diversos",
};

export const FALLBACK_CHAPTER = "Diversos";

// Ordem estável dos capítulos no orçamento criado
export const CHAPTER_ORDER = [
  "Quadros e Proteções",
  "Tubagem e Cablagem",
  "Aparelhagem e Iluminação",
  "ITED / Telecomunicações",
  "Terras e Proteção",
  "Fotovoltaico",
  "Mobilidade Elétrica",
  "Diversos",
];
