import { createClient } from '@/lib/supabase/server';
import { GlicemiaView } from './GlicemiaView';

export const dynamic = 'force-dynamic';

export default async function GlicemiaPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const since = new Date();
  since.setDate(since.getDate() - 14);
  const sinceISO = since.toISOString().slice(0, 10);

  const { data } = await supabase
    .from('glucose_readings')
    .select('*')
    .eq('user_id', user.id)
    .gte('reading_date', sinceISO)
    .order('reading_date', { ascending: false })
    .order('reading_time', { ascending: false })
    .limit(200);

  return <GlicemiaView initialReadings={data ?? []} />;
}
