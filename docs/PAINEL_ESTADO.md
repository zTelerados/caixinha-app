# Painel — Estado Atual

Este arquivo é lido pelo script `scripts/painel.js` pra gerar o `painel.html`.
Formato simples: blocos marcados por `## Secao`, listas com `- chave: valor` ou `- "linha livre"`.

---

## Fase

emoji: 🧹
titulo: Faxina geral do projeto
analogia: Imagina que o Caixinha e uma casa que voce ta construindo. Nas ultimas semanas voce foi adicionando comodos rapido (dashboard, tabela, integracao WhatsApp, espelho Sheets), e agora a casa funciona, mas o porao ta cheio de caixa, ferramenta espalhada, e uma caixa de movel veio com defeito de fabrica. A faxina serve pra organizar tudo isso antes de construir o proximo comodo, que vao ser os cartoes de credito.

---

## Acabou de ser feito

- humano: Listei tudo que tem no projeto e separei o que serve, o que ta morto, e o que precisa decisao sua.
  tecnico: Auditoria de 89 arquivos versionados, classificacao em 5 categorias (ativo, historico util, duplicado, morto, indefinido).
- humano: Organizei os documentos numa pasta so (docs) e joguei coisa antiga pro porao (archive).
  tecnico: Criadas pastas /docs/ (5 MDs movidos) e /archive/ (old-migrations + _to_delete com twilio.ts e DIAGNOSTIC_RULES.md).
- humano: Limpei a lista do que o projeto usa e tirei um atalho antigo que nao serve mais.
  tecnico: Atualizado .gitignore, removido script "migrate" do package.json, corrigido link em scripts/diagnose.js.

---

## Esperando voce

- pergunta: Tem 10 arquivos da ultima rodada que sairam com defeito de fabrica. Refaz do zero na proxima rodada ou tenta consertar agora?
  analogia: E tipo um movel que veio com cupim. Tentar salvar gasta tempo e o risco de ficar oculto e grande. Comprar novo (refazer do zero) sai mais rapido e limpo. A proxima rodada ja vai construir cartoes de credito do jeito certo, entao reaproveita o impulso.
  recomendacao: Apagar os 10 arquivos com defeito e refazer limpo na proxima rodada.
  resolvido: false

---

## Vem a seguir

- Voce responde a pergunta acima (apagar ou tentar consertar).
- Se "apagar": eu removo os 10 arquivos com defeito, volto os arquivos que foram alterados ao estado anterior, e fecho a faxina com o repo 100% limpo.
- Depois da faxina fechada, a proxima rodada comeca: cartoes de credito e faturas.

---

## Tempo estimado

5 a 10 minutos depois da sua resposta.
