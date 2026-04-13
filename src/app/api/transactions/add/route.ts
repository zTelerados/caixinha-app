import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { monthLabel } from '@/lib/formatter';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, description, amount, category_id, payment_method, date, month_label: providedMonthLabel } = body;

    // Validate required fields
    if (!type || !description || amount === undefined || !date) {
      return NextResponse.json(
        { error: 'Missing required fields: type, description, amount, date' },
        { status: 400 }
      );
    }

    // Look up user by OWNER_PHONE
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('phone', process.env.OWNER_PHONE!)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Insert transaction
    const { data: transaction, error: insertError } = await supabaseAdmin
      .from('transactions')
      .insert([
        {
          user_id: user.id,
          type,
          description,
          amount: Number(amount),
          category_id: category_id || null,
          payment_method: payment_method || null,
          date,
          month_label: providedMonthLabel || monthLabel(new Date(date)),
        },
      ])
      .select('*')
      .single();

    if (insertError || !transaction) {
      return NextResponse.json({ error: 'Failed to create transaction' }, { status: 500 });
    }

    // Log to transaction_log
    await supabaseAdmin
      .from('transaction_log')
      .insert([
        {
          user_id: user.id,
          action: 'create',
          transaction_id: transaction.id,
          details: { source: 'dashboard' },
        },
      ]);

    // Fetch with category join
    const { data: transactionWithCategory } = await supabaseAdmin
      .from('transactions')
      .select('*, category:categories(id, name, emoji)')
      .eq('id', transaction.id)
      .single();

    return NextResponse.json(
      {
        transaction: {
          id: transactionWithCategory.id,
          type: transactionWithCategory.type,
          description: transactionWithCategory.description,
          amount: Number(transactionWithCategory.amount),
          category_id: transactionWithCategory.category_id,
          category: transactionWithCategory.category,
          payment_method: transactionWithCategory.payment_method,
          date: transactionWithCategory.date,
          month_label: transactionWithCategory.month_label,
          created_at: transactionWithCategory.created_at,
          updated_at: transactionWithCategory.updated_at,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error in POST /api/transactions/add:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
