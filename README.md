# ⚡ Kably — Orçamentos de Obras de Eletricidade

Plataforma web para criar orçamentos profissionais de instalações elétricas
(residencial, comercial/industrial, ITED, fotovoltaico, mobilidade elétrica).
Uso interno, preparada para evolução futura para produto multi-empresa.

## Funcionalidades

- **Orçamentos por capítulos e artigos** — estrutura típica de eletricidade
  pré-carregada (quadros, tubagem, aparelhagem, ITED, terras…), editável.
- **Base de artigos PT** — ~75 artigos com preços de referência (custo de
  material + horas de mão de obra por unidade), pesquisável e editável.
- **Margens separadas** para material e mão de obra, ajustáveis por orçamento.
- **IVA**: 23%, 6% (reabilitação) e autoliquidação (subempreitadas, art. 2.º
  n.º 1 al. j) do CIVA).
- **PDF com logotipo** em duas versões:
  - *Cliente* — só preços finais;
  - *Interna* — custos, mão de obra e margem visíveis.
- **Responsiva** — funciona no browser do PC e do telemóvel.
- **Importação de MQT (Excel)** — carrega o mapa de quantidades, mapeia as
  colunas, o Kably sugere artigos por semelhança de texto e cria o orçamento.
  As associações confirmadas ficam memorizadas para os próximos MQT.

## Stack

- Next.js 16 (App Router, React Server Components + Server Actions)
- SQLite via `node:sqlite` (embutido no Node ≥ 22 — sem dependências nativas,
  compatível com Windows ARM64)
- `@react-pdf/renderer` para geração de PDF no servidor
- Tailwind CSS 4

## Correr

```bash
npm install
npm run dev    # desenvolvimento — http://localhost:3000
npm run build && npm start   # produção
```

A base de dados é criada e pré-carregada automaticamente no primeiro arranque,
em `data/kably.db` (fora do git).

`node scripts/sample-budget.js` cria um orçamento de exemplo para testes.

## Acesso fora de casa (túnel Cloudflare)

```powershell
powershell -ExecutionPolicy Bypass -File scripts\iniciar.ps1
```

O script arranca o servidor (se necessário) e abre um túnel Cloudflare gratuito,
mostrando o endereço público (`https://….trycloudflare.com`) para abrir no
telemóvel. **O endereço muda a cada arranque do túnel** — para um endereço fixo
é preciso um domínio próprio na Cloudflare ou alojamento pago (Railway/Fly.io).

A app fica protegida por palavra-passe: define `KABLY_PASSWORD` no `.env.local`
(vê `.env.example`). Sem esta variável não há autenticação — nunca exponhas a
app à internet sem ela. A sessão dura 1 ano por browser (cookie).

## Estrutura

| Caminho | Responsabilidade |
|---|---|
| `src/lib/db.ts` | Schema SQLite, seed e todas as queries |
| `src/lib/calc.ts` | Cálculo de preços, margens, IVA e totais |
| `src/lib/seed-data.ts` | Base de artigos PT + capítulos por defeito |
| `src/lib/pdf.tsx` | Documento PDF (versões interna e cliente) |
| `src/app/actions.ts` | Server actions (todas as mutações) |
| `src/app/orcamentos/` | Lista, criação, editor e PDF de orçamentos |
| `src/app/artigos/` | Gestão da base de artigos |
| `src/app/definicoes/` | Dados da empresa, logotipo, margens por defeito |

## Modelo de cálculo

Por item: `preço = material×qtd×(1+margem_mat) + horas×€/h×qtd×(1+margem_MO)`.
Os valores de material/horas são copiados do artigo ao adicionar (snapshot) —
alterar um artigo na base não muda orçamentos existentes.

## Próximos passos (fora do MVP)

- Levantamento de medições em obra (modo mobile dedicado)
- Envio por email/WhatsApp a partir da plataforma
- Importação de tabelas de preços de fornecedores (Excel/CSV)
- Multi-empresa + contas de utilizador (quando passar a produto)
