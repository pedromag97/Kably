# Exemplo trabalhado: Iluminação de segurança (só mão de obra)

**Caso real:** CNT MaiaShopping · Iluminação de Segurança — cliente ILUMinho
**Regime:** subempreitada, **material fornecido pelo cliente**, **IVA autoliquidação**

Este documento não é sobre a aplicação — é sobre **como se pensa um orçamento
destes**. Os números são pressupostos meus, para teres algo concreto para
corrigir. O que interessa é o **método**.

---

## 1. A regra que manda neste orçamento

Em modo **só mão de obra**, o material não entra no preço. Logo:

> **Preço = Horas × Taxa horária × (1 + margem)**

Só há **duas** variáveis. Se erras as horas, erras o preço. Se erras a taxa,
erras o preço. Não há mais nada onde te esconderes — e é por isso que este tipo
de orçamento é o mais perigoso para quem está a começar.

---

## 2. Como estimar horas (três métodos, do pior para o melhor)

**a) Rendimento unitário de tabela** — usar um valor de referência (h/unidade).
Bom para arrancar, mau para confiar. É o que está na base de artigos do Kably.

**b) Engenharia inversa** — pegar numa obra passada que correu bem, dividir as
horas reais pelas unidades instaladas. *Este é o bom.* Se instalaste 60 blocos em
2 dias de 8 h a dois homens: 32 h ÷ 60 = **0,53 h/bloco**, tudo incluído.

**c) Cronometragem** — medir uma unidade em obra real e multiplicar. O mais exato,
mas só o tens depois de já andares a fazer.

> **É por isto que existe o "Orçado vs. Real" nas Obras.** Cada obra que
> acompanhas transforma o método (a) no método (b) para a próxima. Ao fim de
> três obras, deixas de adivinhar.

### O erro clássico

Cronometras a montagem de um bloco — 12 minutos — e orçamentas 0,2 h/un.
**Errado.** Esqueceste: ir buscar material, montar/mover a escada ou plataforma,
o ensaio, a etiqueta, o registo, a limpeza, a pausa. O valor que interessa é
**horas totais da obra ÷ unidades instaladas**, não o cronómetro de uma unidade
em condições ideais.

---

## 3. Pressupostos assumidos (corrige-os)

| | Valor assumido |
|---|---|
| Blocos autónomos de emergência | **180** |
| Blocos de sinalização / pictogramas | **40** |
| Dos quais em zona alta (~6 m, galeria) | **30** |
| Altura corrente | teto falso, ~3,2 m |
| Alimentação | já existe circuito próximo (só derivação/ligação) |
| Horário | **fora de horas** (após encerramento) |
| Plataforma elevatória | fornecida pela ILUMinho |

---

## 4. As linhas do orçamento

### 4.1 Trabalho unitário

| Trabalho | Qtd | h/un | Horas | Porquê este valor |
|---|---:|---:|---:|---|
| Montagem de bloco autónomo (altura corrente) | 150 | 0,45 | 67,5 | Abrir teto falso, fixar, ligar, fechar, teste rápido |
| Montagem de bloco em zona alta | 30 | 0,85 | 25,5 | O tempo é dominado por **posicionar a plataforma**, não pela montagem |
| Montagem de sinalização / pictograma | 40 | 0,35 | 14,0 | Mais simples, sem ligação em alguns casos |
| Ensaio de autonomia + registo | 220 | 0,10 | 22,0 | **Obrigatório.** Cada aparelho tem de ser testado e registado |
| Etiquetagem e identificação | 220 | 0,05 | 11,0 | Pequeno, mas 220 × qualquer coisa dá horas |
| | | **Subtotal** | **140,0 h** | |

### 4.2 O que quase toda a gente esquece (valor global)

| Trabalho | Horas | Porquê |
|---|---:|---|
| Credenciação e formação de acesso à obra | 4 | Quase todos os centros comerciais exigem |
| Coordenação, reuniões e compatibilização | 8 | Obra com outros empreiteiros a trabalhar ao lado |
| Telas finais, registo fotográfico e dossier | 6 | Normalmente exigido pelo dono de obra |
| Deslocações (12 idas × 1,5 h) | 18 | Maia. **Isto é tempo pago a alguém** |
| Limpeza e remoção de resíduos | 4 | Embalagens de 220 aparelhos não desaparecem sozinhas |
| | **40,0 h** | |

### 4.3 Total de horas

```
Trabalho unitário .... 140 h
Trabalhos globais .....  40 h
                       -------
TOTAL ................ 180 h        (~0,8 h por aparelho, tudo incluído)
```

> Repara: os "esquecidos" são **40 h — 22% do trabalho**. É exatamente esta
> fatia que separa um orçamento que dá lucro de um que dá prejuízo.

---

## 5. A taxa horária — onde o dinheiro se ganha ou perde

Tens **20 €/h** configurado. Vê o efeito de mudar só isso, com 180 h e 35 % de margem:

| Taxa de custo | Cálculo | **Preço final** |
|---|---|---:|
| 20 €/h (atual) | 180 × 20 × 1,35 | **4 860 €** |
| 26 €/h (taxa real provável) | 180 × 26 × 1,35 | **6 318 €** |
| 30 €/h (real + trabalho noturno) | 180 × 30 × 1,35 | **7 290 €** |

**A mesma obra, o mesmo trabalho: 2 430 € de diferença.** Não mudou uma única
hora — mudou só a taxa.

Por isso, **antes de orçamentares isto**, vai a **Custos** e calcula a tua taxa
real. E se o trabalho é noturno, isso tem de estar refletido: ou numa taxa mais
alta, ou numa linha própria de "acréscimo por trabalho fora de horas".

---

## 6. A taxa de gestão de material

A ILUMinho fornece ~220 aparelhos. Se cada um vale ~35 €, são **7 700 € de
material** que **tu** vais receber, conferir, armazenar, distribuir pela obra e
responder por ele se faltar.

Isso é trabalho. No Kably, o campo **"Taxa gestão material (%)"** existe
exatamente para isto:

```
7 700 € × 5 % = 385 €
```

Não é obrigatório cobrar — mas se não cobras, estás a fazê-lo de graça. Discute
com o cliente; muitos aceitam sem problema porque lhes poupa logística.

---

## 7. Checklist antes de enviar este orçamento

- [ ] Apaguei a linha de teste (*Cabo XV, 1 m*)
- [ ] Confirmei a taxa horária em **Custos**
- [ ] O trabalho noturno está refletido no preço
- [ ] Ficou claro **por escrito** de quem é a plataforma elevatória
- [ ] Incluí ensaios de autonomia, etiquetagem e telas finais
- [ ] Incluí deslocações
- [ ] Defini nas notas o que **não** está incluído (ex.: alimentação nova,
      alterações ao teto falso, trabalhos de construção civil)
- [ ] Confirmei que a autoliquidação está correta (cliente é sujeito passivo)

---

## 8. O que fazer a seguir (o mais importante)

Quando ganhares esta obra, **regista as horas reais** no diário de custos da Obra.
No fim, o Kably diz-te se as 180 h eram 150 ou 240.

Esse número é o ativo mais valioso que vais construir: a partir da segunda ou
terceira obra deixas de orçamentar por palpite e passas a orçamentar por
histórico. É assim que se aprende a orçamentar — não a ler, a **medir**.
