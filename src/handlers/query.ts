import { supabaseAdmin } from '@/lib/supabase';
import { fmtValor, friendlyName, monthLabel, fmtDate } from '@/lib/formatter';
import { matchCategory } from '@/lib/categories';
import { QueryResult } from '@/types';

export async function handleQuery(userId: string, query: QueryResult): Promise<string> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  if (query.type === 'summary') {
    // Month summary
    const { data: txs } = await supabaseAdmin
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .eq('month_label', monthLabel(now))
      .gte('date', monthStart.toISOString());

    const expenses = (txs || []).filter((t) => t.type === 'expense');
    const income = (txs || []).filter((t) => t.type === 'income');

    const totalExpense = expenses.reduce((sum, t) => sum + t.amount, 0);
    const totalIncome = income.reduce((sum, t) => sum + t.amount, 0);

    // Top categories
    const catTotals = new Map<string, { total: number; name: string; emoji: string }>();
    for (const tx of expenses) {
      if (!tx.category_id) continue;
      const entry = catTotals.get(tx.category_id) || { total: 0, name: '', emoji: '' };
      entry.total += tx.amount;
      catTotals.set(tx.category_id, entry);
    }

    const sorted = Array.from(catTotals.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 3);

    let categoryStr = '';
    for (const cat of sorted) {
      const pct = ((cat.total / totalExpense) * 100).toFixed(0);
      categoryStr += `${cat.name} (${pct}%), `;
    }
    categoryStr = categoryStr.slice(0, -2);

    const balance = totalIncome - totalExpense;
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysPassed = now.getDate();
    const daysLeft = daysInMonth - daysPassed;
    const dailyBudget = daysLeft > 0 ? balance / daysLeft : 0;

    return `Resumo de ${monthLabel(now)}: gastou ${fmtValor(totalExpense)}, recebeu ${fmtValor(totalIncome)}. Top: ${categoryStr}. Sobrou ${fmtValor(balance)}. Orçamento diário: ${fmtValor(Math.max(0, dailyBudget))}.`;
  }

  if (query.type === 'week') {
    const weekStart = new Date(now.getTime() - 7 * 86400000);
    const { data: txs } = await supabaseAdmin
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .eq('type', 'expense')
      .gte('date', weekStart.toISOString());

    const total = (txs || []).reduce((sum, t) => sum + t.amount, 0);
    const count = txs?.length || 0;

    return `Última semana: ${count} gastos, total ${fmtValor(total)}.`;
  }

  if (query.type === 'today') {
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 86400000);

    const { data: txs } = await supabaseAdmin
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .eq('type', 'expense')
      .gte('date', todayStart.toISOString())
      .lt('date', todayEnd.toISOString());

    const total = (txs || []).reduce((sum, t) => sum + t.amount, 0);
    const count = txs?.length || 0;

    return `Hoje: ${count} gastos, total ${fmtValor(total)}.`;
  }

  if (query.type === 'yesterday') {
    const yesterdayStart = new Date(now.getTime() - 86400000);
    const yesterdayStart2 = new Date(yesterdayStart.getFullYear(), yesterdayStart.getMonth(), yesterdayStart.getDate());
    const yesterdayEnd = new Date(yesterdayStart2.getTime() + 86400000);

    const { data: txs } = await supabaseAdmin
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .eq('type', 'expense')
      .gte('date', yesterdayStart2.toISOString())
      .lt('date', yesterdayEnd.toISOString());

    const total = (txs || []).reduce((sum, t) => sum + t.amount, 0);
    const count = txs?.length || 0;

    return `Ontem: ${count} gastos, total ${fmtValor(total)}.`;
  }

  if (query.type === 'balance') {
    const { data: txs } = await supabaseAdmin
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .eq('month_label', monthLabel(now))
      .gte('date', monthStart.toISOString());

    const expenses = (txs || []).filter((t) => t.type === 'expense');
    const income = (txs || []).filter((t) => t.type === 'income');

    const totalExpense = expenses.reduce((sum, t) => sum + t.amount, 0);
    const totalIncome = income.reduce((sum, t) => sum + t.amount, 0);
    const balance = totalIncome - totalExpense;

    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysLeft = daysInMonth - now.getDate();
    const dailyBudget = daysLeft > 0 ? balance / daysLeft : 0;

    return `Saldo: ${fmtValor(balance)}. Pra gastar ${daysLeft} dias: ${fmtValor(Math.max(0, dailyBudget))} por dia.`;
  }

  if (query.type === 'category' && query.term) {
    const cat = await matchCategory(query.term, userId);
    if (!cat) {
      return `Não achei categoria pra "${query.term}".`;
    }

    const { data: txs } = await supabaseAdmin
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .eq('type', 'expense')
      .eq('category_id', cat.id)
      .eq('month_label', monthLabel(now))
      .gte('date', monthStart.toISOString());

    const total = (txs || []).reduce((sum, t) => sum + t.amount, 0);
    const count = txs?.length || 0;

    return `${friendlyName(cat.name)}: ${count} gastos, total ${fmtValor(total)} este mês.`;
  }

  return 'Não entendi a query.';
}
