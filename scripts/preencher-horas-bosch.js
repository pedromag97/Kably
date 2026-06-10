/* Pré-preenche horas de mão de obra de REFERÊNCIA nas linhas a zero do
   orçamento BOSCH (id 3). Só toca em itens com laborHours=0 e materialCost=0.
   Os tempos são pontos de partida "porta a porta" — REVER antes de enviar.
   Itens de avaliação especializada (PT, transformadores, UPS, quadros por
   especificação, AV/som, controlo de acessos) ficam a 0 de propósito. */
const { DatabaseSync } = require("node:sqlite");
const path = require("node:path");

const BUDGET_ID = 3;
const db = new DatabaseSync(path.join(__dirname, "..", "data", "kably.db"));

db.prepare("UPDATE budgets SET vatMode='REVERSE', laborRate=23.5 WHERE id=?").run(BUDGET_ID);

// Regras: primeira correspondência ganha (específico antes do genérico).
// Os padrões de cabo são inequívocos, por isso vêm ANTES da regra de
// avaliação manual — um cabo "(ao Q.X (UPS))" é cabo, não é a UPS.
// [regex, horas/un, etiqueta]
const RULES = [
  // Cabos de energia
  [/3x\{[34]x\[lxz1|4x\[lxz1/i, 0.3, "cabo BT paralelo (3-4 cond./fase)"],
  [/lxz1|lxhioz1|lx1av/i, 0.2, "cabo BT/MT alumínio grande secção"],
  [/x[za]1.*r5g(25|35)|r1x50|r5g16/i, 0.08, "cabo cobre médio (16-50mm²)"],
  [/xz1|x1av|xav|rv-k/i, 0.05, "cabo cobre pequeno"],
  [/liycy|jy\(st\)y|lihch|lih\(st\)h|^-?\s*rf 3x|vcm\/|cabo comando|modo bus|cabo de comando/i, 0.03, "cabo de sinal/comando"],
  [/cabo.*(coaxial|\butp\b|s\/ftp|cat ?6|cat ?7|fibra|freenet|unitubo)|^-?\s*coaxial/i, 0.03, "cabo telecom"],

  // Tubagem e caminhos de cabos
  [/pead/i, 0.15, "PEAD em vala aberta"],
  [/vd ?\d+|isogris/i, 0.05, "tubo VD/ISOGRIS"],
  [/calha de pavimento|oka-w|\buzd\b|\bugd\b/i, 0.3, "calha de pavimento"],
  [/^\s*-?\s*\d{2,3}x\d{2,3}mm/i, 0.15, "esteira/calha (dimensão)"],
  [/esteira/i, 0.15, "esteira"],

  // Caixas (antes de "tomada": as caixas de pavimento mencionam tomadas)
  [/caixa de pavimento|tipo [a-d] - caixa/i, 1.0, "caixa de pavimento técnico"],
  [/caixa de visita/i, 3.0, "caixa de visita"],
  [/tipo i1/i, 0.25, "caixa I1"],

  // Deixar a 0 — avaliação especializada (regra "stop")
  [/posto de transforma|transformador|\bUPS\b|celas|q\.g\.b\.t|^-\s*q\.[egps]|central de dete|câmara|camara|concentrador|leitor de cart|processador|mesa de mistura|transmissor|microfone|ponto de acceso|estação de carga|colunas de som|amplficador|amplificador|ptz|wall mount|matrix|pc all-in-one|switch|parametriza|serviço|servico|sistema autom|fonte central|baterias|inibidor|monitor de falta|router|chassis|cassete|pigtail|splice|adaptador|armário 19|armario 19|kit |painel |prateleira|régua|regua|passa-fios|oggioni|sensitron|^av\d|^-\s*av\d|botoneira|acessórios de segurança|acessorios de seguranca|gard gt8|haste|faixas vermelhas|coroa|strip led|fotocélula|fotocelula|apoio fixo|coluna em alum|sensor magn|placa rádio|placa radio|trasm\.|vas\/|va\/08|rir\/|plx |agt kt|mtm|dg-s|carregador cm|sku|painel tátil|painel tatil|para montagem encastrada|todos os quadros|retirada das infra|rebaixamento|instalação do transformador|instalacao do transformador|abertura e tapamento de vala|caixas de passagem|vala para instalação|atualização do bis|atualizacao do bis|cabo térmico|cabo termico|controlador de ligação|controlador de ligacao|interface de monitoriz/i, 0, "avaliação manual"],

  // Deteção e segurança
  [/detector|detetor/i, 0.6, "detetor"],
  [/sirene|bot[aã]o alarme/i, 0.5, "sirene/botão de alarme"],

  // Iluminação
  [/lumin[aá]ria|tipo l\d|tipo e\d|guideled|calha global pulse|tipo 6 -/i, 0.75, "luminária industrial"],

  // Aparelhagem
  [/tomada.*trif[aá]sica|tomada.*industrial/i, 0.75, "tomada industrial"],
  [/tomada/i, 0.35, "tomada"],
  [/comando de estore/i, 0.5, "comando de estore"],
  [/caixa/i, 0.25, "caixa"],
];

const items = db
  .prepare(
    `SELECT bi.id, bi.name, bi.unit, bi.quantity FROM budget_items bi
     JOIN budget_chapters bc ON bc.id = bi.chapterId
     WHERE bc.budgetId=? AND bi.laborHours=0 AND bi.materialCost=0`
  )
  .all(BUDGET_ID);

const upd = db.prepare("UPDATE budget_items SET laborHours=? WHERE id=?");
const stats = new Map();
let filled = 0;
let manual = 0;
let unmatched = 0;

for (const it of items) {
  let applied = null;
  for (const [re, hours, label] of RULES) {
    if (re.test(it.name)) {
      applied = { hours, label };
      break;
    }
  }
  if (!applied) {
    unmatched++;
    continue;
  }
  if (applied.hours === 0) {
    manual++;
    continue;
  }
  upd.run(applied.hours, it.id);
  filled++;
  const s = stats.get(applied.label) ?? { n: 0, h: 0 };
  s.n++;
  s.h += applied.hours * it.quantity;
  stats.set(applied.label, s);
}

console.log(`Linhas analisadas: ${items.length}`);
console.log(`Preenchidas com horas de referência: ${filled}`);
console.log(`Deixadas a 0 (avaliação manual): ${manual}`);
console.log(`Sem regra (ficam a 0): ${unmatched}`);
console.log("\nPor categoria (linhas | horas totais):");
[...stats.entries()]
  .sort((a, b) => b[1].h - a[1].h)
  .forEach(([label, s]) => console.log(`  ${label}: ${s.n} linhas | ${Math.round(s.h)} h`));
