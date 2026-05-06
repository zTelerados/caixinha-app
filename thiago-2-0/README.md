# Thiago 2.0

PWA de tracking pessoal de saúde — gamificado, editorial, mobile-first.
Construído com Next.js 14 (App Router), TypeScript, Tailwind, Supabase e Recharts.

> *"acumular sessenta dias é virar uma pessoa."*

---

## O que é

Aplicativo pessoal para um usuário diabético tipo 1 acompanhar diariamente:

- Insulina (manhã / tarde / noite)
- Glicemia capilar (até 4 leituras/dia)
- Treino do dia (split de 6 dias)
- Adesão a água, dieta, sono
- Peso e HbA1c rumo à cirurgia em junho de 2027

## Stack

- **Next.js 14** com App Router e Server Components
- **TypeScript** estrito
- **Tailwind CSS** + design tokens em OKLCH
- **Supabase** (Auth + Postgres + Edge Functions)
- **Recharts** para gráficos (lazy-loaded)
- **Web Push API** + Service Worker
- **Web Audio API** + `navigator.vibrate` para feedback sonoro/háptico

## Rodando localmente

### 1. Pré-requisitos

- Node.js 20+
- Conta gratuita no Supabase (https://supabase.com)
- Conta gratuita no Vercel (deploy)

### 2. Instalar dependências

```bash
cd thiago-2-0
npm install
```

### 3. Configurar Supabase

1. Crie um projeto novo em https://supabase.com
2. Em **SQL Editor**, abra `supabase/migrations/0001_init.sql` e execute tudo de uma vez
3. Em **Project Settings → API**, copie:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` → `SUPABASE_SERVICE_ROLE_KEY` (apenas server-side, nunca exponha no cliente)

### 4. Gerar chaves VAPID (push)

```bash
npx web-push generate-vapid-keys
```

Cole no `.env.local`.

### 5. `.env.local`

Copie `.env.local.example` para `.env.local` e preencha:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

NEXT_PUBLIC_VAPID_PUBLIC_KEY=B...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:voce@exemplo.com
```

### 6. Rodar

```bash
npm run dev
```

Abra http://localhost:3000 e crie sua conta na tela de login.

---

## Deploy na Vercel

1. Push do repositório para o GitHub
2. Importe no Vercel apontando para a pasta `thiago-2-0/` como root
3. Adicione todas as variáveis de ambiente do `.env.local`
4. Deploy

> O domínio precisa ser HTTPS para que push e service worker funcionem em produção.

---

## Edge Function (notificações push)

A função `supabase/functions/send-reminder` envia notificações para os horários configurados.

### Deploy

```bash
# Instalar Supabase CLI (uma vez)
npm install -g supabase

# Login e link
supabase login
supabase link --project-ref SEU_REF

# Setar secrets
supabase secrets set VAPID_PUBLIC_KEY=B... VAPID_PRIVATE_KEY=... VAPID_SUBJECT=mailto:voce@exemplo.com

# Deploy
supabase functions deploy send-reminder
```

### Cron

No painel **Database → Extensions** ative `pg_cron` e `pg_net`. Em seguida, no SQL Editor:

```sql
select cron.schedule(
  'thiago-reminders',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := 'https://SEU-PROJETO.functions.supabase.co/send-reminder',
    headers := jsonb_build_object(
      'Authorization', 'Bearer SUA_SERVICE_ROLE_KEY',
      'Content-Type',  'application/json'
    )
  );
  $$
);
```

A função roda a cada 5 minutos, lê todos os lembretes habilitados que casam com o horário atual (no timezone `America/Sao_Paulo`) e dispara push para a `push_subscription` salva em `profiles`.

---

## PWA · instalar no iPhone

1. Abra o site no **Safari** (não funciona no Chrome para iOS)
2. Toque no botão **Compartilhar**
3. Toque em **Adicionar à Tela de Início**
4. Abra o app a partir do ícone na home

> Push notifications no iPhone exigem **iOS 16.4 ou superior** e **app instalado na home**. Notificações em Safari de aba normal **não funcionam** no iOS.

---

## Geração de ícones PNG

O ícone vetorial principal está em `public/icon.svg`. Para gerar PNGs (recomendado para iOS), use qualquer conversor:

```bash
# Exemplo com sharp-cli (npx)
npx sharp-cli -i public/icon.svg -o public/icon-192.png resize 192 192
npx sharp-cli -i public/icon.svg -o public/icon-512.png resize 512 512
```

Ou use https://realfavicongenerator.net importando o `icon.svg`.

---

## Arquitetura

```
thiago-2-0/
├── app/
│   ├── layout.tsx                   fonts (Italiana, Cormorant, Manrope, JetBrains Mono)
│   ├── page.tsx                     landing
│   ├── login/page.tsx               auth (senha + magic link)
│   ├── app/
│   │   ├── layout.tsx               TopBar + BottomNav (auth-checked)
│   │   ├── page.tsx                 status (hero + jornada + vitals + treino)
│   │   ├── glicemia/page.tsx        chart + TIR + registro
│   │   ├── quests/page.tsx          quests por grupo + milestones
│   │   └── dossie/page.tsx          identidade + peso + lembretes + logout
│   └── api/push/subscribe/route.ts  registro de subscription
├── components/
│   ├── Sigil.tsx                    "T" geométrico com seta
│   ├── Wordmark.tsx                 "Thiago 2.0" tipográfico
│   ├── AnimatedCheck.tsx            checkmark com SVG path animation
│   ├── RadialProgress.tsx
│   ├── ProgressBar.tsx              com pulseGlow ao 100%
│   ├── Confetti.tsx                 32 partículas em 5 cores
│   ├── Sheet.tsx                    bottom sheet iOS-style
│   ├── Card.tsx
│   ├── TopBar.tsx                   sticky com glass-blur
│   └── BottomNav.tsx                4 abas + indicador animado
├── lib/
│   ├── constants.ts                 QUESTS, MILESTONES, SPLIT, paleta semântica
│   ├── utils.ts                     datas, base64 → Uint8Array, isIos, isStandalone
│   ├── sound.ts                     useSound (Web Audio + vibrate)
│   ├── push.ts                      usePush (subscribe, unsubscribe)
│   ├── types.ts                     contratos do Supabase
│   └── supabase/{client,server,middleware}.ts
├── middleware.ts                    auth gate
├── public/
│   ├── manifest.json
│   ├── sw.js                        cache + push + click handler
│   └── icon.svg
└── supabase/
    ├── migrations/0001_init.sql     schema + RLS + trigger handle_new_user
    └── functions/send-reminder/
        ├── index.ts                 cron-driven push dispatcher
        └── deno.json
```

## Design system

Inspirações: **BBiMP World** (tipografia editorial, contraste de pesos, microinterações)
e **Typeless** (cards brancos, dados grandes em peso bold, accent indigo pontual).

**Tipografia:**
- Display — Italiana
- Display heavy — DM Serif Display
- Itálico decorativo — Cormorant Garamond italic
- Corpo — Manrope
- Mono — JetBrains Mono (labels com letter-spacing 0.28em)

**Paleta** — todas as cores em OKLCH como CSS custom properties em `app/globals.css`.

**Microinterações:**
- Checkmark via `stroke-dashoffset` animado
- Barra de XP com `pulseGlow` ao bater 100%
- Confete de 32 partículas em 5 cores
- Sheet desliza de baixo (`@keyframes slideUp`) com handle iOS
- Botões com `transform: scale(0.97)` no `:active`
- Sons via Web Audio API (sem arquivos) + `navigator.vibrate`

---

## Próximos passos sugeridos

- [ ] Gerar `icon-192.png` e `icon-512.png` (instruções acima)
- [ ] Configurar VAPID keys e deployar `send-reminder`
- [ ] Agendar cron via `pg_cron`
- [ ] Após deploy, instalar PWA no iPhone (Compartilhar → Adicionar à Tela de Início)
- [ ] Autorizar push e ativar lembretes em `Dossiê`
