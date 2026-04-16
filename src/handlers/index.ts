import { supabaseAdmin } from '@/lib/supabase';
import { sendWhatsApp } from '@/lib/twilio';
import { getCategories, suggestCategory, matchCategory } from '@/lib/categories';
import {
  detectUndo,
  detectCorrection,
  detectIncome,
  detectQuery,
  detectCategoryCommand,
  parseExpense,
} from '@/lib/parser';
import { PendingAction } from '@/types';
import { handleUndo } from './undo';
import { handleCorrection } from './correction';
import { handleIncome } from './income';
import { handleQuery } from './query';
import { handleCategoryCommand } from './category-command';
import { handlePending } from './pending';
import { handleExpense } from './expense';
import { v4 as uuidv4 } from 'uuid';

export async function routeMessage(
  phone: string,
  message: string,
  audioTranscription?: string,
): Promise<void> {
  // Helper: wraps response with audio prefix when transcription is present
  const send = async (msg: string) => {
    const finalMsg = audioTranscription ? wrapAudioResponse(msg, audioTranscription) : msg;
    await sendWhatsApp(phone, finalMsg);
  };

  try {
    // Find user by phone
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('phone', phone)
      .single();

    if (!user) {
      await sendWhatsApp(phone, 'Número não autorizado.');
      return;
    }

    // Get user's categories
    const categories = await getCategories(user.id);

    // Check for expired pending actions
    const { data: pendingList } = await supabaseAdmin
      .from('pending_actions')
      .select('*')
      .eq('user_id', user.id);

    const now = new Date();
    for (const p of pendingList || []) {
      if (new Date(p.expires_at) < now) {
        await supabaseAdmin.from('pending_actions').delete().eq('id', p.id);
      }
    }

    // Priority 1: Undo
    if (detectUndo(message)) {
      await supabaseAdmin.from('pending_actions').delete().eq('user_id', user.id);
      const response = await handleUndo(user.id, phone);
      await send(response);
      return;
    }

    // Priority 2: Correction
    const correction = detectCorrection(message);
    if (correction) {
      await supabaseAdmin.from('pending_actions').delete().eq('user_id', user.id);
      const response = await handleCorrection(user.id, phone, correction);
      await send(response);
      return;
    }

    // Priority 3: Income
    const income = detectIncome(message);
    if (income) {
      await supabaseAdmin.from('pending_actions').delete().eq('user_id', user.id);
      const response = await handleIncome(user.id, income, phone);
      await send(response);
      return;
    }

    // Priority 4: Query
    const query = detectQuery(message);
    if (query) {
      await supabaseAdmin.from('pending_actions').delete().eq('user_id', user.id);
      const response = await handleQuery(user.id, query);
      await send(response);
      return;
    }

    // Priority 5: Category Command
    const categoryCmd = detectCategoryCommand(message);
    if (categoryCmd) {
      await supabaseAdmin.from('pending_actions').delete().eq('user_id', user.id);
      const response = await handleCategoryCommand(user.id, phone, categoryCmd);
      await send(response);
      return;
    }

    // Priority 6: Pending Action Check
    const { data: pending } = await supabaseAdmin
      .from('pending_actions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1);

    if (pending && pending.length > 0) {
      const response = await handlePending(user.id, phone, message, pending[0]);
      await send(response);
      return;
    }

    // Priority 7: Parse Expense
    const parsed = parseExpense(message, categories);
    if (parsed) {
      let response: string;

      // Check if category is missing
      if (!parsed.category_id) {
        // Try to match using learned_items and fuzzy matching via matchCategory
        const matched = await matchCategory(parsed.description, user.id);
        if (matched) {
          parsed.category_id = matched.id;
          parsed.category_name = matched.name;
          parsed.category_source = 'learned';
        } else {
          const suggested = await suggestCategory(parsed.description, user.id);
          const newPending: PendingAction = {
            id: uuidv4(),
            user_id: user.id,
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
            response = `${parsed.description} de ${parsed.amount}. Tá em ${suggested.emoji} ${suggested.name}? (sim/não)`;
          } else {
            response = `${parsed.description} de ${parsed.amount}. Em qual categoria? (alimentação, transporte, lazer...)`;
          }

          await send(response);
          return;
        }
      }

      // Check if payment method is missing
      if (!parsed.payment_method) {
        const newPending: PendingAction = {
          id: uuidv4(),
          user_id: user.id,
          type: 'payment_method',
          payload: { parsed },
          expires_at: new Date(Date.now() + 5 * 60000).toISOString(),
          created_at: new Date().toISOString(),
        };
        await supabaseAdmin.from('pending_actions').insert([newPending]);

        response = 'Crédito, pix ou dinheiro?';
        await send(response);
        return;
      }

      // Complete the expense
      response = await handleExpense(user.id, parsed, phone);
      await send(response);
      return;
    }

    // Nothing matched
    const fallback =
      'Não entendi. Tenta algo tipo: uber 23 pix, açaí 17, recebi 500 da mãe, resumo, categorias.';
    await send(fallback);
  } catch (e) {
    console.error('Route message error:', e);
    await sendWhatsApp(phone, 'Erro ao processar. Tenta de novo.');
  }
}

/**
 * Wraps a response with the audio transcription prefix when the message
 * originated from a voice note.
 */
function wrapAudioResponse(response: string, transcription: string): string {
  return `🎤 Ouvi: "${transcription}"\n\n${response}\n\nSe eu entendi errado, me corrige.`;
}
