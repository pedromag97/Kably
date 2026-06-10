# Guia de Orçamentação de Obras de Eletricidade

Este documento explica **como pensar** e **como calcular** um orçamento de
instalações elétricas, do zero até ao preço final com margem. É a lógica que
o Kably aplica automaticamente — mas deves dominá-la tu, para confiares nos
números e saberes negociar.

---

## 1. O que é, afinal, um orçamento

Um orçamento é uma **promessa de preço por um trabalho bem definido**. Tem de
cumprir quatro objetivos ao mesmo tempo:

1. **Cobrir todos os custos** — material, mão de obra, deslocações, desgaste.
2. **Pagar o teu tempo** — incluindo o tempo que não está "na obra" (orçamentar, comprar material, gerir).
3. **Gerar lucro** — o que sobra depois de tudo pago. Sem lucro, o negócio não cresce nem aguenta imprevistos.
4. **Ganhar a obra** — tem de ser competitivo. Os três primeiros pontos definem o teu preço mínimo; o mercado define o máximo.

> A regra de ouro: **nunca baixes o preço abaixo do custo + o teu ordenado.**
> Entre esse mínimo e o preço de mercado, é negociação. Abaixo disso, estás a
> pagar para trabalhar.

---

## 2. As peças que compõem o orçamento

### 2.1 Levantamento (medições)

Antes de qualquer conta, precisas de saber **o que vai ser feito, em
quantidades**:

- **Pontos** — cada tomada, interruptor, ponto de luz, tomada TV/RJ45.
- **Metros** — tubo, cabo, calha, roços. Regra prática: mede em planta e
  acrescenta 10–15% (os cabos não andam em linha reta).
- **Equipamentos** — quadro elétrico, disjuntores, diferenciais, ATI,
  luminárias, carregador EV…
- **Trabalhos especiais** — certificação, medição de terras, desmontagens.

Erro de principiante: esquecer o "invisível" — caixas de derivação, terras,
fixações, pequeno material. É por isso que a base de artigos do Kably tem o
artigo *"Pequeno material e consumíveis"*.

### 2.2 Estrutura por capítulos

Agrupa os trabalhos por natureza. A estrutura clássica de eletricidade:

1. **Quadros e Proteções** — quadro, disjuntores, diferenciais
2. **Tubagem e Cablagem** — tubos, cabos, caixas, roços
3. **Aparelhagem e Iluminação** — tomadas, interruptores, luminárias
4. **ITED / Telecomunicações** — coaxial, rede, fibra, ATI
5. **Terras e Proteção** — elétrodo, condutor de terra, medições
6. **Diversos** — deslocações, certificações, limpezas

Porquê capítulos? O cliente percebe o que está a pagar, tu detetas buracos
("esqueci-me das terras!"), e em negociação consegues cortar capítulos em vez
de dar descontos cegos.

### 2.3 O artigo: a unidade base

Cada linha do orçamento é um **artigo** com:

| Campo | Exemplo |
|---|---|
| Designação | Tomada schuko simples |
| Unidade | un (também: m, h, vg*) |
| Quantidade | 18 |
| **Custo de material** por unidade | 6,00 € |
| **Horas de mão de obra** por unidade | 0,3 h |

*\*vg = valor global (trabalho cobrado por preço fechado, ex.: certificação)*

A separação **material vs mão de obra** é a chave de todo o método — porque
têm custos e margens diferentes, como vais ver já a seguir.

---

## 3. A matemática, passo a passo

### Passo 1 — Custo de material

```
custo material do item = preço de compra × quantidade
```

Usa o preço a que **tu compras** (com o teu desconto de fornecedor), não o
preço de tabela. Em cabos e tubos, acrescenta 5–10% de desperdício (pontas,
erros de corte).

### Passo 2 — A tua taxa horária real (o número mais importante)

Quanto custa **uma hora do teu trabalho**? Não é o que "queres ganhar à hora"
— é o resultado desta conta:

```
taxa horária = (ordenado anual + encargos + custos fixos do negócio)
               ÷ horas faturáveis por ano
```

**Exemplo realista:**

| Parcela | Valor |
|---|---|
| Ordenado pretendido: 1.400 €/mês × 14 | 19.600 € |
| Segurança social / impostos (≈ 24%) | 4.700 € |
| Carrinha + combustível + seguro | 4.200 € |
| Ferramenta, EPI, telemóvel, contabilidade, software | 1.800 € |
| **Total a cobrir por ano** | **30.300 €** |

