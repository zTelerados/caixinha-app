import { ParsedMessage, ParsedIncome, ParsedCorrection, QueryResult, CategoryCommand } from '@/types';
import { normalize, normalizeDescription, getLastDayOfWeek, monthLabel, friendlyName } from './formatter';
import { humanNormalize, canonicalPayment, parseNumberWords, basicNormalize } from './normalize';
import { Category } from '@/types';
import { findBestCategoryMatch } from './categories';

// ════════════════════════════════════════════════════════════
// DETECÇÃO DE INTENÇÃO
// ════════════════════════════════════════════════════════════

export function detectUndo(msg: string): boolean {
  const t = humanNormalize(msg);
  const verbs = [
    'apaga','apagar','apague','deleta','delete','deletar',
    'remove','remover','remova','limpa','limpar','limpe',
    'desfaz','desfazer','desfaca','tira','tirar','cancela','cancelar',
  ];
  return verbs.some((v) => t === v || t.startsWith(v));
}

export function detectCorrection(msg: string): ParsedCorrection | null {
  const t = humanNormalize(msg);

  const p1 = t.match(/^(era|seria|na verdade|corrige?\s*(pra|para)?|na verdade era|tava errado.*era)\s+(.+)/i);
  if (p1) return { type: 'category', term: (p1[p1.length - 1] || '').trim() };

  const p2 = t.match(/^categoria\s+(.+)/i);
  if (p2) return { type: 'category', term: (p2[1] || '').trim() };

  // Amount correction: "valor era 50", "era 50", "muda pra 40"
  const p3 = t.match(/(?:valor|errado|tava errado).*?(\d+(?:[.,]\d{1,2})?)/i);
  if (p3) return { type: 'amount', amount: parseFloat(p3[1].replace(',', '.')) };

  const p4 = t.match(/^(muda|ajusta|edita)\s*(pra|para)\s*(\d+(?:[.,]\d{1,2})?)/i);
  if (p4) return { type: 'amount', amount: parseFloat(p4[3].replace(',', '.')) };

  const p5 = t.match(/^valor era\s+(\d+(?:[.,]\d{1,2})?)/i);
  if (p5) return { type: 'amount', amount: parseFloat(p5[1].replace(',', '.')) };

  // Payment correction: "era pix", "era credito", "muda pra dinheiro"
  const p6 = t.match(/^(?:era|muda\s+pra|troca\s+pra)\s+(pix|credito|debito|dinheiro|cartao|cash)/);
  if (p6) {
    const pm = canonicalPayment(p6[1]);
    if (pm) return { type: 'payment', term: pm };
  }

  return null;
}

export function detectIncome(msg: string): ParsedIncome | null {
  const t = humanNormalize(msg);
  const triggers = [
    'recebi','recebido','entrada','salario','freelance',
    'freela','renda','depositaram','caiu','transferencia',
    'ganhei','entrou','pagaram','pix recebido','venda',
  ];
  if (!triggers.some((g) => t.includes(g))) return null;

  // Try digit match first
  const match = t.match(/(\d+(?:[.,]\d{1,2})?)/);
  let amount: number | null = null;

  if (match) {
    amount = parseFloat(match[1].replace(',', '.'));
  } else {
    // Try number words: "recebi cinquenta do freela"
    amount = parseNumberWords(t);
  }

  if (!amount || amount <= 0) return null;

  let txt = msg.trim();
  if (match) txt = txt.replace(match[0], '').trim();

  const removeWords = [
    ...triggers, 'reais','pix','credito','dinheiro','cash',
    'do','da','dos','das','de', 'pratas','conto','contos','pila','pilas',
  ];
  const words = txt.split(/\s+/);
  const source: string[] = [];
  for (const word of words) {
    const wNorm = normalize(word);
    const isRemove = removeWords.some((r) => normalize(r) === wNorm);
    if (!isRemove && word.length > 1) source.push(word);
  }

  let sourceStr = source.length > 0 ? source.join(' ') : 'Entrada';
  sourceStr = sourceStr.charAt(0).toUpperCase() + sourceStr.slice(1);

  const now = new Date();
  return { source: sourceStr, amount, date: now, month_label: monthLabel(now) };
}

