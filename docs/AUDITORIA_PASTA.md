# Caixinha — Auditoria da Pasta de Trabalho

**Data:** 13 de abril de 2026
**Objetivo:** mapear todos os arquivos do projeto, classificar em 5 categorias e propor plano de reorganização. **Nenhum arquivo foi movido ou apagado nesta auditoria** — só mapeamento.

---

## Resumo Executivo

| Categoria | Arquivos | Tamanho |
|---|---|---|
| 🟢 Ativo | 72 | ~560 KB |
| 🟡 Histórico útil | 2 | ~16 KB |
| 🔵 Duplicado | 1 | ~8 KB |
| 🔴 Morto | 3 | ~285 KB |
| ⚪ Indefinido (requer decisão sua) | 11 | ~45 KB |
| **Total versionável** | **89** | **~910 KB** |
| `.next/` (gitignored, build) | — | 93 MB |
| `node_modules/` (gitignored) | — | 466 MB |
| `.git/` | — | 585 KB |

**Espaço potencialmente liberável no repo versionado:** ~330 KB (morto + tsbuildinfo).
**Espaço liberável em disco local:** 93 MB (`.next` pode ser deletado a qualquer momento, regenera no build).

**Observação crítica:** o projeto tá **relativamente limpo** comparado ao que o prompt previa. Não tem `.gs` do Apps Script, não tem `.txt` de copy-paste, não tem logo roxa antiga, não tem `DIAGNOSTICO_v1.md`, `DIAGNOSTICO_v2.md`. A estrutura Next.js já foi adotada de forma enxuta desde o início. O que existe de sujeira é pontual.

**Observação da Fase 1 (recém-implementada):** o subagente que implementou Frentes 1, 2, 3 reportou **1200+ erros de TypeScript por caracteres Unicode problemáticos** nos arquivos criados. Esses arquivos estão marcados como **⚪ Indefinido** nessa auditoria porque precisam de decisão sua: fixar encoding, reescrever, ou descartar.

---

## Arquivos Críticos (Intocáveis sem confirmação)

Listados primeiro pra não ter dúvida. **Nada aqui pode ser movido, renomeado ou apagado na Fase 2.**

- `.env.local` — variáveis de ambiente reais
- `.git/` — histórico completo do repositório
- `.gitignore`
- `package.json` e `package-lock.json`
- `next.config.js`, `tsconfig.json`, `postcss.config.js`, `tailwind.config.js`
- `vercel.json`
- `next-env.d.ts`
- `public/manifest.json`, `public/sw.js`
- `public/icons/icon-192.png`, `icon-512.png`, `icon.svg` (referenciados no manifest)
- `DIAGNOSTICO_CAIXINHA.md`, `diagnostico.html`, `diagnostic-history.json` (gerados automaticamente a cada commit via husky pre-commit)
- `supabase/schema.sql` e `supabase/migrations/**` (documentação do banco)
- `.github/workflows/**`
- `.husky/**`
- Todo arquivo dentro de `src/app/`, `src/handlers/`, `src/lib/`, `src/types/` que esteja em uso (ver tabela abaixo)
- `scripts/diagnose.js`, `scripts/diagnostic-rules.js`, `scripts/html-template.js`, `scripts/backup.js` (referenciados em `package.json`)

---

## 🟢 Ativo (em uso)

### Código fonte — Core Next.js App

| Caminho | Tamanho | Justificativa |
|---|---|---|
| `src/app/layout.tsx` | 1.7 KB | Root layout do Next.js |
| `src/app/page.tsx` | 48 KB | Dashboard principal |
| `src/app/globals.css` | 1.6 KB | CSS global Tailwind |
| `src/app/sw-register.tsx` | 2.5 KB | Registro do service worker |
| `src/app/config/page.tsx` | 22 KB | Página de configurações |
| `src/app/tabela/page.tsx` | 40 KB | View Tabela (sprint anterior) |
| `src/types/index.ts` | 3.7 KB | Type definitions |

### Código fonte — Libs

