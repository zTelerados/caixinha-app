import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { monthLabel } from '@/lib/formatter';

export async function GET(req: NextRequest) {
  const month = req.nextUrl.searchParams.get('month') || monthLabel();

  const { data: user } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('phone', process.env.OWNER_PHONE!)
    .single();

  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const { data } = await supabaseAdmin
    .from('transactions')
    .select('date, amount')
    .eq('user_id', user.id)
    .eq('type', 'expense')
    .eq('month_label', month)
    .order('date');

  const byDay: Record<string, number> = {};
  for (const t of data || []) {
    byDay[t.date] = (byDay[t.date] || 0) + Number(t.amount);
  }

  let cumulative = 0;
  const evolution = Object.entries(byDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, daily]) => {
      cumulative += daily;
      const dia = parseInt(date.split('-')[2], 10);
    return { dia, cumulative };
    });

  return NextResponse.json({ month, evolution });
}
