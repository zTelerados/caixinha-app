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
    .select('*, category:categories(name, emoji)')
    .eq('user_id', user.id)
    .eq('month_label', month)
    .order('date', { ascending: false });

  return NextResponse.json({
    month,
    transactions: (data || []).map((t) => ({
      id: t.id,
      type: t.type,
      description: t.description,
      amount: Number(t.amount),
      category: t.category ? { name: t.category.name, emoji: t.category.emoji } : null,
      payment_method: t.payment_method,
      date: t.date,
      created_at: t.created_at,
    })),
  });
}
