import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { TopBar } from '@/components/TopBar';
import { BottomNav } from '@/components/BottomNav';

export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('total_xp, streak')
    .eq('id', user.id)
    .single();

  const xp = profile?.total_xp ?? 0;
  const streak = profile?.streak ?? 0;

  return (
    <div className="min-h-dvh bg-bg pb-24">
      <TopBar xp={xp} streak={streak} />
      <main className="mx-auto max-w-md">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
