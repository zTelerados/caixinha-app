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
import { fmtValor } from '@/lib/formatter';
import { displayPayment } from '@/lib/normalize';
import { v4 as uuidv4 } from 'uuid';

// ─── Limiar de valor alto pra pedir confirmação ─────────
const HIGH_VALUE_THRESHOLD = 200;

export async function routeMessage(
  phone: string,
  message: string,
  audioTranscription?: string,
  buttonPayload?: string,
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
      const result = await handlePending(user.id, phone, message, p, buttonPayload);
      if (result.buttons && result.buttons.length > 0) {
        await sendButtons(phone, result.response, result.buttons);
      } else {
        const sent = await send(maybeAppendClosing(result.response));
        dbg.setResponse(sent);
      }
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

      // ── Categoria não identificada → botões ──
      if (parsed.category_id === null || parsed.category_id === undefined) {
        const matched = await matchCategory(parsed.description, user.id);
        if (matched) {
          parsed.category_id = matched.id;
          parsed.category_name = matched.name;
          parsed.category_source = 'learned';
        } else {
          // Busca top 3 categorias mais prováveis
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

          // Monta botões com top categorias
          const topCats = categories.slice(0, 2); // 2 mais usadas + "Outra"
          if (suggested && topCats.length > 0) {
            const catButtons = [
              { id: `cat_${suggested.id}`, title: `${suggested.emoji} ${suggested.name}`.slice(0, 20) },
              ...topCats
                .filter(c => c.id !== suggested.id)
                .slice(0, 1)
                .map(c => ({ id: `cat_${c.id}`, title: `${c.emoji} ${c.name}`.slice(0, 20) })),
              { id: 'cat_outra', title: 'Outra' },
            ];
            response = `${parsed.description} ${fmtValor(parsed.amount)}. Qual categoria?`;
            await sendButtons(phone, response, catButtons);
          } else {
            response = `${parsed.description} ${fmtValor(parsed.amount)}. Em qual categoria?`;
            await send(response);
          }

          dbg.setResponse(response);
          await dbg.flush();
          return;
        }
      }

      // ── Pagamento não especificado → botões ──
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
          response = `${parsed.description} ${fmtValor(parsed.amount)}. Como pagou?`;
          await sendButtons(phone, response, [
            { id: 'pix', title: 'Pix' },
            { id: 'credito', title: 'Credito' },
            { id: 'dinheiro', title: 'Dinheiro' },
          ]);
          dbg.setResponse(response);
          await dbg.flush();
          return;
        }
      }

      // ── Valor alto → pedir confirmação ──
      if (parsed.amount >= HIGH_VALUE_THRESHOLD) {
        const catLabel = parsed.category_name || 'sem categoria';
        const payLabel = displayPayment(parsed.payment_method) || 'sem forma';
        const confirmMsg = `Anotar? ${parsed.description} ${fmtValor(parsed.amount)} em ${catLabel} (${payLabel})`;

        const newPending: PendingAction = {
          id: uuidv4(),
          user_id: user.id,
          type: 'confirm_high_value',
          payload: { parsed },
          expires_at: new Date(Date.now() + 10 * 60000).toISOString(),
          created_at: new Date().toISOString(),
        };
        await supabaseAdmin.from('pending_actions').insert([newPending]);

        dbg.setHandler('ask_confirm_high_value');
        await sendButtons(phone, confirmMsg, [
          { id: 'confirm_yes', title: 'Sim' },
          { id: 'confirm_edit', title: 'Corrigir' },
          { id: 'confirm_cancel', title: 'Cancelar' },
        ]);
        dbg.setResponse(confirmMsg);
        await dbg.flush();
        return;
      }

      // ── Registrar gasto ──
      dbg.setHandler('handleExpense');
      response = await handleExpense(user.id, parsed, phone);
      const finalResponse = maybeAppendClosing(response);

      // Envia resposta com botões de correção rápida
      await sendButtons(phone, finalResponse, [
        { id: 'post_corrigir', title: 'Corrigir' },
        { id: 'post_apagar', title: 'Apagar' },
      ]);

      dbg.setResponse(finalResponse);
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
