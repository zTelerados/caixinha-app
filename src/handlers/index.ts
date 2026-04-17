import { supabaseAdmin } from '@/lib/supabase';
import { sendWhatsApp, sendButtons } from '@/lib/whatsapp';
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
import { handleOnboarding, getOnboardingClosing } from './onboarding';
import { handleConfig } from './config';
import { createDebugContext } from '@/lib/debug-log';
import { v4 as uuidv4 } from 'uuid';

export async function routeMessage(
  phone: string,
  message: string,
  audioTranscription?: string,
): Promise<void> {
  const send = async (msg: string) => {
    const finalMsg = audioTranscription ? wrapAudioResponse(msg, audioTranscription) : msg;
    await sendWhatsApp(phone, finalMsg);
    return finalMsg;
  };

  let dbg: ReturnType<typeof createDebugContext> | null = null;

  try {
    // Onboarding check
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('phone', phone)
      .single();

    if (!existingUser || (existingUser.onboarding_step !== null && existingUser.onboarding_step < 5)) {
      const ob = await handleOnboarding(phone, message);
      if (!ob.done) {
        await sendWhatsApp(phone, ob.response);
        return;
      }
      if (!ob.userId) return;
    }

    const { data: user } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('phone', phone)
      .single();

    if (!user) {
      await sendWhatsApp(phone, 'Erro interno. Tenta de novo.');
      return;
    }

    dbg = createDebugContext(user.id, message);
    if (audioTranscription) {
      dbg.setParsed({ audioTranscription });
    }

    const categories = await getCategories(user.id);
    const onboardingStep = user.onboarding_step;

    // Clean expired pending actions
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

    const maybeAppendClosing = (response: string): string => {
      const closing = getOnboardingClosing(onboardingStep, user.name);
      return closing ? response + closing : response;
    };

    // Priority 0: Config commands
    const configResult = await handleConfig(user.id, message);
    if (configResult.matched) {
      dbg.setIntent('config');
      dbg.setHandler('handleConfig');
      const sent = await send(configResult.response);
      dbg.setResponse(sent);
      await dbg.flush();
      return;
    }

    // Priority 1: Undo
    if (detectUndo(message)) {
      dbg.setIntent('undo');
      dbg.setHandler('handleUndo');
      await supabaseAdmin.from('pending_actions').delete().eq('user_id', user.id);
      const response = await handleUndo(user.id, phone);
      const sent = await send(response);
      dbg.setResponse(sent);
      await dbg.flush();
      return;
    }

    // Priority 2: Pending Action Check
    const { data: pending } = await supabaseAdmin
      .from('pending_actions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1);

    if (pending && pending.length > 0) {
      const p = pending[0];
      dbg.setIntent('pending_response');
      dbg.setPending(JSON.stringify({ type: p.type, id: p.id }));
      dbg.setHandler('handlePending');
      const response = await handlePending(user.id, phone, message, p);
      const sent = await send(maybeAppendClosing(response));
      dbg.setResponse(sent);
      await dbg.flush();
      return;
    }

    // Priority 3: Correction
    const correction = detectCorrection(message);
    if (correction) {
      dbg.setIntent('correction');
      dbg.setHandler('handleCorrection');
      dbg.setParsed(correction as any);
      const response = await handleCorrection(user.id, phone, correction);
      const sent = await send(response);
      dbg.setResponse(sent);
      await dbg.flush();
      return;
    }

    // Priority 4: Income
    const income = detectIncome(message);
    if (income) {
      dbg.setIntent('income');
      dbg.setHandler('handleIncome');
      dbg.setParsed({ source: income.source, amount: income.amount });
      const response = await handleIncome(user.id, income, phone);
      const sent = await send(maybeAppendClosing(response));
      dbg.setResponse(sent);
      await dbg.flush();
      return;
    }

    // Priority 5: Query
    const query = detectQuery(message);
    if (query) {
      dbg.setIntent('query_' + query.type);
      dbg.setHandler('handleQuery');
      dbg.setParsed(query as any);
      const response = await handleQuery(user.id, query);
      const sent = await send(response);
      dbg.setResponse(sent);
      await dbg.flush();
      return;
    }

    // Priority 6: Category Command
    const categoryCmd = detectCategoryCommand(message);
    if (categoryCmd) {
      dbg.setIntent('category_command');
      dbg.setHandler('handleCategoryCommand');
      dbg.setParsed(categoryCmd as any);
      const response = await handleCategoryCommand(user.id, phone, categoryCmd);
      const sent = await send(response);
      dbg.setResponse(sent);
      await dbg.flush();
      return;
    }

    // Priority 7: Parse Expense
    const parsed = parseExpense(message, categories);
    if (parsed) {
      dbg.setIntent('expense');
      dbg.setParsed({
        description: parsed.description,
        amount: parsed.amount,
        category_id: parsed.category_id,
        category_name: parsed.category_name,
        payment_method: parsed.payment_method,
        date: parsed.date?.toISOString?.() || String(parsed.date),
      });

      let response: string;

      if (parsed.category_id === null || parsed.category_id === undefined) {
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
            payload: { parsed, suggestedCategoryId: suggested?.id },
            expires_at: new Date(Date.now() + 10 * 60000).toISOString(),
            created_at: new Date().toISOString(),
          };
          await supabaseAdmin.from('pending_actions').insert([newPending]);

          dbg.setHandler('ask_category');
          if (suggested) {
            response = `${parsed.description} de ${parsed.amount}. T\u00e1 em ${suggested.emoji} ${suggested.name}? (sim/n\u00e3o)`;
          } else {
            response = `${parsed.description} de ${parsed.amount}. Em qual categoria? (alimenta\u00e7\u00e3o, transporte, lazer...)`;
          }

          const sent = await send(response);
          dbg.setResponse(sent);
          await dbg.flush();
          return;
        }
      }

      if (parsed.payment_method === null || parsed.payment_method === undefined) {
        if (user.default_payment) {
          parsed.payment_method = user.default_payment;
        } else {
          const newPending: PendingAction = {
            id: uuidv4(),
            user_id: user.id,
            type: 'payment_method',
            payload: { parsed },
            expires_at: new Date(Date.now() + 10 * 60000).toISOString(),
            created_at: new Date().toISOString(),
          };
          await supabaseAdmin.from('pending_actions').insert([newPending]);

          dbg.setHandler('ask_payment_method');
          response = 'Cr\u00e9dito, pix ou dinheiro?';
          const sent = await send(response);
          dbg.setResponse(sent);
          await dbg.flush();
          return;
        }
      }

      dbg.setHandler('handleExpense');
      response = await handleExpense(user.id, parsed, phone);
      const sent = await send(maybeAppendClosing(response));
      dbg.setResponse(sent);
      await dbg.flush();
      return;
    }

    // Nothing matched
    dbg.setIntent('fallback');
    dbg.setHandler('none');
    const fallback = 'N\u00e3o entendi. Tenta algo tipo: uber 23 pix, a\u00e7a\u00ed 17, recebi 500 da m\u00e3e, resumo, categorias.';
    const sent = await send(fallback);
    dbg.setResponse(sent);
    await dbg.flush();
  } catch (e) {
    console.error('Route message error:', e);
    const errMsg = e instanceof Error ? e.message + '\n' + e.stack : String(e);
    if (dbg) {
      dbg.setError(errMsg);
      dbg.setResponse('Erro ao processar. Tenta de novo.');
      await dbg.flush();
    }
    await sendWhatsApp(phone, 'Erro ao processar. Tenta de novo.');
  }
}

function wrapAudioResponse(response: string, transcription: string): string {
  return '\ud83c\udfa4 Ouvi: "' + transcription + '"\n\n' + response + '\n\nSe eu entendi errado, me corrige.';
}
