<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# KABLY — Contexto do Projeto

Plataforma web de orçamentação de obras de eletricidade, em português (PT-PT).
Dono: Pedro (pedromag97 no GitHub). Conversa e textos da UI sempre em PT-PT;
identificadores de código em inglês.

## Visão e decisões tomadas

- **Fase atual: uso interno** (uma só empresa). No futuro pode evoluir para
  produto SaaS multi-empresa com plano freemium — o modelo de dados já tem
  `companyId` em tudo por essa razão. Não adicionar contas/pagamentos agora.
- O Pedro está a **começar na orçamentação** (não é especialista) — a
  plataforma e os docs devem guiá-lo. Explicações didáticas são bem-vindas.
- Tipos de obra alvo: residencial, comercial/industrial, ITED, fotovoltaico,
  carregadores EV.
- Orçamentação **por artigos detalhados** organizados em capítulos;
  margens separadas **material vs mão de obra**; IVA 23% / 6% (reabilitação) /
  autoliquidação (art. 2.º n.º 1 al. j) CIVA).
- Web responsiva (PC + telemóvel via browser). Sem app nativa.

## Stack (e porquê)

- **Next.js 16** (App Router, Server Actions) + Tailwind 4 + TypeScript
- **Camada de dados com dois drivers, mesma API** (`src/lib/db.ts`, assíncrona):
  - **Local** (incl. Windows ARM64): adaptador sobre `node:sqlite` em
    `data/kably.db`. Sem binários nativos (o Prisma e o `@libsql/client` nativo
    NÃO têm binário ARM64 — por isso esta escolha).
  - **Produção (Turso)**: cliente web libSQL puro-JS (`@libsql/client/web`,
    via HTTP). Ativado definindo `DATABASE_URL=libsql://…` + `DATABASE_AUTH_TOKEN`.
  - O adaptador expõe só `execute/batch/executeMultiple`. Deletes em cascata
    são **explícitos** (batch) para o comportamento ser idêntico local e remoto.
- **@react-pdf/renderer** para PDFs no servidor (está em
  `serverExternalPackages` no next.config.ts).
- BD criada e pré-carregada (seed) automaticamente no primeiro arranque. Sem
  migrações formais — schema + `migrate()` (ALTER if missing) em `src/lib/db.ts`.

## Produção (Fases 1, 2 e 3 concluídas)

- **Online em https://kably-production.up.railway.app** (Railway, deploy
  automático a cada push para `master`). Endereço fixo, sem depender de PC local.
- **Base de dados: Turso** (libSQL). Variáveis no Railway: `DATABASE_URL`,
  `DATABASE_AUTH_TOKEN`. Sem `DATABASE_URL` → cai no ficheiro local.
- `scripts/migrar-para-turso.mjs` fez a migração inicial (lê `.env.local`).
- **Autenticação (Fase 2):** contas por utilizador (email + bcrypt), sessões na
  BD (tabela `sessions`, cookie `kably_session` httpOnly, 30 dias). 1.ª conta
  via `/setup` (só quando `users` vazia). Papéis `owner`/`member`: Custos e
  Equipa são owner-only (gate em `requireOwner`). `KABLY_PASSWORD` **já não é
  usada** (pode ser removida do Railway).
- O túnel Cloudflare (`scripts/iniciar.ps1`) deixou de ser necessário.
- **Multi-empresa (Fase 3):** TODAS as queries de dados recebem `companyId`
  (da sessão) e estão escopadas; mutações de capítulos/itens escopadas por
  `budgetId` + guarda `budgetBelongsTo`. `/registo` cria empresa nova + base de
  artigos + dono; `/login` é a entrada (link Criar conta); `/setup` só reclama a
  empresa legada quando `users` está vazia. **Isolamento testado A vs B.**
  - Empresa do Pedro: id 1, "Lousacabo…", dono `pedromag997@gmail.com` (com BOSCH).
- **Landing pública (Fase 4):** `/` é a página de marketing (hero, funcionalidades,
  preços dos planos Grátis/Pro 14,90€/Equipas 29,90€) — quem tem sessão é
  reencaminhado para `/orcamentos`. A app vive em `/orcamentos` (a lista mudou de
  `/`). Planos são só informativos (beta tudo desbloqueado); pagamentos a definir.
- **Email (Fase 5):** `src/lib/email.ts` envia via Resend; **sem `RESEND_API_KEY`
  regista na consola (não entrega)**. Recuperação de password (`/recuperar`,
  `/repor`, tabela `password_resets`). Envio de orçamento (modal no editor):
  email com PDF anexado + link, WhatsApp, copiar link. Vista pública
  `/p/[token]` (preços cliente) + `/p/[token]/pdf`; cliente aceita/recusa →
  notifica o dono. Estado em `budgets.status` (DRAFT/SENT/ACCEPTED/REJECTED).
  - **Falta para entrega real:** `RESEND_API_KEY` no Railway; e domínio verificado
    (`EMAIL_FROM`) para enviar a clientes (sem isso, Resend só envia para o dono).
