import { supabaseAdmin } from '@/lib/supabase';
import { fmtValor } from '@/lib/formatter';
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

  return `Entrada registrada. ${parsed.source}, ${fmtValor(parsed.amount)}.`;
}
