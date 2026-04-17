// ══════════════════════════════════════════════════════════
// NORMALIZE.TS — Camada de compreensão humana
// Pipeline de normalização que toda mensagem passa antes
// de qualquer parser. Depois daqui, não existe "digitou errado".
// ══════════════════════════════════════════════════════════

// ─── 1. Normalização básica ──────────────────────────────

/** Strip accents, lowercase, collapse spaces, remove junk chars */
export function basicNormalize(raw: string): string {
  let s = raw.trim();
  // Remove emojis and special unicode (keep letters, numbers, spaces, comma, dot, $, R)
  s = s.replace(/[\u{1F600}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}]/gu, '');
  s = s.toLowerCase();
  // Remove accents
  s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  // Remove everything except letters, digits, spaces, comma, period
  s = s.replace(/[^a-z0-9\s,.\-]/g, ' ');
  // Collapse whitespace
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

// ─── 2. Dicionário de typos ─────────────────────────────

const TYPO_MAP: Record<string, string> = {
  // Payment methods
  pic: 'pix', pics: 'pix', pyx: 'pix', pixx: 'pix', pixs: 'pix', px: 'pix',
  credito: 'credito', credt: 'credito', credi: 'credito', cred: 'credito',
  cartao: 'credito', cartão: 'credito', crédito: 'credito',
  debito: 'debito', debt: 'debito', débito: 'debito',
  dinh: 'dinheiro', dinheir: 'dinheiro', dinhero: 'dinheiro', cash: 'dinheiro',
  especie: 'dinheiro',

  // Action verbs
  gasti: 'gastei', gastie: 'gastei', gasstei: 'gastei', gastey: 'gastei',
  pagei: 'paguei', pagui: 'paguei',
  compri: 'comprei', compray: 'comprei',
  resebi: 'recebi', recbi: 'recebi', rcebi: 'recebi', receb: 'recebi',

  // Query words
  reumo: 'resumo', rezumo: 'resumo', reusmo: 'resumo',
  quato: 'quanto', qanto: 'quanto', qnto: 'quanto',
  onten: 'ontem', ontm: 'ontem',
  oje: 'hoje', hj: 'hoje',
  semna: 'semana', seman: 'semana',
  mes: 'mes', mez: 'mes',
  categria: 'categoria', categora: 'categoria',
  ajda: 'ajuda', ajud: 'ajuda',

  // Common items
  uber: 'uber', ubr: 'uber', ube: 'uber',
  ifood: 'ifood', ifod: 'ifood', ifoood: 'ifood',
  mercdo: 'mercado', mercad: 'mercado',
  farmcia: 'farmacia', farma: 'farmacia',
  cerva: 'cerveja', cerv: 'cerveja', breja: 'cerveja',

  // Number words (basic typos)
  reais: 'reais', reas: 'reais', rais: 'reais',
  pratas: 'reais', prata: 'reais',
  conto: 'reais', contos: 'reais',
  pila: 'reais', pilas: 'reais',
};

// ─── 3. Levenshtein fuzzy matching ──────────────────────

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost,
      );
    }
  }
  return dp[m][n];
}

/** All canonical words we want to fuzzy match against */
const CANONICAL_WORDS = new Set([
  ...Object.values(TYPO_MAP),
  'pix', 'credito', 'debito', 'dinheiro',
  'gastei', 'paguei', 'comprei', 'recebi',
  'resumo', 'quanto', 'ontem', 'hoje', 'semana', 'mes',
  'categoria', 'ajuda', 'apaga', 'desfaz', 'cancela',
  'alimentacao', 'transporte', 'mercado', 'lazer', 'saude',
  'uber', 'ifood', 'farmacia', 'cerveja',
]);

function fuzzyMatch(word: string): string | null {
  if (word.length <= 2) return null; // Too short for fuzzy
  const maxDist = word.length <= 4 ? 1 : 2;

  let bestMatch: string | null = null;
  let bestDist = maxDist + 1;

  for (const canonical of CANONICAL_WORDS) {
    // Quick length check to skip obvious mismatches
    if (Math.abs(canonical.length - word.length) > maxDist) continue;

    const dist = levenshtein(word, canonical);
    if (dist > 0 && dist < bestDist) {
      bestDist = dist;
      bestMatch = canonical;
    }
  }

  return bestMatch;
}

// ─── 4. Payment method canonicalization ─────────────────

/** Canonical payment methods (lowercase, no accents) for DB storage */
export const PAYMENT_CANONICAL: Record<string, string> = {
  pix: 'pix',
  credito: 'credito',
  debito: 'debito',
  dinheiro: 'dinheiro',
  cartao: 'credito',
  cash: 'dinheiro',
  especie: 'dinheiro',
};

/** Display names for payment methods (user-facing, with accents) */
export const PAYMENT_DISPLAY: Record<string, string> = {
  pix: 'Pix',
  credito: 'Crédito',
  debito: 'Débito',
  dinheiro: 'Dinheiro',
};

