// Smoke tests para detectFollowUp.
// Rodar com: npm run test:followup

import { detectFollowUp, detectQuery } from '../src/lib/parser';
import type { Category, QueryResult } from '../src/types';

const cats: Category[] = [
  { id: 'cat-merc', user_id: 'u1', name: 'Mercado', emoji: '🛒', keywords: ['mercado'], learned_items: [], sort_order: 1, created_at: '' },
  { id: 'cat-laz', user_id: 'u1', name: 'Lazer', emoji: '🎉', keywords: ['lazer', 'cerveja'], learned_items: [], sort_order: 2, created_at: '' },
];

let pass = 0, fail = 0;
function expect<T>(name: string, actual: T, expected: T) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) { pass++; console.log(`  ok  ${name}`); }
  else { fail++; console.log(`  FAIL ${name} -> got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`); }
}

console.log('\n=== detectQuery: novos periodos ===');

let q = detectQuery('quanto gastei semana passada?');
expect('"semana passada" -> last_week', q?.type, 'last_week');

q = detectQuery('quanto gastei mes passado?');
expect('"mes passado" -> last_month', q?.type, 'last_month');

q = detectQuery('no mes anterior quanto gastei?');
expect('"mes anterior" -> last_month', q?.type, 'last_month');

console.log('\n=== detectFollowUp: troca de periodo ===');

const baseCat: QueryResult = { type: 'category', term: 'mercado' };

let f = detectFollowUp('e semana passada?', baseCat, cats);
expect('"e semana passada?" -> last_week com term=mercado', f, { type: 'last_week', term: 'mercado' });

f = detectFollowUp('e mes passado?', baseCat, cats);
expect('"e mes passado?" -> last_month com term=mercado', f, { type: 'last_month', term: 'mercado' });

f = detectFollowUp('e ontem?', baseCat, cats);
expect('"e ontem?" -> yesterday com term=mercado', f, { type: 'yesterday', term: 'mercado' });

f = detectFollowUp('e hoje?', baseCat, cats);
expect('"e hoje?" -> today com term=mercado', f, { type: 'today', term: 'mercado' });

console.log('\n=== detectFollowUp: troca de tipo ===');

f = detectFollowUp('e o maior?', baseCat, cats);
expect('"e o maior?" -> biggest', f, { type: 'biggest' });

f = detectFollowUp('e o ultimo?', baseCat, cats);
expect('"e o ultimo?" -> last_n count=1', f, { type: 'last_n', count: 1 });

f = detectFollowUp('e ultimos 3?', baseCat, cats);
expect('"e ultimos 3?" -> last_n count=3', f, { type: 'last_n', count: 3 });

console.log('\n=== detectFollowUp: troca de categoria ===');

const baseWeek: QueryResult = { type: 'week' };

f = detectFollowUp('e mercado?', baseWeek, cats);
expect('"e mercado?" sobre week -> week com term=mercado', f, { type: 'week', term: 'mercado' });

f = detectFollowUp('e em lazer?', baseWeek, cats);
expect('"e em lazer?" sobre week -> week com term=lazer', f, { type: 'week', term: 'lazer' });

// Sobre category, troca o term mantendo o tipo
f = detectFollowUp('e lazer?', baseCat, cats);
expect('"e lazer?" sobre category(mercado) -> category(lazer)', f, { type: 'category', term: 'lazer' });

console.log('\n=== detectFollowUp: rejeicao ===');

f = detectFollowUp('quanto gastei hoje?', baseCat, cats);
expect('Sem prefixo "e" -> nao e follow-up', f, null);

f = detectFollowUp('mercado', baseCat, cats);
expect('"mercado" sozinho -> nao e follow-up', f, null);

f = detectFollowUp('e xpto bla', baseCat, cats);
expect('"e xpto bla" termo curto -> nao e follow-up valido (categoria nao existe)', f?.type, 'category');
// Aceito que vire category query — handler mostra "nao achei categoria"

console.log(`\n${pass} passed, ${fail} failed.`);
process.exit(fail > 0 ? 1 : 0);
