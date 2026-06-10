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
- **SQLite via `node:sqlite`** (módulo embutido do Node ≥ 24) — decisão
  deliberada: o portátil original é **Windows ARM64** e o Prisma não tem
  binário compatível; `node:sqlite` não tem dependências nativas. Não migrar
  para Prisma/better-sqlite3 sem motivo forte.
- **@react-pdf/renderer** para PDFs no servidor (está em
  `serverExternalPackages` no next.config.ts).
- BD criada e pré-carregada automaticamente no primeiro arranque em
  `data/kably.db` (gitignored). Sem migrações formais — schema em
  `src/lib/db.ts` (CREATE TABLE IF NOT EXISTS).

## Mapa do código

| Caminho | Responsabilidade |
|---|---|
| `src/lib/db.ts` | Schema SQLite, seed, todas as queries (normalizar linhas com `plain()` — node:sqlite devolve objetos com protótipo nulo que o RSC rejeita) |
| `src/lib/calc.ts` | Fórmula de preços: `preço = mat×qtd×(1+margem_mat) + horas×€/h×qtd×(1+margem_MO)`; IVA; formatação pt-PT |
| `src/lib/seed-data.ts` | ~75 artigos PT de referência + capítulos por defeito |
| `src/lib/pdf.tsx` | PDF (versão **interna** com custos/margem, versão **cliente** só preços). Não usar Intl no PDF (espaços U+202F quebram WinAnsi) |
| `src/lib/auth.ts` + `src/proxy.ts` | Autenticação por palavra-passe (cookie 1 ano). Ativa quando `KABLY_PASSWORD` está definida no `.env.local` |
| `src/app/actions.ts` | Todas as server actions |
| `src/app/orcamentos/` | Lista, novo, editor (`src/components/BudgetEditor.tsx`), PDF (route handler) |
| `src/app/artigos/`, `src/app/definicoes/` | Gestão de artigos; dados da empresa + logotipo (base64 na BD) |
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