| Caminho | Tamanho | Justificativa |
|---|---|---|
| `src/lib/anomaly.ts` | 6.8 KB | Detecção de anomalias (usado em cron) |
| `src/lib/categories.ts` | 6.6 KB | Lógica de categorias |
| `src/lib/formatter.ts` | 949 B | Helpers de formatação |
| `src/lib/interactive.ts` | 3.9 KB | Builders de mensagens interativas WhatsApp |
| `src/lib/messaging/index.ts` | 908 B | Provider selector |
| `src/lib/messaging/meta-provider.ts` | 6.6 KB | Meta Cloud API provider |
| `src/lib/messaging/twilio-provider.ts` | 4.8 KB | Twilio provider (fallback) |
| `src/lib/messaging/types.ts` | 1.8 KB | Types do messaging layer |
| `src/lib/narrative.ts` | 5.4 KB | Motor de narrativa dos relatórios |
| `src/lib/parser.ts` | 21 KB | Parser de mensagens |
| `src/lib/responses.ts` | 6.5 KB | Response engine |
| `src/lib/sheets-sync.ts` | 17 KB | Sync Supabase → Google Sheets |
| `src/lib/supabase.ts` | 408 B | Client Supabase |

### Código fonte — Handlers

| Caminho | Tamanho | Justificativa |
|---|---|---|
| `src/handlers/index.ts` | 8.7 KB | Router principal |
| `src/handlers/button-actions.ts` | 9.8 KB | Handler de botões interativos |
| `src/handlers/category-command.ts` | 3.9 KB | Comandos de categoria |
| `src/handlers/correction.ts` | 3.1 KB | Correções |
| `src/handlers/expense.ts` | 11 KB | Handler de gastos |
| `src/handlers/income.ts` | 1.6 KB | Handler de entradas |
| `src/handlers/pending.ts` | 6.3 KB | Handler de pending actions |
| `src/handlers/query.ts` | 5.5 KB | Handler de queries |
| `src/handlers/undo.ts` | 2.1 KB | Handler de undo |

### Código fonte — API Routes

| Caminho | Tamanho | Justificativa |
|---|---|---|
| `src/app/api/categories/route.ts` | 1.4 KB | CRUD categorias |
| `src/app/api/config/export/route.ts` | 2.6 KB | Export JSON |
| `src/app/api/cron/monthly/route.ts` | 5 KB | Cron mensal |
| `src/app/api/cron/sheets-sync/route.ts` | 1.1 KB | Cron sync sheets |
| `src/app/api/cron/weekly/route.ts` | 4.4 KB | Cron semanal |
| `src/app/api/evolution/route.ts` | 1.1 KB | Endpoint evolução |
| `src/app/api/panorama/route.ts` | 1.1 KB | Endpoint panorama |
| `src/app/api/sheets/sync/route.ts` | 861 B | Sync manual sheets |
| `src/app/api/summary/route.ts` | 2.4 KB | Endpoint summary |
| `src/app/api/transactions/[id]/route.ts` | 5.6 KB | CRUD transação individual |
| `src/app/api/transactions/add/route.ts` | 3 KB | Adicionar transação manual |
| `src/app/api/transactions/all/route.ts` | 1.3 KB | Listar todas |
| `src/app/api/transactions/batch/route.ts` | 2.7 KB | Batch ops |
| `src/app/api/transactions/route.ts` | 1.1 KB | CRUD transações |
| `src/app/api/webhook/meta/route.ts` | 3.4 KB | Webhook Meta Cloud |
| `src/app/api/webhook/route.ts` | 2.6 KB | Webhook Twilio |

### Scripts

| Caminho | Tamanho | Justificativa |
|---|---|---|
| `scripts/diagnose.js` | 14 KB | Gera diagnóstico (referenciado em `package.json` e husky) |
| `scripts/diagnostic-rules.js` | 42 KB | Regras do diagnóstico |
| `scripts/html-template.js` | 12 KB | Template do `diagnostico.html` |
| `scripts/backup.js` | 2.8 KB | Script de backup |

### Configs e infra

| Caminho | Tamanho | Justificativa |
|---|---|---|
| `.env.local.example` | 1 KB | Template de env |
| `.gitignore` | 91 B | — |
| `.github/workflows/auto-diagnose.yml` | 1.1 KB | GitHub Action |
| `.github/workflows/ci.yml` | 612 B | GitHub Action |
| `.husky/pre-commit` | — | Git hook pre-commit |
| `next.config.js`, `next-env.d.ts` | — | Next config |
| `package.json`, `package-lock.json` | — | — |
| `postcss.config.js`, `tailwind.config.js` | — | — |
| `tsconfig.json` | 566 B | TS config |
| `vercel.json` | 443 B | Vercel config (crons) |

### Documentação (ativa)

