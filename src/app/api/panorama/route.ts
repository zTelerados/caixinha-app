import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { MONTHS } from '@/types';

export async function GET() {
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('phone', process.env.OWNER_PHONE!)
    .single();

  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const results = [];
  for (let m = 1; m <= 12; m++) {
    const monthName = MONTHS[m];

    const { data: expenses } = await supabaseAdmin
      .from('transactions')
      .select('amount')
      .eq('user_id', user.id)
      .eq('type', 'expense')
      .eq('month_label', monthName);

    const { data: incomes } = await supabaseAdmin
      .from('transactions')
      .select('amount')
      .eq('user_id', user.id)
      .eq('type', 'income')
      .eq('month_label', monthName);

    results.push({
      month: monthName,
      expenses: (expenses || []).reduce((s, t) => s + Number(t.amount), 0),
      income: (incomes || []).reduce((s, t) => s + Number(t.amount), 0),
    });
  }

  return NextResponse.json({ panorama: results });
}
