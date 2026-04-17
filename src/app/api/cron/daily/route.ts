import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendWhatsApp } from '@/lib/whatsapp';
import { buildDailyMorningMessage } from '@/lib/responses';
import { User } from '@/types';

export const dynamic = 'force-dynamic';

async function sendDailyReport(user: User): Promise<void> {
  const now = new Date();

  // Yesterday boundaries (BRT = UTC-3, but we work in UTC dates stored in DB)
  const yesterdayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(yesterdayEnd.getTime() - 86400000);

  // Query yesterday's expenses
  const { data: yesterdayTxs } = await supabaseAdmin
    .from('transactions')
    .select('description, amount')
    .eq('user_id', user.id)
    .eq('type', 'expense')
    .gte('date', yesterdayStart.toISOString())
    .lt('date', yesterdayEnd.toISOString())
    .order('amount', { ascending: false });

  const txs = yesterdayTxs || [];
  const yesterdayTotal = txs.reduce((sum, tx) => sum + tx.amount, 0);
  const yesterdayCount = txs.length;
  const yesterdayTop = txs.length > 0
    ? `${txs[0].description} (R$ ${txs[0].amount.toFixed(2).replace('.', ',')})`
    : null;

  // Month totals
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const { data: monthExpenses } = await supabaseAdmin
    .from('transactions')
    .select('amount')
    .eq('user_id', user.id)
    .eq('type', 'expense')
    .gte('date', monthStart.toISOString());

  const { data: monthIncomes } = await supabaseAdmin
    .from('transactions')
    .select('amount')
    .eq('user_id', user.id)
    .eq('type', 'income')
    .gte('date', monthStart.toISOString());

  const monthTotal = (monthExpenses || []).reduce((sum, tx) => sum + tx.amount, 0);
  const monthIncome = (monthIncomes || []).reduce((sum, tx) => sum + tx.amount, 0);
  const balance = monthIncome - monthTotal;

  const message = buildDailyMorningMessage({
    userName: user.name,
    yesterdayTotal,
    yesterdayCount,
    yesterdayTop,
    monthTotal,
    monthIncome,
    balance,
    pendingBills: [],
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
        await sendDailyReport(user);
        sent += 1;
      } catch (err) {
        console.error(`Daily report error for user ${user.id}:`, err);
      }
    }

    return NextResponse.json({ status: 'ok', sent });
  } catch (err) {
    console.error('Daily cron error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