| Caminho | Tamanho | Justificativa |
|---|---|---|
| `README.md` | 5.1 KB | Overview do projeto |
| `DIAGNOSTICO_CAIXINHA.md` | 5.3 KB | Gerado automaticamente |
| `diagnostico.html` | 16 KB | Gerado automaticamente |
| `diagnostic-history.json` | 4.8 KB | Histórico de evolução, lido pelo diagnose.js |
| `BENCHMARKS.md` | 6.1 KB | Criado hoje, referência do racional de features |
| `DESIGN_REFERENCE.md` | 4.9 KB | Paleta, tipografia, referência visual |
| `BACKUP_STRATEGY.md` | 1.9 KB | Estratégia de backup |
| `INSTALL_IOS.md` | 564 B | Instruções de install PWA no iOS |

### Supabase

| Caminho | Tamanho | Justificativa |
|---|---|---|
| `supabase/schema.sql` | 6.6 KB | Schema completo |
| `supabase/migrations/20260413_credit_cards_invoices.sql` | 4.8 KB | Migration recente (aguarda execução) |
| `supabase/migrations/.gitkeep` | 0 | Manter pasta versionada |

### Public

| Caminho | Tamanho | Justificativa |
|---|---|---|
| `public/manifest.json` | 598 B | PWA manifest |
| `public/sw.js` | 3.1 KB | Service worker |
| `public/icons/icon-192.png` | 2.5 KB | Referenciado no manifest |
| `public/icons/icon-512.png` | 7 KB | Referenciado no manifest |
| `public/icons/icon.svg` | 352 B | Source vetorial |

---

## 🟡 Histórico útil

| Caminho | Tamanho | Justificativa | Ação sugerida |
|---|---|---|---|
| `scripts/migrate-from-sheets.ts` | 7.8 KB | Migração one-way da Planilha v7 → Supabase v8. Já executada. Ainda referenciada em `package.json` como script `npm run migrate`. | Mover pra `/archive/old-migrations/` e remover do `package.json`. Valor: documenta o processo de migração. |
| `DIAGNOSTIC_RULES.md` | 8.3 KB | Documento antigo descrevendo as regras do diagnóstico. O código vivo dessas regras está em `scripts/diagnostic-rules.js` (42 KB). O `.md` é provavelmente desatualizado. | Revisar rapidamente — se for espelho desatualizado do `.js`, **🔵 Duplicado** (apagar). Se tiver conteúdo único, mover pra `/docs/`. |

---

## 🔵 Duplicado

| Caminho | Tamanho | Justificativa | Ação sugerida |
|---|---|---|---|
| `DIAGNOSTIC_RULES.md` (suspeita) | 8.3 KB | Se for só um dump das regras já codificadas em `diagnostic-rules.js`, é duplicado. Precisa abrir pra confirmar. | **Requer revisão** — marcado aqui como suspeito. |

---

## 🔴 Morto

| Caminho | Tamanho | Justificativa | Ação sugerida |
|---|---|---|---|
| `src/lib/twilio.ts` | 730 B | Antigo wrapper do Twilio, antes do messaging layer provider-agnostic. Grep confirma que **nenhum arquivo atual importa de `@/lib/twilio`**. Foi substituído por `src/lib/messaging/`. | Apagar. |
| `tsconfig.tsbuildinfo` | 285 KB | Cache do TypeScript incremental. Já está no `.gitignore` (`*.tsbuildinfo`), mas existe no working dir. Não deveria estar no repo. | Apagar local (regenera no próximo build). Confirmar que não está sendo versionado (deveria não estar). |
| `supabase/migrations/.gitkeep` | 0 | Arquivo marker pra versionar pasta vazia. A pasta hoje já tem migration real. O `.gitkeep` pode sair. | Apagar. |

---

## ⚪ Indefinido (requer decisão sua)

Arquivos criados na Fase 1 recém-delegada (cartões + parcelamento + áudio). **O subagente reportou 1200+ erros de TypeScript por caracteres Unicode problemáticos nesses arquivos.** Antes de mover ou apagar qualquer coisa, você precisa decidir: **fixar encoding**, **reescrever limpo**, ou **descartar Fase 1**.

