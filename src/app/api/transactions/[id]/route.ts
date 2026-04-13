import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const transactionId = params.id;
    const body = await req.json();
    const { description, amount, category_id, payment_method, date } = body;

    // Look up user by OWNER_PHONE
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('phone', process.env.OWNER_PHONE!)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify transaction belongs to user
    const { data: existingTransaction, error: fetchError } = await supabaseAdmin
      .from('transactions')
      .select('*')
      .eq('id', transactionId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !existingTransaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    // Build update object with only provided fields
    const updateData: any = {};
    if (description !== undefined) updateData.description = description;
    if (amount !== undefined) updateData.amount = Number(amount);
    if (category_id !== undefined) updateData.category_id = category_id;
    if (payment_method !== undefined) updateData.payment_method = payment_method;
    if (date !== undefined) updateData.date = date;
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    // Update transaction
    const { data: updatedTransaction, error: updateError } = await supabaseAdmin
      .from('transactions')
      .update(updateData)
      .eq('id', transactionId)
      .select('*')
      .single();

    if (updateError || !updatedTransaction) {
      return NextResponse.json({ error: 'Failed to update transaction' }, { status: 500 });
    }

    // Log to transaction_log
    await supabaseAdmin
      .from('transaction_log')
      .insert([
        {
          user_id: user.id,
          action: 'update',
          transaction_id: transactionId,
          details: {
            old: {
              description: existingTransaction.description,
              amount: existingTransaction.amount,
              category_id: existingTransaction.category_id,
              payment_method: existingTransaction.payment_method,
              date: existingTransaction.date,
            },
            new: updateData,
          },
        },
      ]);

    // Fetch with category join
    const { data: transactionWithCategory } = await supabaseAdmin
      .from('transactions')
      .select('*, category:categories(id, name, emoji)')
      .eq('id', transactionId)
      .single();

    return NextResponse.json({
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
    });
  } catch (error) {
    console.error('Error in PUT /api/transactions/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const transactionId = params.id;

    // Look up user by OWNER_PHONE
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('phone', process.env.OWNER_PHONE!)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify transaction belongs to user
    const { data: existingTransaction, error: fetchError } = await supabaseAdmin
      .from('transactions')
      .select('*')
      .eq('id', transactionId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !existingTransaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    // Delete transaction
    const { error: deleteError } = await supabaseAdmin
      .from('transactions')
      .delete()
      .eq('id', transactionId);

    if (deleteError) {
      return NextResponse.json({ error: 'Failed to delete transaction' }, { status: 500 });
    }

    // Log to transaction_log
    await supabaseAdmin
      .from('transaction_log')
      .insert([
        {
          user_id: user.id,
          action: 'delete',
          transaction_id: transactionId,
          details: {
            description: existingTransaction.description,
            amount: existingTransaction.amount,
          },
        },
      ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/transactions/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
