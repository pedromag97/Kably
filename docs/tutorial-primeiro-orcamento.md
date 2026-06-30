# Tutorial: o teu primeiro orçamento no Kably (passo a passo)

Este guia leva-te do início ao fim a fazer um orçamento **dentro da aplicação**,
clique a clique. É prático — para a teoria (margens, IVA, como pensar os preços),
vê o [Guia de Orçamentação](guia-orcamentacao.md).

> **Antes de começar:** abre o Kably e entra com a tua conta. Cais no **Painel**.
> A barra de menu em cima tem: Painel · Orçamentos · Obras · Clientes · Artigos ·
> Fornecedores · Custos · Equipa · Definições. No telemóvel, é o botão ☰.

---

## Resumo rápido (o caminho todo numa olhada)

1. **Preparar** (só na 1.ª vez): Definições da empresa → Custos (taxa horária) → Artigos.
2. **Criar**: Orçamentos → **+ Novo orçamento** → dados do cliente.
3. **Preencher**: capítulos → adicionar artigos da base / linhas em branco → quantidades.
4. **Afinar**: margens, IVA, validade no painel "Dados do cliente, IVA e margens".
5. **Rever**: o **Resumo** à direita (custo, margem, IVA, total).
6. **Entregar**: menu **Ações** → PDF / Enviar ao cliente.
7. **Depois**: cliente aceita → vira **Obra** → custos reais + faturação por fases.

---

## Passo 0 — Preparar (só precisas de fazer uma vez)

Antes do primeiro orçamento, vale 15 minutos a afinar três coisas. Depois é só
reutilizar.

### 0.1 Dados da empresa — **Definições**
Mete o **nome, NIF, morada, contactos e o logótipo**. Isto aparece no cabeçalho
de todos os PDF. Define também os **valores por defeito** que cada orçamento novo
herda:
- **Margem material (%)** e **Margem mão de obra (%)**
- **Mão de obra (€/hora)** — a tua taxa horária de venda
- **Validade (dias)** e as **Condições** (texto que sai no PDF)
- **Follow-up: dias sem resposta** — ao fim de quantos dias o Painel te avisa para
  ligares a um cliente que ainda não respondeu.

> Não sabes que taxa horária pôr? Não inventes — usa o passo seguinte.

### 0.2 Saber quanto cobrar à hora — **Custos**
A página **Custos** calcula a tua **taxa horária real** a partir dos custos da
empresa (salários, encargos, despesas fixas, dias e horas de trabalho, % de horas
faturáveis). O número que sai é o **mínimo** que tens de cobrar à hora só para
não perderes dinheiro. Leva-o para a "Mão de obra (€/hora)" nas Definições.

> Porque é que a taxa real é muito maior do que o teu ordenado/hora? Porque há
> imensas horas que **não** faturas (orçamentar, comprar material, deslocações,
> férias). A taxa cobre tudo isso. Detalhe no [Guia de Orçamentação](guia-orcamentacao.md).

### 0.3 A base de artigos — **Artigos**
O Kably já vem com ~75 artigos de eletricidade PT (tomadas, cabos, quadros…), cada
um com um **custo de material** e **horas por unidade**. Vê a lista em **Artigos** e
ajusta os preços aos teus fornecedores. Cada artigo é a tua "peça de Lego": num
orçamento, escolhes o artigo e indicas a quantidade — o preço sai feito.

- Para acertar preços de material, usa **Fornecedores** + o botão **Importar
  cotação** (carregas o Excel do fornecedor) ou abre um artigo e vê o **histórico
  de preços** e adota o mais recente.

---

## Passo 1 — Levantamento (o que vais orçamentar)

Antes de tocar no computador, tem à mão **o que vai ser feito, em quantidades**:
quantas tomadas, quantos interruptores, metros de tubo e cabo, o quadro e as
proteções, iluminação, ITED, terras, e os "trabalhos invisíveis" (caixas de
derivação, fixações, pequeno material).