export function detectQuery(msg: string): QueryResult | null {
  const t = humanNormalize(msg);

  // Compare: "gastei mais com comida ou transporte?"
  const compareMatch = t.match(/gast(ei|o|ou)\s+mais\s+(com|em|de)\s+(.+?)\s+ou\s+(.+?)(\?|$)/);
  if (compareMatch) {
    return { type: 'compare', term: compareMatch[3].trim(), term2: compareMatch[4].trim() };
  }

  // Last N: "me mostra os ultimos 5 gastos"
  const lastNMatch = t.match(/(ultimos?|mostra|lista)\s+(\d+)\s*(gasto|transac|despesa|compra)/);
  if (lastNMatch) {
    return { type: 'last_n', count: parseInt(lastNMatch[2], 10) };
  }

  // Biggest
  if (/maior\s+gasto/.test(t) || /gasto\s+mais\s+caro/.test(t) || /gast(ei|o|ou)\s+mais/.test(t) && !/ou\s+/.test(t)) {
    return { type: 'biggest' };
  }

  // Daily avg
  if (/gasto\s+medio/.test(t) || /media\s+(por\s+)?dia/.test(t) || /medio\s+(por\s+)?dia/.test(t)) {
    return { type: 'daily_avg' };
  }

  // Status
  if (/t[oa]\s+no\s+vermelho/.test(t) || /como\s+t[oa]\s+no\s+mes/.test(t) || /como\s+estou\s+no\s+mes/.test(t) || /situacao\s+do\s+mes/.test(t)) {
    return { type: 'status' };
  }

  // Remaining
  if (/sobra\s+(pro|para\s+o)\s+resto/.test(t) || /quanto\s+sobra/.test(t) || /resta\s+do\s+mes/.test(t)) {
    return { type: 'remaining' };
  }

  // Summary
  if (/^(resumo|quanto\s+gast(ei|o)(\s|$|\?)|quanto\s+ja\s+gast|me\s+da\s+(um\s+)?resumo)/.test(t))
    return { type: 'summary' };
  if (/quanto\s+(eu\s+)?gast(ei|o|ou)\s+(esse|este|no|nesse|neste)\s*(mes)/.test(t))
    return { type: 'summary' };
  if (/como\s+t[ao]\s+no\s+mes/.test(t))
    return { type: 'status' };
  if (/^como\s+t[ao]/.test(t))
    return { type: 'summary' };

  // Period queries
  if (/quanto\s+(eu\s+)?gast(ei|o|ou)\s+(essa|esta|na|nessa|nesta)\s*semana/.test(t))
    return { type: 'week' };
  if (/quanto\s+(eu\s+)?gast(ei|o|ou)\s+hoje/.test(t))
    return { type: 'today' };
  if (/quanto\s+(eu\s+)?gast(ei|o|ou)\s+ontem/.test(t) || /gastos\s+de\s+ontem/.test(t) || /quais\s+(foram\s+)?(os\s+)?(meus\s+)?gastos\s+(de\s+)?ontem/.test(t))
    return { type: 'yesterday' };

  // Balance
  if (/saldo|quanto\s+(eu\s+)?tenho|quanto\s+falta|quanto\s+resta/.test(t))
    return { type: 'balance' };
  if (/sobr(ou|a)/.test(t))
    return { type: 'balance' };

  // Category queries
  const catPatterns = [
    /quanto\s+(eu\s+)?gast(ei|o|ou)\s*(com|em|de|no|na)\s+(.+)/,
    /quantos?\s+(.+?)\s+(essa|esta|na|nessa)\s*semana/,
    /total\s*(de|do|da|dos|das|em|com|no|na)\s+(.+)/,
    /quanto\s+foi\s*(de|do|da|em|com|no|na)\s+(.+)/,
    /quanto\s+t[ao]\s*(de|do|da|em|com|no|na)\s+(.+)/,
  ];
  for (const p of catPatterns) {
    const m = t.match(p);
    if (m) {
      const term = (m[m.length - 1] || '').trim();
      if (term.length > 1) return { type: 'category', term };
    }
  }
  return null;
}

