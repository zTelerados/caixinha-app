# Caixinha — Benchmarks e Referências de Mercado

**Última atualização:** 13 de abril de 2026

Este documento registra os concorrentes pesquisados, o que foi absorvido do estudo deles, o que foi conscientemente deixado de fora, e o racional por trás de cada decisão.

O objetivo **não é copiar**. O objetivo é entender onde está a fronteira do mercado, o que resolve dor real, e o que é inflação de feature. O Caixinha mantém identidade própria (carioca, direto, sem moralismo, sem gamificação) — inspiração é direção, não cópia.

---

## Concorrentes pesquisados

### PlannerFin
Plataforma brasileira de finanças pessoais com foco em planejamento anual, cartões de crédito, faturas, parcelamento, metas e controle familiar.

**O que tem de melhor:**
- Tratamento correto de cartão de crédito como entidade separada (cartão tem fatura, fatura fecha, fatura vence, fatura é paga — e só então o valor afeta o saldo).
- Parcelamento com distribuição automática entre faturas de meses futuros.
- Visão de "compromissos futuros" — quanto dos próximos meses já está comprometido.
- Controle familiar (múltiplos usuários compartilhando mesmas finanças).

**O que foi puxado pro Caixinha:**
- Frente 1: estrutura de `credit_cards` e `invoices`, comando WhatsApp de cartão, rota `/cartoes`.
- Frente 2: parser de parcelamento, geração de transações futuras vinculadas às faturas corretas, widget de compromissos futuros.

**O que ficou de fora:**
- Controle familiar / multi-usuário. Adiado conscientemente até uso pessoal estar consolidado.

---

### Granazen
App brasileiro de finanças com foco em automação: importação OFX, leitura de faturas PDF, mensagens de áudio e relatórios mensais em PDF enviados automaticamente.

**O que tem de melhor:**
- Áudio via WhatsApp com transcrição automática. Elimina fricção de digitação.
- Relatório mensal em PDF enviado todo dia 1º, com capa, gráficos e resumo executivo.
- Importação OFX de extrato bancário.

**O que foi puxado pro Caixinha:**
- Frente 3 (Fase 1): pipeline de áudio com Whisper API, limite de 60s, confirmação do que foi ouvido.
- Frente 4 (Fase 2): relatório mensal em PDF enviado via WhatsApp todo dia 1º, com comando manual `"relatório de X"`.

**O que ficou de fora (conscientemente):**
- Importação OFX / leitura de fatura PDF / sincronização automática com bancos. Adiado. Razões: complexidade alta, compliance bancário, parser específico por banco, e o Caixinha ainda não está em estágio de produto pra justificar esse investimento.

---

### Contabilizzy
Plataforma de gestão financeira pessoal com foco em múltiplos perfis no mesmo número (pessoal, empresarial, projeto) e categorização inteligente.

**O que tem de melhor:**
- Perfis múltiplos compartilhando o mesmo número de WhatsApp com troca de contexto por comando (`/pessoal`, `/empresa`).
- Dashboard segmentado por perfil.

**O que foi puxado pro Caixinha:**
- Nada nessa rodada.

**O que ficou de fora (adiado):**
- Perfis múltiplos. Adiado até que o uso pessoal esteja maduro e valide a necessidade real.

---

### Memoz
Plataforma com estrutura de planos modulares (free, pro, premium) e lembretes de contas a pagar/receber com notificação proativa.

**O que tem de melhor:**
- Lembretes com recorrência (mensal, semanal) e notificação 1 dia antes + no dia.
- Estrutura clara de planos com features moduladas.

**O que foi puxado pro Caixinha:**
- Frente 5 (Fase 2): lembretes de contas a pagar e receber com notificação proativa e recorrência.

**O que ficou de fora (adiado):**
- Estrutura de planos / monetização modular. Adiado até decisão de comercializar.

---

### Trilha
App de finanças com forte apelo de gamificação: XP por registrar gastos, conquistas, metas, rankings.

**O que tem de melhor:**
- Engajamento alto no público jovem via mecânicas de jogo.

**O que foi puxado pro Caixinha:**
- **Nada.** Referência consciente de **não seguir**.

**Motivo:** Gamificação em finanças pessoais vira tom motivacional forçado e infantiliza a relação com dinheiro. O Caixinha é carioca direto, sem moralismo, sem "parabéns por registrar seu gasto". Finanças é assunto sério — o humor pode ser leve, mas não infantil. Gamificação fora de escopo permanentemente.

---

## Adiado conscientemente

Essas features **não são pendências esquecidas**. São decisões estratégicas feitas com razão e data pra revisitar.

| Feature | Origem | Quando revisitar | Razão do adiamento |
|---|---|---|---|
| Integração bancária (OFX, fatura PDF, sync automático) | Granazen | Quando o Caixinha estiver maduro e com base de usuários reais | Complexidade alta, depende de compliance bancário, parser específico por banco. Não faz sentido investir nesse nível de infra antes do produto validar use case. |
| Controle familiar / multi-usuário avançado | PlannerFin | Quando uso pessoal estiver consolidado | Multi-usuário é uma rodada inteira de refatoração (auth, RLS por usuário, separação de dados). Precisa de validação pessoal primeiro. |
| Perfis múltiplos (pessoal/empresarial) | Contabilizzy | Quando multi-usuário estiver resolvido | Depende da fundação de multi-usuário. Camada adicional de complexidade de contexto. |
| Gamificação / XP / conquistas / metas motivacionais | Trilha | **Nunca** | Fora do escopo permanente. Conflita com identidade do Caixinha (direto, adulto, sem moralismo). |
| Planos modulares de monetização | Memoz | Quando tiver decisão de comercializar o produto | Decisão de negócio, não técnica. Adiado até essa decisão existir. |

---

## Regra geral

Inspiração é direção, não cópia. Quando uma feature de concorrente for considerada, a pergunta é:

1. Resolve dor real do uso pessoal atual?
2. Mantém identidade do Caixinha (direto, carioca, sem moralismo, sem gamificação)?
3. A complexidade técnica se justifica pelo valor entregue?

Se as três respostas forem sim, entra. Se qualquer uma for não, fica de fora — com ou sem data pra revisitar.
