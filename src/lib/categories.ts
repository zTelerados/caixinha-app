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

// Substring match com guarda de tamanho mínimo (3 chars)
// para evitar que learned_items curtos casem com qualquer texto
const MIN_SUBSTR_LEN = 3;
const MIN_FUZZY_LEN = 4;

function substringMatchScore(text: string, term: string): number {
  if (term.length < MIN_SUBSTR_LEN) return 0;
  // Match direto: term inteiro dentro do text → score = tamanho do term
  if (text.includes(term)) return term.length;
  // Match invertido: text inteiro dentro do term (texto curto, term mais longo)
  // só vale se text também tiver tamanho mínimo
  if (text.length >= MIN_SUBSTR_LEN && term.includes(text)) return text.length;
  return 0;
}

function fuzzyMatchScore(text: string, term: string): number {
  if (text.length < MIN_FUZZY_LEN || term.length < MIN_FUZZY_LEN) return 0;
  const tolerance = Math.min(text.length, term.length) >= 5 ? 2 : 1;
  const distance = levenshteinDistance(text, term);
  if (distance > tolerance) return 0;
  // Score: tamanho da menor string menos distância (priorizar match mais forte)
  return Math.min(text.length, term.length) - distance;
}

export type MatchResult = {
  category: Category;
  score: number;
  source: 'keyword' | 'learned';
  via: 'substring' | 'fuzzy';
  matched: string;
};

// Helper puro: encontra a melhor categoria para um texto, dada uma lista pré-carregada.
// Não depende de DB. Usado pelo parser e pelo matchCategory.
export function findBestCategoryMatch(
  text: string,
  categories: Category[]
): MatchResult | null {
  const textNorm = normalize(text);
  if (!textNorm) return null;

  let best: MatchResult | null = null;

  const consider = (
    candidate: MatchResult,
    tier: number
  ) => {
    // Tier menor = prioridade maior (substring keyword > substring learned > fuzzy keyword > fuzzy learned)
    // Empate: maior score vence
    if (!best) { best = { ...candidate, score: candidate.score - tier * 1000 }; return; }
    const adjusted = candidate.score - tier * 1000;
    if (adjusted > best.score) best = { ...candidate, score: adjusted };
  };

  // Tier 0: keywords substring
  for (const cat of categories) {
    for (const kw of cat.keywords || []) {
      const score = substringMatchScore(textNorm, normalize(kw));
      if (score > 0) consider({ category: cat, score, source: 'keyword', via: 'substring', matched: kw }, 0);
    }
  }
  // Tier 1: learned_items substring
  for (const cat of categories) {
    for (const item of (cat.learned_items as string[]) || []) {
      const score = substringMatchScore(textNorm, normalize(item));
      if (score > 0) consider({ category: cat, score, source: 'learned', via: 'substring', matched: item }, 1);
    }
  }
  // Tier 2: keywords fuzzy
  for (const cat of categories) {
    for (const kw of cat.keywords || []) {
      const score = fuzzyMatchScore(textNorm, normalize(kw));
      if (score > 0) consider({ category: cat, score, source: 'keyword', via: 'fuzzy', matched: kw }, 2);
    }
  }
  // Tier 3: learned_items fuzzy
  for (const cat of categories) {
    for (const item of (cat.learned_items as string[]) || []) {
      const score = fuzzyMatchScore(textNorm, normalize(item));
      if (score > 0) consider({ category: cat, score, source: 'learned', via: 'fuzzy', matched: item }, 3);
    }
  }

  return best;
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
  const result = findBestCategoryMatch(text, cats);
  return result?.category || null;
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
