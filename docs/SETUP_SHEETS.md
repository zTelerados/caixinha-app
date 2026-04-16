# Planilha Espelho — guia de ligação

Esse guia é pra você (Thiago) fazer uma vez só. O Cowork não consegue fazer sozinho porque depende de contas suas (Google Cloud, Google Drive, Vercel).

No fim, toda vez que o Caixinha anotar um gasto ou entrada no WhatsApp, uma linha nova aparece na planilha automaticamente. Sem você precisar abrir nada.

---

## O que vai acontecer na prática

Bot → banco → planilha. A planilha é só um espelho. Se você apagar, nada quebra. Se o Google cair, o bot continua funcionando normal.

---

## Parte 1 — Google Cloud (cria a chave)

Você vai criar uma "conta de robô" (service account) dentro do Google Cloud. Essa conta é quem vai escrever na planilha no seu lugar.

### 1. Abrir o Google Cloud Console

Vai em https://console.cloud.google.com e entra com a mesma conta Google que você quer usar pra planilha.

### 2. Criar um projeto novo

No topo da página tem um seletor de projeto. Clica nele → "Novo projeto".

- Nome: `caixinha` (ou o que você quiser)
- Deixa organização em branco
- Cria

Espera uns segundos até aparecer "projeto criado". Seleciona ele.

### 3. Ligar a API do Sheets

No menu da esquerda: **APIs e serviços** → **Biblioteca**.

Busca por "Google Sheets API", clica nela, clica **ativar**.

### 4. Criar a service account

Menu da esquerda: **APIs e serviços** → **Credenciais**.

No topo: **criar credenciais** → **conta de serviço**.

- Nome: `caixinha-bot`
- ID: deixa o que ele sugere
- Pula as outras etapas (não precisa dar role nenhuma)
- Concluir

### 5. Baixar a chave JSON

Volta em **Credenciais**. Clica na conta de serviço que você acabou de criar.

Aba **Chaves** → **adicionar chave** → **criar chave** → **JSON** → criar.

Um arquivo `.json` vai baixar. **Guarda ele.** Esse arquivo tem duas coisas que a gente precisa:

- `client_email` (algo tipo `caixinha-bot@caixinha-xxxxx.iam.gserviceaccount.com`)
- `private_key` (começa com `-----BEGIN PRIVATE KEY-----` e tem várias linhas)

---

## Parte 2 — Criar a planilha

### 1. Criar planilha no Drive

Vai no https://sheets.google.com → em branco.

Nome da planilha: `Caixinha Espelho` (ou o que quiser).

### 2. Renomear a aba

Embaixo, a primeira aba se chama "Página1" por padrão. Renomeia pra **`Transacoes`** (sem acento, com C maiúsculo).

### 3. Compartilhar com a service account

Botão **Compartilhar** no canto superior direito.

Cola o `client_email` da chave JSON (aquele email `.iam.gserviceaccount.com`).

Permissão: **editor**. Desmarca "notificar pessoas". Envia.

### 4. Pegar o ID da planilha

O ID tá na URL:

```
https://docs.google.com/spreadsheets/d/AQUI_FICA_O_ID/edit
```

Copia essa parte do meio.

---

## Parte 3 — Colar no Vercel

Vai no projeto no Vercel → **Settings** → **Environment Variables**.

Adiciona três variáveis (nos três ambientes: production, preview, development):

**`GOOGLE_SHEETS_SPREADSHEET_ID`**
O ID que você copiou da URL.

**`GOOGLE_SERVICE_ACCOUNT_EMAIL`**
O `client_email` da chave JSON.

**`GOOGLE_SERVICE_ACCOUNT_KEY`**
O `private_key` inteiro da chave JSON, incluindo `-----BEGIN PRIVATE KEY-----` e `-----END PRIVATE KEY-----`.

> Dica: pode colar com as quebras de linha como `\n` literal (como aparece no JSON). O código aceita dos dois jeitos.

(opcional) **`NEXT_PUBLIC_GOOGLE_SHEETS_SPREADSHEET_ID`**
Mesmo valor do primeiro. Serve pra mostrar o botão "abrir planilha" no painel.

Salva. Faz um **redeploy** pra pegar as variáveis novas.

---

## Parte 4 — Testar

### Teste 1: conexão

Abre no navegador:

```
https://SEU-DOMINIO.vercel.app/api/sheets/status
```

Se voltar `{"configured":true,"connected":true,"title":"Caixinha Espelho"}` — tá pronto.

Se voltar `connected:false` com erro, normalmente é um desses:

- Esqueceu de compartilhar a planilha com o email da service account (parte 2.3)
- Errou o ID na env var (parte 2.4)
- A `private_key` veio quebrada no copia-e-cola

### Teste 2: fluxo real

Manda no WhatsApp do bot:

```
Cafe 8 em alimentacao
```

Abre a planilha. Uma linha nova vai estar lá, com data, tipo, descrição, valor, categoria, forma de pagamento, mês e data de criação.

### Teste 3: importar o histórico (opcional)

Se você já tem transações antigas no banco e quer levar tudo pra planilha de uma vez:

```
POST https://SEU-DOMINIO.vercel.app/api/sheets/sync
```

Isso apaga a aba `Transacoes` e reescreve com tudo. Roda só quando precisar.

---

## Se algo der errado

O bot continua funcionando. A planilha é espelho — se ela falhar, o Caixinha só loga o erro e segue a vida. Você não perde transação.

Se quiser desligar temporariamente: apaga as três env vars no Vercel e redeploya. O bot volta ao comportamento antigo, sem planilha.

---

## Resumo das variáveis

| Nome | Vem de onde |
|---|---|
| `GOOGLE_SHEETS_SPREADSHEET_ID` | URL da planilha |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | campo `client_email` do JSON |
| `GOOGLE_SERVICE_ACCOUNT_KEY` | campo `private_key` do JSON |
| `NEXT_PUBLIC_GOOGLE_SHEETS_SPREADSHEET_ID` | mesmo do primeiro (opcional) |
