import { supabaseAdmin } from '@/lib/supabase';
import { humanNormalize, canonicalPayment, displayPayment } from '@/lib/normalize';

interface ConfigResult {
  matched: boolean;
  response: string;
}

export async function handleConfig(
  userId: string,
  message: string,
): Promise<ConfigResult> {
  const msg = message.trim();
  const low = humanNormalize(msg);

  // Tone change
  const toneMatch = low.match(/(?:muda|troca|altera)\s+(?:meu\s+)?tom\s+(?:pra|para)\s+(neutro|cria)/);
  if (toneMatch) {
    const newTone = toneMatch[1];
    await supabaseAdmin
      .from('users')
      .update({ tone: newTone })
      .eq('id', userId);
    return {
      matched: true,
      response: newTone === 'cria'
        ? 'Tom atualizado. Agora \u00e9 no papo de cria.'
        : 'Tom atualizado para neutro. Vou responder de forma mais formal.',
    };
  }

  // Name change
  const nameMatch = msg.match(/(?:meu nome [e\u00e9]|me chama de|pode me chamar de)\s+(.+)/i);
  if (nameMatch) {
    const rawName = nameMatch[1].trim().replace(/[.!?]+$/, '');
    const name = rawName.split(' ').map((w: string) =>
      w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
    ).join(' ');

    await supabaseAdmin
      .from('users')
      .update({ name })
      .eq('id', userId);
    return {
      matched: true,
      response: `Pronto! Agora te chamo de ${name.split(' ')[0]}.`,
    };
  }

  // Month start day
  const monthMatch = low.match(/(?:meu\s+)?mes\s+comeca\s+(?:no\s+)?dia\s+(\d{1,2})/);
  if (monthMatch) {
    const day = parseInt(monthMatch[1], 10);
    if (day < 1 || day > 28) {
      return { matched: true, response: 'Dia precisa ser entre 1 e 28.' };
    }
    await supabaseAdmin
      .from('users')
      .update({ month_start_day: day })
      .eq('id', userId);
    return {
      matched: true,
      response: `Pronto! Seu m\u00eas agora come\u00e7a no dia ${day}.`,
    };
  }

  // Default payment — now stores canonical lowercase
  const payMatch = low.match(/pagamento\s+padrao\s+(?:e\s+)?(credito|pix|dinheiro|debito|cartao|cash)/);
  if (payMatch) {
    const canonical = canonicalPayment(payMatch[1]) || 'pix';
    await supabaseAdmin
      .from('users')
      .update({ default_payment: canonical })
      .eq('id', userId);
    return {
      matched: true,
      response: `Pagamento padr\u00e3o atualizado para ${displayPayment(canonical)}.`,
    };
  }

  // Help
  if (low === 'ajuda' || low === 'help' || low === 'como funciona') {
    return {
      matched: true,
      response: '\ud83d\udcd6 *Como usar o Caixinha:*\n\n\ud83d\udcb8 *Registrar gasto:* "cafe 10 pix" ou "uber 25 credito"\n\ud83d\udcb0 *Registrar entrada:* "recebi 500 do freela"\n\ud83d\udcca *Ver resumo:* "resumo" ou "quanto gastei esse m\u00eas"\n\ud83d\udcc5 *Gastos de hoje:* "quanto gastei hoje"\n\ud83d\udd0d *Por categoria:* "quanto gastei com alimenta\u00e7\u00e3o"\n\ud83d\udcb3 *Saldo:* "quanto tenho" ou "saldo"\n\u21a9\ufe0f *Desfazer:* "apaga" ou "desfaz"\n\u270f\ufe0f *Corrigir:* "era 40" ou "categoria transporte"\n\n\u2699\ufe0f *Configura\u00e7\u00f5es:*\n\u2022 "meu nome \u00e9 Maria"\n\u2022 "muda meu tom pra neutro"\n\u2022 "meu m\u00eas come\u00e7a dia 5"\n\u2022 "pagamento padr\u00e3o \u00e9 credito"',
    };
  }

  return { matched: false, response: '' };
}
