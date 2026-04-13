import { supabaseAdmin } from './supabase';
import { Category } from '@/types';
import { normalize } from './formatter';

let categoryCache: { data: Category[]; ts: number } | null = null;
const CACHE_TTL = 60_000; // 1 min

// ════════════════════════════════════════════════════════════
// LEVENSHTEIN DISTANCE FOR FUZZY MATCHING
// ════════════════════════════════════════════════════════════

function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  return dp[m][n];
}

function fuzzyMatch(text: string, pattern: string): boolean {
  const textNorm = normalize(text);
  const patternNorm = normalize(pattern);

  // For words >= 5 chars: tolerance of 2, for shorter: tolerance of 1
  const tolerance = Math.min(textNorm.length, patternNorm.length) >= 5 ? 2 : 1;
  const distance = levenshteinDistance(textNorm, patternNorm);

  return distance <= tolerance;
}

export async function getCategories(userId: string): Promise<Category[]> {
  if (categoryCache && Date.now() - categoryCache.ts < CACHE_TTL) {
    return categoryCache.data;
  }
  const { data } = await supabaseAdmin
    .from('categories')
    .select('*')
    .eq('user_id', userId)
    .order('sort_order');
  categoryCache = { data: data || [], ts: Date.now() };
  return data || [];
}

export function invalidateCache() {
  categoryCache = null;
}

export async function matchCategory(
  text: string,
  userId: string
): Promise<Category | null> {
  const cats = await getCategories(userId);
  const norm = normalize(text);

  // 1. Check keywords (exact/substring match)
  for (const cat of cats) {
    for (const kw of cat.keywords || []) {
      const kwNorm = normalize(kw);
      if (norm.includes(kwNorm) || kwNorm.includes(norm)) return cat;
    }
  }

  // 2. Check learned items (exact/substring match)
  for (const cat of cats) {
    const learned = (cat.learned_items as string[]) || [];
    for (const item of learned) {
      const itemNorm = normalize(item);
      if (norm.includes(itemNorm) || itemNorm.includes(norm)) return cat;
    }
  }

  // 3. Check keywords (fuzzy match for higher confidence)
  for (const cat of cats) {
    for (const kw of cat.keywords || []) {
      if (fuzzyMatch(norm, kw)) return cat;
    }
  }

  // 4. Check learned items (fuzzy match for higher confidence)
  for (const cat of cats) {
    const learned = (cat.learned_items as string[]) || [];
    for (const item of learned) {
      if (fuzzyMatch(norm, item)) return cat;
    }
  }

  return null;
}

export async function resolveCategory(
  term: string,
  userId: string
): Promise<Category | null> {
  const cats = await getCategories(userId);
  const termNorm = normalize(term);

  // Friendly names map
  const friendlyMap: Record<string, string> = {
    alimentacao: 'iFood / Restaurante', comida: 'iFood / Restaurante',
    food: 'iFood / Restaurante', restaurante: 'iFood / Restaurante',
    ifood: 'iFood / Restaurante',
    transporte: 'Uber / Transporte', uber: 'Uber / Transporte',
    carro: 'Uber / Transporte',
    saude: 'Saúde', farmacia: 'Saúde',
    roupa: 'Roupa', vestuario: 'Roupa',
    lazer: 'Lazer', diversao: 'Lazer',
    assinatura: 'Assinaturas', assinaturas: 'Assinaturas', streaming: 'Assinaturas',
    mercado: 'Mercado', supermercado: 'Mercado',
    weed: 'Weed', beck: 'Weed', erva: 'Weed', maconha: 'Weed',
  };

  const mapped = friendlyMap[termNorm];
  if (mapped) {
    return cats.find((c) => c.name === mapped) || null;
  }

  // Direct match on category name
  for (const cat of cats) {
    const catNorm = normalize(cat.name);
    if (termNorm === catNorm || catNorm.includes(termNorm) || termNorm.includes(catNorm)) {
      return cat;
    }
  }

  // Keyword match
  return matchCategory(term, userId);
}

export async function suggestCategory(
  description: string,
  userId: string
): Promise<Category | null> {
  const cats = await getCategories(userId);
  const norm = normalize(description);

  const suggestions: { test: RegExp; name: string }[] = [
    { test: /cerveja|chopp|drink|vodka|whisky|vinho|gin/, name: 'Lazer' },
    { test: /pao|bolo|doce|salgado|lanche|cafe|pastel|sanduiche/, name: 'iFood / Restaurante' },
    { test: /shampoo|sabonete|creme|hidratante|desodorante/, name: 'Saúde' },
    { test: /presente|gift|lembranca/, name: 'Roupa' },
    { test: /arroz|feijao|leite|ovo|carne|peixe|fruta|verdura/, name: 'Mercado' },
  ];

  for (const s of suggestions) {
    if (s.test.test(norm)) {
      return cats.find((c) => c.name === s.name) || null;
    }
  }
  return null;
}

export async function learnItem(
  categoryId: string,
  item: string
): Promise<void> {
  const { data: cat } = await supabaseAdmin
    .from('categories')
    .select('learned_items')
    .eq('id', categoryId)
    .single();

  if (!cat) return;
  const learned = (cat.learned_items as string[]) || [];
  const itemLower = item.toLowerCase().trim();
  if (!learned.includes(itemLower)) {
    learned.push(itemLower);
    await supabaseAdmin
      .from('categories')
      .update({ learned_items: learned })
      .eq('id', categoryId);
    invalidateCache();
  }
}

export async function unlearnItem(
  categoryId: string,
  item: string
): Promise<void> {
  const { data: cat } = await supabaseAdmin
    .from('categories')
    .select('learned_items')
    .eq('id', categoryId)
    .single();

  if (!cat) return;
  const learned = (cat.learned_items as string[]) || [];
  const itemLower = item.toLowerCase().trim();
  const idx = learned.indexOf(itemLower);
  if (idx !== -1) {
    learned.splice(idx, 1);
    await supabaseAdmin
      .from('categories')
      .update({ learned_items: learned })
      .eq('id', categoryId);
    invalidateCache();
  }
}