| Caminho | Tamanho | Status |
|---|---|---|
| `src/lib/cards.ts` | 11 KB | Criado pelo subagente — pode ter encoding quebrado |
| `src/lib/installments.ts` | 5 KB | Criado pelo subagente — pode ter encoding quebrado |
| `src/lib/audio.ts` | 3.9 KB | Criado pelo subagente — pode ter encoding quebrado |
| `src/handlers/cards.ts` | 8 KB | Criado pelo subagente — pode ter encoding quebrado |
| `src/app/cartoes/page.tsx` | 8.7 KB | Criado pelo subagente — pode ter encoding quebrado |
| `src/app/api/cards/route.ts` | 1.6 KB | Criado pelo subagente — pode ter encoding quebrado |
| `src/app/api/cards/[id]/route.ts` | 2.7 KB | Criado pelo subagente — pode ter encoding quebrado |
| `src/app/api/invoices/route.ts` | 989 B | Criado pelo subagente — pode ter encoding quebrado |
| `src/app/api/invoices/[id]/pay/route.ts` | 852 B | Criado pelo subagente — pode ter encoding quebrado |
| `src/app/api/commitments/route.ts` | 752 B | Criado pelo subagente — pode ter encoding quebrado |
| `supabase/migrations/20260413_credit_cards_invoices.sql` | 4.8 KB | Criado por mim direto (sem encoding issue), SQL válido. Mas depende da decisão de manter Fase 1. |

**Decisões necessárias:**

1. **Fixar encoding e validar Fase 1** — correr `npx tsc --noEmit`, tratar os erros um por um, testar. Caminho mais trabalhoso mas preserva trabalho.
2. **Reescrever Fase 1 limpo** — eu reescrevo os arquivos via ferramentas Write (sem passar por bash), garantindo encoding ASCII puro. Mais rápido que fixar 1200 erros.
3. **Descartar Fase 1 inteira** — apagar todos os arquivos listados acima e manter só a migration SQL pra eventual retomada futura.

**Minha recomendação:** opção **2 (reescrever limpo)**. O tempo de fixar 1200 erros de encoding é maior que reescrever com encoding correto desde o zero, e o risco de deixar caracteres quebrados escondidos é alto.

---

## Estrutura de Pastas — Antes vs Depois

### Hoje (raiz)

```
/caixinha-app
├── BACKUP_STRATEGY.md           ← doc
├── BENCHMARKS.md                ← doc
├── DESIGN_REFERENCE.md          ← doc
├── DIAGNOSTICO_CAIXINHA.md      ← gerado
├── DIAGNOSTIC_RULES.md          ← doc (suspeito duplicado)
├── INSTALL_IOS.md               ← doc
├── README.md                    ← doc
├── diagnostico.html             ← gerado
├── diagnostic-history.json      ← gerado
├── AUDITORIA_PASTA.md           ← novo (este arquivo)
├── package.json, tsconfig.json, etc
├── public/
├── scripts/
├── src/
└── supabase/
```

**Problema:** 8 `.md` na raiz, dificulta escanear. Ainda assim, está **longe de ser caótico**.

### Depois (proposta)

```
/caixinha-app
├── README.md                    ← mantém (entry point do repo)
├── DIAGNOSTICO_CAIXINHA.md      ← mantém (gerado, raiz esperada pelo diagnose.js)
├── diagnostico.html             ← mantém (gerado)
├── diagnostic-history.json      ← mantém (gerado)
├── package.json, tsconfig.json, etc
├── public/
├── scripts/
├── src/
├── supabase/
├── docs/                        ← nova
│   ├── BACKUP_STRATEGY.md
│   ├── BENCHMARKS.md
│   ├── DESIGN_REFERENCE.md
│   ├── INSTALL_IOS.md
│   ├── AUDITORIA_PASTA.md       ← este arquivo, movido
│   └── DIAGNOSTIC_RULES.md      ← se sobreviver à revisão
└── archive/                     ← nova, em quarentena
    ├── old-migrations/
    │   └── migrate-from-sheets.ts
    └── _to_delete/
        ├── twilio.ts            ← de src/lib/
        └── .gitkeep             ← de supabase/migrations/
```

**Ganho:** raiz enxuta (só os `.md` que o Next/Vercel/ferramentas precisam ver). Toda documentação humana num lugar só. Quarentena clara.

**Cuidado:** mover `AUDITORIA_PASTA.md` pra `/docs/` exige atualizar qualquer link relativo. O `BENCHMARKS.md` tá linkado em `DIAGNOSTICO_CAIXINHA.md` via `./BENCHMARKS.md` — se mover pra `/docs/`, atualizar pra `./docs/BENCHMARKS.md` no `scripts/diagnose.js`.

---

## Imports Órfãos (análise)

Análise rápida de grep dos `src/lib/*.ts`:

