# CAIXINHA — Testes de Regressão Obrigatórios

> Nenhum deploy sobe sem todos esses casos passando.
> Testar no WhatsApp real antes de considerar pronto.

---

## Caso 1: Registro simples com categoria e pagamento

**Entrada:** `uber 22 pix`
**Saída esperada:** Confirmação com dados (descrição, valor, categoria, forma de pagamento)
**Formato:** `✅ Anotado, [nome]. uber, R$ 22,00 em transporte 🚗. Pix. Hoje.`
**Última correção:** 2026-04-16

---

## Caso 2: Pergunta de categoria + resposta

**Entrada 1:** `agua 5 pix`
**Saída 1:** Pergunta de categoria (ex: `Água de 5. Em qual categoria?`)
**Entrada 2:** `alimentacao` (ou `alimentação`)
**Saída 2:** Confirmação com dados completos OU pergunta de pagamento se pagamento não veio na mensagem original
**NUNCA:** `Erro ao processar. Tenta de novo.`
**Bug original:** Date serialization — parsed.date vira string ao salvar no Supabase JSONB, quebrando .toISOString()
**Última correção:** 2026-04-16

---

## Caso 3: Pergunta de pagamento + resposta

**Entrada 1:** `agua 5` (sem forma de pagamento)
**Saída 1:** Pergunta de categoria (se categoria não foi auto-detectada) ou pergunta de pagamento
**Entrada N:** `pix`
**Saída N:** Confirmação com dados completos
**NUNCA:** `Erro ao processar. Tenta de novo.`
**Bug original:** Mesmo bug de Date serialization do Caso 2
**Última correção:** 2026-04-16

---

## Caso 4: Undo / Desfazer

**Entrada:** `apaga o ultimo` (ou `desfaz`, `cancela`)
**Saída esperada:** Confirmação do que foi apagado com descrição e valor
**NUNCA:** Apagar sem confirmar qual transação
**Última correção:** 2026-04-16

---

## Caso 5: Consulta resumo mensal

**Entrada:** `quanto gastei esse mes` (ou `resumo`, `como tô`)
**Saída esperada:** Breakdown por categoria com emojis, totais, saldo
**Formato:** Categorias listadas com emoji, nome, valor e contagem
**Última correção:** 2026-04-16

---

## Caso 6: Áudio (quando OPENAI_API_KEY estiver configurada)

**Entrada:** Áudio de voz dizendo "café dez reais pix"
**Saída esperada:** `🎤 Ouvi: "café dez reais pix"` + confirmação com dados
**Sem OPENAI_API_KEY:** `Ainda não consigo ouvir áudios. Manda por texto.`
**Última correção:** 2026-04-16 (implementado, aguardando key)

---

## Regras gerais que nunca podem quebrar

1. **"Erro ao processar. Tenta de novo." genérico é proibido.** Se falhou, dar contexto útil.
2. **"acima da média" só aparece com 5+ transações anteriores na categoria E valor 2.5x acima da média real.**
3. **Mensagens duplicadas (mesma mensagem, mesmo número, <3s) são ignoradas.**
4. **Pending actions expiram em 10 minutos, não 5.**
5. **Pending action tem prioridade 2 no router (só undo passa por cima).**
6. **Date objects são reconstituídos após deserialização do Supabase JSONB.**

---

## Como testar

1. Abrir WhatsApp, conversa com o bot Twilio
2. Testar cada caso na ordem
3. Verificar se a saída corresponde ao esperado
4. Se qualquer caso falhar, NÃO fazer deploy
5. Documentar a falha e a data aqui antes de corrigir
