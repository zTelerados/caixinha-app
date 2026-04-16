# Caixinha — Design Reference

Padrao visual aprovado em 12 de abril de 2026. Toda feature visual nova respeita esse documento. Sem reinventar paleta, sem trocar tipografia, sem mudar estilos de componente. Consistencia e o que faz produto parecer maduro.

---

## Paleta de Cores

| Token | Hex | Uso |
|-------|-----|-----|
| `caixa-bg` | `#0a0a0a` | Fundo principal (body, page) |
| `caixa-card` | `#141414` | Fundo de cards e containers |
| `caixa-border` | `#1f1f1f` | Bordas de cards, separadores |
| `caixa-green` | `#2D6A4F` | Accent principal, valores positivos, saldo |
| `caixa-accent` | `#40916C` | Accent secundario, gradientes |
| `caixa-red` | `#E76F51` | Valores negativos, gastos, alertas |
| `caixa-blue` | `#457B9D` | Accent terciario, gradientes de barras |
| `caixa-text` | `#e5e5e5` | Texto primario |
| `caixa-muted` | `#737373` | Texto secundario, labels, datas |

Nota: o diagnostico.html usa `#0a0a0f` como base e `#3fa672` como green. O dashboard usa `#0a0a0a` e `#2D6A4F`. A FASE 2 do dashboard vai unificar pra um dos dois. Ate la, o padrao do dashboard e o que esta acima.

---

## Tipografia

| Elemento | Familia | Peso | Tamanho |
|----------|---------|------|---------|
| Titulo principal (h1) | Inter | 700 (bold) | 2.25rem / 36px |
| Subtitulo (h2) | Inter | 600 (semibold) | 1.5rem / 24px |
| Titulo de card (h3) | Inter | 600 | 1.125rem / 18px |
| Texto corpo | Inter | 400 | 0.875rem / 14px |
| Labels / muted | Inter | 400 | 0.75rem / 12px |
| Valores numericos | Inter | 700 | 1.5rem / 24px |
| Valores pequenos | Inter | 600 | 0.875rem / 14px |

Font-variant-numeric: `tabular-nums` em todos os valores monetarios.

---

## Espacamento

| Contexto | Valor |
|----------|-------|
| Padding interno dos cards | 24px (p-6) |
| Gap entre cards (grid) | 16px (gap-4) no mobile, 32px (gap-8) no desktop |
| Margem entre secoes | 32px (mb-8) |
| Border radius dos cards | 12px (rounded-xl) |
| Border radius dos botoes | 8px (rounded-lg) |

---

## Cards

Fundo `#141414` com borda `1px solid #1f1f1f`. Radius 12px. Padding 24px. Hover: borda muda pra `rgba(45, 106, 79, 0.3)` com sombra sutil verde (`shadow-caixa-green/10`). Transicao 300ms.

```css
.card {
  background: #141414;
  border: 1px solid #1f1f1f;
  border-radius: 12px;
  padding: 24px;
  transition: all 300ms;
}
.card:hover {
  border-color: rgba(45, 106, 79, 0.3);
  box-shadow: 0 10px 15px rgba(45, 106, 79, 0.1);
}
```

---

## KPI Cards

Layout: grid 2 colunas no mobile, 4 no desktop. Cada card tem:
- Label muted (12px, #737373) no topo
- Valor grande (24px, bold) abaixo
- Icone com fundo circular no canto superior direito
- Cores: verde pra positivo, vermelho pra negativo

Icones: Lucide React (TrendingUp, TrendingDown, Wallet, Receipt). Tamanho 24px. Fundo circular com 12px padding, opacidade 10% da cor.

---

## Lista de Transacoes

Cada item e uma row horizontal com:
- Emoji da categoria (20px, flex-shrink-0) a esquerda
- Descricao (14px, font-medium, truncate) + data (12px, muted) empilhados
- Valor (14px, semibold) + seta (ArrowUpRight verde ou ArrowDownRight vermelho) a direita

Hover: fundo `rgba(31, 31, 31, 0.3)`. Sem borda entre items, so espaco (gap 12px). Max-height 384px com overflow-y-auto e scrollbar custom.

---

## Donut Chart (Categorias)

Recharts PieChart com innerRadius 60, outerRadius 100, paddingAngle 2. Click em fatia filtra transacoes. Opacidade das fatias nao selecionadas cai pra 0.3. Tooltip com fundo `#141414`, borda `#1f1f1f`, radius 8px.

Cores das categorias (em ordem): `#2D6A4F`, `#E76F51`, `#457B9D`, `#C1121F`, `#6A0572`, `#1D3557`, `#40916C`, `#7F5539`.

---

## Grafico de Evolucao

Recharts AreaChart com gradiente do verde (#2D6A4F) no topo (30% opacidade) pro transparente embaixo. Stroke 2px. Eixos: cinza #737373, font 12px. Tooltip igual ao donut.

---

## Barras de Metodo de Pagamento

Barra horizontal com:
- Label (14px, font-medium) + valor (14px, muted) na mesma linha
- Barra abaixo: 8px de altura, fundo `#1f1f1f`, preenchimento com gradiente `caixa-green` pra `caixa-blue`, largura proporcional ao maximo.

---

## Seletor de Mes

Dois botoes (ChevronLeft / ChevronRight) com icone 20px. Nome do mes centralizado entre eles (24px, semibold). Botoes com hover verde sutil.

---

## Regras Gerais

1. Sem emojis na UI do dashboard (emojis so nos dados de categoria que vem do banco).
2. Sem em-dashes. Usar virgula ou ponto.
3. Sem texto motivacional ("voce esta indo bem!", "continue assim!").
4. Numeros sempre formatados em BRL: `R$ 1.234,56`.
5. Datas em dd/mm formato curto.
6. Dark mode only. Sem toggle light/dark.
7. Scrollbar custom: thumb #404040, track transparent, hover #525252.
8. Animacoes sutis (300ms ease). Sem animacao exagerada.