E as horas? Trabalhas ~220 dias/ano × 8 h = 1.760 h. Mas só **60–70%** são
faturáveis — o resto é orçamentar, comprar material, conduzir, administrativo:

```
horas faturáveis ≈ 1.760 × 0,70 ≈ 1.230 h
taxa horária = 30.300 ÷ 1.230 ≈ 24,60 €/h  →  arredonda: 25 €/h
```

> Se cobrares 15 €/h "porque é o que se vê por aí", estás a perder 10 € por
> cada hora trabalhada. A maioria dos eletricistas que fecham portas não
> falharam no trabalho — falharam nesta conta.

### Passo 3 — Custo de mão de obra por item

```
custo MO do item = horas por unidade × taxa horária × quantidade
```

Exemplo: instalar uma tomada leva ~0,3 h (inclui abrir caixa, ligar, testar).
18 tomadas × 0,3 h × 25 €/h = **135 €** de mão de obra.

### Passo 4 — Aplicar margens (e porquê duas margens diferentes)

A margem cobre o **risco e o lucro**. Aplica-se separadamente:

- **Margem sobre material (20–30%)** — cobre: capital parado (compras antes
  de receber), garantia de material que avaria, idas ao fornecedor, material
  que sobra. 25% é um bom ponto de partida.
- **Margem sobre mão de obra (30–40%)** — cobre: imprevistos de execução
  (paredes que esfarelam, traçados que mudam), o risco de teres estimado as
  horas por baixo, e o **lucro** propriamente dito. 35% é um bom ponto de partida.

```
preço de venda do item =
    custo material × (1 + margem material)
  + custo MO       × (1 + margem MO)
```

**Exemplo completo — 1 tomada schuko:**

```
material: 6,00 € × 1,25  = 7,50 €
MO:       0,3 h × 25 €/h = 7,50 € × 1,35 = 10,13 €
preço de venda           = 7,50 + 10,13 ≈ 17,60 €
```

⚠️ **Margem ≠ markup — cuidado com a confusão clássica:**
aplicar 25% **sobre o custo** (markup, é o que o Kably faz) não é o mesmo que
ter 25% de **margem sobre a venda**. Custo 100 € + 25% = 125 €; a margem
sobre a venda é 25 ÷ 125 = **20%**. Quando comparares com conversas de café
("eu meto 30%"), confirma sempre de qual das duas se está a falar.

### Passo 5 — Somar e aplicar IVA

```
subtotal (s/ IVA) = soma dos preços de venda de todos os itens
IVA               = subtotal × taxa
TOTAL             = subtotal + IVA
```

As três situações em Portugal:

| Regime | Quando se aplica |
|---|---|
| **23%** | Regra geral (obra nova, cliente particular) |
| **6%** | Empreitadas de **reabilitação** de imóveis habitacionais (verifica as condições do caso concreto) |
| **Autoliquidação** (0% na fatura) | **Subempreitadas** de construção civil — quando faturas a outro empreiteiro, é ele que liquida o IVA (art. 2.º, n.º 1, al. j) do CIVA). Escreve sempre a menção legal na fatura. |

> O IVA **não é teu**: entra e sai. Nunca o uses para "engordar" nem para dar
> desconto — a tua conta de lucro faz-se sempre sobre o subtotal sem IVA.

### Resumo do fluxo completo

```
medições → artigos (material + horas) → custos → + margens → subtotal → + IVA → TOTAL
```

---

## 4. Custos que os principiantes esquecem (e que comem a margem)

- **Deslocações** — 20 idas à obra × 30 min × 25 €/h = 250 €. Orçamenta-as.
- **Tempo de orçamentação** — visitas e medições de obras que não ganhas.
  Está coberto pela taxa horária (as horas não faturáveis), se a calculaste bem.
- **Pequeno material** — bucha, fita, abraçadeiras, ligadores. 2–4% do material.
- **Roços e ajudas de construção civil** — quem abre? quem fecha? Se és tu,
  cobra; se não és, **escreve nas exclusões**.
- **Certificação e papelada** — taxa da entidade certificadora + o teu tempo.
- **Garantia** — voltar lá daqui a 6 meses porque um diferencial dispara.
  É para isto que serve parte da margem.
- **Prazo de recebimento** — se o cliente paga a 60 dias, tu financias a obra.
  Por isso se pede **adiantamento** (ver condições, abaixo).

