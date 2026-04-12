import { ParsedMessage, ParsedIncome, ParsedCorrection, QueryResult, CategoryCommand } from '@/types';
import { normalize, getLastDayOfWeek, monthLabel, friendlyName } from './formatter';
import { Category } from '@/types';

// ════════════════════════════════════════════════════════════
// DETECÇÃO DE INTENÇÃO
// ════════════════════════════════════════════════════════════

export function detectUndo(msg: string): boolean {
  const t = normalize(msg.trim());
  const verbs = [
    'apaga','apagar','apague','deleta','delete','deletar',
    'remove','remover','remova','limpa','limpar','limpe',
    'desfaz','desfazer','desfaca','tira','tirar','cancela','cancelar',
  ];
  return verbs.some((v) => t === v || t.startsWith(v));
}

export function detectCorrection(msg: string): ParsedCorrection | null {
  const t = msg.toLowerCase().trim();

  const p1 = t.match(/^(era|seria|na verdade|corrige?\s*(pra|para)?|na verdade era|tava errado.*era)\s+(.+)/i);
  if (p1) return { type: 'category', term: (p1[p1.length - 1] || '').trim() };

  const p2 = t.match(/^categoria\s+(.+)/i);
  if (p2) return { type: 'category', term: (p2[1] || '').trim() };

  const p3 = t.match(/(?:valor|errado|tava errado).*?(\d+(?:[.,]\d{1,2})?)/i);
  if (p3) return { type: 'amount', amount: parseFloat(p3[1].replace(',', '.')) };

  const p4 = t.match(/^(muda|ajusta|edita)\s*(pra|para)\s*(\d+(?:[.,]\d{1,2})?)/i);
  if (p4) return { type: 'amount', amount: parseFloat(p4[3].replace(',', '.')) };

  const p5 = t.match(/^valor era\s+(\d+(?:[.,]\d{1,2})?)/i);
  if (p5) return { type: 'amount', amount: parseFloat(p5[1].replace(',', '.')) };

  return null;
}

