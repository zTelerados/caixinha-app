import { supabaseAdmin } from '@/lib/supabase';
import { sendWhatsApp } from '@/lib/twilio';
import { resolveCategory, suggestCategory, matchCategory } from '@/lib/categories';
import { PendingAction, ParsedMessage } from '@/types';
import { normalize } from '@/lib/formatter';
import { monthLabel } from '@/lib/formatter';
import { handleExpense } from './expense';
import { v4 as uuidv4 } from 'uuid';

/**
 * Reconstruct Date objects and month_label after JSON deserialization.
 * When ParsedMessage is stored in Supabase JSONB, Date objects become
 * ISO strings. This function restores them so handleExpense works.
 */
function hydrateParsed(raw: any): ParsedMessage {
  const parsed = { ...raw } as ParsedMessage;
  parsed.date = parsed.date ? new Date(parsed.date as any) : new Date();
  if (parsed.month_label === undefined || parsed.month_label === null) {
    parsed.month_label = monthLabel(parsed.date);
  }
  return parsed;
}

const PAYMENT_KEYWORDS: Array<{ pattern: RegExp; method: string }> = [
  { pattern: /cr[eé]dito|cartao|cartão/, method: 'Crédito' },
  { pattern: /d[eé]bito/, method: 'Débito' },
  { pattern: /pix/, method: 'Pix' },
  { pattern: /dinheiro|cash|esp[eé]cie/, method: 'Dinheiro' },
];

function matchPaymentMethod(msg: string): string | null {
  const low = msg.toLowerCase();
  for (const { pattern, method } of PAYMENT_KEYWORDS) {
    if (pattern.test(low)) return method;
  }
  return null;
}

export async function handlePending(
  userId: string,
  phone: string,
  message: string,
  pending: PendingAction
): Promise<string> {
  const msgNorm = normalize(message);

  try {
    if (pending.type === 'category') {
      const payload = pending.payload as { parsed: any; suggestedCategoryId?: string };
      const parsed = hydrateParsed(payload.parsed);

      if (payload.suggestedCategoryId && /^(sim|s|isso|ok|tá|ta|yes|y)$/.test(msgNorm)) {
        parsed.category_id = payload.suggestedCategoryId;
      } else if (/^(n[ãa]o|nao|n|nope)$/.test(msgNorm)) {
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
        return 'Beleza. Em qual categoria então? (alimentação, transporte, lazer...)';
      } else {
        const resolved = await resolveCategory(message, userId);
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
            return `Não achei essa categoria. Tá em ${suggested.emoji} ${suggested.name}? (sim/não)`;
          }
          return 'Não achei essa categoria. Qual é? (alimentação, transporte, lazer...)';
        }
      }

      if (parsed.payment_method === null || parsed.payment_method === undefined) {
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
        return 'Crédito, pix ou dinheiro?';
      }

      await supabaseAdmin.from('pending_actions').delete().eq('id', pending.id);
      return await handleExpense(userId, parsed, phone);
    }

    if (pending.type === 'payment_method') {
      const payload = pending.payload as { parsed: any };
      const parsed = hydrateParsed(payload.parsed);

      const method = matchPaymentMethod(message);
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
        return 'Não entendi. Crédito, débito, pix ou dinheiro?';
      }

      parsed.payment_method = method;
      await supabaseAdmin.from('pending_actions').delete().eq('id', pending.id);
      return await handleExpense(userId, parsed, phone);
    }

    await supabaseAdmin.from('pending_actions').delete().eq('id', pending.id);
    return 'Algo deu errado. Manda o gasto de novo do início.';
  } catch (e) {
    console.error('Pending action error:', e);
    await supabaseAdmin.from('pending_actions').delete().eq('id', pending.id);
    return 'Deu ruim ao registrar. Manda o gasto de novo do início.';
  }
}
