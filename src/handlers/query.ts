import { supabaseAdmin } from '@/lib/supabase';
import { fmtValor, friendlyName, monthLabel, fmtDate } from '@/lib/formatter';
import { matchCategory } from '@/lib/categories';
import { QueryResult } from '@/types';
import {
  buildQuerySummaryResponse,
  buildQueryPeriodResponse,
  buildQueryBalanceResponse,
  buildQueryCategoryResponse,
} from '@/lib/responses';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getUserMeta(userId: string): Promise<{ name: string; tone: string }> {
  const { data } = await supabaseAdmin
    .from('users')
    .select('name, tone')
    .eq('id', userId)
    .single();
  return { name: data?.name ?? 'amigo', tone: data?.tone ?? 'cria' };
}

function daysLeftInMonth(now: Date): number {
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return daysInMonth - now.getDate();
}

// Fetch all month transactions for this user
async function getMonthTransactions(userId: string, now: Date) {
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const { data: txs } = await supabaseAdmin
    .from('transactions')
    .select('*, category:categories(name, emoji)')
    .eq('user_id', userId)
    .eq('month_label', monthLabel(now))
    .gte('date', monthStart.toISOString())
    .order('date', { ascending: false });
  return txs || [];
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

export async function handleQuery(userId: string, query: QueryResult): Promise<string> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const user = await getUserMeta(userId);

  // ── Summary ──────────────────────────────────────────────
  if (query.type === 'summary') {
    const txs = await getMonthTransactions(userId, now);

    const expenses = txs.filter((t) => t.type === 'expense');
    const income = txs.filter((t) => t.type === 'income');

    const totalExpense = expenses.reduce((sum, t) => sum + t.amount, 0);
    const totalIncome = income.reduce((sum, t) => sum + t.amount, 0);
    const balance = totalIncome - totalExpense;

    // Build category breakdown with joined name/emoji
    const catMap = new Map<string, { name: string; emoji: string; total: number; count: number }>();
    for (const tx of expenses) {
      const catId = tx.category_id ?? 'sem_categoria';
      const cat = tx.category as { name: string; emoji: string } | null;
      const entry = catMap.get(catId) || {
        name: cat?.name ?? 'Sem categoria',
        emoji: cat?.emoji ?? '📦',
        total: 0,
        count: 0,
      };
      entry.total += tx.amount;
      entry.count += 1;
      catMap.set(catId, entry);
    }

    const categories = Array.from(catMap.values());
    const left = daysLeftInMonth(now);
    const dailyBudget = left > 0 ? balance / left : 0;
    const daysPassed = now.getDate();
    const dailyAvg = daysPassed > 0 ? totalExpense / daysPassed : 0;
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const projection = dailyAvg * daysInMonth;

    return buildQuerySummaryResponse({
      userName: user.name,
      month: monthLabel(now),
      categories,
      totalExpense,
      totalIncome,
      balance,
      daysLeft: left,
      dailyBudget: Math.max(0, dailyBudget),
      projection,
      tone: user.tone,
    });
  }

  // ── Week ─────────────────────────────────────────────────
  if (query.type === 'week') {
    const weekStart = new Date(now.getTime() - 7 * 86400000);
    const { data: txs } = await supabaseAdmin
      .from('transactions')
      .select('*, category:categories(name, emoji)')
      .eq('user_id', userId)
      .eq('type', 'expense')
      .gte('date', weekStart.toISOString())
      .order('date', { ascending: false });

    const items = (txs || []).map((tx) => ({
      description: tx.description,
      amount: tx.amount,
      category: (tx.category as any)?.name,
      emoji: (tx.category as any)?.emoji,
    }));
    const total = items.reduce((sum, t) => sum + t.amount, 0);

    return buildQueryPeriodResponse({
      userName: user.name,
      period: 'esta semana',
      transactions: items,
      total,
      count: items.length,
      tone: user.tone,
    });
  }

  // ── Today ────────────────────────────────────────────────
  if (query.type === 'today') {
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 86400000);

    const { data: txs } = await supabaseAdmin
      .from('transactions')
      .select('*, category:categories(name, emoji)')
      .eq('user_id', userId)
      .eq('type', 'expense')
      .gte('date', todayStart.toISOString())
      .lt('date', todayEnd.toISOString())
      .order('date', { ascending: false });

    const items = (txs || []).map((tx) => ({
      description: tx.description,
      amount: tx.amount,
      category: (tx.category as any)?.name,
      emoji: (tx.category as any)?.emoji,
    }));
    const total = items.reduce((sum, t) => sum + t.amount, 0);

    return buildQueryPeriodResponse({
      userName: user.name,
      period: 'hoje',
      transactions: items,
      total,
      count: items.length,
      tone: user.tone,
    });
  }

  // ── Yesterday ────────────────────────────────────────────
  if (query.type === 'yesterday') {
    const yesterdayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    const yesterdayEnd = new Date(yesterdayStart.getTime() + 86400000);

    const { data: txs } = await supabaseAdmin
      .from('transactions')
      .select('*, category:categories(name, emoji)')
      .eq('user_id', userId)
      .eq('type', 'expense')
      .gte('date', yesterdayStart.toISOString())
      .lt('date', yesterdayEnd.toISOString())
      .order('date', { ascending: false });

    const items = (txs || []).map((tx) => ({
      description: tx.description,
      amount: tx.amount,
      category: (tx.category as any)?.name,
      emoji: (tx.category as any)?.emoji,
    }));
    const total = items.reduce((sum, t) => sum + t.amount, 0);

    return buildQueryPeriodResponse({
      userName: user.name,
      period: 'ontem',
      transactions: items,
      total,
      count: items.length,
      tone: user.tone,
    });
  }

  // ── Balance ──────────────────────────────────────────────
  if (query.type === 'balance') {
    const txs = await getMonthTransactions(userId, now);

    const expenses = txs.filter((t) => t.type === 'expense');
    const income = txs.filter((t) => t.type === 'income');

    const totalExpense = expenses.reduce((sum, t) => sum + t.amount, 0);
    const totalIncome = income.reduce((sum, t) => sum + t.amount, 0);
    const balance = totalIncome - totalExpense;
    const left = daysLeftInMonth(now);
    const dailyBudget = left > 0 ? balance / left : 0;

    return buildQueryBalanceResponse({
      userName: user.name,
      balance,
      totalExpense,
      totalIncome,
      daysLeft: left,
      dailyBudget: Math.max(0, dailyBudget),
      tone: user.tone,
    });
  }

  // ── Category ─────────────────────────────────────────────
  if (query.type === 'category' && query.term) {
    const cat = await matchCategory(query.term, userId);
    if (!cat) {
      return `Nao achei categoria pra "${query.term}".`;
    }

    const { data: txs } = await supabaseAdmin
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .eq('type', 'expense')
      .eq('category_id', cat.id)
      .eq('month_label', monthLabel(now))
      .gte('date', monthStart.toISOString())
      .order('date', { ascending: false });

    const items = (txs || []).map((tx) => ({
      description: tx.description,
      amount: tx.amount,
      date: tx.date,
    }));
    const total = items.reduce((sum, t) => sum + t.amount, 0);

    return buildQueryCategoryResponse({
      userName: user.name,
      categoryName: cat.name,
      categoryEmoji: cat.emoji || '📁',
      transactions: items,
      total,
      count: items.length,
      tone: user.tone,
    });
  }

  // ── Biggest ──────────────────────────────────────────────
  if (query.type === 'biggest') {
    const txs = await getMonthTransactions(userId, now);
    const expenses = txs.filter((t) => t.type === 'expense');

    if (expenses.length === 0) {
      return `Nenhum gasto registrado esse mes, ${user.name.split(' ')[0]}.`;
    }

    const sorted = [...expenses].sort((a, b) => b.amount - a.amount);
    const top = sorted[0];
    const cat = top.category as { name: string; emoji: string } | null;
    const emoji = cat?.emoji ?? '💸';
    const catLabel = cat ? ` em ${friendlyName(cat.name)}` : '';

    const lines: string[] = [];
    lines.push(`${emoji} Maior gasto do mes, ${user.name.split(' ')[0]}:`);
    lines.push('');
    lines.push(`${top.description} — ${fmtValor(top.amount)}${catLabel}`);
    lines.push(`Data: ${fmtDate(new Date(top.date))}`);

    if (sorted.length >= 3) {
      lines.push('');
      lines.push('🏆 Top 3:');
      for (let i = 0; i < Math.min(3, sorted.length); i++) {
        const tx = sorted[i];
        const txCat = tx.category as { name: string; emoji: string } | null;
        const em = txCat?.emoji ?? '•';
        lines.push(`${i + 1}. ${em} ${tx.description} — ${fmtValor(tx.amount)}`);
      }
    }

    return lines.join('\n');
  }

  // ── Last N ───────────────────────────────────────────────
  if (query.type === 'last_n') {
    const n = query.count ?? 5;

    const { data: txs } = await supabaseAdmin
      .from('transactions')
      .select('*, category:categories(name, emoji)')
      .eq('user_id', userId)
      .eq('type', 'expense')
      .order('date', { ascending: false })
      .limit(n);

    const items = txs || [];
    if (items.length === 0) {
      return `Nenhum gasto registrado ainda, ${user.name.split(' ')[0]}.`;
    }

    const lines: string[] = [];
    lines.push(`📋 Ultimos ${items.length} gastos, ${user.name.split(' ')[0]}:`);
    lines.push('');

    for (const tx of items) {
      const cat = tx.category as { name: string; emoji: string } | null;
      const emoji = cat?.emoji ?? '•';
      lines.push(`${emoji} ${tx.description} — ${fmtValor(tx.amount)} (${fmtDate(new Date(tx.date))})`);
    }

    const total = items.reduce((sum: number, t: any) => sum + t.amount, 0);
    lines.push('');
    lines.push(`Total: ${fmtValor(total)}`);

    return lines.join('\n');
  }

  // ── Compare ──────────────────────────────────────────────
  if (query.type === 'compare' && query.term && query.term2) {
    const cat1 = await matchCategory(query.term, userId);
    const cat2 = await matchCategory(query.term2, userId);

    if (!cat1 || !cat2) {
      const missing = !cat1 ? query.term : query.term2;
      return `Nao achei categoria pra "${missing}".`;
    }

    const fetchCatTotal = async (catId: string) => {
      const { data: txs } = await supabaseAdmin
        .from('transactions')
        .select('amount')
        .eq('user_id', userId)
        .eq('type', 'expense')
        .eq('category_id', catId)
        .eq('month_label', monthLabel(now))
        .gte('date', monthStart.toISOString());
      return (txs || []).reduce((sum, t) => sum + t.amount, 0);
    };

    const [total1, total2] = await Promise.all([
      fetchCatTotal(cat1.id),
      fetchCatTotal(cat2.id),
    ]);

    const e1 = cat1.emoji || '📁';
    const e2 = cat2.emoji || '📁';
    const n1 = friendlyName(cat1.name);
    const n2 = friendlyName(cat2.name);

    const lines: string[] = [];
    lines.push(`⚖️ Comparativo, ${user.name.split(' ')[0]}:`);
    lines.push('');
    lines.push(`${e1} ${n1}: ${fmtValor(total1)}`);
    lines.push(`${e2} ${n2}: ${fmtValor(total2)}`);
    lines.push('');

    if (total1 > total2) {
      const diff = total1 - total2;
      lines.push(`${n1} ta ${fmtValor(diff)} na frente.`);
    } else if (total2 > total1) {
      const diff = total2 - total1;
      lines.push(`${n2} ta ${fmtValor(diff)} na frente.`);
    } else {
      lines.push('Empate tecnico!');
    }

    return lines.join('\n');
  }

  // ── Daily Average ────────────────────────────────────────
  if (query.type === 'daily_avg') {
    const txs = await getMonthTransactions(userId, now);
    const expenses = txs.filter((t) => t.type === 'expense');
    const totalExpense = expenses.reduce((sum, t) => sum + t.amount, 0);
    const daysPassed = now.getDate();
    const avg = daysPassed > 0 ? totalExpense / daysPassed : 0;

    const lines: string[] = [];
    lines.push(`📊 Media diaria, ${user.name.split(' ')[0]}:`);
    lines.push('');
    lines.push(`Total do mes: ${fmtValor(totalExpense)}`);
    lines.push(`Dias passados: ${daysPassed}`);
    lines.push(`Media: ${fmtValor(avg)} por dia`);

    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const projection = avg * daysInMonth;
    lines.push('');
    lines.push(`📈 Projecao fim do mes: ${fmtValor(projection)}`);

    return lines.join('\n');
  }

  // ── Remaining ────────────────────────────────────────────
  if (query.type === 'remaining') {
    const txs = await getMonthTransactions(userId, now);

    const expenses = txs.filter((t) => t.type === 'expense');
    const income = txs.filter((t) => t.type === 'income');

    const totalExpense = expenses.reduce((sum, t) => sum + t.amount, 0);
    const totalIncome = income.reduce((sum, t) => sum + t.amount, 0);
    const balance = totalIncome - totalExpense;
    const left = daysLeftInMonth(now);
    const dailyBudget = left > 0 ? balance / left : 0;

    return buildQueryBalanceResponse({
      userName: user.name,
      balance,
      totalExpense,
      totalIncome,
      daysLeft: left,
      dailyBudget: Math.max(0, dailyBudget),
      tone: user.tone,
    });
  }

  // ── Status ───────────────────────────────────────────────
  if (query.type === 'status') {
    const txs = await getMonthTransactions(userId, now);

    const expenses = txs.filter((t) => t.type === 'expense');
    const income = txs.filter((t) => t.type === 'income');

    const totalExpense = expenses.reduce((sum, t) => sum + t.amount, 0);
    const totalIncome = income.reduce((sum, t) => sum + t.amount, 0);
    const balance = totalIncome - totalExpense;
    const left = daysLeftInMonth(now);
    const dailyBudget = left > 0 ? balance / left : 0;
    const daysPassed = now.getDate();
    const dailyAvg = daysPassed > 0 ? totalExpense / daysPassed : 0;
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const projection = dailyAvg * daysInMonth;

    const nome = user.name.split(' ')[0];
    const lines: string[] = [];

    if (balance < 0) {
      lines.push(`🔴 ${nome}, ce ta no vermelho.`);
    } else if (dailyBudget < 20) {
      lines.push(`🟡 ${nome}, ta apertado.`);
    } else {
      lines.push(`🟢 ${nome}, ta de boa.`);
    }

    lines.push('');
    lines.push(`💰 Receita: ${fmtValor(totalIncome)}`);
    lines.push(`💸 Gastos: ${fmtValor(totalExpense)}`);
    lines.push(`📊 Saldo: ${fmtValor(balance)}`);
    lines.push('');
    lines.push(`📅 Faltam ${left} dias | ${fmtValor(Math.max(0, dailyBudget))}/dia`);
    lines.push(`📈 Projecao: ${fmtValor(projection)} ate o fim do mes`);

    if (balance < 0) {
      lines.push('');
      lines.push(user.tone === 'neutro'
        ? 'Atencao: seus gastos ultrapassaram a receita.'
        : 'Hora de segurar a onda.');
    }

    return lines.join('\n');
  }

  return 'Nao entendi a pergunta. Tenta de outro jeito?';
}
