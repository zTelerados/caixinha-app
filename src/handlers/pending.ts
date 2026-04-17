import { supabaseAdmin } from '@/lib/supabase';
import { sendWhatsApp } from '@/lib/whatsapp';
import { resolveCategory, suggestCategory, matchCategory, getCategories } from '@/lib/categories';
import { PendingAction, ParsedMessage } from '@/types';
import { normalize } from '@/lib/formatter';
import { monthLabel } from '@/lib/formatter';
import { canonicalPayment, displayPayment } from '@/lib/normalize';
import { handleExpense } from './expense';
import { handleUndo } from './undo';
import { WhatsAppButton } from '@/lib/whatsapp';
import { v4 as uuidv4 } from 'uuid';

// ─── Return type with optional buttons ──────────────────
export interface PendingResult {
  response: string;
  buttons?: WhatsAppButton[];
}

/**
 * Reconstruct Date objects and month_label after JSON deserialization.
 */
function hydrateParsed(raw: any): ParsedMessage {
  const parsed = { ...raw } as ParsedMessage;
  parsed.date = parsed.date ? new Date(parsed.date as any) : new Date();
  if (parsed.month_label === undefined || parsed.month_label === null) {
    parsed.month_label = monthLabel(parsed.date);
  }
  return parsed;
}

function matchPaymentMethod(msg: string): string | null {
  return canonicalPayment(msg);
}

