import { supabaseAdmin } from '@/lib/supabase';
import { resolveCategory, learnItem, invalidateCache } from '@/lib/categories';
import { fmtValor, friendlyName } from '@/lib/formatter';
import { ParsedCorrection, Transaction } from '@/types';

export async function handleCorrection(
  userId: string,
  phone: string,
  correction: ParsedCorrection
): Promise<string> {
  // Get last transaction from config
  const { data: config } = await supabaseAdmin
    .from('config')
    .select('value')
    .eq('user_id', userId)
    .eq('key', 'last_transaction')
    .single();

  if (!config || !config.value) {
    return 'Não tem nada pra corrigir.';
  }

  const { transaction_id } = config.value;

  // Read actual transaction
  const { data: transaction } = await supabaseAdmin
    .from('transactions')
    .select('*')
    .eq('id', transaction_id)
    .single();

  if (!transaction) {
    return 'Transação não encontrada.';
  }

  let updatedDesc = transaction.description;
  let updatedAmount = transaction.amount;
  let updatedCategoryId = transaction.category_id;

  // Apply correction
  if (correction.type === 'amount' && correction.amount !== undefined) {
    updatedAmount = correction.amount;
  } else if (correction.type === 'category' && correction.term) {
    const newCategory = await resolveCategory(correction.term, userId);
    if (newCategory) {
      updatedCategoryId = newCategory.id;
      await learnItem(newCategory.id, transaction.description);
      invalidateCache();
    } else {
      return `Não achei a categoria "${correction.term}".`;
    }
  }

  // Update transaction
  const { error: updateError } = await supabaseAdmin
    .from('transactions')
    .update({
      amount: updatedAmount,
      category_id: updatedCategoryId,
    })
    .eq('id', transaction_id);

  if (updateError) {
    console.error('Update error:', updateError);
    return 'Erro ao corrigir. Tenta de novo.';
  }

  // Log correction
  await supabaseAdmin.from('transaction_log').insert([
    {
      user_id: userId,
      action: 'update',
      transaction_id: transaction_id,
      old_value: { amount: transaction.amount, category_id: transaction.category_id },
      new_value: { amount: updatedAmount, category_id: updatedCategoryId },
      created_at: new Date().toISOString(),
    },
  ]);

  if (correction.type === 'amount') {
    return `Corrigido. ${transaction.description} agora é ${fmtValor(updatedAmount)}.`;
  } else {
    const { data: cat } = await supabaseAdmin
      .from('categories')
      .select('name, emoji')
      .eq('id', updatedCategoryId)
      .single();

    const catName = cat ? `${friendlyName(cat.name)} ${cat.emoji}` : 'outra categoria';
    return `Corrigido. ${transaction.description} agora tá em ${catName}.`;
  }
}