- **Fase 6 (pré-lançamento):** convites de equipa por email (`/convite/[token]`,
  membro define a própria password); legal `/privacidade` + `/termos` (RGPD, com
  `[campos]` por preencher) + rodapé; exportar dados (`/definicoes/exportar`, JSON)
  e apagar empresa (zona de perigo, `deleteCompany` cascata); rate-limiting
  (`src/lib/rate-limit.ts`) no login/recuperação; monitorização
  (`src/instrumentation.ts` → `src/lib/monitoring.ts`, Sentry via `SENTRY_DSN`).
- **Falta para lançamento real:** preencher os `[campos]` legais; `RESEND_API_KEY`
  (entrega de emails) + domínio verificado (`EMAIL_FROM`); opcional `SENTRY_DSN`;
  e, quando quiser cobrar, faturação (Stripe) — a base (planos na landing) está pronta.
- **Preços de fornecedores (módulo):** tabelas `suppliers` + `price_entries`
  (`price_entries` guarda `supplierName` desnormalizado para o histórico sobreviver
  à remoção do fornecedor — FK `ON DELETE SET NULL`). `/fornecedores` gere a lista
  do Pedro (Rexel, Sonepar, CEF…). Cada artigo tem página de detalhe `/artigos/[id]`:
  comparação entre fornecedores (mais barato destacado + botão **Adotar preço** →
  grava em `materialCost` via `setArticleCost`), histórico datado + mini-gráfico
  SVG (sparkline), e entrada manual de cotação. Upload de cotação Excel em
  `/artigos/cotacao` (assistente 3 passos: fornecedor+data+ficheiro → mapa de
  colunas/revisão com auto-matching pela engine `matching.ts` → cria/associa
  artigos e regista preços). Tudo escopado por `companyId`.
- **Clientes + Painel (gestão de negócio):** tabela `clients` (geridos em
  `/clientes`, com import Excel/CSV e ficha `/clientes/[id]` com orçamentos,
  totais ganho/pendente/conversão e notas). Orçamentos ganham `clientId` mas
  **mantêm a cópia** dos dados do cliente (editar no orçamento não mexe na
  ficha). Ao criar um orçamento, o cliente é auto-guardado e deduplicado por
  **NIF→nome** (`findClientByNifOrName`). **Duplicar orçamento** (botão na lista
  → `duplicateBudget`, cópia em rascunho). **Migração** `/clientes/migrar`: cria
  fichas a partir de clientes escritos em orçamentos antigos (ecrã de revisão,
  reaproveita fichas existentes). **`/painel`** é o destino pós-login: contagens
  por estado + conversão, valores (pipeline/ganho/médio), lista de **follow-up**
  (enviados sem resposta há > `companies.followUpDays` dias, configurável nas
  Definições) e **validade expirada**, com selector mês/trimestre/ano/tudo.
- **Seletor de cliente no editor + revisões (Fase 7):** o editor de orçamento
  tem agora seletor de ficha de cliente (preenche os campos + religa `clientId`;
  `updateBudgetMetaAction` deduplica por NIF→nome como na criação). **Revisões**:
  `budgets.revisionOf` aponta para o orçamento base; "Nova revisão" (menu Ações)
  cria cópia em rascunho numerada `BASE (Rev.N)` ligada à raiz, com crachá
  "Revisão de …" no editor. Duplicar (cópia solta) e Revisão (versão ligada) são
  ações distintas.

## Mapa do código