export function detectCategoryCommand(msg: string): CategoryCommand | null {
  const m = humanNormalize(msg);

  if (m.match(/^(cria|nova|adiciona)\s+categoria\s+(.+)$/)) {
    return { type: 'create', name: m.replace(/^(cria|nova|adiciona)\s+categoria\s+/, '').trim() };
  }
  if (m === 'minhas categorias' || m === 'lista categorias' || m === 'categorias') {
    return { type: 'list' };
  }
  if (m.match(/^(apaga|remove)\s+categoria\s+(.+)$/)) {
    return { type: 'delete', name: m.replace(/^(apaga|remove)\s+categoria\s+/, '').trim() };
  }
  const renMatch = m.match(/^renomeia\s+categoria\s+(.+)\s+pra\s+(.+)$/);
  if (renMatch) return { type: 'rename', from: renMatch[1].trim(), to: renMatch[2].trim() };

  const emojiMatch = m.match(/^muda\s+emoji\s+da\s+categoria\s+(.+)\s+pra\s+(.+)$/);
  if (emojiMatch) return { type: 'change_emoji', name: emojiMatch[1].trim(), emoji: emojiMatch[2].trim() };

  return null;
}

// ════════════════════════════════════════════════════════════
// PARSER DE GASTO
// ════════════════════════════════════════════════════════════