/** Convert any payment string to canonical lowercase form */
export function canonicalPayment(raw: string): string | null {
  const normalized = basicNormalize(raw);
  // Direct match
  if (PAYMENT_CANONICAL[normalized]) return PAYMENT_CANONICAL[normalized];
  // Check if any canonical key is contained in the string
  for (const [key, val] of Object.entries(PAYMENT_CANONICAL)) {
    if (normalized.includes(key)) return val;
  }
  // Fuzzy
  const fuzzy = fuzzyMatch(normalized);
  if (fuzzy && PAYMENT_CANONICAL[fuzzy]) return PAYMENT_CANONICAL[fuzzy];
  return null;
}

/** Get display name for a canonical payment method */
export function displayPayment(canonical: string | null): string {
  if (!canonical) return '';
  return PAYMENT_DISPLAY[canonical] || canonical;
}

// ─── 5. Numbers by extenso (Portuguese) ─────────────────

const NUMBER_WORDS: Record<string, number> = {
  zero: 0, um: 1, uma: 1, dois: 2, duas: 2, tres: 3,
  quatro: 4, cinco: 5, meia: 6, seis: 6, sete: 7, oito: 8, nove: 9,
  dez: 10, onze: 11, doze: 12, treze: 13, catorze: 14, quatorze: 14,
  quinze: 15, dezesseis: 16, dezessete: 17, dezoito: 18, dezenove: 19,
  vinte: 20, trinta: 30, quarenta: 40, cinquenta: 50,
  sessenta: 60, setenta: 70, oitenta: 80, noventa: 90,
  cem: 100, cento: 100,
  duzentos: 200, duzentas: 200, trezentos: 300, trezentas: 300,
  quatrocentos: 400, quatrocentas: 400, quinhentos: 500, quinhentas: 500,
  seiscentos: 600, seiscentas: 600, setecentos: 700, setecentas: 700,
  oitocentos: 800, oitocentas: 800, novecentos: 900, novecentas: 900,
  mil: 1000,
};

/**
 * Parse Portuguese number words into a numeric value.
 * Handles: "cinquenta", "duzentos e trinta", "mil e quinhentos",
 * "vinte e cinco reais e cinquenta centavos"
 */
export function parseNumberWords(text: string): number | null {
  const cleaned = basicNormalize(text)
    .replace(/\breais\b/g, '')
    .replace(/\breal\b/g, '')
    .replace(/\bpratas?\b/g, '')
    .replace(/\bcontos?\b/g, '')
    .replace(/\bpilas?\b/g, '')
    .trim();

  // Handle "X reais e Y centavos"
  const centavosMatch = cleaned.match(/(.+?)\s+(?:e\s+)?(\w+)\s+centavos?$/);
  if (centavosMatch) {
    const mainPart = parseNumberWordsInner(centavosMatch[1].trim());
    const centPart = parseNumberWordsInner(centavosMatch[2].trim());
    if (mainPart !== null && centPart !== null) {
      return mainPart + centPart / 100;
    }
  }

  return parseNumberWordsInner(cleaned);
}

function parseNumberWordsInner(text: string): number | null {
  if (!text) return null;

  // Split on "e" connector
  const parts = text.split(/\s+e\s+/).map(p => p.trim()).filter(Boolean);
  if (parts.length === 0) return null;

  let total = 0;
  let foundAny = false;

  for (const part of parts) {
    const words = part.split(/\s+/);
    let partValue = 0;

    for (const word of words) {
      const val = NUMBER_WORDS[word];
      if (val !== undefined) {
        if (val === 1000) {
          partValue = partValue === 0 ? 1000 : partValue * 1000;
        } else {
          partValue += val;
        }
        foundAny = true;
      }
    }

    total += partValue;
  }

  return foundAny ? total : null;
}

// ─── 6. Full pipeline ───────────────────────────────────

/**
 * Apply typo corrections to individual words in a message.
 * Returns the corrected message string.
 */
export function correctTypos(text: string): string {
  const words = text.split(' ');
  return words.map(word => {
    // Direct typo map hit
    if (TYPO_MAP[word]) return TYPO_MAP[word];
    // Fuzzy match
    const fuzzy = fuzzyMatch(word);
    if (fuzzy) return fuzzy;
    return word;
  }).join(' ');
}

/**
 * Full normalization pipeline.
 * Call this on every incoming message before any parser.
 * Returns the cleaned, corrected message.
 */
export function humanNormalize(raw: string): string {
  let s = basicNormalize(raw);
  s = correctTypos(s);
  return s;
}

/**
 * Try to extract a numeric value from text.
 * Handles: digits, R$ prefix, comma decimals, number words.
 * Returns the number or null.
 */
export function extractNumber(text: string): number | null {
  // Try digit patterns first (most common)
  const digitMatch = text.match(/r?\$?\s*(\d+(?:[.,]\d{1,2})?)/);
  if (digitMatch) {
    return parseFloat(digitMatch[1].replace(',', '.'));
  }

  // Try number words
  return parseNumberWords(text);
}
