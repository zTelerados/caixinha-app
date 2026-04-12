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

  const { data: expenses } = await supabaseAdmin
    .from('transactions')
    .select('*, category:categories(*)')
    .eq('user_id', user.id)
    .eq('type', 'expense')
    .eq('month_label', month)
    .order('date', { ascending: false });

  const { data: incomes } = await supabaseAdmin
    .from('transactions')
    .select('*')
    .eq('user_id', user.id)
    .eq('type', 'income')
    .eq('month_label', month);

  const totalExpenses = (expenses || []).reduce((s, t) => s + Number(t.amount), 0);
  const totalIncome = (incomes || []).reduce((s, t) => s + Number(t.amount), 0);

  // By category
  const byCat: Record<string, { name: string; emoji: string; total: number; count: number }> = {};
  for (const t of expenses || []) {
    const catName = t.category?.name || 'Sem categoria';
    const emoji = t.category?.emoji || '📌';
    if (!byCat[catName]) byCat[catName] = { name: catName, emoji, total: 0, count: 0 };
    byCat[catName].total += Number(t.amount);
    byCat[catName].count++;
  }

  const categories = Object.values(byCat).sort((a, b) => b.total - a.total);

  // By payment method
  const byMethod: Record<string, number> = {};
  for (const t of expenses || []) {
    const method = t.payment_method || 'Não informado';
    byMethod[method] = (byMethod[method] || 0) + Number(t.amount);
  }

  return NextResponse.json({
    month,
    totalGastos: totalExpenses,
    totalEntradas: totalIncome,
    saldo: totalIncome - totalExpenses,
    qtdTransacoes: (expenses || []).length,
    categories,
    paymentMethods: Object.entries(byMethod).map(([name, total]) => ({ name, total })),
    recentTransactions: (expenses || []).slice(0, 10).map((t) => ({
      id: t.id,
      description: t.description,
      amount: Number(t.amount),
      category: t.category?.name || 'Sem categoria',
      emoji: t.category?.emoji || '📌',
      payment_method: t.payment_method,
      date: t.date,
    })),
  });
}
