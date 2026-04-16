// Rota manual pra resincronizar todas as transacoes com a planilha.
// POST /api/sheets/sync -> le do Supabase, reescreve a aba 'Transacoes' inteira.

import { NextResponse } from 'next/server';
import { resyncAllTransactions, testSheetsConnection } from '@/lib/sheets-sync';

export async function POST() {
  const test = await testSheetsConnection();
  if (!test.ok) {
    return NextResponse.json({ ok: false, error: test.error }, { status: 400 });
  }

  const result = await resyncAllTransactions();
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
  }

  return NextResponse.json({ ok: true, count: result.count, title: test.title });
}
