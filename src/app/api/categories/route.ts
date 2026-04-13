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

    // Select all categories ordered by sort_order
    const { data: categories, error: categoriesError } = await supabaseAdmin
      .from('categories')
      .select('*')
      .eq('user_id', user.id)
      .order('sort_order', { ascending: true });

    if (categoriesError) {
      return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
    }

    return NextResponse.json({
      categories: (categories || []).map((c) => ({
        id: c.id,
        user_id: c.user_id,
        name: c.name,
        emoji: c.emoji,
        keywords: c.keywords || [],
        learned_items: c.learned_items || [],
        sort_order: c.sort_order,
        created_at: c.created_at,
      })),
    });
  } catch (error) {
    console.error('Error in GET /api/categories:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
