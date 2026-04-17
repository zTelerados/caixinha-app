import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendWhatsApp } from '@/lib/whatsapp';
import { monthLabel, fmtDate, fmtValor } from '@/lib/formatter';
import { buildMonthlyNarrative, MonthlyStats } from '@/lib/narrative';
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

async function sendMonthlyReport(user: User): Promise<void> {
  const now = new Date();
  const thisMonthLabel = monthLabel(now);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // Get this month transactions
  const { data: monthTxs } = await supabaseAdmin
    .from('transactions')
    .select('*')
    .eq('user_id', user.id)
    .eq('month_label', thisMonthLabel)
    .gte('date', monthStart.toISOString())
    .order('date');

  // Get last month transactions
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthLabel = monthLabel(lastMonthDate);
  const { data: lastMonthTxs } = await supabaseAdmin
    .from('transactions')
    .select('amount')
    .eq('user_id', user.id)
    .eq('month_label', lastMonthLabel)
    .eq('type', 'expense');

  // Totals
  const expenses = (monthTxs || []).filter((tx) => tx.type === 'expense');
  const incomes = (monthTxs || []).filter((tx) => tx.type === 'income');

  const totalThisMonth = expenses.reduce((sum, tx) => sum + tx.amount, 0);
  const totalIncomeThisMonth = incomes.reduce((sum, tx) => sum + tx.amount, 0);
  const totalLastMonth = (lastMonthTxs || []).reduce((sum, tx) => sum + tx.amount, 0);

  // Get last month income
  const { data: lastMonthIncomes } = await supabaseAdmin
    .from('transactions')
    .select('amount')
    .eq('user_id', user.id)
    .eq('month_label', lastMonthLabel)
    .eq('type', 'income');

  const totalIncomeLastMonth = (lastMonthIncomes || []).reduce((sum, tx) => sum + tx.amount, 0);
  const balance = totalIncomeThisMonth - totalThisMonth;

  // Group by category
  const categoryMap = new Map<string, { name: string; emoji: string; total: number }>();
  for (const tx of expenses) {
    if (tx.category_id) {
      if (!categoryMap.has(tx.category_id)) {
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
          });
        }
      }
      const entry = categoryMap.get(tx.category_id);
      if (entry) {
        entry.total += tx.amount;
      }
    }
  }

  const topCategories = Array.from(categoryMap.values())
    .sort((a, b) => b.total - a.total);

  // Average daily spend
  const daysInMonth = now.getDate(); // current day of month
  const avgDailySpend = daysInMonth > 0 ? totalThisMonth / daysInMonth : 0;

  // Highest and lowest days
  const dayMap = new Map<string, number>();
  for (const tx of expenses) {
    const date = tx.date ? fmtDate(new Date(tx.date)) : 'N/A';
    dayMap.set(date, (dayMap.get(date) || 0) + tx.amount);
  }

  const sortedDays = Array.from(dayMap.entries())
    .sort((a, b) => b[1] - a[1]);

  const highestDay = sortedDays[0] || ['N/A', 0];
  const lowestDay = sortedDays[sortedDays.length - 1] || ['N/A', 0];

  const stats: MonthlyStats = {
    totalThisMonth,
    totalLastMonth,
    totalIncomeThisMonth,
    totalIncomeLastMonth,
    balance,
    topCategories,
    avgDailySpend,
    highestDay: {
      date: highestDay[0],
      total: highestDay[1],
    },
    lowestDay: {
      date: lowestDay[0],
      total: lowestDay[1],
    },
  };

  const message = buildMonthlyNarrative(stats);
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
        await sendMonthlyReport(user);
        sent += 1;
      } catch (err) {
        console.error(`Monthly report error for user ${user.id}:`, err);
      }
    }

    return NextResponse.json({ status: 'ok', sent });
  } catch (err) {
    console.error('Monthly cron error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
