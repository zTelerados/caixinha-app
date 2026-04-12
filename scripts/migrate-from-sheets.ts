/**
 * CAIXINHA — Script de migração Google Sheets → Supabase
 *
 * Uso: GOOGLE_SHEETS_ID=xxx SUPABASE_URL=xxx SUPABASE_SERVICE_KEY=xxx npx tsx scripts/migrate-from-sheets.ts
 *
 * Este script lê os dados da planilha do Caixinha (gastos + entradas de cada mês)
 * e insere no Supabase. Validação de integridade no final.
 */

import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';

// ════════════════════════════════════════════════════════════
// CONFIG
// ════════════════════════════════════════════════════════════

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const SHEETS_ID = process.env.GOOGLE_SHEETS_ID || '';

// Planilha: gastos nas colunas K-O (11-15), linhas 10-55
// Entradas nas colunas P-R (16-18), linhas 10-25
const COL_NOME = 10;  // K (0-indexed)
const COL_DATA = 11;
const COL_TIPO = 12;
const COL_CAT = 13;
const COL_VALOR = 14;

const COL_FONTE = 15; // P
const COL_DATA_E = 16;
const COL_VALOR_E = 17;

const LINHA_INICIO = 9; // row 10, 0-indexed
const LINHA_FIM = 54;
const LINHA_INICIO_E = 9;
const LINHA_FIM_E = 24;

const MESES = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
];

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ════════════════════════════════════════════════════════════
// MAIN
// ════════════════════════════════════════════════════════════

async function main() {
  console.log('🔄 Caixinha — Migração Sheets → Supabase\n');

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Falta SUPABASE_URL ou SUPABASE_SERVICE_KEY');
    process.exit(1);
  }
  if (!SHEETS_ID) {
    console.error('❌ Falta GOOGLE_SHEETS_ID');
    process.exit(1);
  }

  // Auth Google (usa Application Default Credentials ou service account)
  const auth = new google.auth.GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  const sheets = google.sheets({ version: 'v4', auth });

  // Busca o user
  const { data: user, error: userErr } = await supabase
    .from('users')
    .select('id')
    .eq('phone', 'whatsapp:+5521995350758')
    .single();

  if (!user || userErr) {
    console.error('❌ Usuário não encontrado no Supabase. Rode o schema.sql primeiro.');
    process.exit(1);
  }

  // Carrega categorias
  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .eq('user_id', user.id);

  const catMap: Record<string, string> = {};
  for (const c of categories || []) {
    catMap[c.name] = c.id;
  }

  let totalGastosSheet = 0;
  let totalEntradasSheet = 0;
  let totalGastosMigrados = 0;
  let totalEntradasMigrados = 0;

  for (const mes of MESES) {
    console.log(`📅 ${mes}...`);

    let rows: any[][] = [];
    try {
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEETS_ID,
        range: `'${mes}'!A1:R60`,
      });
      rows = res.data.values || [];
    } catch (e: any) {
      if (e.message?.includes('Unable to parse range')) {
        console.log(`   ⏭️  Aba "${mes}" não existe, pulando.`);
        continue;
      }
      throw e;
    }

    // GASTOS
    for (let i = LINHA_INICIO; i <= LINHA_FIM && i < rows.length; i++) {
      const row = rows[i] || [];
      const nome = (row[COL_NOME] || '').toString().trim();
      const valor = parseFloat((row[COL_VALOR] || '0').toString().replace(',', '.'));

      if (!nome || !valor || valor <= 0) continue;
      totalGastosSheet++;

      const data = (row[COL_DATA] || '').toString().trim();
      const tipo = (row[COL_TIPO] || '').toString().trim();
      const cat = (row[COL_CAT] || '').toString().trim();

      // Parse date (dd/MM format)
      let dateStr = new Date().toISOString().split('T')[0];
      if (data) {
        const parts = data.split('/');
        if (parts.length >= 2) {
          const mesNum = MESES.indexOf(mes) + 1;
          const year = new Date().getFullYear();
          const day = parts[0].padStart(2, '0');
          const month = (parts.length > 1 ? parts[1] : mesNum.toString()).padStart(2, '0');
          dateStr = `${year}-${month}-${day}`;
        }
      }

      const categoryId = catMap[cat] || null;

      const { error } = await supabase.from('transactions').insert({
        user_id: user.id,
        type: 'expense',
        description: nome,
        amount: valor,
        category_id: categoryId,
        payment_method: tipo || null,
        date: dateStr,
        month_label: mes,
      });

      if (error) {
        console.error(`   ❌ Erro inserindo gasto "${nome}": ${error.message}`);
      } else {
        totalGastosMigrados++;
      }
    }

    // ENTRADAS
    for (let i = LINHA_INICIO_E; i <= LINHA_FIM_E && i < rows.length; i++) {
      const row = rows[i] || [];
      const fonte = (row[COL_FONTE] || '').toString().trim();
      const valor = parseFloat((row[COL_VALOR_E] || '0').toString().replace(',', '.'));

      if (!fonte || !valor || valor <= 0) continue;
      totalEntradasSheet++;

      const data = (row[COL_DATA_E] || '').toString().trim();
      let dateStr = new Date().toISOString().split('T')[0];
      if (data) {
        const parts = data.split('/');
        if (parts.length >= 2) {
          const year = new Date().getFullYear();
          const day = parts[0].padStart(2, '0');
          const month = parts[1].padStart(2, '0');
          dateStr = `${year}-${month}-${day}`;
        }
      }

      const { error } = await supabase.from('transactions').insert({
        user_id: user.id,
        type: 'income',
        description: fonte,
        amount: valor,
        category_id: null,
        payment_method: null,
        date: dateStr,
        month_label: mes,
      });

      if (error) {
        console.error(`   ❌ Erro inserindo entrada "${fonte}": ${error.message}`);
      } else {
        totalEntradasMigrados++;
      }
    }

    console.log(`   ✅ OK`);
  }

  // VALIDAÇÃO
  console.log('\n════════════════════════════════════════');
  console.log('VALIDAÇÃO DE INTEGRIDADE');
  console.log('════════════════════════════════════════');
  console.log(`Gastos na planilha:    ${totalGastosSheet}`);
  console.log(`Gastos no Supabase:    ${totalGastosMigrados}`);
  console.log(`Entradas na planilha:  ${totalEntradasSheet}`);
  console.log(`Entradas no Supabase:  ${totalEntradasMigrados}`);

  const gastosOk = totalGastosSheet === totalGastosMigrados;
  const entradasOk = totalEntradasSheet === totalEntradasMigrados;

  if (gastosOk && entradasOk) {
    console.log('\n✅ MIGRAÇÃO COMPLETA — 100% de integridade.');
  } else {
    console.log('\n⚠️  ATENÇÃO — Diferença encontrada:');
    if (!gastosOk) console.log(`   Gastos: faltam ${totalGastosSheet - totalGastosMigrados}`);
    if (!entradasOk) console.log(`   Entradas: faltam ${totalEntradasSheet - totalEntradasMigrados}`);
  }
}

main().catch((e) => {
  console.error('💥 Erro fatal:', e);
  process.exit(1);
});
