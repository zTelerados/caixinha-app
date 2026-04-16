import { supabaseAdmin } from './supabase';
import { monthLabel } from './formatter';
import { buildAnomalyAlert, AnomalyAlertData } from './narrative';
import { Transaction } from '@/types';

export async function checkAnomalies(userId: string, transaction: Transaction): Promise<string | null> {
  try {
    const alert = await checkHighAmount(userId, transaction);
    if (alert) return alert;

    const limitAlert = await checkCategoryLimit(userId, transaction);
    if (limitAlert) return limitAlert;

    const frequencyAlert = await checkFrequency(userId, transaction);
    if (frequencyAlert) return frequencyAlert;

    const paceAlert = await checkPace(userId, transaction);
    if (paceAlert) return paceAlert;

    return null;
  } catch (err) {
    console.error('Anomaly check error:', err);
    return null;
  }
}

async function checkHighAmount(userId: string, transaction: Transaction): Promise<string | null> {
  if (!transaction.category_id) return null;

  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
  const { data: categoryTxs } = await supabaseAdmin
    .from('transactions')
    .select('amount, id')
    .eq('user_id', userId)
    .eq('type', 'expense')
    .eq('category_id', transaction.category_id)
    .gte('date', thirtyDaysAgo.toISOString());

  // Exclude the transaction we just inserted
  const previous = (categoryTxs || []).filter((tx) => tx.id !== transaction.id);

  // Need at least 5 previous transactions for a meaningful average
  if (previous.length < 5) return null;

  const avg = previous.reduce((sum, tx) => sum + tx.amount, 0) / previous.length;
  const threshold = avg * 2.5;

  if (transaction.amount > threshold) {
    const { data: cat } = await supabaseAdmin
      .from('categories')
      .select('name, emoji')
      .eq('id', transaction.category_id)
      .single();

    const alertData: AnomalyAlertData = {
      type: 'high_amount',
      amount: transaction.amount,
      categoryAvg: avg,
      category: cat ? { name: cat.name, emoji: cat.emoji } : undefined,
    };

    return buildAnomalyAlert(alertData);
  }

  return null;
}

async function checkCategoryLimit(userId: string, transaction: Transaction): Promise<string | null> {
  if (!transaction.category_id) return null;

  const { data: config } = await supabaseAdmin
    .from('config')
    .select('value')
    .eq('user_id', userId)
    .eq('key', 'category_limit_' + transaction.category_id)
    .single();

  if (!config || !config.value?.limit) return null;

  const limit = config.value.limit;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const { data: monthTxs } = await supabaseAdmin
    .from('transactions')
    .select('amount')
    .eq('user_id', userId)
    .eq('type', 'expense')
    .eq('category_id', transaction.category_id)
    .eq('month_label', monthLabel(now))
    .gte('date', monthStart.toISOString());

  const totalWithNew = (monthTxs || []).reduce((sum, tx) => sum + tx.amount, 0) + transaction.amount;

  if (totalWithNew > limit) {
    const { data: cat } = await supabaseAdmin
      .from('categories')
      .select('name, emoji')
      .eq('id', transaction.category_id)
      .single();

    const alertData: AnomalyAlertData = {
      type: 'category_limit',
      categoryTotal: totalWithNew,
      categoryLimit: limit,
      category: cat ? { name: cat.name, emoji: cat.emoji } : undefined,
    };

    return buildAnomalyAlert(alertData);
  }

  return null;
}

async function checkFrequency(userId: string, transaction: Transaction): Promise<string | null> {
  if (!transaction.category_id) return null;

  const oneDayAgo = new Date(Date.now() - 24 * 86400000);
  const { data: recentTxs } = await supabaseAdmin
    .from('transactions')
    .select('id')
    .eq('user_id', userId)
    .eq('type', 'expense')
    .eq('category_id', transaction.category_id)
    .gte('date', oneDayAgo.toISOString());

  const count = (recentTxs || []).length + 1;

  if (count > 5) {
    const { data: cat } = await supabaseAdmin
      .from('categories')
      .select('name, emoji')
      .eq('id', transaction.category_id)
      .single();

    const alertData: AnomalyAlertData = {
      type: 'frequency',
      transactionCount: count,
      category: cat ? { name: cat.name, emoji: cat.emoji } : undefined,
    };

    return buildAnomalyAlert(alertData);
  }

  return null;
}

async function checkPace(userId: string, transaction: Transaction): Promise<string | null> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const dayOfMonth = now.getDate();

  const { data: monthTxs } = await supabaseAdmin
    .from('transactions')
    .select('amount')
    .eq('user_id', userId)
    .eq('type', 'expense')
    .eq('month_label', monthLabel(now))
    .gte('date', monthStart.toISOString());

  const currentMonthTotal = (monthTxs || []).reduce((sum, tx) => sum + tx.amount, 0) + transaction.amount;

  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthLabel = monthLabel(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  const { data: lastMonthTxs } = await supabaseAdmin
    .from('transactions')
    .select('amount, date')
    .eq('user_id', userId)
    .eq('type', 'expense')
    .eq('month_label', lastMonthLabel)
    .gte('date', lastMonthStart.toISOString());

  const sameDataLastMonth = (lastMonthTxs || [])
    .filter((tx) => {
      const txDate = new Date(tx.date || '');
      return txDate.getDate() <= dayOfMonth;
    })
    .reduce((sum, tx) => sum + tx.amount, 0);

  if (sameDataLastMonth === 0) return null;

  const projectedMonth = (currentMonthTotal / dayOfMonth) * 30;
  const threshold = sameDataLastMonth * 1.3;

  if (projectedMonth > threshold) {
    const alertData: AnomalyAlertData = {
      type: 'pace',
      projectedMonth,
      monthBudget: sameDataLastMonth,
    };

    return buildAnomalyAlert(alertData);
  }

  return null;
}