export async function handlePending(
  userId: string,
  phone: string,
  message: string,
  pending: PendingAction,
  buttonPayload?: string,
): Promise<PendingResult> {
  const msgNorm = normalize(message);
  // Se veio de botão, usa o payload direto
  const effectiveMessage = buttonPayload || message;
  const effectiveNorm = buttonPayload || msgNorm;

  try {
    // ── Categoria ──
    if (pending.type === 'category') {
      const payload = pending.payload as { parsed: any; suggestedCategoryId?: string };
      const parsed = hydrateParsed(payload.parsed);

      // Botão de categoria: "cat_UUID" ou "cat_outra"
      if (effectiveNorm.startsWith('cat_')) {
        const catId = effectiveNorm.replace('cat_', '');

        if (catId === 'outra') {
          await supabaseAdmin.from('pending_actions').delete().eq('id', pending.id);
          const newPending: PendingAction = {
            id: uuidv4(),
            user_id: userId,
            type: 'category',
            payload: { parsed },
            expires_at: new Date(Date.now() + 10 * 60000).toISOString(),
            created_at: new Date().toISOString(),
          };
          await supabaseAdmin.from('pending_actions').insert([newPending]);

          // Manda lista completa de categorias
          const cats = await getCategories(userId);
          const catList = cats.map(c => `${c.emoji} ${c.name}`).join(', ');
          return { response: `Qual categoria? ${catList}` };
        }

        // Categoria selecionada por botão
        parsed.category_id = catId;
        await supabaseAdmin.from('pending_actions').delete().eq('id', pending.id);

        // Se pagamento não definido, perguntar com botões
        if (parsed.payment_method === null || parsed.payment_method === undefined) {
          const { data: user } = await supabaseAdmin
            .from('users')
            .select('default_payment')
            .eq('id', userId)
            .single();

          if (user?.default_payment) {
            parsed.payment_method = user.default_payment;
          } else {
            const newPending: PendingAction = {
              id: uuidv4(),
              user_id: userId,
              type: 'payment_method',
              payload: { parsed },
              expires_at: new Date(Date.now() + 10 * 60000).toISOString(),
              created_at: new Date().toISOString(),
            };
            await supabaseAdmin.from('pending_actions').insert([newPending]);
            return {
              response: `${parsed.description} R$ ${parsed.amount}. Como pagou?`,
              buttons: [
                { id: 'pix', title: 'Pix' },
                { id: 'credito', title: 'Credito' },
                { id: 'dinheiro', title: 'Dinheiro' },
              ],
            };
          }
        }

        const expenseResponse = await handleExpense(userId, parsed, phone);
        return {
          response: expenseResponse,
          buttons: [
            { id: 'post_corrigir', title: 'Corrigir' },
            { id: 'post_apagar', title: 'Apagar' },
          ],
        };
      }

      // Texto "sim" pra categoria sugerida
      if (payload.suggestedCategoryId && /^(sim|s|isso|ok|ta|yes|y)$/i.test(effectiveNorm)) {
        parsed.category_id = payload.suggestedCategoryId;
      } else if (/^(n[ãa]o|nao|n|nope)$/i.test(effectiveNorm)) {
        await supabaseAdmin.from('pending_actions').delete().eq('id', pending.id);
        const newPending: PendingAction = {
          id: uuidv4(),
          user_id: userId,
          type: 'category',
          payload: { parsed },
          expires_at: new Date(Date.now() + 10 * 60000).toISOString(),
          created_at: new Date().toISOString(),
        };
        await supabaseAdmin.from('pending_actions').insert([newPending]);
        return { response: 'Beleza. Em qual categoria ent\u00e3o?' };
      } else {
        const resolved = await resolveCategory(effectiveMessage, userId);
        if (resolved) {
          parsed.category_id = resolved.id;
        } else {
          const suggested = await suggestCategory(parsed.description, userId);
          await supabaseAdmin.from('pending_actions').delete().eq('id', pending.id);
          const newPending: PendingAction = {
            id: uuidv4(),
            user_id: userId,
            type: 'category',
            payload: { parsed, suggestedCategoryId: suggested?.id },
            expires_at: new Date(Date.now() + 10 * 60000).toISOString(),
            created_at: new Date().toISOString(),
          };
          await supabaseAdmin.from('pending_actions').insert([newPending]);
          if (suggested) {
            return { response: `N\u00e3o achei essa categoria. T\u00e1 em ${suggested.emoji} ${suggested.name}? (sim/n\u00e3o)` };
          }
          return { response: 'N\u00e3o achei essa categoria. Qual \u00e9?' };
        }
      }

      // Categoria resolvida — verificar pagamento
      if (parsed.payment_method === null || parsed.payment_method === undefined) {
        await supabaseAdmin.from('pending_actions').delete().eq('id', pending.id);

        const { data: user } = await supabaseAdmin
          .from('users')
          .select('default_payment')
          .eq('id', userId)
          .single();

        if (user?.default_payment) {
          parsed.payment_method = user.default_payment;
        } else {
          const newPending: PendingAction = {
            id: uuidv4(),
            user_id: userId,
            type: 'payment_method',
            payload: { parsed },
            expires_at: new Date(Date.now() + 10 * 60000).toISOString(),
            created_at: new Date().toISOString(),
          };
          await supabaseAdmin.from('pending_actions').insert([newPending]);
          return {
            response: `${parsed.description} R$ ${parsed.amount}. Como pagou?`,
            buttons: [
              { id: 'pix', title: 'Pix' },
              { id: 'credito', title: 'Credito' },
              { id: 'dinheiro', title: 'Dinheiro' },
            ],
          };
        }
      }

      await supabaseAdmin.from('pending_actions').delete().eq('id', pending.id);
      const expenseResponse = await handleExpense(userId, parsed, phone);
      return {
        response: expenseResponse,
        buttons: [
          { id: 'post_corrigir', title: 'Corrigir' },
          { id: 'post_apagar', title: 'Apagar' },
        ],
      };
    }

    // ── Forma de pagamento ──
    if (pending.type === 'payment_method') {
      const payload = pending.payload as { parsed: any };
      const parsed = hydrateParsed(payload.parsed);

      // Botão direto: "pix", "credito", "dinheiro"
      const method = matchPaymentMethod(effectiveMessage);
      if (method === null) {
        await supabaseAdmin.from('pending_actions').delete().eq('id', pending.id);
        const newPending: PendingAction = {
          id: uuidv4(),
          user_id: userId,
          type: 'payment_method',
          payload: { parsed },
          expires_at: new Date(Date.now() + 10 * 60000).toISOString(),
          created_at: new Date().toISOString(),
        };
        await supabaseAdmin.from('pending_actions').insert([newPending]);
        return {
          response: 'N\u00e3o entendi. Como pagou?',
          buttons: [
            { id: 'pix', title: 'Pix' },
            { id: 'credito', title: 'Credito' },
            { id: 'dinheiro', title: 'Dinheiro' },
          ],
        };
      }

      parsed.payment_method = method;
      await supabaseAdmin.from('pending_actions').delete().eq('id', pending.id);
      const expenseResponse = await handleExpense(userId, parsed, phone);
      return {
        response: expenseResponse,
        buttons: [
          { id: 'post_corrigir', title: 'Corrigir' },
          { id: 'post_apagar', title: 'Apagar' },
        ],
      };
    }

    // ── Confirmação de valor alto ──
    if (pending.type === 'confirm_high_value') {
      const payload = pending.payload as { parsed: any };
      const parsed = hydrateParsed(payload.parsed);

      await supabaseAdmin.from('pending_actions').delete().eq('id', pending.id);

      if (effectiveNorm === 'confirm_yes' || /^(sim|s|yes|y|ok)$/i.test(effectiveNorm)) {
        const expenseResponse = await handleExpense(userId, parsed, phone);
        return {
          response: expenseResponse,
          buttons: [
            { id: 'post_corrigir', title: 'Corrigir' },
            { id: 'post_apagar', title: 'Apagar' },
          ],
        };
      }

      if (effectiveNorm === 'confirm_cancel' || /^(n[ãa]o|nao|n|cancela)$/i.test(effectiveNorm)) {
        return { response: 'Cancelado. Nada foi registrado.' };
      }

      if (effectiveNorm === 'confirm_edit' || /^(corrig|edita|muda)/i.test(effectiveNorm)) {
        return { response: 'Beleza, manda o gasto correto do in\u00edcio.' };
      }

      return { response: 'N\u00e3o entendi. Manda "sim" pra confirmar ou "n\u00e3o" pra cancelar.' };
    }

    // ── Botões pós-registro: Corrigir / Apagar ──
    if (effectiveNorm === 'post_corrigir') {
      await supabaseAdmin.from('pending_actions').delete().eq('id', pending.id);
      return { response: 'O que quer corrigir? Manda:\n"era credito" (pagamento)\n"era 25" (valor)\n"era transporte" (categoria)' };
    }

    if (effectiveNorm === 'post_apagar') {
      await supabaseAdmin.from('pending_actions').delete().eq('id', pending.id);
      const undoResult = await handleUndo(userId, phone);
      return { response: undoResult };
    }

    // Fallback
    await supabaseAdmin.from('pending_actions').delete().eq('id', pending.id);
    return { response: 'Algo deu errado. Manda o gasto de novo do in\u00edcio.' };
  } catch (e) {
    console.error('Pending action error:', e);
    await supabaseAdmin.from('pending_actions').delete().eq('id', pending.id);
    return { response: 'Deu ruim ao registrar. Manda o gasto de novo do in\u00edcio.' };
  }
}
