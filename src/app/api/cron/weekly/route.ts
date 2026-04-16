import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendWhatsApp } from '@/lib/twilio';
import { fmtDate } from '@/lib/formatter';
import { buildWeeklySummaryMessage } from '@/lib/responses';
import { User } from '@/types';

export const dynamic = 'force-dynamic';

async function sendWeeklyReport(user: User): Promise<void> {
  const now = new Date();

  // This week: Monday to Sunday
  // now is Sunday night (cron runs Sunday 23:00 UTC)
  const dayOfWeek = now.getDay(); // 0 = Sunday
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - mondayOffset);
  const weekEnd = new Date(weekStart.getTime() + 7 * 86400000);

  // Last week boundaries
  const lastWeekStart = new Date(weekStart.getTime() - 7 * 86400000);

  // This week's expenses
  const { data: weekTxs } = await supabaseAdmin
    .from('transactions')
    .select('description, amount, date')
    .eq('user_id', user.id)
    .eq('type', 'expense')
    .gte('date', weekStart.toISOString())
    .lt('date', weekEnd.toISOString())
    .order('amount', { ascending: false });

  // Last week's expenses
  const { data: lastWeekTxs } = await supabaseAdmin
    .from('transactions')
    .select('amount')
    .eq('user_id', user.id)
    .eq('type', 'expense')
    .gte('date', lastWeekStart.toISOString())
    .lt('date', weekStart.toISOString());

  const txs = weekTxs || [];
  const weekTotal = txs.reduce((sum, tx) => sum + tx.amount, 0);
  const lastWeekTotal = (lastWeekTxs || []).reduce((sum, tx) => sum + tx.amount, 0);
  const weekPctChange = lastWeekTotal > 0
    ? ((weekTotal - lastWeekTotal) / lastWeekTotal) * 100
    : 0;

  // Top 3 items by amount (already sorted desc)
  const topItems = txs.slice(0, 3).map((tx) => ({
    description: tx.description,
    amount: tx.amount,
  }));

  // Biggest single expense
  const biggestSingle = txs.length > 0
    ? { description: txs[0].description, amount: txs[0].amount }
    : null;

  // Most expensive day
  const dayMap = new Map<string, number>();
  for (const tx of txs) {
    const day = tx.date ? fmtDate(new Date(tx.date)) : 'N/A';
    dayMap.set(day, (dayMap.get(day) || 0) + tx.amount);
  }
  const sortedDays = Array.from(dayMap.entries()).sort((a, b) => b[1] - a[1]);
  const mostExpensiveDay = sortedDays.length > 0
    ? { day: sortedDays[0][0], total: sortedDays[0][1] }
    : null;

  const message = buildWeeklySummaryMessage({
    userName: user.name,
    weekTotal,
    lastWeekTotal,
    weekPctChange,
    topItems,
    biggestSingle,
    mostExpensiveDay,
    tone: user.tone,
  });

  await sendWhatsApp(user.phone, message);
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const { data: users } = await supabaseAdmin
      .from('users')
      .select('*');

    if (!users) {
      return NextResponse.json({ status: 'no users', sent: 0 });
    }

    let sent = 0;
    for (const user of users) {
      try {
        await sendWeeklyReport(user);
        sent += 1;
      } catch (err) {
        console.error(`Weekly report error for user ${user.id}:`, err);
      }
    }

    return NextResponse.json({ status: 'ok', sent });
  } catch (err) {
    console.error('Weekly cron error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
