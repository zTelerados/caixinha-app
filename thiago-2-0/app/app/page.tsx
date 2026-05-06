import { createClient } from '@/lib/supabase/server';
import { StatusView } from './StatusView';
import { todayISO } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function StatusPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const today = todayISO();

  const [profileRes, weightsRes, glucoseRes, questsRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('weight_log').select('*').eq('user_id', user.id).order('date', { ascending: false }).limit(30),
    supabase.from('glucose_readings').select('*').eq('user_id', user.id).gte('reading_date', today).order('reading_time', { ascending: false }),
    supabase.from('daily_quests').select('quest_id').eq('user_id', user.id).eq('date', today),
  ]);

  return (
    <StatusView
      profile={profileRes.data}
      weights={weightsRes.data ?? []}
      todayGlucose={glucoseRes.data ?? []}
      completedQuestIds={(questsRes.data ?? []).map(r => r.quest_id)}
    />
  );
}