- `src/lib/twilio.ts` → **0 imports** fora do próprio arquivo. **Órfão confirmado.** Já marcado como 🔴 Morto.
- Todos os outros libs (`anomaly.ts`, `categories.ts`, `formatter.ts`, `interactive.ts`, `narrative.ts`, `parser.ts`, `responses.ts`, `sheets-sync.ts`, `supabase.ts`, `messaging/*`) → importados em pelo menos um handler ou route. Todos vivos.
- Handlers: todos referenciados pelo router `src/handlers/index.ts`.
- Pages: cada `page.tsx` é entry point do Next.js (não precisa ser importado).
- API routes: cada `route.ts` é endpoint (não precisa ser importado).

**Nenhum outro órfão além do `twilio.ts`.**

---

## `.gitignore` — Proposta atualizada

### Hoje
```
node_modules/
.next/
.env.local
.env
.vercel
*.tsbuildinfo
next-env.d.ts
/backups/
```

### Proposta
```
# Dependencies
node_modules/

# Build output
.next/
dist/
build/
*.tsbuildinfo

# Next.js autogen
next-env.d.ts

# Environment
.env
.env.local
.env*.local

# Vercel
.vercel/

# Backups locais
/backups/

# OS
.DS_Store
Thumbs.db

# Editor
*.log
*.tmp
*.bak
.cache/
coverage/
```

**O que NÃO deve entrar no `.gitignore`:**
- `.env.local.example` ✅ já não está
- `package-lock.json` ✅ já não está
- `DIAGNOSTICO_CAIXINHA.md` e `diagnostico.html` ✅ já não estão (gerados mas versionados via husky)
- `BENCHMARKS.md`, `AUDITORIA_PASTA.md`, demais docs ✅ não devem estar

---

## Plano de Execução em Fases

### Fase 1 — Auditoria (ESTA fase)
**Status: entregue. Aguardando sua revisão.**

### Fase 2 — Reorganização (só depois da sua aprovação)
1. Criar `/archive/old-migrations/` e `/archive/_to_delete/`
2. Mover `scripts/migrate-from-sheets.ts` → `/archive/old-migrations/`
3. Remover script `migrate` de `package.json` (ou atualizar pra apontar pro novo caminho)
4. Mover `src/lib/twilio.ts` → `/archive/_to_delete/`
5. Apagar `supabase/migrations/.gitkeep`
6. Criar `/docs/` e mover: `BACKUP_STRATEGY.md`, `BENCHMARKS.md`, `DESIGN_REFERENCE.md`, `INSTALL_IOS.md`, `AUDITORIA_PASTA.md`, e `DIAGNOSTIC_RULES.md` (se sobrevier)
7. Atualizar `scripts/diagnose.js` pra apontar pra `./docs/BENCHMARKS.md`
8. Atualizar `.gitignore` conforme proposta
9. Deletar `tsconfig.tsbuildinfo` local (regenera)
10. Rodar `npm run build` pra garantir que nada quebrou
11. Commit separado: `chore: reorganize project structure`

### Fase 3 — Apagar quarentena (após 1 semana de uso)
1. Apagar `/archive/_to_delete/` inteira
2. Commit: `chore: remove deprecated files after quarantine period`

---

## Saúde do Repositório (snapshot)

- **Total de arquivos versionáveis:** 89
- **Tamanho do repo (sem node_modules/.next):** ~910 KB
- **Tamanho do `.git/`:** 585 KB
- **Arquivos órfãos detectados:** 1 (`src/lib/twilio.ts`)
- **Arquivos com encoding quebrado (Fase 1):** 10 (requer decisão)
- **Duplicados suspeitos:** 1 (`DIAGNOSTIC_RULES.md`)
- **Última auditoria:** 13/abr/2026

---

## O que eu preciso de você antes de Fase 2

1. **Fase 1 (cartão + parcelamento + áudio):** decide entre **fixar encoding** / **reescrever limpo** / **descartar**. Minha recomendação: reescrever limpo.
2. **`DIAGNOSTIC_RULES.md`:** é duplicado do `.js` ou tem conteúdo único? Abre e confirma se morre ou vai pra `/docs/`.
3. **`scripts/migrate-from-sheets.ts`:** concorda em mover pra `/archive/old-migrations/` e remover do `package.json`?
4. **Estrutura `/docs/`:** concorda com a proposta?
5. **Estrutura `/archive/_to_delete/`:** concorda com o modelo de quarentena de 1 semana?

Responde item por item (ou tudo junto com "tá ok") e eu toco Fase 2.
