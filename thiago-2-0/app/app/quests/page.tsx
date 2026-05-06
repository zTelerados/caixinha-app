import { createClient } from '@/lib/supabase/server';
import { QuestsView } from './QuestsView';
import { todayISO } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function QuestsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const today = todayISO();

  const [profileRes, todayQuestsRes, achievementsRes] = await Promise.all([
    supabase.from('profiles').select('total_xp, streak, last_streak_date, start_date').eq('id', user.id).single(),
    supabase.from('daily_quests').select('quest_id').eq('user_id', user.id).eq('date', today),
    supabase.from('achievements').select('milestone_id').eq('user_id', user.id),
  ]);

  return (
    <QuestsView
      profile={profileRes.data}
      todayCompleted={(todayQuestsRes.data ?? []).map(r => r.quest_id)}
      unlockedMilestones={(achievementsRes.data ?? []).map(r => r.milestone_id)}
    />
  );
}
