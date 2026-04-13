import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    // Look up user by OWNER_PHONE
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('phone', process.env.OWNER_PHONE!)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Select ALL transactions (no month filter) with category join, ordered by date desc
    const { data: transactions, error: transactionsError } = await supabaseAdmin
      .from('transactions')
      .select('*, category:categories(name, emoji)')
      .eq('user_id', user.id)
      .order('date', { ascending: false });

    if (transactionsError) {
      return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
    }

    // Generate CSV string
    const headers = 'Data,Tipo,Descrição,Valor,Categoria,Forma de Pagamento';
    const rows: string[] = [];

    for (const t of transactions || []) {
      // Format date as dd/mm/yyyy
      const [year, month, day] = t.date.split('-');
      const formattedDate = `${day}/${month}/${year}`;

      // Format amount with comma decimal (Brazilian style)
      const formattedAmount = Number(t.amount).toFixed(2).replace('.', ',');

      // Category name or empty
      const categoryName = t.category?.name || '';

      // Payment method or empty
      const paymentMethod = t.payment_method || '';

      // Escape description for CSV (wrap in quotes if contains comma or quote)
      let escapedDescription = t.description;
      if (escapedDescription.includes(',') || escapedDescription.includes('"')) {
        escapedDescription = `"${escapedDescription.replace(/"/g, '""')}"`;
      }

      const row = `${formattedDate},${t.type},${escapedDescription},${formattedAmount},${categoryName},${paymentMethod}`;
      rows.push(row);
    }

    const csv = [headers, ...rows].join('\n');

    // Return as text/csv with Content-Disposition header for download
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="caixinha-export.csv"',
      },
    });
  } catch (error) {
    console.error('Error in GET /api/config/export:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
