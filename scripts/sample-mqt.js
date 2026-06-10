/* Gera um MQT de teste em Excel (public/mqt-teste.xlsx), com a estrutura
   típica enviada por gabinetes: cabeçalhos, títulos de capítulo sem
   quantidade, e descrições longas. */
const XLSX = require("xlsx");
const path = require("node:path");

const rows = [
  ["MAPA DE QUANTIDADES DE TRABALHOS — MORADIA UNIFAMILIAR", null, null, null],
  [null, null, null, null],
  ["Art.", "Designação dos trabalhos", "Un", "Quant."],
  ["1", "INSTALAÇÕES ELÉTRICAS", null, null],
  ["1.1", "Fornecimento e montagem de quadro elétrico de encastrar com 24 módulos, incluindo aparelhagem de proteção e identificação de circuitos", "un", 1],
  ["1.2", "Fornecimento e instalação de tomada schuko simples, incluindo ligações e espelho", "un", 24],
  ["1.3", "Execução de roços em alvenaria e posterior fecho com argamassa", "m", 45],
  ["1.4", "Fornecimento e instalação de cabo XV 3G2,5 mm² em tubo embebido", "m", 120],
  ["1.5", "Fornecimento e instalação de tubo VD 25 mm embebido", "m", 110],
  ["1.6", "Instalação de downlight LED 18W de encastrar em teto falso", "un", 12],
  ["1.7", "Fornecimento e montagem de comutador de escada", "un", 6],
  ["2", "TELECOMUNICAÇÕES", null, null],
  ["2.1", "Fornecimento e instalação de cabo UTP cat. 6 em tubo", "m", 80],
  ["2.2", "Fornecimento e montagem de videoporteiro a cores com abertura de porta", "un", 1],
  ["3", "DIVERSOS", null, null],
  ["3.1", "Certificação da instalação elétrica e emissão de ficha técnica", "vg", 1],
];

const ws = XLSX.utils.aoa_to_sheet(rows);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, "MQT");
const out = path.join(__dirname, "..", "public", "mqt-teste.xlsx");
XLSX.writeFile(wb, out);
console.log("MQT de teste criado:", out);
