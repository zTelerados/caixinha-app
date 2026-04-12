import { supabaseAdmin } from '@/lib/supabase';
import { sendWhatsApp } from '@/lib/twilio';
import { resolveCategory, suggestCategory, matchCategory } from '@/lib/categories';
import { PendingAction, ParsedMessage } from '@/types';
import { normalize } from '@/lib/formatter';
import { handleExpense } from './expense';
import { v4 as uuidv4 } from 'uuid';

export async function handlePending(
  userId: string,
  phone: string,
  message: string,
  pending: PendingAction
): Promise<string> {
  const msgNorm = normalize(message);

  try {
    if (pending.type === 'category') {
      // Message is response to category suggestion
      const payload = pending.payload as { parsed: ParsedMessage; suggestedCategoryId?: string };
      const parsed = payload.parsed;

      // Check if user is confirming suggestion
      if (payload.suggestedCategoryId && /^(sim|s|isso|ok|tá|ta)$/.test(msgNorm)) {
        // Use suggested category
        parsed.category_id = payload.suggestedCategoryId;
      } else {
        // Try to resolve category from message
        const resolved = await resolveCategory(message, userId);
        if (resolved) {
          parsed.category_id = resolved.id;
        } else {
          // Category not resolved, ask again
          const suggested = await suggestCategory(parsed.description, userId);
          const newPending: PendingAction = {
            id: uuidv4(),
            user_id: userId,
            type: 'category',
            payload: {
              parsed,
              suggestedCategoryId: suggested?.id,
            },
            expires_at: new Date(Date.now() + 5 * 60000).toISOString(),
            created_at: new Date().toISOString(),
          };
          await supabaseAdmin.from('pending_actions').insert([newPending]);

          if (suggested) {
            return `Entendi. Tá em ${suggested.emoji} ${suggested.name}? (sim/não)`;
          }
          return 'Em qual categoria? (alimentação, transporte, lazer...)';
        }
      }

      // Now check if we need payment method
      if (!parsed.payment_method) {
        const newPending: PendingAction = {
          id: uuidv4(),
          user_id: userId,
          type: 'payment_method',
          payload: { parsed },
          expires_at: new Date(Date.now() + 5 * 60000).toISOString(),
          created_at: new Date().toISOString(),
        };
        await supabaseAdmin.from('pending_actions').insert([newPending]);

        await supabaseAdmin.from('pending_actions').delete().eq('id', pending.id);

        return 'Crédito, pix ou dinheiro?';
      }

      // Complete the expense
      const response = await handleExpense(userId, parsed, phone);

      // Delete pending action
      await supabaseAdmin.from('pending_actions').delete().eq('id', pending.id);

      return response;
    }

    if (pending.type === 'payment_method') {
      // Message is response to payment method question
      const payload = pending.payload as { parsed: ParsedMessage };
      const parsed = payload.parsed;

      const msgLow = message.toLowerCase();
      if (msgLow.includes('credito') || msgLow.includes('crédito')) {
        parsed.payment_method = 'Crédito';
      } else if (msgLow.includes('pix')) {
        parsed.payment_method = 'Pix';
      } else if (msgLow.includes('dinheiro') || msgLow.includes('cash') || msgLow.includes('especie')) {
        parsed.payment_method = 'Dinheiro';
      } else {
        // Invalid payment method, ask again
        const newPending: PendingAction = {
          id: uuidv4(),
          user_id: userId,
          type: 'payment_method',
          payload: { parsed },
          expires_at: new Date(Date.now() + 5 * 60000).toISOString(),
          created_at: new Date().toISOString(),
        };
        await supabaseAdmin.from('pending_actions').insert([newPending]);

        await supabaseAdmin.from('pending_actions').delete().eq('id', pending.id);

        return 'Crédito, pix ou dinheiro?';
      }

      // Complete the expense
      const response = await handleExpense(userId, parsed, phone);

      // Delete pending action
      await supabaseAdmin.from('pending_actions').delete().eq('id', pending.id);

      return response;
    }

    return 'Pending action inválido.';
  } catch (e) {
    console.error('Pending action error:', e);
    await supabaseAdmin.from('pending_actions').delete().eq('id', pending.id);
    return 'Erro ao processar. Tenta de novo.';
  }
}
