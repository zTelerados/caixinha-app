# Configuração Meta Cloud API — Guia Passo a Passo

Esse guia te leva do zero até o Caixinha funcionando com a API oficial do WhatsApp (Meta Cloud API).
Não precisa saber programar. Só seguir os passos.

---

## O que você vai precisar

- Uma conta no Facebook (sua pessoal serve)
- Um número de celular (pode ser o mesmo do WhatsApp pessoal, mas recomendo um número separado)
- Acesso ao painel do Vercel (onde o Caixinha tá hospedado)

---

## Passo 1 — Criar conta Business no Facebook

1. Acesse: https://business.facebook.com
2. Clique em **Criar conta**
3. Preencha com o nome do seu negócio (pode ser "Caixinha" ou seu nome)
4. Confirme seu email

> Você vai cair num painel chamado **Meta Business Suite**. Não precisa mexer em nada aqui por enquanto.

---

## Passo 2 — Criar o App de desenvolvedor

1. Acesse: https://developers.facebook.com
2. Clique em **Meus Apps** (canto superior direito)
3. Clique em **Criar App**
4. Escolha **Outro** como tipo de uso
5. Escolha **Empresa** como tipo de app
6. Dê o nome: **Caixinha**
7. Selecione sua conta Business criada no Passo 1
8. Clique **Criar app**

Você vai cair no painel do app. Agora precisa adicionar o WhatsApp:

9. Na tela de "Adicionar produtos ao app", procure **WhatsApp** e clique **Configurar**
10. Selecione sua conta Business e clique **Continuar**

> Pronto. Agora você tem um app com WhatsApp habilitado.

---

## Passo 3 — Número de teste e token temporário

Depois de configurar o WhatsApp, você cai na página **Primeiros passos** (ou "Get Started").

Nessa tela você vai ver:

- **Número de telefone de teste**: A Meta te dá um número temporário grátis pra testar. Esse número pode enviar mensagens pra números que você cadastrar.
- **Token temporário**: Um token que expira em 24h. Vamos usar ele agora pra testar, mas depois a gente troca por um permanente.

### Cadastrar seu número pra receber mensagens:

1. Na seção "Para", clique em **Gerenciar lista de números de telefone**
2. Adicione seu número pessoal (com código do país: +5521...)
3. Você vai receber um código de verificação no WhatsApp
4. Digite o código pra confirmar

### Testar envio:

Clique em **Enviar mensagem** na mesma tela. Se receber um "Hello World" no WhatsApp, tá funcionando.

---

## Passo 4 — Token permanente (System User)

O token temporário expira em 24h. Pra produção, precisa de um token permanente.

1. Acesse: https://business.facebook.com/settings/system-users
2. Se não tiver nenhum System User, clique **Adicionar**
3. Nome: **Caixinha Bot**
4. Função: **Admin**
5. Clique **Criar usuário do sistema**

Agora vincule o app:

6. Clique no System User que acabou de criar
7. Clique **Adicionar ativos**
8. Na aba **Apps**, selecione o app **Caixinha**
9. Ative **Controle total**
10. Clique **Salvar alterações**

Agora gere o token:

11. Clique **Gerar novo token**
12. Selecione o app **Caixinha**
13. Marque as permissões:
    - `whatsapp_business_management`
    - `whatsapp_business_messaging`
14. Clique **Gerar token**
15. **COPIE ESSE TOKEN E GUARDE NUM LUGAR SEGURO** — ele só aparece uma vez

> Esse é o `META_ACCESS_TOKEN` que vai pro Vercel.

---

## Passo 5 — Pegar o Phone Number ID

1. Volte pra: https://developers.facebook.com
2. Vá no seu app Caixinha → **WhatsApp** → **Configuração da API** (ou "API Setup")
3. Na seção "De", você vai ver o número de teste e abaixo dele o **Phone number ID**
4. Copie esse ID (é um número longo tipo `123456789012345`)

> Esse é o `META_PHONE_NUMBER_ID` que vai pro Vercel.

---

## Passo 6 — Configurar o Webhook

Webhook é o "endereço" que a Meta vai usar pra avisar o Caixinha quando alguém manda mensagem.

1. No painel do app, vá em **WhatsApp** → **Configuração** (ou "Configuration")
2. Na seção **Webhook**, clique **Editar**
3. Preencha:
   - **URL de retorno**: `https://caixinha-app-murex.vercel.app/api/webhook`
   - **Token de verificação**: invente uma senha qualquer, tipo `caixinha-verify-2024` (anote porque vai pro Vercel)
4. Clique **Verificar e salvar**

Se der erro, confira se a URL tá exatamente certa e se o app no Vercel tá no ar.

5. Depois de salvar, na seção **Campos de webhook**, clique **Gerenciar**
6. Encontre o campo **messages** e clique **Assinar**

> Isso faz a Meta enviar pro seu webhook toda vez que alguém manda mensagem pro número.

---

## Passo 7 — App Secret

1. No painel do app, vá em **Configurações** → **Básico**
2. Copie o **Chave secreta do app** (App Secret)

> Esse é o `META_APP_SECRET` que vai pro Vercel. Serve pra verificar que as mensagens realmente vieram da Meta.

---

## Passo 8 — Variáveis no Vercel

Abra o Vercel → seu projeto Caixinha → Settings → Environment Variables.

Adicione estas variáveis:

| Variável | Valor | Exemplo |
|---|---|---|
| `WHATSAPP_PROVIDER` | `meta` | `meta` |
| `META_PHONE_NUMBER_ID` | O ID do Passo 5 | `123456789012345` |
| `META_ACCESS_TOKEN` | O token do Passo 4 | `EAABx...longo...` |
| `META_VERIFY_TOKEN` | A senha que você inventou no Passo 6 | `caixinha-verify-2024` |
| `META_APP_SECRET` | O App Secret do Passo 7 | `abc123def456...` |

**NÃO delete as variáveis do Twilio** — elas ficam lá como backup. Se der problema, muda `WHATSAPP_PROVIDER` pra `twilio` e volta tudo em 30 segundos.

Depois de salvar, clique em **Deployments** e faça um **Redeploy** pra aplicar.

---

## Passo 9 — Perfil do WhatsApp Business

No Meta Business Suite:

1. Vá em **WhatsApp** → **Configurações da conta**
2. Configure o perfil:
   - **Nome**: Caixinha
   - **Foto**: logo verde do Caixinha
   - **Descrição**: "Seu assessor financeiro pessoal."
   - **Categoria**: Finance

---

## Passo 10 — Testar

Mande uma mensagem pro número do WhatsApp Business: **"gastei 15 no cafe"**

Se responder com a confirmação normal do Caixinha, tá tudo funcionando.

---

## Rollback de emergência

Se algo der errado com a Meta:

1. Vercel → Environment Variables
2. Mude `WHATSAPP_PROVIDER` de `meta` pra `twilio`
3. Redeploy
4. Em 30 segundos você tá de volta no Twilio

---

## Limites grátis

A Meta dá **1.000 conversas grátis por mês** (service-initiated). Pra uso pessoal, isso é mais que suficiente. Uma "conversa" dura 24h a partir da primeira mensagem, então múltiplas mensagens no mesmo dia contam como 1 conversa.
