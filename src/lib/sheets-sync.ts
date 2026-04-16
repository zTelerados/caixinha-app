// ============================================================
// Sheets Espelho - sync de transacoes pro Google Sheets
// ============================================================
// Resiliencia:
//   - Se env vars faltam, log warning e nao quebra o bot
//   - Erro no Google nunca propaga pro usuario do WhatsApp
//   - Cada operacao isolada: falhar sync nao desfaz transacao no DB
// ============================================================

import { google } from 'googleapis';
import type { sheets_v4 } from 'googleapis';
import { supabaseAdmin } from './supabase';
import type { Transaction } from '@/types';

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
const SERVICE_JSON_RAW = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

function parseJsonEnv(): { email: string; key: string } | null {
  if (!SERVICE_JSON_RAW) return null;
  try {
    const parsed = JSON.parse(SERVICE_JSON_RAW);
    if (parsed && parsed.client_email && parsed.private_key) {
      return { email: parsed.client_email, key: parsed.private_key };
    }
  } catch {
    return null;
  }
  return null;
}

const fromJson = parseJsonEnv();
const SERVICE_EMAIL = fromJson?.email || process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const SERVICE_KEY = fromJson?.key || process.env.GOOGLE_SERVICE_ACCOUNT_KEY;

const TAB_TRANSACTIONS = 'Transacoes';

export interface SheetsStatus {
  configured: boolean;
  spreadsheetId: string | null;
}

export function getSheetsStatus(): SheetsStatus {
  return {
    configured: Boolean(SPREADSHEET_ID && SERVICE_EMAIL && SERVICE_KEY),
    spreadsheetId: SPREADSHEET_ID || null,
  };
}

let cachedSheets: sheets_v4.Sheets | null = null;

function getSheetsClient(): sheets_v4.Sheets | null {
  if (!SPREADSHEET_ID || !SERVICE_EMAIL || !SERVICE_KEY) return null;
  if (cachedSheets) return cachedSheets;

  const privateKey = SERVICE_KEY.replace(/\\n/g, '\n');
  const jwt = new google.auth.JWT({
    email: SERVICE_EMAIL,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive'],
  });
  cachedSheets = google.sheets({ version: 'v4', auth: jwt });
  return cachedSheets;
}

function formatRow(tx: any): any[] {
  const data = tx.date || '';
  const tipo = tx.type === 'income' ? 'Entrada' : 'Saida';
  const desc = tx.description || '';
  const valor = Number(tx.amount) || 0;
  const cat = tx.category?.name || '';
  const pag = tx.payment_method || '';
  const mes = tx.month_label || '';
  const criado = tx.created_at || new Date().toISOString();
  return [data, tipo, desc, valor, cat, pag, mes, criado];
}

export async function syncTransactionToSheet(tx: Transaction): Promise<boolean> {
  const sheets = getSheetsClient();
  if (!sheets || !SPREADSHEET_ID) {
    console.log('[sheets] nao configurado, pulando sync');
    return false;
  }
  try {
    let categoryName: string | null = null;
    if (tx.category_id) {
      const { data: cat } = await supabaseAdmin
        .from('categories')
        .select('name')
        .eq('id', tx.category_id)
        .single();
      categoryName = cat?.name || null;
    }
    const row = formatRow({ ...tx, category: categoryName ? { name: categoryName } : null });
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: TAB_TRANSACTIONS + '!A:H',
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [row] },
    });
    return true;
  } catch (err: any) {
    console.error('[sheets] sync falhou:', err?.message || err);
    return false;
  }
}

export function syncTransactionInBackground(tx: Transaction): void {
  syncTransactionToSheet(tx).catch((e) => {
    console.error('[sheets] background sync erro:', e?.message || e);
  });
}

export async function resyncAllTransactions(): Promise<{ ok: boolean; count: number; error?: string }> {
  const sheets = getSheetsClient();
  if (!sheets || !SPREADSHEET_ID) {
    return { ok: false, count: 0, error: 'Sheets nao configurado' };
  }
  try {
    const { data: txs, error } = await supabaseAdmin
      .from('transactions')
      .select('*, category:categories(name)')
      .order('date', { ascending: true });
    if (error) throw new Error(error.message);

    const rows = (txs || []).map(formatRow);
    const header = ['Data', 'Tipo', 'Descricao', 'Valor', 'Categoria', 'Pagamento', 'Mes', 'Criado em'];

    await sheets.spreadsheets.values.clear({
      spreadsheetId: SPREADSHEET_ID,
      range: TAB_TRANSACTIONS + '!A:H',
    });
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: TAB_TRANSACTIONS + '!A1',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [header, ...rows] },
    });
    return { ok: true, count: rows.length };
  } catch (err: any) {
    const msg = err?.message || String(err);
    console.error('[sheets] resync total falhou:', msg);
    return { ok: false, count: 0, error: msg };
  }
}

export async function testSheetsConnection(): Promise<{ ok: boolean; error?: string; title?: string }> {
  const sheets = getSheetsClient();
  if (!sheets || !SPREADSHEET_ID) {
    return { ok: false, error: 'Env vars faltando' };
  }
  try {
    const res = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
    return { ok: true, title: res.data.properties?.title || '' };
  } catch (err: any) {
    return { ok: false, error: err?.message || String(err) };
  }
}
