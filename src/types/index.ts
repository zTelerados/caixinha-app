// ════════════════════════════════════════════════════════════
// CAIXINHA v8 — Type definitions
// ════════════════════════════════════════════════════════════

export interface User {
  id: string;
  phone: string;
  name: string;
  tone: string;
  month_start_day: number;
  created_at: string;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  emoji: string;
  keywords: string[];
  learned_items: string[];
  sort_order: number;
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  type: 'expense' | 'income';
  description: string;
  amount: number;
  category_id: string | null;
  payment_method: string | null;
  date: string;
  month_label: string;
  created_at: string;
  updated_at: string;
  // joined
  category?: Category;
}

export interface PendingAction {
  id: string;
  user_id: string;
  type: string;
  payload: Record<string, any>;
  expires_at: string;
  created_at: string;
}

export interface ParsedMessage {
  description: string;
  amount: number;
  date: Date;
  payment_method: string | null;
  category_id: string | null;
  category_name: string | null;
  custom_date: boolean;
  month_label: string;
}

export interface ParsedIncome {
  source: string;
  amount: number;
  date: Date;
  month_label: string;
}

export interface ParsedCorrection {
  type: 'category' | 'amount';
  term?: string;
  amount?: number;
}

export interface QueryResult {
  type: 'summary' | 'week' | 'today' | 'yesterday' | 'balance' | 'category';
  term?: string;
}

export interface CategoryCommand {
  type: 'create' | 'list' | 'delete' | 'rename' | 'change_emoji';
  name?: string;
  from?: string;
  to?: string;
  emoji?: string;
}

export interface ContextAnalysis {
  totalMonth: number;
  totalCategory: number;
  countCategory: number;
  countCategoryWeek: number;
  countToday: number;
  income: number;
  balance: number;
  topCategory: string | null;
  topCategoryTotal: number;
  pctCategory: number;
  avgCategory: number;
  showContext: boolean;
  insight: string | null;
}

export interface HandlerResult {
  response: string;
  handled: boolean;
}

// Month names in Portuguese
export const MONTHS: Record<number, string> = {
  1: 'Janeiro', 2: 'Fevereiro', 3: 'Março', 4: 'Abril',
  5: 'Maio', 6: 'Junho', 7: 'Julho', 8: 'Agosto',
  9: 'Setembro', 10: 'Outubro', 11: 'Novembro', 12: 'Dezembro',
};

export const FRIENDLY_NAMES: Record<string, string> = {
  'iFood / Restaurante': 'alimentação',
  'Uber / Transporte': 'transporte',
  'Mercado': 'mercado',
  'Lazer': 'lazer',
  'Roupa': 'roupa',
  'Assinaturas': 'assinaturas',
  'Saúde': 'saúde',
  'Weed': 'weed',
};
