import { fmtValor, friendlyName, monthLabel } from '@/lib/formatter';

const DASHBOARD_URL = 'https://caixinha-app-murex.vercel.app';

const MONTH_ABBR: Record<number, string> = {
  0: 'jan', 1: 'fev', 2: 'mar', 3: 'abr',
  4: 'mai', 5: 'jun', 6: 'jul', 7: 'ago',
  8: 'set', 9: 'out', 10: 'nov', 11: 'dez',
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function fmtDateShort(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  const day = date.getDate().toString().padStart(2, '0');
  const month = MONTH_ABBR[date.getMonth()] ?? 'jan';
  return `${day}/${month}`;
}

function isToday(d: Date): boolean {
  const now = new Date();
  return (
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear()
  );
}

function firstName(name: string): string {
  return name.split(' ')[0];
}

function shouldShowMonthSummary(amount: number, balance: number, monthTotal: number): boolean {
  if (amount > 50) return true;
  if (balance < 0) return true;
  const previousTotal = monthTotal - amount;
  const marks = [500, 1000, 2000, 3000, 5000];
  for (const mark of marks) {
    if (previousTotal < mark && monthTotal >= mark) return true;
  }
  return false;
}

function dashboardLink(): string {
  return `📊 Ver detalhes: ${DASHBOARD_URL}`;
}

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface ExpenseResponseParams {
  userName: string;
  description: string;
  amount: number;
  categoryName: string | null;
  categoryEmoji: string | null;
  paymentMethod: string | null;
  date: Date;
  tone: string;
  categoryHistory: Array<{ description: string; amount: number; date: string }>;
  monthTotal: number;
  monthIncome: number;
  balance: number;
}

export interface IncomeResponseParams {
  userName: string;
  source: string;
  amount: number;
  tone: string;
  monthIncome: number;
  monthExpense: number;
  balance: number;
}

export interface QuerySummaryParams {
  userName: string;
  month: string;
  categories: Array<{ name: string; emoji: string; total: number; count: number }>;
  totalExpense: number;
  totalIncome: number;
  balance: number;
  daysLeft: number;
  dailyBudget: number;
  projection: number;
  tone: string;
}

export interface QueryPeriodParams {
  userName: string;
  period: string;
  transactions: Array<{ description: string; amount: number; category?: string; emoji?: string }>;
  total: number;
  count: number;
  tone: string;
}

export interface QueryBalanceParams {
  userName: string;
  balance: number;
  totalExpense: number;
  totalIncome: number;
  daysLeft: number;
  dailyBudget: number;
  tone: string;
}

export interface QueryCategoryParams {
  userName: string;
  categoryName: string;
  categoryEmoji: string;
  transactions: Array<{ description: string; amount: number; date: string }>;
  total: number;
  count: number;
  tone: string;
}

export interface DailyMorningParams {
  userName: string;
  yesterdayTotal: number;
  yesterdayCount: number;
  yesterdayTop: string | null;
  monthTotal: number;
  monthIncome: number;
  balance: number;
  pendingBills: string[];
  tone: string;
}

export interface WeeklySummaryParams {
  userName: string;
  weekTotal: number;
  lastWeekTotal: number;
  weekPctChange: number;
  topItems: Array<{ description: string; amount: number }>;
  biggestSingle: { description: string; amount: number } | null;
  mostExpensiveDay: { day: string; total: number } | null;
  tone: string;
}

export interface AudioConfirmationParams extends ExpenseResponseParams {
  transcription: string;
}

// ---------------------------------------------------------------------------
// Builders
// ---------------------------------------------------------------------------

export function buildExpenseResponse(params: ExpenseResponseParams): string {
  const {
    userName, description, amount, categoryName, categoryEmoji,
    paymentMethod, date, tone, categoryHistory, monthTotal, monthIncome, balance,
  } = params;
  const t = tone || 'cria';
  const lines: string[] = [];

  // Layer 1 — Confirmation
  const catLabel = categoryName ? `${friendlyName(categoryName)}` : '';
  const catEm = categoryEmoji ?? '';
  const dateStr = isToday(date) ? 'Hoje' : fmtDateShort(date);
  const pmLabel = paymentMethod ? `. ${paymentMethod}` : '';

  if (t === 'neutro') {
    lines.push(
      `✅ Pronto, ${firstName(userName)}. Registrei: ${description}, ${fmtValor(amount)}` +
      (catLabel ? ` em ${catLabel} ${catEm}` : '') +
      `${pmLabel}. ${dateStr}.`,
    );
  } else {
    lines.push(
      `✅ Anotado, ${firstName(userName)}. ${description}, ${fmtValor(amount)}` +
      (catLabel ? ` em ${catLabel} ${catEm}` : '') +
      `${pmLabel}. ${dateStr}.`,
    );
  }

  // Layer 2 — Category context
  if (categoryName && categoryHistory.length > 0) {
    const emoji = catEm || '📁';
    const friendly = friendlyName(categoryName);
    const cap = friendly.charAt(0).toUpperCase() + friendly.slice(1);
    lines.push('');
    lines.push(`${emoji} ${cap} esse mês:`);

    const items = categoryHistory.slice(0, 5);
    for (const item of items) {
      const d = fmtDateShort(item.date);
      const dLabel = isToday(new Date(item.date)) ? 'hoje' : d;
      lines.push(`• ${item.description} — ${fmtValor(item.amount)} (${dLabel})`);
    }

    const subtotal = items.reduce((s, i) => s + i.amount, 0);
    lines.push(`Subtotal: ${fmtValor(subtotal)}`);
  } else if (categoryName) {
    const friendly = friendlyName(categoryName);
    lines.push('');
    lines.push(`Primeiro gasto de ${friendly} esse mês.`);
  }

  // Layer 3 — Monthly summary (conditional)
  if (shouldShowMonthSummary(amount, balance, monthTotal)) {
    const now = new Date();
    const monthName = monthLabel(now).toLowerCase();
    lines.push('');
    lines.push(`💰 Total ${monthName}: ${fmtValor(monthTotal)} | Saldo: ${fmtValor(balance)}`);
  }

  // Dashboard link
  lines.push('');
  lines.push(dashboardLink());

  // Neutro closing
  if (t === 'neutro') {
    lines.push('Tudo certo? Se precisar mudar, é só me dizer.');
  }

  return lines.join('\n');
}

export function buildIncomeResponse(params: IncomeResponseParams): string {
  const { userName, source, amount, tone, monthIncome, monthExpense, balance } = params;
  const t = tone || 'cria';
  const lines: string[] = [];

  if (t === 'neutro') {
    lines.push(`✅ Pronto, ${firstName(userName)}. Registrei entrada de ${fmtValor(amount)} (${source}).`);
  } else {
    lines.push(`✅ Entrou, ${firstName(userName)}! ${fmtValor(amount)} de ${source}. Tá no radar.`);
  }

  lines.push('');
  lines.push(`💰 Receita do mês: ${fmtValor(monthIncome)}`);
  lines.push(`💸 Gastos do mês: ${fmtValor(monthExpense)}`);
  lines.push(`📊 Saldo: ${fmtValor(balance)}`);

  lines.push('');
  lines.push(dashboardLink());

  if (t === 'neutro') {
    lines.push('Tudo certo? Se precisar mudar, é só me dizer.');
  }

  return lines.join('\n');
}

export function buildQuerySummaryResponse(params: QuerySummaryParams): string {
  const {
    userName, month, categories, totalExpense, totalIncome,
    balance, daysLeft, dailyBudget, projection, tone,
  } = params;
  const t = tone || 'cria';
  const lines: string[] = [];

  if (t === 'neutro') {
    lines.push(`📋 Resumo de ${month}, ${firstName(userName)}:`);
  } else {
    lines.push(`📋 ${month}, ${firstName(userName)}:`);
  }

  lines.push('');

  // Categories breakdown
  const sorted = [...categories].sort((a, b) => b.total - a.total);
  for (const cat of sorted) {
    lines.push(`${cat.emoji} ${cat.name}: ${fmtValor(cat.total)} (${cat.count}x)`);
  }

  lines.push('');
  lines.push(`💸 Total gastos: ${fmtValor(totalExpense)}`);
  lines.push(`💰 Receita: ${fmtValor(totalIncome)}`);
  lines.push(`📊 Saldo: ${fmtValor(balance)}`);

  if (daysLeft > 0 && dailyBudget > 0) {
    lines.push('');
    lines.push(`📅 Faltam ${daysLeft} dias | Orçamento diário: ${fmtValor(dailyBudget)}`);
  }

  if (projection > 0) {
    lines.push(`📈 Projeção fim do mês: ${fmtValor(projection)}`);
  }

  lines.push('');
  lines.push(dashboardLink());

  return lines.join('\n');
}

export function buildQueryPeriodResponse(params: QueryPeriodParams): string {
  const { userName, period, transactions, total, count, tone } = params;
  const t = tone || 'cria';
  const lines: string[] = [];

  if (t === 'neutro') {
    lines.push(`📋 Seus gastos de ${period}, ${firstName(userName)}:`);
  } else {
    lines.push(`📋 ${period}, ${firstName(userName)}:`);
  }

  lines.push('');

  if (transactions.length === 0) {
    lines.push(t === 'neutro' ? 'Nenhum gasto registrado nesse período.' : 'Nada registrado. Dia limpo!');
  } else {
    for (const tx of transactions) {
      const emoji = tx.emoji ?? '•';
      lines.push(`${emoji} ${tx.description} — ${fmtValor(tx.amount)}`);
    }
    lines.push('');
    lines.push(`Total: ${fmtValor(total)} (${count} ${count === 1 ? 'gasto' : 'gastos'})`);
  }

  lines.push('');
  lines.push(dashboardLink());

  return lines.join('\n');
}

export function buildQueryBalanceResponse(params: QueryBalanceParams): string {
  const { userName, balance, totalExpense, totalIncome, daysLeft, dailyBudget, tone } = params;
  const t = tone || 'cria';
  const lines: string[] = [];

  if (t === 'neutro') {
    lines.push(`💰 Saldo atual, ${firstName(userName)}:`);
  } else {
    lines.push(`💰 Saldo, ${firstName(userName)}:`);
  }

  lines.push('');
  lines.push(`Receita: ${fmtValor(totalIncome)}`);
  lines.push(`Gastos: ${fmtValor(totalExpense)}`);
  lines.push(`Saldo: ${fmtValor(balance)}`);

  if (daysLeft > 0 && dailyBudget > 0) {
    lines.push('');
    if (t === 'neutro') {
      lines.push(`Restam ${daysLeft} dias no mês. Orçamento diário sugerido: ${fmtValor(dailyBudget)}.`);
    } else {
      lines.push(`Faltam ${daysLeft} dias. Tá com ${fmtValor(dailyBudget)}/dia pra gastar.`);
    }
  } else if (balance < 0) {
    lines.push('');
    lines.push(t === 'neutro'
      ? 'Atenção: seus gastos ultrapassaram a receita do mês.'
      : 'Estourou o mês. Segura a onda.');
  }

  lines.push('');
  lines.push(dashboardLink());

  return lines.join('\n');
}

export function buildQueryCategoryResponse(params: QueryCategoryParams): string {
  const { userName, categoryName, categoryEmoji, transactions, total, count, tone } = params;
  const t = tone || 'cria';
  const lines: string[] = [];
  const friendly = friendlyName(categoryName);
  const cap = friendly.charAt(0).toUpperCase() + friendly.slice(1);

  if (t === 'neutro') {
    lines.push(`${categoryEmoji} Detalhes de ${cap}, ${firstName(userName)}:`);
  } else {
    lines.push(`${categoryEmoji} ${cap}, ${firstName(userName)}:`);
  }

  lines.push('');

  if (transactions.length === 0) {
    lines.push('Nenhum gasto nessa categoria esse mês.');
  } else {
    const items = transactions.slice(0, 5);
    for (const tx of items) {
      const d = fmtDateShort(tx.date);
      lines.push(`• ${tx.description} — ${fmtValor(tx.amount)} (${d})`);
    }
    if (transactions.length > 5) {
      lines.push(`... e mais ${transactions.length - 5}`);
    }
    lines.push('');
    lines.push(`Total: ${fmtValor(total)} (${count} ${count === 1 ? 'gasto' : 'gastos'})`);
  }

  lines.push('');
  lines.push(dashboardLink());

  return lines.join('\n');
}

export function buildDailyMorningMessage(params: DailyMorningParams): string {
  const {
    userName, yesterdayTotal, yesterdayCount, yesterdayTop,
    monthTotal, monthIncome, balance, pendingBills, tone,
  } = params;
  const t = tone || 'cria';
  const lines: string[] = [];

  if (t === 'neutro') {
    lines.push(`☀️ Bom dia, ${firstName(userName)}!`);
  } else {
    lines.push(`☀️ E aí, ${firstName(userName)}!`);
  }

  lines.push('');

  // Yesterday recap
  if (yesterdayCount > 0) {
    lines.push(`Ontem: ${fmtValor(yesterdayTotal)} em ${yesterdayCount} ${yesterdayCount === 1 ? 'gasto' : 'gastos'}.`);
    if (yesterdayTop) {
      lines.push(`Maior: ${yesterdayTop}.`);
    }
  } else {
    lines.push(t === 'neutro'
      ? 'Nenhum gasto registrado ontem.'
      : 'Ontem foi dia limpo, zero gastos.');
  }

  lines.push('');
  lines.push(`📊 Mês: ${fmtValor(monthTotal)} gastos | Receita: ${fmtValor(monthIncome)} | Saldo: ${fmtValor(balance)}`);

  if (pendingBills.length > 0) {
    lines.push('');
    lines.push('⚠️ Contas pendentes:');
    for (const bill of pendingBills) {
      lines.push(`• ${bill}`);
    }
  }

  return lines.join('\n');
}

export function buildWeeklySummaryMessage(params: WeeklySummaryParams): string {
  const {
    userName, weekTotal, lastWeekTotal, weekPctChange,
    topItems, biggestSingle, mostExpensiveDay, tone,
  } = params;
  const t = tone || 'cria';
  const lines: string[] = [];

  if (t === 'neutro') {
    lines.push(`📊 Resumo semanal, ${firstName(userName)}:`);
  } else {
    lines.push(`📊 Semana fechou, ${firstName(userName)}:`);
  }

  lines.push('');
  lines.push(`💸 Total da semana: ${fmtValor(weekTotal)}`);

  if (lastWeekTotal > 0) {
    const arrow = weekPctChange > 0 ? '📈' : weekPctChange < 0 ? '📉' : '➡️';
    const sign = weekPctChange > 0 ? '+' : '';
    lines.push(`${arrow} ${sign}${weekPctChange.toFixed(0)}% vs semana passada (${fmtValor(lastWeekTotal)})`);
  }

  if (topItems.length > 0) {
    lines.push('');
    lines.push('🏆 Top gastos:');
    for (let i = 0; i < topItems.length; i++) {
      const item = topItems[i];
      lines.push(`${i + 1}. ${item.description} — ${fmtValor(item.amount)}`);
    }
  }

  if (biggestSingle) {
    lines.push('');
    lines.push(`💥 Maior gasto: ${biggestSingle.description} (${fmtValor(biggestSingle.amount)})`);
  }

  if (mostExpensiveDay) {
    lines.push(`📅 Dia mais caro: ${mostExpensiveDay.day} (${fmtValor(mostExpensiveDay.total)})`);
  }

  return lines.join('\n');
}

export function buildAudioConfirmation(params: AudioConfirmationParams): string {
  const { transcription, ...expenseParams } = params;
  const t = params.tone || 'cria';
  const lines: string[] = [];

  lines.push(`🎤 Ouvi: "${transcription}"`);
  lines.push('');
  lines.push(buildExpenseResponse(expenseParams));
  lines.push('');

  if (t === 'neutro') {
    lines.push('Se eu entendi errado, é só me corrigir.');
  } else {
    lines.push('Se eu entendi errado, me corrige.');
  }

  return lines.join('\n');
}