---

## 5. Sanity checks — como saber se o orçamento "está bom"

Antes de enviar, testa os números contra a realidade:

1. **Lucro por dia de trabalho.** Estima os dias de obra (total de horas ÷ 8).
   Divide a margem total pelos dias. Se uma obra de 10 dias te deixa 300 € de
   margem, são 30 €/dia de lucro — qualquer imprevisto torna-a deficitária.
2. **Preço por ponto.** Divide o total (s/ IVA) pelo n.º de pontos elétricos.
   Em Portugal, um ponto em remodelação anda tipicamente na ordem de
   **25–45 €** (varia muito com região e acabamentos). Muito abaixo: estás
   barato. Muito acima: confirma se o cliente percebe o valor extra.
3. **Rácio material/MO.** Numa instalação típica, material e mão de obra
   andam perto de 50/50 (±15%). Um desvio grande pode indicar esquecimento
   de horas ou de material.
4. **Comparação com obras anteriores.** O melhor indicador — por isso vale a
   pena guardar o histórico no Kably e, no fim de cada obra, comparar horas
   reais vs orçamentadas. É assim que as estimativas afinam.

---

## 6. Estratégia de margem (não é só matemática)

- **Obras pequenas → margens maiores.** Uma obra de 300 € tem os mesmos
  custos fixos de arranque (deslocação, orçamento, compras) que uma de
  3.000 €. Define um **valor mínimo de intervenção** (ex.: 80–120 €).
- **Não dês descontos — corta âmbito.** "Consigo baixar 400 € se a
  iluminação decorativa ficar de fora" preserva a tua margem por hora;
  "faço por menos 400 €" destrói-a.
- **Cliente que repete merece preço, não prejuízo.** Para construtoras
  habituais podes apertar a margem do material (compras em volume), mas
  nunca a da mão de obra.
- **Quem compra só pelo preço, abandona-te pelo preço.** Compete por
  confiança: orçamento detalhado e profissional (é para isso que serve o PDF
  do Kably), prazos cumpridos, obra limpa.

---

## 7. As condições escritas (a tua proteção)

Todo o orçamento deve dizer, por escrito:

- **Validade** (ex.: 30 dias) — o preço do cobre muda; protege-te.
- **Condições de pagamento** — ex.: 40% na adjudicação / 40% durante a obra /
  20% na conclusão. O adiantamento financia o material.
- **Exclusões** — construção civil, pinturas, licenças, luminárias decorativas
  (se aplicável). O que não está escrito, o cliente assume que está incluído.
- **Trabalhos a mais** — alterações ao pedido são orçamentadas à parte, por
  escrito, antes de executadas.

---

## 8. Como isto se faz no Kably

| Conceito deste guia | Onde está no Kably |
|---|---|
| Taxa horária | **Definições** → Mão de obra (€/hora) |
| Margens material / MO | **Definições** (defeito) e em cada orçamento |
| Artigos com material + horas | **Artigos** — base editável com ~75 artigos de referência |
| Capítulos | Criados automaticamente em cada novo orçamento |
| Regime de IVA | Escolhido ao criar o orçamento (23% / 6% / autoliquidação) |
| Condições e validade | **Definições** → Condições (saem no PDF) |
| Ver custos e lucro | Painel **Resumo** do editor + **PDF Interno** |
| Preço para o cliente | **PDF Cliente** (sem custos nem margens) |

O Kably aplica exatamente a fórmula do Passo 4 a cada item:
`preço = material×qtd×(1+margem mat.) + horas×taxa×qtd×(1+margem MO)`.

---

## 9. Mini-glossário

- **Custo direto** — o que consegues atribuir a uma obra concreta (material, horas nela).
- **Custo indireto / fixo** — o que existe mesmo sem obras (carrinha, seguros, telemóvel).
- **Markup** — percentagem somada **ao custo** para obter o preço.
- **Margem (sobre a venda)** — percentagem do **preço final** que é ganho.
- **vg (valor global)** — preço fechado por um trabalho completo, sem unidades.
- **Auto de medição** — registo do trabalho executado num período, base da faturação por fases (relevante em obras longas).
- **Trabalhos a mais** — trabalhos fora do âmbito orçamentado; sempre por escrito.

---

*Documento de apoio do Kably — revê os números do teu caso (taxa horária e
margens) pelo menos uma vez por ano, ou sempre que os custos mudem.*
