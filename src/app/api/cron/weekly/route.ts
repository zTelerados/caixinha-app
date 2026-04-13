import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendWhatsApp } from '@/lib/twilio';
import { monthLabel, fmtValor, fmtDate } from '@/lib/formatter';
import { buildWeeklyNarrative, WeeklyStats } from '@/lib/narrative';
import { User } from '@/types';

export const dynamic = 'force-dynamic';

async function verifyAuth(req: NextRequest): Promise<boolean> {
  // Verify Vercel's built-in cron auth header
  const authHeader = req.headers.get('authorization');
  if (authHeader === `Bearer ${process.env.CRON_SECRET}`) {
    return true;
  }
  return false;
}

async function sendWeeklyReport(user: User): Promise<void> {
  const now = new Date();

  // Get last 7 days transactions
  const weekStart = new Date(now.getTime() - 7 * 86400000);
  const { data: weekTxs } = await supabaseAdmin
    .from('transactions')
    .select('*')
    .eq('user_id', user.id)
    .eq('type', 'expense')
    .gte('date', weekStart.toISOString())
    .order('amount', { ascending: false });

  // Get 7 days before that (14-7 days ago)
  const prevWeekStart = new Date(now.getTime() - 14 * 86400000);
  const { data: prevWeekTxs } = await supabaseAdmin
    .from('transactions')
    .select('amount')
    .eq('user_id', user.id)
    .eq('type', 'expense')
    .gte('date', prevWeekStart.toISOString())
    .lt('date', weekStart.toISOString());

  const totalThisWeek = (weekTxs || []).reduce((sum, tx) => sum + tx.amount, 0);
  const totalLastWeek = (prevWeekTxs || []).reduce((sum, tx) => sum + tx.amount, 0);

  // Group by category
  const categoryMap = new Map<string, { name: string; emoji: string; total: number; count: number }>();
  for (const tx of weekTxs || []) {
    if (tx.category_id) {
      if (!categoryMap.has(tx.category_id)) {
        // Fetch category
        const { data: cat } = await supabaseAdmin
          .from('categories')
          .select('name, emoji')
          .eq('id', tx.category_id)
          .single();

        if (cat) {
          categoryMap.set(tx.category_id, {
            name: cat.name,
            emoji: cat.emoji,
            total: 0,
            count: 0,
          });
        }
      }
      const entry = categoryMap.get(tx.category_id);
      if (entry) {
        entry.total += tx.amount;
        entry.count += 1;
      }
    }
  }

  const topCategories = Array.from(categoryMap.values())
    .sort((a, b) => b.total - a.total);

  // Find most expensive
  const mostExpensive = (weekTxs || []).sort((a, b) => b.amount - a.amount)[0] || {
    description: 'N/A',
    amount: 0,
    date: '',
  };

  // Find highest spending day
  const dayMap = new Map<string, number>();
  for (const tx of weekTxs || []) {
    const date = tx.date ? fmtDate(new Date(tx.date)) : 'N/A';
    dayMap.set(date, (dayMap.get(date) || 0) + tx.amount);
  }
  const highestDay = Array.from(dayMap.entries())
    .sort((a, b) => b[1] - a[1])[0] || ['N/A', 0];

  const stats: WeeklyStats = {
    totalThisWeek,
    totalLastWeek,
    topCategories,
    mostExpensive: {
      description: mostExpensive.description,
      amount: mostExpensive.amount,
      date: mostExpensive.date ? fmtDate(new Date(mostExpensive.date)) : 'N/A',
    },
    highestDay: {
      date: highestDay[0],
      total: highestDay[1],
    },
  };

  const message = buildWeeklyNarrative(stats);
  await sendWhatsApp(user.phone, message);
}

export async function GET(req: NextRequest) {
  // Verify auth
  if (!verifyAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get all users
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
