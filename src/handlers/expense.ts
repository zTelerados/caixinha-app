import { supabaseAdmin } from '@/lib/supabase';
import { sendWhatsApp } from '@/lib/twilio';
import { fmtValor, friendlyName, monthLabel, fmtDate } from '@/lib/formatter';
import { learnItem, getCategories } from '@/lib/categories';
import { ParsedMessage, Transaction, ContextAnalysis } from '@/types';
import { v4 as uuidv4 } from 'uuid';

async function analyzeContext(
  userId: string,
  transaction: Transaction
): Promise<ContextAnalysis> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // Total for the month
  const { data: monthTxs } = await supabaseAdmin
    .from('transactions')
    .select('amount, category_id, date')
    .eq('user_id', userId)
    .eq('type', 'expense')
    .eq('month_label', monthLabel(now))
    .gte('date', monthStart.toISOString());

  const totalMonth = (monthTxs || []).reduce((sum, tx) => sum + tx.amount, 0);
  const income = await supabaseAdmin
    .from('transactions')
    .select('amount')
    .eq('user_id', userId)
    .eq('type', 'income')
    .eq('month_label', monthLabel(now))
    .gte('date', monthStart.toISOString());

  const totalIncome = (income.data || []).reduce((sum, tx) => sum + tx.amount, 0);
  const balance = totalIncome - totalMonth;

  // Category analysis
  const categoryTxs = (monthTxs || []).filter((tx) => tx.category_id === transaction.category_id);
  const totalCategory = categoryTxs.reduce((sum, tx) => sum + tx.amount, 0);
  const countCategory = categoryTxs.length;

  // Week analysis
  const weekStart = new Date(now.getTime() - 7 * 86400000);
  const { data: weekTxs } = await supabaseAdmin
    .from('transactions')
    .select('category_id, amount')
    .eq('user_id', userId)
    .eq('type', 'expense')
    .eq('month_label', monthLabel(now))
    .gte('date', weekStart.toISOString());

  const countCategoryWeek = (weekTxs || []).filter((tx) => tx.category_id === transaction.category_id).length;

  // Today
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayTxs = (monthTxs || []).filter((tx) => new Date(tx.date || '').toDateString() === todayStart.toDateString());
  const countToday = todayTxs.length;

  // Top category
  const categoryTotals = new Map<string, number>();
  (monthTxs || []).forEach((tx) => {
    if (tx.category_id) {
      categoryTotals.set(tx.category_id, (categoryTotals.get(tx.category_id) || 0) + tx.amount);
    }
  });

  let topCategory: string | null = null;
  let topCategoryTotal = 0;
  for (const [catId, total] of categoryTotals) {
    if (total > topCategoryTotal) {
      topCategory = catId;
      topCategoryTotal = total;
    }
  }

  const pctCategory = totalMonth > 0 ? (totalCategory / totalMonth) * 100 : 0;
  const avgCategory = countCategory > 0 ? totalCategory / countCategory : 0;

  let insight: string | null = null;
  let showContext = false;

  // Insights
  if (totalCategory > avgCategory * 1.5) {
    insight = 'acima da média nessa categoria';
    showContext = true;
  } else if (topCategory === transaction.category_id && countCategory === 1) {
    insight = 'primeira vez nessa categoria este mês';
    showContext = true;
  } else if (topCategory === transaction.category_id && countCategory > 1) {
    insight = 'ainda é a categoria com mais gasto';
    showContext = true;
  } else if (totalMonth > totalIncome && balance < 0) {
    insight = 'ó que já gastou mais que ganhou este mês';
    showContext = true;
  }

  return {
    totalMonth,
    totalCategory,
    countCategory,
    countCategoryWeek,
    countToday,
    income: totalIncome,
    balance,
    topCategory,
    topCategoryTotal,
    pctCategory,
    avgCategory,
    showContext,
    insight,
  };
}

export async function handleExpense(
  userId: string,
  parsed: ParsedMessage,
  phone: string
): Promise<string> {
  const transactionId = uuidv4();
  const now = new Date();

  const transaction: Transaction = {
    id: transactionId,
    user_id: userId,
    type: 'expense',
    description: parsed.description,
    amount: parsed.amount,
    category_id: parsed.category_id || null,
    payment_method: parsed.payment_method || null,
    date: parsed.date.toISOString(),
    month_label: parsed.month_label,
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  };

  // Insert transaction
  const { error: txError } = await supabaseAdmin.from('transactions').insert([transaction]);
  if (txError) {
    console.error('Transaction insert error:', txError);
    return 'Erro ao registrar gasto. Tenta de novo.';
  }

  // Save for undo
  await supabaseAdmin
    .from('config')
    .upsert(
      {
        user_id: userId,
        key: 'last_transaction',
        value: { transaction_id: transactionId, timestamp: now.toISOString() },
      },
      { onConflict: 'user_id,key' }
    );

  // Log
  await supabaseAdmin.from('transaction_log').insert([
    {
      user_id: userId,
      action: 'create',
      transaction_id: transactionId,
      old_value: null,
      new_value: { description: parsed.description, amount: parsed.amount },
      created_at: now.toISOString(),
    },
  ]);

  // Learn category if set
  if (parsed.category_id && parsed.description) {
    await learnItem(parsed.category_id, parsed.description);
  }

  // Build response
  let response = `Anotado. ${parsed.description}, ${fmtValor(parsed.amount)}`;
  if (parsed.category_id) {
    const cats = await getCategories(userId);
    const cat = cats.find((c) => c.id === parsed.category_id);
    if (cat) {
      response += ` em ${friendlyName(cat.name)} ${cat.emoji}`;
    }
  }

  // Analyze context
  const ctx = await analyzeContext(userId, transaction);
  if (ctx.showContext && ctx.insight) {
    response += `. ${ctx.insight}`;
  }

  response += '.';

  return response;
}
