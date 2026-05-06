import { createClient } from '@/lib/supabase/server';
import { DossieView } from './DossieView';
import { REMINDER_TYPES } from '@/lib/constants';

export const dynamic = 'force-dynamic';

export default async function DossiePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [profileRes, weightsRes, remindersRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('weight_log').select('*').eq('user_id', user.id).order('date', { ascending: true }).limit(120),
    supabase.from('reminders').select('*').eq('user_id', user.id),
  ]);

  // Garantir que o usuário tenha registros para todos os tipos de lembrete
  const existingTypes = new Set((remindersRes.data ?? []).map(r => r.reminder_type));
  const missing = REMINDER_TYPES.filter(t => !existingTypes.has(t.id));
  if (missing.length > 0) {
    await supabase.from('reminders').insert(
      missing.map(t => ({
        user_id: user.id,
        reminder_type: t.id,
        hour: t.defaultHour,
        minute: t.defaultMinute,
        enabled: false,
      })),
    );
  }

  const reminders = (await supabase.from('reminders').select('*').eq('user_id', user.id)).data ?? [];

  return (
    <DossieView
      profile={profileRes.data}
      weights={weightsRes.data ?? []}
      reminders={reminders}
      userEmail={user.email ?? ''}
    />
  );
}
