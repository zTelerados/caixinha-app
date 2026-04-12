import { supabaseAdmin } from '@/lib/supabase';
import { invalidateCache } from '@/lib/categories';
import { CategoryCommand } from '@/types';
import { v4 as uuidv4 } from 'uuid';

export async function handleCategoryCommand(
  userId: string,
  phone: string,
  command: CategoryCommand
): Promise<string> {
  try {
    if (command.type === 'create' && command.name) {
      // Get highest sort_order
      const { data: cats } = await supabaseAdmin
        .from('categories')
        .select('sort_order')
        .eq('user_id', userId)
        .order('sort_order', { ascending: false })
        .limit(1);

      const sortOrder = ((cats?.[0]?.sort_order as number) || 0) + 1;

      const { error } = await supabaseAdmin.from('categories').insert([
        {
          id: uuidv4(),
          user_id: userId,
          name: command.name,
          emoji: '📌',
          keywords: [],
          learned_items: [],
          sort_order: sortOrder,
          created_at: new Date().toISOString(),
        },
      ]);

      if (error) {
        console.error('Category create error:', error);
        return 'Erro ao criar categoria.';
      }

      invalidateCache();
      return `Categoria "${command.name}" criada.`;
    }

    if (command.type === 'list') {
      const { data: cats } = await supabaseAdmin
        .from('categories')
        .select('*')
        .eq('user_id', userId)
        .order('sort_order');

      if (!cats || cats.length === 0) {
        return 'Você não tem categorias criadas ainda.';
      }

      const list = cats.map((c) => `${c.emoji} ${c.name}`).join(', ');
      return `Suas categorias: ${list}.`;
    }

    if (command.type === 'delete' && command.name) {
      const { data: cat } = await supabaseAdmin
        .from('categories')
        .select('id')
        .eq('user_id', userId)
        .ilike('name', `%${command.name}%`)
        .single();

      if (!cat) {
        return `Categoria "${command.name}" não encontrada.`;
      }

      const { error } = await supabaseAdmin.from('categories').delete().eq('id', cat.id);

      if (error) {
        console.error('Category delete error:', error);
        return 'Erro ao deletar categoria.';
      }

      invalidateCache();
      return `Categoria "${command.name}" deletada.`;
    }

    if (command.type === 'rename' && command.from && command.to) {
      const { data: cat } = await supabaseAdmin
        .from('categories')
        .select('id')
        .eq('user_id', userId)
        .ilike('name', `%${command.from}%`)
        .single();

      if (!cat) {
        return `Categoria "${command.from}" não encontrada.`;
      }

      const { error } = await supabaseAdmin
        .from('categories')
        .update({ name: command.to })
        .eq('id', cat.id);

      if (error) {
        console.error('Category rename error:', error);
        return 'Erro ao renomear categoria.';
      }

      invalidateCache();
      return `"${command.from}" agora é "${command.to}".`;
    }

    if (command.type === 'change_emoji' && command.name && command.emoji) {
      const { data: cat } = await supabaseAdmin
        .from('categories')
        .select('id')
        .eq('user_id', userId)
        .ilike('name', `%${command.name}%`)
        .single();

      if (!cat) {
        return `Categoria "${command.name}" não encontrada.`;
      }

      const { error } = await supabaseAdmin
        .from('categories')
        .update({ emoji: command.emoji })
        .eq('id', cat.id);

      if (error) {
        console.error('Category emoji change error:', error);
        return 'Erro ao mudar emoji.';
      }

      invalidateCache();
      return `Emoji de "${command.name}" mudou pra ${command.emoji}.`;
    }

    return 'Comando inválido.';
  } catch (e) {
    console.error('Category command error:', e);
    return 'Erro ao processar comando.';
  }
}