export function detectIncome(msg: string): ParsedIncome | null {
  const t = msg.toLowerCase().trim();
  const triggers = [
    'recebi','recebido','entrada','salário','salario','freelance',
    'freela','renda','depositaram','caiu','transferência','transferencia',
    'ganhei','entrou','pagaram','pix recebido','venda',
  ];
  if (!triggers.some((g) => t.includes(g))) return null;

  const match = t.match(/(\d+(?:[.,]\d{1,2})?)/);
  if (!match) return null;
  const amount = parseFloat(match[1].replace(',', '.'));
  if (amount <= 0) return null;

  let txt = msg.trim().replace(match[0], '').trim();
  const removeWords = [
    ...triggers, 'reais','pix','crédito','credito','dinheiro','cash',
    'do','da','dos','das','de',
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
  const t = normalize(msg);

  if (/^(resumo|como\s+t[ao]|quanto\s+gast(ei|o)(\s|$|\?)|quanto\s+ja\s+gast|me\s+da\s+(um\s+)?resumo)/.test(t))
    return { type: 'summary' };
  if (/quanto\s+(eu\s+)?gast(ei|o|ou)\s+(esse|este|no|nesse|neste)\s*(mes)/.test(t))
    return { type: 'summary' };
  if (/quanto\s+(eu\s+)?gast(ei|o|ou)\s+(essa|esta|na|nessa|nesta)\s*semana/.test(t))
    return { type: 'week' };
  if (/quanto\s+(eu\s+)?gast(ei|o|ou)\s+hoje/.test(t))
    return { type: 'today' };
  if (/quanto\s+(eu\s+)?gast(ei|o|ou)\s+ontem/.test(t))
    return { type: 'yesterday' };
  if (/saldo|sobr(ou|a)|quanto\s+(eu\s+)?tenho|quanto\s+falta|quanto\s+resta/.test(t))
    return { type: 'balance' };

  const catPatterns = [
    /quanto\s+(eu\s+)?gast(ei|o|ou)\s*(com|em|de|no|na)\s+(.+)/,
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
  const m = msg.toLowerCase().trim();

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
  const textNorm = normalize(original);

  // Amount
  const amountRegex = /(?:r\$\s*)?(\d+(?:[.,]\d{1,2})?)(?:\s*(?:reais|pila|conto|contos|real))?/gi;
  const matches: RegExpExecArray[] = [];
  let m: RegExpExecArray | null;
  while ((m = amountRegex.exec(original)) !== null) matches.push(m);
  if (matches.length === 0) return null;

  let bestMatch = matches[matches.length - 1];
  for (const match of matches) {
    if (parseFloat(match[1].replace(',', '.')) > 0 && match.index > original.length * 0.3) {
      bestMatch = match;
    }
  }
  const amount = parseFloat(bestMatch[1].replace(',', '.'));
  if (amount <= 0) return null;

  let txt = original.replace(bestMatch[0], ' ').trim();
  const now = new Date();
  let date = now;
  let customDate = false;

  // Date detection
  if (textNorm.includes('ontem')) {
    date = new Date(now.getTime() - 86400000);
    customDate = true;
    txt = txt.replace(/ontem/i, '').trim();
  } else if (textNorm.includes('anteontem') || textNorm.includes('antes de ontem')) {
    date = new Date(now.getTime() - 2 * 86400000);
    customDate = true;
    txt = txt.replace(/ante?s?\s*de?\s*ontem/i, '').trim();
  } else {
    const dayMap: Record<string, number> = {
      segunda: 1, terca: 2, quarta: 3, quinta: 4,
      sexta: 5, sabado: 6, domingo: 0,
    };
    for (const [name, dow] of Object.entries(dayMap)) {
      const re = new RegExp(`${name}\\s*passad[ao]`, 'i');
      if (textNorm.match(re)) {
        date = getLastDayOfWeek(dow);
        customDate = true;
        txt = txt.replace(re, '').trim();
        break;
      }
    }
  }

  // Payment method
  let paymentMethod: string | null = null;
  const txtLow = txt.toLowerCase();
  if (txtLow.includes('credito') || txtLow.includes('crédito')) {
    paymentMethod = 'Crédito';
    txt = txt.replace(/no\s*cr[eé]dito/i, '').replace(/cr[eé]dito/i, '').trim();
  } else if (txtLow.includes('pix')) {
    paymentMethod = 'Pix';
    txt = txt.replace(/no\s*pix/i, '').replace(/pix/i, '').trim();
  } else if (txtLow.includes('dinheiro') || txtLow.includes('cash') || /esp[eé]cie/.test(txtLow)) {
    paymentMethod = 'Dinheiro';
    txt = txt.replace(/no\s*dinheiro/i, '').replace(/dinheiro/i, '').replace(/cash/i, '').replace(/esp[eé]cie/i, '').trim();
  }

  // Category from text
  let categoryId: string | null = null;
  let categoryName: string | null = null;
  const txtCat = normalize(txt);
  for (const cat of categories) {
    for (const kw of cat.keywords || []) {
      const kwNorm = normalize(kw);
      if (txtCat.includes(kwNorm) || kwNorm.includes(txtCat)) {
        categoryId = cat.id;
        categoryName = cat.name;
        break;
      }
    }
    if (categoryId) break;
  }

  // Clean description
  let desc = txt;
  const prefixes = ['paguei','gastei','comprei','pago','gasto','foi','era','deu'];
  let descLow = desc.toLowerCase();
  for (const p of prefixes) {
    if (descLow.startsWith(p)) {
      desc = desc.substring(p.length).trim();
      descLow = desc.toLowerCase();
      break;
    }
  }
  const suffixes = ['de','do','da','dos','das','no','na','nos','nas','em','pra','pro','para'];
  const descWords = desc.split(' ');
  if (descWords.length > 1) {
    const last = descWords[descWords.length - 1].toLowerCase();
    if (suffixes.includes(last)) descWords.pop();
  }
  desc = descWords.join(' ').trim();
  if (!desc || desc.length < 2) {
    desc = categoryName ? friendlyName(categoryName) : 'gasto';
  }
  desc = desc.charAt(0).toUpperCase() + desc.slice(1);

  return {
    description: desc,
    amount,
    date,
    payment_method: paymentMethod,
    category_id: categoryId,
    category_name: categoryName,
    custom_date: customDate,
    month_label: monthLabel(date),
  };
}