> Erro de principiante: esquecer o invisível. Acrescenta ~10–15% aos metros de
> cabo (não andam em linha reta) e nunca te esqueças das **terras** e do **pequeno
> material**.

---

## Passo 2 — Criar o orçamento

1. Menu **Orçamentos** → botão **+ Novo orçamento**.
2. Preenche:
   - **Título da obra** — ex.: *"Instalação elétrica — Moradia T3, Cascais"*.
   - **Cliente** — se já tens a ficha, escolhe-a na lista (preenche tudo
     sozinho). Se for novo, escreve o **nome, NIF, email e telefone**: o cliente
     fica **guardado automaticamente** na tua lista de Clientes.
   - **Morada da obra** e **Regime de IVA** (ver Passo 4).
3. **Criar orçamento**. Entras no **editor**, já com os capítulos típicos de
   eletricidade criados.

> **Atalho — já tens o mapa em Excel?** Em vez de "Novo orçamento", usa
> **Orçamentos → Importar MQT**: carregas o ficheiro do cliente e o Kably associa
> cada linha aos teus artigos automaticamente. Saltas grande parte do trabalho.

---

## Passo 3 — Preencher os capítulos e os artigos

No editor, cada **capítulo** (Quadros, Tubagem, Aparelhagem…) é uma caixa. Dentro
de cada um, adicionas linhas:

- **+ Da base de artigos** — abre a pesquisa. Procura o artigo (ex.: "tomada
  schuko"), indica a **quantidade** e clica. A linha entra com o preço já
  calculado.
- **+ Linha em branco** — para algo que não está na base. Escreves a designação,
  unidade, quantidade, custo de material e horas à mão.
- **+ Adicionar capítulo** — se precisares de um capítulo que não existe.

Em cada linha podes ajustar: **Designação, Un, Qtd, Material €/un, MO h/un**. As
colunas **P. Unit.** e **Total** são calculadas automaticamente.

> Renomeia ou apaga capítulos que não uses (o ✕ no cabeçalho do capítulo). Um
> orçamento limpo, só com o que interessa, passa mais confiança.

> **Trabalho só de mão de obra** (o cliente fornece o material)? No painel de
> dados (Passo 4), liga **"Só mão de obra"**. O material deixa de ser faturado e
> podes cobrar uma pequena **taxa de gestão de material** sobre o valor fornecido.

---

## Passo 4 — Afinar margens, IVA e validade

No editor, abre o painel **"Dados do cliente, IVA e margens"** (carrega no título
para expandir). Aqui ajustas, **só para este orçamento**:

- **Margem material (%)** e **Margem mão de obra (%)** — quanto acrescentas ao
  custo. (Os valores por defeito vêm das Definições.)
- **Mão de obra (€/hora)** e **Validade (dias)**.
- **Regime de IVA**:
  - **IVA 23%** — normal.
  - **IVA 6%** — reabilitação de imóvel de habitação (condições específicas).
  - **Autoliquidação** — serviços de construção a sujeito passivo de IVA (o IVA é
    entregue pelo cliente; sai a nota legal no PDF).
- **Notas** — texto livre que aparece no PDF (exclusões, pressupostos).

Clica **Guardar dados**.

> Margem ≠ lucro. Uma margem de 25% sobre o custo **não** são 25% de lucro depois
> de tudo pago. Se tens dúvidas, lê a secção de margens no
> [Guia de Orçamentação](guia-orcamentacao.md).

---

## Passo 5 — Rever o Resumo

À direita (ou em baixo, no telemóvel) tens o **Resumo** sempre atualizado:

- **Custo material** e **Custo mão de obra** (com as horas totais)
- **Custo total** e **Margem (lucro)** — o que sobra para ti
- **Subtotal s/ IVA**, **IVA**, e o **Total** que o cliente paga

Confere duas coisas:
1. A **margem** faz sentido? (Não está negativa nem ridiculamente baixa.)
2. As **horas totais** batem certo com o tempo que a obra te vai mesmo levar?

> Vê o orçamento com olhos de quem vai **executar**: se as horas estão curtas, o
> preço está curto — e quem paga a diferença és tu.

---

## Passo 6 — Entregar ao cliente

No canto superior do editor, o botão **Ações** abre o menu:

- **PDF para cliente** — versão limpa, só com designações e preços. É o que
  envias.
- **PDF interno (com custos)** — versão só para ti, com custos e margens. **Nunca
  envies esta ao cliente.**
- **Enviar ao cliente** — abre uma janela para:
  - **Email** (com o PDF em anexo e um link) — o cliente abre o link e pode
    **Aceitar** ou **Recusar**; és avisado da decisão.
  - **WhatsApp** ou **Copiar link** — para partilhares como preferires.

Assim que envias, o orçamento passa a **Enviado** e o Painel começa a contar os
dias para o follow-up.

> **Nota:** o envio de email a clientes precisa de um domínio verificado (passo de
> lançamento ainda por fazer). Até lá, usa o **WhatsApp / copiar link**, ou o PDF
> que descarregas e anexas tu.

---

## Passo 7 — Depois de enviado

- **Sem resposta?** O **Painel** mostra a lista *"A precisar de follow-up"* com os
  orçamentos enviados há mais de X dias. Liga ao cliente.
- **Cliente pediu alterações?** No menu **Ações → Nova revisão**: cria uma cópia
  ligada ao original, numerada *(Rev.1)*, que ajustas sem perder o orçamento
  inicial.
- **Cliente aceitou?** Se aceitou pelo link, fica logo **Aceite**. Se te disse por
  telefone, abre o orçamento e em **Ações → Marcar como aceite**. O orçamento
  passa a ser uma **Obra**.

---

## Passo 8 — Da obra ao recebimento (acompanhar a execução)

No menu **Obras** estão os orçamentos aceites. Abre a obra para:

- **Orçado vs. real** — vais lançando no **diário de custos** o que gastas mesmo
  (material em €, horas de mão de obra, outros). O Kably compara com o que
  orçaste e mostra a **margem real** que estás a fazer. É aqui que descobres se a
  obra correu bem ou mal — e aprendes para o próximo orçamento.
- **Faturação por fases** — define como faturas (ex.: **30 / 40 / 30** num clique,
  ou valores fixos). Marca cada fase como **Faturado** e depois **Pago**, e tens
  sempre o **por receber** à vista. Cada fase gera um **PDF de auto de medição**
  para dares ao cliente/contabilista.

O **Painel** junta tudo no bloco **"Tesouraria das obras"**: quanto tens por
receber, por faturar e já recebido.

---

## Lista de verificação (antes de enviar)

- [ ] Todos os trabalhos estão lá? (terras, pequeno material, deslocações)
- [ ] As **quantidades** estão certas?
- [ ] O **IVA** é o correto para esta obra?
- [ ] A **margem** no Resumo é positiva e saudável?
- [ ] As **horas totais** são realistas?
- [ ] Revi o **PDF para cliente** (sem custos à vista, com o meu logótipo)?
- [ ] As **condições/exclusões** estão claras nas Notas?

---

## Dúvidas frequentes

**Posso reaproveitar um orçamento parecido?**
Sim — na lista de Orçamentos, o botão **⧉ (Duplicar)** cria uma cópia em rascunho.
Muda o cliente e os números e poupas tempo.

**Mudei o preço de um material. Atualiza os orçamentos antigos?**
Não — cada orçamento guarda os preços do momento em que foi feito (assim não muda
o que já enviaste). Atualizas a base em **Artigos** para os **próximos**.

**Onde vejo se estou a ganhar dinheiro?**
No orçamento, a linha **Margem** do Resumo (previsão). Na realidade, na **Obra**,
o **orçado vs. real**.

---

*Bom trabalho. O primeiro orçamento custa; a partir do segundo, com a base de
artigos afinada, fazes um em minutos.*
