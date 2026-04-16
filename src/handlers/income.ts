import { supabaseAdmin } from '@/lib/supabase';
import { monthLabel } from '@/lib/formatter';
import { buildIncomeResponse } from '@/lib/responses';
import { ParsedIncome, Transaction } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { syncTransactionInBackground } from '@/lib/sheets-sync';

export async function handleIncome(
  userId: string,
  parsed: ParsedIncome,
  phone: string
): Promise<string> {
  const transactionId = uuidv4();
  const now = new Date();

  const transaction: Transaction = {
    id: transactionId,
    user_id: userId,
    type: 'income',
    description: parsed.source,
    amount: parsed.amount,
    category_id: null,
    payment_method: null,
    date: parsed.date.toISOString(),
    month_label: parsed.month_label,
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  };

  // Insert transaction
  const { error: txError } = await supabaseAdmin.from('transactions').insert([transaction]);
  if (txError) {
    console.error('Income insert error:', txError);
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
      new_value: { source: parsed.source, amount: parsed.amount },
      created_at: now.toISOString(),
    },
  ]);

  // Fetch user name and tone
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('name, tone')
    .eq('id', userId)
    .single();

  const userName = user?.name ?? 'Usuário';
  const tone = user?.tone ?? 'cria';

  // Query month totals for balance
  const currentMonthLabel = monthLabel(now);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [expenseResult, incomeResult] = await Promise.all([
    supabaseAdmin
      .from('transactions')
      .select('amount')
      .eq('user_id', userId)
      .eq('type', 'expense')
      .eq('month_label', currentMonthLabel)
      .gte('date', monthStart.toISOString()),
    supabaseAdmin
      .from('transactions')
      .select('amount')
      .eq('user_id', userId)
      .eq('type', 'income')
      .eq('month_label', currentMonthLabel)
      .gte('date', monthStart.toISOString()),
  ]);

  const monthExpense = (expenseResult.data || []).reduce((sum, tx) => sum + tx.amount, 0);
  const monthIncome = (incomeResult.data || []).reduce((sum, tx) => sum + tx.amount, 0);
  const balance = monthIncome - monthExpense;

  return buildIncomeResponse({
    userName,
    source: parsed.source,
    amount: parsed.amount,
    tone,
    monthIncome,
    monthExpense,
    balance,
  });
}