export function parseExpense(msg: string, categories: Category[]): ParsedMessage | null {
  const original = msg.trim();
  // Normalize for matching but keep original for description extraction
  const normalized = humanNormalize(original);

  // ── Amount extraction (digits) ──
  const amountRegex = /(?:r?\$?\s*)?(\d+(?:[.,]\d{1,2})?)(?:\s*(?:reais|pila|conto|contos|real|pratas?))?/gi;
  const matches: RegExpExecArray[] = [];
  let am: RegExpExecArray | null;
  while ((am = amountRegex.exec(normalized)) !== null) matches.push(am);

  let amount: number | null = null;
  let amountStr: string | null = null;

  if (matches.length > 0) {
    // Pick the best match (prefer later in string, with actual value)
    let bestMatch = matches[matches.length - 1];
    for (const match of matches) {
      if (parseFloat(match[1].replace(',', '.')) > 0 && match.index > normalized.length * 0.3) {
        bestMatch = match;
      }
    }
    amount = parseFloat(bestMatch[1].replace(',', '.'));
    amountStr = bestMatch[0];
  } else {
    // Try number words: "gastei cinquenta no cafe"
    // Extract potential number word sequences
    const numberWordPattern = /\b(zero|um|uma|dois|duas|tres|quatro|cinco|meia|seis|sete|oito|nove|dez|onze|doze|treze|catorze|quatorze|quinze|dezesseis|dezessete|dezoito|dezenove|vinte|trinta|quarenta|cinquenta|sessenta|setenta|oitenta|noventa|cem|cento|duzentos|duzentas|trezentos|trezentas|quatrocentos|quatrocentas|quinhentos|quinhentas|seiscentos|seiscentas|setecentos|setecentas|oitocentos|oitocentas|novecentos|novecentas|mil)(\s+e\s+(zero|um|uma|dois|duas|tres|quatro|cinco|meia|seis|sete|oito|nove|dez|onze|doze|treze|catorze|quatorze|quinze|dezesseis|dezessete|dezoito|dezenove|vinte|trinta|quarenta|cinquenta|sessenta|setenta|oitenta|noventa|cem|cento|duzentos|duzentas|trezentos|trezentas|quatrocentos|quatrocentas|quinhentos|quinhentas|seiscentos|seiscentas|setecentos|setecentas|oitocentos|oitocentas|novecentos|novecentas|mil))*/;
    const wordMatch = normalized.match(numberWordPattern);
    if (wordMatch) {
      amount = parseNumberWords(wordMatch[0]);
      amountStr = wordMatch[0];
    }
  }

  if (!amount || amount <= 0) return null;

  // Remove amount from text for description extraction
  let txt = normalized;
  if (amountStr) {
    txt = txt.replace(amountStr, ' ').trim();
  }
  // Also remove "reais", "pratas", etc. that might remain
  txt = txt.replace(/\b(reais|real|pratas?|contos?|pilas?|uns?|umas?|uma?\s+nota\s+de)\b/g, ' ').trim();

  const now = new Date();
  let date = now;
  let customDate = false;

  // ── Date detection ──
  if (txt.includes('ontem')) {
    date = new Date(now.getTime() - 86400000);
    customDate = true;
    txt = txt.replace(/ontem/g, '').trim();
  } else if (txt.includes('anteontem') || txt.includes('antes de ontem')) {
    date = new Date(now.getTime() - 2 * 86400000);
    customDate = true;
    txt = txt.replace(/ante?s?\s*de?\s*ontem/g, '').trim();
  } else {
    const dayMap: Record<string, number> = {
      segunda: 1, terca: 2, quarta: 3, quinta: 4,
      sexta: 5, sabado: 6, domingo: 0,
    };
    for (const [name, dow] of Object.entries(dayMap)) {
      const re = new RegExp(`${name}\\s*passad[ao]`, 'g');
      if (txt.match(re)) {
        date = getLastDayOfWeek(dow);
        customDate = true;
        txt = txt.replace(re, '').trim();
        break;
      }
    }
  }

  // ── Payment method detection (using canonical lowercase) ──
  let paymentMethod: string | null = null;
  // Check for payment keywords in the normalized text
  const pmPatterns: Array<{ pattern: RegExp; method: string }> = [
    { pattern: /\b(?:no\s+)?credito\b/, method: 'credito' },
    { pattern: /\b(?:no\s+)?debito\b/, method: 'debito' },
    { pattern: /\b(?:no\s+)?pix\b/, method: 'pix' },
    { pattern: /\b(?:no\s+)?dinheiro\b/, method: 'dinheiro' },
    { pattern: /\b(?:no\s+)?cartao\b/, method: 'credito' },
    { pattern: /\bcash\b/, method: 'dinheiro' },
    { pattern: /\bespecie\b/, method: 'dinheiro' },
  ];

  for (const { pattern, method } of pmPatterns) {
    if (pattern.test(txt)) {
      paymentMethod = method;
      txt = txt.replace(pattern, '').trim();
      break;
    }
  }

  // ── Category from text ──
  let categoryId: string | null = null;
  let categoryName: string | null = null;
  let categorySource: 'keyword' | 'learned' | null = null;
  const txtCat = txt.replace(/\s+/g, ' ').trim();

  // Helper unico: keywords > learned_items, substring > fuzzy, com score por tamanho.
  // Cobre typos ("uberr") e prioriza match mais longo ("uber casa" > "uber").
  const match = findBestCategoryMatch(txtCat, categories);
  if (match) {
    categoryId = match.category.id;
    categoryName = match.category.name;
    categorySource = match.source;
  }

  // ── Clean description ──
  let desc = txt;
  const prefixes = ['paguei','gastei','comprei','pago','gasto','foi','era','deu',
    'foram','custou','saiu','deram','pago','comprado'];
  let descLow = desc.toLowerCase();
  for (const p of prefixes) {
    if (descLow.startsWith(p)) {
      desc = desc.substring(p.length).trim();
      descLow = desc.toLowerCase();
      break;
    }
  }
  const suffixes = ['de','do','da','dos','das','no','na','nos','nas','em','pra','pro','para','pelo','pela'];
  const descWords = desc.split(' ');
  if (descWords.length > 1) {
    const last = descWords[descWords.length - 1].toLowerCase();
    if (suffixes.includes(last)) descWords.pop();
  }
  // Also remove leading preposition words
  while (descWords.length > 1) {
    const first = descWords[0].toLowerCase();
    if (suffixes.includes(first)) {
      descWords.shift();
    } else {
      break;
    }
  }
  desc = descWords.join(' ').trim();
  if (!desc || desc.length < 2) {
    desc = categoryName ? friendlyName(categoryName) : 'gasto';
  }
  // Normalize: remove leading prepositions, capitalize
  desc = normalizeDescription(desc);

  return {
    description: desc,
    amount,
    date,
    payment_method: paymentMethod,
    category_id: categoryId,
    category_name: categoryName,
    custom_date: customDate,
    month_label: monthLabel(date),
    category_source: categorySource,
  };
}
