import { supabaseAdmin } from '@/lib/supabase';
import { fmtValor, friendlyName } from '@/lib/formatter';
import { Transaction } from '@/types';

export async function handleUndo(userId: string, phone: string): Promise<string> {
  // Get last transaction from config
  const { data: config } = await supabaseAdmin
    .from('config')
    .select('value')
    .eq('user_id', userId)
    .eq('key', 'last_transaction')
    .single();

  if (!config || !config.value) {
    return 'Não tem nada pra desfazer.';
  }

  const { transaction_id, timestamp } = config.value;
  const txTimestamp = new Date(timestamp);
  const now = new Date();
  const diffMinutes = (now.getTime() - txTimestamp.getTime()) / 60000;

  // Validate timestamp (max 2 hours)
  if (diffMinutes > 120) {
    return 'Tá muito tempo que fez isso. Não dá pra desfazer.';
  }

  // Read actual transaction to confirm
  const { data: transaction } = await supabaseAdmin
    .from('transactions')
    .select('*')
    .eq('id', transaction_id)
    .single();

  if (!transaction) {
    return 'Transação não encontrada.';
  }

  // Delete transaction
  const { error: deleteError } = await supabaseAdmin
    .from('transactions')
    .delete()
    .eq('id', transaction_id);

  if (deleteError) {
    console.error('Delete error:', deleteError);
    return 'Erro ao desfazer. Tenta de novo.';
  }

  // Log deletion
  await supabaseAdmin.from('transaction_log').insert([
    {
      user_id: userId,
      action: 'delete',
      transaction_id: transaction_id,
      details: { description: transaction.description, amount: transaction.amount },
      created_at: new Date().toISOString(),
    },
  ]);

  // Clear last_transaction
  await supabaseAdmin
    .from('config')
    .delete()
    .eq('user_id', userId)
    .eq('key', 'last_transaction');

  const type = transaction.type === 'income' ? 'Entrada' : 'Gasto';
  const desc = transaction.description || 'registro';

  return `Apagado. ${type}: ${desc}, ${fmtValor(transaction.amount)} removido.`;
}
