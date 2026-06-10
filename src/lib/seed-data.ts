// Base de artigos de eletricidade — preços de referência (Portugal).
// [código, designação, categoria, unidade, custo material €, horas de mão de obra]
export const SEED_ARTICLES: [string, string, string, string, number, number][] = [
  // ── Quadros e Proteções ─────────────────────────────────────────────
  ["QP", "Quadro elétrico de encastrar 12 módulos", "Quadros e Proteções", "un", 25, 1.5],
  ["QP", "Quadro elétrico de encastrar 24 módulos", "Quadros e Proteções", "un", 45, 2.5],
  ["QP", "Quadro elétrico de encastrar 36 módulos", "Quadros e Proteções", "un", 65, 3.5],
  ["QP", "Quadro elétrico saliente 48 módulos", "Quadros e Proteções", "un", 95, 4],
  ["QP", "Disjuntor 1P+N 10A curva C", "Quadros e Proteções", "un", 8, 0.15],
  ["QP", "Disjuntor 1P+N 16A curva C", "Quadros e Proteções", "un", 8, 0.15],
  ["QP", "Disjuntor 1P+N 20A curva C", "Quadros e Proteções", "un", 9, 0.15],
  ["QP", "Disjuntor 1P+N 25A curva C", "Quadros e Proteções", "un", 10, 0.15],
  ["QP", "Disjuntor 3P+N 20A curva C", "Quadros e Proteções", "un", 35, 0.3],
  ["QP", "Disjuntor 3P+N 32A curva C", "Quadros e Proteções", "un", 40, 0.3],
  ["QP", "Interruptor diferencial 2P 40A 30mA", "Quadros e Proteções", "un", 35, 0.25],
  ["QP", "Interruptor diferencial 4P 40A 30mA", "Quadros e Proteções", "un", 65, 0.3],
  ["QP", "Protetor de sobretensões tipo 2", "Quadros e Proteções", "un", 60, 0.5],
  ["QP", "Contactor 25A (tarifa bi-horária)", "Quadros e Proteções", "un", 30, 0.5],

  // ── Cabos e Condutores ──────────────────────────────────────────────
  ["CB", "Condutor H07V-U 1,5 mm²", "Cabos e Condutores", "m", 0.25, 0.02],
  ["CB", "Condutor H07V-U 2,5 mm²", "Cabos e Condutores", "m", 0.4, 0.02],
  ["CB", "Condutor H07V-R 4 mm²", "Cabos e Condutores", "m", 0.65, 0.025],
  ["CB", "Condutor H07V-R 6 mm²", "Cabos e Condutores", "m", 0.95, 0.03],
  ["CB", "Cabo XV 3G1,5 mm²", "Cabos e Condutores", "m", 0.85, 0.04],
  ["CB", "Cabo XV 3G2,5 mm²", "Cabos e Condutores", "m", 1.3, 0.04],
  ["CB", "Cabo XV 5G2,5 mm²", "Cabos e Condutores", "m", 2.1, 0.05],
  ["CB", "Cabo XV 5G6 mm²", "Cabos e Condutores", "m", 3.8, 0.06],
  ["CB", "Cabo RV-K 3G10 mm²", "Cabos e Condutores", "m", 3.2, 0.06],
  ["CB", "Cabo LSVAV 4x16 mm² (coluna/entrada)", "Cabos e Condutores", "m", 7.5, 0.1],

  // ── Tubagem e Caminhos de Cabos ─────────────────────────────────────
  ["TB", "Tubo VD 20 mm embebido", "Tubagem e Caminhos de Cabos", "m", 0.45, 0.05],
  ["TB", "Tubo VD 25 mm embebido", "Tubagem e Caminhos de Cabos", "m", 0.6, 0.06],
  ["TB", "Tubo VD 32 mm embebido", "Tubagem e Caminhos de Cabos", "m", 0.9, 0.07],
  ["TB", "Calha técnica 40x16 mm", "Tubagem e Caminhos de Cabos", "m", 2.5, 0.08],
  ["TB", "Calha técnica 110x50 mm", "Tubagem e Caminhos de Cabos", "m", 8, 0.12],
  ["TB", "Esteira metálica 100 mm", "Tubagem e Caminhos de Cabos", "m", 9, 0.15],
  ["TB", "Caixa de derivação de encastrar", "Tubagem e Caminhos de Cabos", "un", 1.2, 0.2],
  ["TB", "Caixa de derivação estanque IP55", "Tubagem e Caminhos de Cabos", "un", 3.5, 0.25],

  // ── Aparelhagem ─────────────────────────────────────────────────────
  ["AP", "Tomada schuko simples", "Aparelhagem", "un", 6, 0.3],
  ["AP", "Tomada schuko dupla", "Aparelhagem", "un", 12, 0.35],
  ["AP", "Tomada estanque IP44", "Aparelhagem", "un", 9, 0.35],
  ["AP", "Interruptor simples", "Aparelhagem", "un", 6, 0.3],
  ["AP", "Comutador de escada", "Aparelhagem", "un", 7, 0.3],
  ["AP", "Comutador de lustre (duplo)", "Aparelhagem", "un", 9, 0.35],
  ["AP", "Inversor de grupo", "Aparelhagem", "un", 12, 0.35],
  ["AP", "Botão de pressão", "Aparelhagem", "un", 7, 0.3],
  ["AP", "Regulador de fluxo luminoso (dimmer)", "Aparelhagem", "un", 35, 0.4],
  ["AP", "Detetor de movimento", "Aparelhagem", "un", 25, 0.5],
  ["AP", "Termóstato de ambiente", "Aparelhagem", "un", 45, 0.75],

  // ── Iluminação ──────────────────────────────────────────────────────
  ["IL", "Aplicação de luminária fornecida pelo cliente", "Iluminação", "un", 0, 0.4],
  ["IL", "Downlight LED 18W de encastrar", "Iluminação", "un", 12, 0.4],
  ["IL", "Painel LED 60x60 40W", "Iluminação", "un", 25, 0.5],
  ["IL", "Armadura estanque LED 36W 120 cm", "Iluminação", "un", 18, 0.5],
  ["IL", "Projetor LED exterior 50W", "Iluminação", "un", 25, 0.5],
  ["IL", "Fita LED com perfil (por metro)", "Iluminação", "m", 12, 0.25],
  ["IL", "Bloco autónomo de emergência", "Iluminação", "un", 28, 0.5],
  ["IL", "Campainha e botão exterior", "Iluminação", "un", 15, 0.5],

  // ── ITED / Telecomunicações ─────────────────────────────────────────
  ["IT", "ATI — armário de telecomunicações individual", "ITED / Telecomunicações", "un", 75, 2],
  ["IT", "Cabo coaxial RG6", "ITED / Telecomunicações", "m", 0.6, 0.03],
  ["IT", "Cabo UTP cat. 6", "ITED / Telecomunicações", "m", 0.45, 0.03],
  ["IT", "Cabo de fibra ótica 2FO", "ITED / Telecomunicações", "m", 0.9, 0.04],
  ["IT", "Tomada terminal coaxial + RJ45", "ITED / Telecomunicações", "un", 20, 0.5],
  ["IT", "Repartidor coaxial 2 saídas", "ITED / Telecomunicações", "un", 8, 0.3],
  ["IT", "Certificação ITED e relatório", "ITED / Telecomunicações", "vg", 150, 2],

  // ── Terras e Proteção ───────────────────────────────────────────────
  ["TR", "Elétrodo de terra (vareta 2 m)", "Terras e Proteção", "un", 18, 1],
  ["TR", "Condutor de terra H07V-R 16 mm²", "Terras e Proteção", "m", 2.2, 0.04],
  ["TR", "Barramento / ligador de terras", "Terras e Proteção", "un", 12, 0.5],
  ["TR", "Medição de terras e relatório", "Terras e Proteção", "vg", 0, 1.5],

  // ── Fotovoltaico ────────────────────────────────────────────────────
  ["FV", "Painel fotovoltaico 450W", "Fotovoltaico", "un", 120, 1],
  ["FV", "Estrutura de fixação (por painel)", "Fotovoltaico", "un", 35, 0.5],
  ["FV", "Inversor híbrido 5 kW", "Fotovoltaico", "un", 950, 4],
  ["FV", "Bateria de lítio 5 kWh", "Fotovoltaico", "un", 1800, 3],
  ["FV", "Cabo solar 6 mm²", "Fotovoltaico", "m", 1.1, 0.04],
  ["FV", "Quadro de proteções DC/AC fotovoltaico", "Fotovoltaico", "un", 180, 2],
  ["FV", "Registo UPAC / licenciamento", "Fotovoltaico", "vg", 0, 4],

  // ── Mobilidade Elétrica ─────────────────────────────────────────────
  ["EV", "Carregador EV wallbox 7,4 kW", "Mobilidade Elétrica", "un", 550, 3],
  ["EV", "Carregador EV wallbox 22 kW", "Mobilidade Elétrica", "un", 850, 4],
  ["EV", "Proteções dedicadas EV (dif. tipo B + disjuntor)", "Mobilidade Elétrica", "un", 220, 1],

  // ── Mão de Obra e Diversos ──────────────────────────────────────────
  ["MO", "Hora de eletricista (oficial)", "Mão de Obra e Diversos", "h", 0, 1],
  ["MO", "Abertura e fecho de roços", "Mão de Obra e Diversos", "m", 0.5, 0.25],
  ["MO", "Furação para caixas de aparelhagem", "Mão de Obra e Diversos", "un", 0.3, 0.15],
  ["MO", "Desmontagem de instalação existente", "Mão de Obra e Diversos", "vg", 0, 4],
  ["MO", "Deslocação e transporte", "Mão de Obra e Diversos", "vg", 0, 0.5],
  ["MO", "Pequeno material e consumíveis", "Mão de Obra e Diversos", "vg", 25, 0],
];

export const DEFAULT_CHAPTERS = [
  "Quadros e Proteções",
  "Tubagem e Cablagem",
  "Aparelhagem e Iluminação",
  "ITED / Telecomunicações",
  "Terras e Proteção",
  "Diversos",
];

export const DEFAULT_CONDITIONS =
  "Pagamento: 40% na adjudicação, 40% durante a obra, 20% na conclusão.\n" +
  "Exclui trabalhos de construção civil não indicados.\n" +
  "Materiais sujeitos a confirmação de stock à data da adjudicação.";
