import { supabaseAdmin } from './supabase';
import { monthLabel } from './formatter';
import { buildAnomalyAlert, AnomalyAlertData } from './narrative';
import { Transaction } from '@/types';

export async function checkAnomalies(userId: string, transaction: Transaction): Promise<string | null> {
  try {
    // 1. Check amount > 2x category average (last 30 days)
    const alert = await checkHighAmount(userId, transaction);
    if (alert) return alert;

    // 2. Check category accumulated > user-defined limit
    const limitAlert = await checkCategoryLimit(userId, transaction);
    if (limitAlert) return limitAlert;

    // 3. Check frequency (>5 in same category in 24h)
    const frequencyAlert = await checkFrequency(userId, transaction);
    if (frequencyAlert) return frequencyAlert;

    // 4. Check pace (current month > 30% above same period last month)
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

  // Get last 30 days of transactions in same category
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
  const { data: categoryTxs } = await supabaseAdmin
    .from('transactions')
    .select('amount')
    .eq('user_id', userId)
    .eq('type', 'expense')
    .eq('category_id', transaction.category_id)
    .gte('date', thirtyDaysAgo.toISOString());

  if (!categoryTxs || categoryTxs.length === 0) return null;

  const avg = categoryTxs.reduce((sum, tx) => sum + tx.amount, 0) / categoryTxs.length;
  const threshold = avg * 2;

  if (transaction.amount > threshold) {
    // Get category info for emoji
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

  // Get user config for category limit
  const { data: config } = await supabaseAdmin
    .from('config')
    .select('value')
    .eq('user_id', userId)
    .eq('key', `category_limit_${transaction.category_id}`)
    .single();

  if (!config || !config.value?.limit) return null;

  const limit = config.value.limit;

  // Get current month accumulated for this category
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
    // Get category info
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

  // Count transactions in this category in last 24h (after adding current one)
  const oneDayAgo = new Date(Date.now() - 24 * 86400000);
  const { data: recentTxs } = await supabaseAdmin
    .from('transactions')
    .select('id')
    .eq('user_id', userId)
    .eq('type', 'expense')
    .eq('category_id', transaction.category_id)
    .gte('date', oneDayAgo.toISOString());

  const count = (recentTxs || []).length + 1; // +1 for current transaction

  if (count > 5) {
    // Get category info
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

  // Get current month accumulated (including this transaction)
  const { data: monthTxs } = await supabaseAdmin
    .from('transactions')
    .select('amount')
    .eq('user_id', userId)
    .eq('type', 'expense')
    .eq('month_label', monthLabel(now))
    .gte('date', monthStart.toISOString());

  const currentMonthTotal = (monthTxs || []).reduce((sum, tx) => sum + tx.amount, 0) + transaction.amount;

  // Get same period last month
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthLabel = monthLabel(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  const { data: lastMonthTxs } = await supabaseAdmin
    .from('transactions')
    .select('amount, date')
    .eq('user_id', userId)
    .eq('type', 'expense')
    .eq('month_label', lastMonthLabel)
    .gte('date', lastMonthStart.toISOString());

  // Compare same day period of last month
  const sameDataLastMonth = (lastMonthTxs || [])
    .filter((tx) => {
      const txDate = new Date(tx.date || '');
      return txDate.getDate() <= dayOfMonth;
    })
    .reduce((sum, tx) => sum + tx.amount, 0);

  if (sameDataLastMonth === 0) return null;

  // Project the month
  const projectedMonth = (currentMonthTotal / dayOfMonth) * 30; // assuming 30 days
  const threshold = sameDataLastMonth * 1.3; // 30% above

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
