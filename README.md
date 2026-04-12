# Caixinha v8

Assessor financeiro pessoal via WhatsApp + Dashboard web.  
Stack: **Next.js 14** · **Supabase** (PostgreSQL) · **Vercel** · **Twilio WhatsApp**

---

## Setup completo (do zero ao deploy)

### 1. Criar projeto no Supabase

1. Acessa [supabase.com](https://supabase.com) e cria um novo projeto
2. Região: **South America (São Paulo)** — mesma do Vercel (`gru1`)
3. Guarda a **URL** e a **anon key** (Settings → API)
4. Guarda a **service_role key** (Settings → API → service_role — essa é secreta, nunca expõe no client)

### 2. Rodar o schema

1. No Supabase Dashboard, vai em **SQL Editor**
2. Cola o conteúdo de `supabase/schema.sql`
3. Clica **Run** — cria tabelas, RLS, categorias padrão e o usuário seed

### 3. Criar o repositório no GitHub

```bash
cd caixinha-app
git init
git add .
git commit -m "Caixinha v8 — migração completa"
git remote add origin https://github.com/SEU_USER/caixinha-app.git
git push -u origin main
```

### 4. Deploy no Vercel

1. Acessa [vercel.com](https://vercel.com) e importa o repositório
2. Framework: **Next.js** (detecta automático)
3. Região: **São Paulo (gru1)** — já configurado no `vercel.json`
4. Adiciona as **Environment Variables**:

| Variável | Valor | Onde pegar |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxx.supabase.co` | Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` | Supabase → Settings → API |
| `SUPABASE_SERVICE_KEY` | `eyJ...` (service_role) | Supabase → Settings → API |
| `TWILIO_SID` | `ACxxxxx...` | Twilio Console |
| `TWILIO_TOKEN` | `xxxxx...` | Twilio Console |
| `TWILIO_NUMBER` | `whatsapp:+14155238886` | Twilio Sandbox |
| `OWNER_PHONE` | `whatsapp:+55XXXXXXXXXXX` | Seu número |

5. Clica **Deploy**

### 5. Atualizar o webhook do Twilio

1. Acessa [Twilio Console → WhatsApp Sandbox](https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn)
2. Em **"When a message comes in"**, coloca:
   ```
   https://SEU-PROJETO.vercel.app/api/webhook
   ```
3. Método: **POST**
4. Salva

### 6. Migrar dados da planilha (opcional)

Se quiser trazer os dados do Google Sheets antigo:

```bash
# Precisa de credenciais Google (Application Default Credentials)
# Instala o gcloud CLI e roda: gcloud auth application-default login

GOOGLE_SHEETS_ID=ID_DA_PLANILHA \
SUPABASE_URL=https://xxx.supabase.co \
SUPABASE_SERVICE_KEY=eyJ... \
npm run migrate
```

O script lê todas as abas (Janeiro–Dezembro), insere gastos e entradas, e valida 100% de integridade no final.

---

## Estrutura do projeto

```
caixinha-app/
├── src/
│   ├── types/index.ts          # Interfaces TypeScript
│   ├── lib/
│   │   ├── supabase.ts         # Clients (anon + admin)
│   │   ├── twilio.ts           # Envio de WhatsApp
│   │   ├── formatter.ts        # Formatação (moeda, data, mês)
│   │   ├── categories.ts       # Engine de categorias + cache
│   │   └── parser.ts           # Parser de mensagens WhatsApp
│   ├── handlers/
│   │   ├── index.ts            # Router principal
│   │   ├── expense.ts          # Registro de gasto
│   │   ├── income.ts           # Registro de entrada
│   │   ├── undo.ts             # Desfazer último gasto
│   │   ├── correction.ts       # Corrigir valor/categoria
│   │   ├── query.ts            # Consultas (resumo, semana, etc)
│   │   ├── category-command.ts # CRUD de categorias
│   │   └── pending.ts          # Resolver ações pendentes
│   └── app/
│       ├── globals.css          # Tailwind + tema dark
│       ├── layout.tsx           # Layout raiz (PWA meta)
│       ├── page.tsx             # Dashboard interativo
│       └── api/
│           ├── webhook/route.ts      # POST — Twilio webhook
│           ├── summary/route.ts      # GET — Resumo do mês
│           ├── transactions/route.ts # GET — Lista de transações
│           ├── evolution/route.ts    # GET — Evolução diária
│           └── panorama/route.ts     # GET — Comparativo anual
├── supabase/schema.sql          # DDL + seed
├── scripts/migrate-from-sheets.ts
├── public/
│   ├── manifest.json            # PWA
│   └── sw.js                    # Service Worker
└── vercel.json                  # Config de deploy
```

---

## Workflow de desenvolvimento

```bash
npm install
npm run dev        # localhost:3000
```

Qualquer push na `main` → Vercel faz deploy automático.

---

## Comandos WhatsApp

| Comando | Exemplo |
|---|---|
| Registrar gasto | `uber 23 pix` |
| Registrar entrada | `recebi 5000 salário` |
| Desfazer | `desfaz` |
| Corrigir valor | `corrige valor 45` |
| Corrigir categoria | `corrige categoria lazer` |
| Resumo do mês | `resumo` |
| Gastos da semana | `semana` |
| Gastos de hoje | `hoje` |
| Saldo | `saldo` |
| Criar categoria | `criar categoria Pets 🐾` |
| Listar categorias | `categorias` |

