import { supabaseAdmin } from '@/lib/supabase';

export async function handleOnboarding(
  phone: string,
  message: string,
): Promise<{ response: string; done: boolean; userId?: string }> {
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('phone', phone)
    .single();

  if (!user) {
    const { data: newUser, error } = await supabaseAdmin
      .from('users')
      .insert([{
        phone,
        name: phone,
        tone: 'neutro',
        month_start_day: 1,
        default_payment: 'pix',
        onboarding_step: 1,
      }])
      .select()
      .single();

    if (error || !newUser) {
      console.error('Failed to create user:', error);
      return {
        response: 'Erro ao criar sua conta. Tenta de novo daqui a pouco.',
        done: false,
      };
    }

    return {
      response: '\ud83d\udc4b Oi! Sou o Caixinha, seu assistente financeiro pessoal.\n\nPra come\u00e7ar, posso te chamar de qu\u00ea?',
      done: false,
    };
  }

  const step = user.onboarding_step;

  // Step 1: waiting for name
  if (step === 1) {
    const name = message.trim().split(' ').map((w: string) =>
      w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
    ).join(' ');

    await supabaseAdmin
      .from('users')
      .update({ name, onboarding_step: 2 })
      .eq('id', user.id);

    const firstName = name.split(' ')[0];
    return {
      response: `Prazer, ${firstName}! Vou te ajudar a controlar seus gastos de forma simples, direto pelo WhatsApp.\n\nQuer que eu te explique como funciona em 1 minuto?\n\n\ud83d\udc49 Responde *quero* ou *ja sei*`,
      done: false,
    };
  }

  // Step 2: waiting for "quero" or "ja sei"
  if (step === 2) {
    const low = message.toLowerCase().trim();
    const firstName = user.name.split(' ')[0];

    if (low.includes('quero') || low.includes('sim') || low.includes('explica')) {
      await supabaseAdmin
        .from('users')
        .update({ onboarding_step: 3 })
        .eq('id', user.id);

      return {
        response: `\u00c9 bem f\u00e1cil, ${firstName}! Quando gastar algo, me manda uma mensagem assim:\n\n\u2022 "Mercado 50 pix"\n\u2022 "Uber 25 dinheiro"\n\u2022 "Caf\u00e9 10"\n\nEu entendo e registro automaticamente.\n\nQuer testar agora? Manda um gasto qualquer, pode ser de mentira s\u00f3 pra ver como funciona.`,
        done: false,
      };
    }

    // "ja sei" or anything else — skip to ready
    await supabaseAdmin
      .from('users')
      .update({ onboarding_step: 5 })
      .eq('id', user.id);

    return {
      response: `Beleza, ${firstName}! T\u00f4 pronto. Manda qualquer gasto e eu registro. Se precisar de ajuda, manda "ajuda".`,
      done: true,
      userId: user.id,
    };
  }

  // Step 3 or 4: process normally
  if (step === 3 || step === 4) {
    const newStep = step === 3 ? 4 : 5;
    await supabaseAdmin
      .from('users')
      .update({ onboarding_step: newStep })
      .eq('id', user.id);

    return {
      response: '',
      done: true,
      userId: user.id,
    };
  }

  // Step 5+ or null: onboarding complete
  return { response: '', done: true, userId: user.id };
}

export function getOnboardingClosing(step: number | null, userName: string): string | null {
  if (step === 4) {
    const firstName = userName.split(' ')[0];
    return `\n\n\u2728 Viu s\u00f3, ${firstName}? Simples assim! Pra ver seus gastos, me pergunta "quanto gastei esse m\u00eas". Qualquer d\u00favida, manda "ajuda".`;
  }
  return null;
}