| Caminho | Responsabilidade |
|---|---|
| `src/lib/db.ts` | Camada de dados **assíncrona** (libSQL). Dois drivers/mesma API: `node:sqlite` local (`await import` dinâmico) + cliente web Turso. Schema, seed, `migrate()`, queries de tudo (inc. `users`/`sessions`). Deletes em cascata explícitos. |
| `src/lib/session.ts` | Auth por sessão: bcrypt, `startSession`/`getCurrentUser`/`requireUser`/`requireOwner`/`endSession`. Usado em páginas/ações (Node), NÃO no proxy (edge). |
| `src/lib/calc.ts` | Fórmula de preços: `preço = mat×qtd×(1+margem_mat) + horas×€/h×qtd×(1+margem_MO)`; IVA; formatação pt-PT |
| `src/lib/seed-data.ts` | ~75 artigos PT de referência + capítulos por defeito |
| `src/lib/pdf.tsx` | PDF (versão **interna** com custos/margem, versão **cliente** só preços). Não usar Intl no PDF (espaços U+202F quebram WinAnsi) |
| `src/proxy.ts` | Gate grosseiro no edge: redireciona para `/login` se não houver cookie `kably_session` (validação real é server-side em `requireUser`) |
| `src/app/setup/`, `src/app/login/`, `src/app/equipa/` | Criar 1.º dono; login email+password; gestão de equipa (owner-only) |
| `src/app/actions.ts` | Todas as server actions |
| `src/app/page.tsx` | Landing pública (marketing + preços). `/orcamentos` redireciona p/ cá se houver sessão? não — landing redireciona logados p/ `/orcamentos` |
| `src/app/orcamentos/` | `page.tsx` = lista; `novo`, `[id]` editor (`BudgetEditor.tsx`), `importar`, `[id]/pdf` |
| `src/app/artigos/`, `src/app/definicoes/` | Gestão de artigos; dados da empresa + logotipo (base64 na BD) |
| `src/app/fornecedores/` + `SuppliersManager.tsx` | Lista de fornecedores (CRUD simples) |
| `src/app/artigos/[id]/` + `ArticleDetail.tsx` | Detalhe do artigo: comparar fornecedores, adotar preço, histórico + sparkline, cotação manual |
| `src/app/artigos/cotacao/` + `QuoteImporter.tsx` | Importar cotação de fornecedor (Excel → matching → `price_entries`) |
| `src/app/painel/` | Destino pós-login: indicadores, conversão, follow-up, validade expirada (selector de período) |
| `src/app/clientes/` + `ClientsManager.tsx`/`ClientImporter.tsx` | Lista de clientes (CRUD + import Excel/CSV) |
| `src/app/clientes/[id]/` + `ClientDetail.tsx` | Ficha do cliente: orçamentos, totais, notas, novo orçamento |
| `src/app/clientes/migrar/` + `ClientMigration.tsx` | Migração: cria fichas a partir de orçamentos antigos (dedup) |
| `src/components/NewBudgetForm.tsx` | Form de novo orçamento com selecção/auto-guardar de cliente |
| `src/lib/matching.ts` | Importação MQT: normalização PT, pontuação de semelhança, adivinha de colunas, mapa categoria→capítulo |
| `src/components/MqtImporter.tsx` + `src/app/orcamentos/importar/` | Assistente de importação de MQT em 3 passos (ficheiro/colunas → associação com revisão → criar). Aliases memorizados em `mqt_aliases` |
| `scripts/iniciar.ps1` | Arranca servidor + túnel Cloudflare e mostra URL pública |
| `scripts/sample-budget.js` | Cria orçamento de exemplo na BD |
| `docs/guia-orcamentacao.md` | Guia didático: conceitos + matemática das margens |
| `docs/tempos-mao-de-obra.md` | Tabela de rendimentos (h/unidade) + método de calibração |

## Como correr

```bash
npm install
npm run dev          # ou: npm run build && npm start  (porta 3000)
```

Acesso fora de casa: `powershell -ExecutionPolicy Bypass -File scripts\iniciar.ps1`
(usa Cloudflare Tunnel gratuito — URL muda a cada arranque; cloudflared
instala-se com `winget install Cloudflare.cloudflared`).

## Dados locais que NÃO estão no git

- `data/kably.db` — a base de dados (orçamentos, artigos editados, empresa).
  Para continuar noutro PC **com os mesmos dados**, copiar este ficheiro
  manualmente. Sem ele, a app arranca limpa com o seed.
- `.env.local` — contém `KABLY_PASSWORD` (palavra-passe de acesso à app).
  Criar a partir de `.env.example`.

## Estado atual (junho 2026)

MVP completo e funcional, testado de ponta a ponta (build limpo, PDFs
verificados visualmente, cálculos conferidos, túnel testado). No PC original
há um orçamento de exemplo (ORC-2026-001, remodelação T2) na BD local.

## Próximos passos combinados

1. **Imediato:** o Pedro vai enviar exemplos reais de orçamentos de obras
   (PDF/Excel/foto). Objetivo: calibrar a base de artigos (preços de material,
   horas por unidade), ajustar capítulos por defeito, copiar estilo de
   condições/exclusões, e possivelmente recriar esses orçamentos no Kably.
   Técnica útil: engenharia inversa dos tempos implícitos (preço ÷ taxa horária).
2. **Fase 2 (por ordem de interesse):** levantamento de medições em obra no
   telemóvel; envio por email/WhatsApp; importação de tabelas de preços de
   fornecedores (Excel/CSV).
3. **Fase 3 (futuro):** multi-empresa + contas + freemium (transformar em
   produto para venda a outros eletricistas).
4. **Alojamento:** se o túnel se tornar incómodo, migrar para Railway (~5 €/mês)
   ou domínio próprio + Cloudflare. O Pedro escolheu túnel grátis por agora.
