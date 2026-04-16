import { supabaseAdmin } from '@/lib/supabase';
import { sendWhatsApp } from '@/lib/twilio';
import { monthLabel } from '@/lib/formatter';
import { learnItem, getCategories } from '@/lib/categories';
import { checkAnomalies } from '@/lib/anomaly';
import { syncTransactionInBackground } from '@/lib/sheets-sync';
import { buildExpenseResponse, ExpenseResponseParams } from '@/lib/responses';
import { ParsedMessage, Transaction } from '@/types';
import { v4 as uuidv4 } from 'uuid';

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
    return 'Nao consegui salvar agora. Manda de novo daqui a pouco.';
  }

  // Espelho na planilha (background, nao trava a resposta)
  syncTransactionInBackground(transaction);

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

  // Fetch user data (name + tone)
  const { data: userData } = await supabaseAdmin
    .from('users')
    .select('name, tone')
    .eq('id', userId)
    .single();

  const userName = userData?.name || 'amigo';
  const tone = userData?.tone || 'cria';

  // Resolve category name + emoji
  let categoryName: string | null = null;
  let categoryEmoji: string | null = null;
  if (parsed.category_id) {
    const cats = await getCategories(userId);
    const cat = cats.find((c) => c.id === parsed.category_id);
    if (cat) {
      categoryName = cat.name;
      categoryEmoji = cat.emoji;
    }
  }

  // Category history — last 5 expenses in same category this month
  let categoryHistory: Array<{ description: string; amount: number; date: string }> = [];
  if (parsed.category_id) {
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const { data: catTxs } = await supabaseAdmin
      .from('transactions')
      .select('description, amount, date')
      .eq('user_id', userId)
      .eq('type', 'expense')
      .eq('category_id', parsed.category_id)
      .eq('month_label', monthLabel(now))
      .gte('date', monthStart.toISOString())
      .order('date', { ascending: false })
      .limit(5);

    categoryHistory = (catTxs || []).map((tx) => ({
      description: tx.description,
      amount: tx.amount,
      date: tx.date,
    }));
  }

  // Month totals — expense sum + income sum
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const { data: expenseTxs } = await supabaseAdmin
    .from('transactions')
    .select('amount')
    .eq('user_id', userId)
    .eq('type', 'expense')
    .eq('month_label', monthLabel(now))
    .gte('date', monthStart.toISOString());

  const monthTotal = (expenseTxs || []).reduce((sum, tx) => sum + tx.amount, 0);

  const { data: incomeTxs } = await supabaseAdmin
    .from('transactions')
    .select('amount')
    .eq('user_id', userId)
    .eq('type', 'income')
    .eq('month_label', monthLabel(now))
    .gte('date', monthStart.toISOString());

  const monthIncome = (incomeTxs || []).reduce((sum, tx) => sum + tx.amount, 0);
  const balance = monthIncome - monthTotal;

  // Build response using the new template system
  const responseParams: ExpenseResponseParams = {
    userName,
    description: parsed.description,
    amount: parsed.amount,
    categoryName,
    categoryEmoji,
    paymentMethod: parsed.payment_method || null,
    date: parsed.date,
    tone,
    categoryHistory,
    monthTotal,
    monthIncome,
    balance,
  };

  const response = buildExpenseResponse(responseParams);

  // Check for anomalies and send alert if triggered
  const anomalyAlert = await checkAnomalies(userId, transaction);
  if (anomalyAlert) {
    await sendWhatsApp(phone, anomalyAlert);
  }

  return response;
}
