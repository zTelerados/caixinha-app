// Smoke tests para findBestCategoryMatch e parseExpense.
// Rodar com: npx tsx scripts/test-category-match.ts

import { findBestCategoryMatch } from '../src/lib/categories';
import { parseExpense } from '../src/lib/parser';
import type { Category } from '../src/types';

const cats: Category[] = [
  {
    id: 'cat-transp',
    user_id: 'u1',
    name: 'Uber / Transporte',
    emoji: '🚗',
    keywords: ['uber', '99', 'taxi', 'metro', 'onibus'],
    learned_items: ['uber casa', 'uber rio'],
    sort_order: 1,
    created_at: '',
  },
  {
    id: 'cat-food',
    user_id: 'u1',
    name: 'iFood / Restaurante',
    emoji: '🍔',
    keywords: ['ifood', 'restaurante', 'lanche', 'cafe'],
    learned_items: ['acai do bairro'],
    sort_order: 2,
    created_at: '',
  },
  {
    id: 'cat-noise',
    user_id: 'u1',
    name: 'Outros',
    emoji: '📦',
    keywords: [],
    learned_items: ['x'], // item curto: não deve casar com qualquer texto
    sort_order: 3,
    created_at: '',
  },
];

let pass = 0, fail = 0;
function expect<T>(name: string, actual: T, expected: T) {
  const ok = actual === expected;
  if (ok) { pass++; console.log(`  ok  ${name}`); }
  else { fail++; console.log(`  FAIL ${name} -> got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`); }
}

console.log('\n=== findBestCategoryMatch ===');

let r = findBestCategoryMatch('uber', cats);
expect('keyword "uber" -> Transporte', r?.category.id, 'cat-transp');
expect('  source = keyword', r?.source, 'keyword');

// "uberr" contém "uber" como prefixo: substring match (tier 0)
r = findBestCategoryMatch('uberr', cats);
expect('"uberr" -> Transporte', r?.category.id, 'cat-transp');

// "ifod" (typo de "ifood") só casa via fuzzy: 4 chars vs 5, distancia 1
r = findBestCategoryMatch('ifod', cats);
expect('typo "ifod" -> iFood', r?.category.id, 'cat-food');
expect('  via = fuzzy', r?.via, 'fuzzy');

r = findBestCategoryMatch('uber casa', cats);
expect('"uber casa" -> Transporte', r?.category.id, 'cat-transp');
expect('  source = keyword (tier 0 vence)', r?.source, 'keyword');

r = findBestCategoryMatch('acai do bairro', cats);
expect('learned "acai do bairro" -> iFood', r?.category.id, 'cat-food');
expect('  source = learned', r?.source, 'learned');

// Item curto "x" não pode poluir match com texto que contém "x"
r = findBestCategoryMatch('xis', cats);
// "xis" tem 3 chars, contém "x" mas item "x" tem só 1 char (< MIN_SUBSTR_LEN=3) -> não casa
expect('item curto "x" não casa com "xis"', r, null);

r = findBestCategoryMatch('xy', cats);
expect('texto < 3 chars retorna null', r, null);

r = findBestCategoryMatch('helicoptero', cats);
expect('"helicoptero" -> null', r, null);

r = findBestCategoryMatch('cafee', cats);
expect('typo "cafee" -> iFood (fuzzy)', r?.category.id, 'cat-food');

console.log('\n=== parseExpense ===');

let p = parseExpense('uber 23 pix', cats);
expect('"uber 23 pix" amount', p?.amount, 23);
expect('  payment', p?.payment_method, 'pix');
expect('  categoria', p?.category_id, 'cat-transp');
expect('  source', p?.category_source, 'keyword');

p = parseExpense('uberr 30 credito', cats);
expect('"uberr 30 credito" via fuzzy', p?.category_id, 'cat-transp');
expect('  payment', p?.payment_method, 'credito');

p = parseExpense('acai do bairro 15 pix', cats);
expect('"acai do bairro 15 pix" via learned', p?.category_id, 'cat-food');
expect('  source learned', p?.category_source, 'learned');

console.log(`\n${pass} passed, ${fail} failed.`);
process.exit(fail > 0 ? 1 : 0);
