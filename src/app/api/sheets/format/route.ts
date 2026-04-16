// POST /api/sheets/format — resync + formata a planilha bonitinha
import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { resyncAllTransactions } from '@/lib/sheets-sync';

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
const SERVICE_JSON_RAW = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

function getAuth() {
  if (!SERVICE_JSON_RAW || !SPREADSHEET_ID) return null;
  try {
    const creds = JSON.parse(SERVICE_JSON_RAW);
    const key = creds.private_key.replace(/\\n/g, '\n');
    return new google.auth.JWT({
      email: creds.client_email,
      key,
      scopes: ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive'],
    });
  } catch {
    return null;
  }
}

export async function POST() {
  // 1. Resync dados
  const resync = await resyncAllTransactions();
  if (!resync.ok) {
    return NextResponse.json({ ok: false, error: resync.error }, { status: 500 });
  }

  // 2. Formatar planilha
  const auth = getAuth();
  if (!auth || !SPREADSHEET_ID) {
    return NextResponse.json({ ok: true, count: resync.count, formatted: false });
  }

  const sheets = google.sheets({ version: 'v4', auth });

  try {
    // Pegar o sheetId da aba Transacoes
    const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
    const tab = (meta.data.sheets || []).find(
      (s) => s.properties?.title === 'Transacoes'
    );
    const sheetId = tab?.properties?.sheetId ?? 0;
    const rowCount = resync.count + 1; // header + dados

    const requests: any[] = [
      // Header: fundo escuro, texto branco, bold
      {
        repeatCell: {
          range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 8 },
          cell: {
            userEnteredFormat: {
              backgroundColor: { red: 0.12, green: 0.12, blue: 0.12 },
              textFormat: { bold: true, fontSize: 11, foregroundColor: { red: 1, green: 1, blue: 1 } },
              horizontalAlignment: 'CENTER',
              verticalAlignment: 'MIDDLE',
              padding: { top: 4, bottom: 4, left: 6, right: 6 },
            },
          },
          fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment,padding)',
        },
      },
      // Congelar header
      {
        updateSheetProperties: {
          properties: { sheetId, gridProperties: { frozenRowCount: 1 } },
          fields: 'gridProperties.frozenRowCount',
        },
      },
      // Coluna Valor (D) — formato moeda
      {
        repeatCell: {
          range: { sheetId, startRowIndex: 1, endRowIndex: rowCount, startColumnIndex: 3, endColumnIndex: 4 },
          cell: {
            userEnteredFormat: {
              numberFormat: { type: 'CURRENCY', pattern: 'R$ #,##0.00' },
              horizontalAlignment: 'RIGHT',
            },
          },
          fields: 'userEnteredFormat(numberFormat,horizontalAlignment)',
        },
      },
      // Coluna Tipo (B) — cor condicional: Entrada verde, Saida vermelha
      // Zebra striping nos dados
      {
        addBanding: {
          bandedRange: {
            range: { sheetId, startRowIndex: 0, endRowIndex: rowCount, startColumnIndex: 0, endColumnIndex: 8 },
            rowProperties: {
              headerColor: { red: 0.12, green: 0.12, blue: 0.12 },
              firstBandColor: { red: 1, green: 1, blue: 1 },
              secondBandColor: { red: 0.95, green: 0.95, blue: 0.97 },
            },
          },
        },
      },
      // Auto-resize colunas
      {
        autoResizeDimensions: {
          dimensions: { sheetId, dimension: 'COLUMNS', startIndex: 0, endIndex: 8 },
        },
      },
      // Coluna Data (A) — largura fixa
      {
        updateDimensionProperties: {
          range: { sheetId, dimension: 'COLUMNS', startIndex: 0, endIndex: 1 },
          properties: { pixelSize: 110 },
          fields: 'pixelSize',
        },
      },
      // Coluna Descricao (C) — largura maior
      {
        updateDimensionProperties: {
          range: { sheetId, dimension: 'COLUMNS', startIndex: 2, endIndex: 3 },
          properties: { pixelSize: 200 },
          fields: 'pixelSize',
        },
      },
      // Coluna Categoria (E) — largura razoavel
      {
        updateDimensionProperties: {
          range: { sheetId, dimension: 'COLUMNS', startIndex: 4, endIndex: 5 },
          properties: { pixelSize: 160 },
          fields: 'pixelSize',
        },
      },
      // Borda inferior no header
      {
        updateBorders: {
          range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 8 },
          bottom: { style: 'SOLID_MEDIUM', color: { red: 0.3, green: 0.3, blue: 0.3 } },
        },
      },
      // Dados: fonte 10, vertical center
      {
        repeatCell: {
          range: { sheetId, startRowIndex: 1, endRowIndex: rowCount, startColumnIndex: 0, endColumnIndex: 8 },
          cell: {
            userEnteredFormat: {
              textFormat: { fontSize: 10 },
              verticalAlignment: 'MIDDLE',
            },
          },
          fields: 'userEnteredFormat(textFormat.fontSize,verticalAlignment)',
        },
      },
    ];

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: { requests },
    });

    // 3. Formato da coluna Data como data legível
    const dataRange = `Transacoes!A2:A${rowCount}`;
    const dateRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: dataRange,
    });

    if (dateRes.data.values) {
      const formatted = dateRes.data.values.map((row) => {
        const raw = row[0] || '';
        try {
          const d = new Date(raw);
          if (isNaN(d.getTime())) return [raw];
          return [`${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`];
        } catch {
          return [raw];
        }
      });
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: dataRange,
        valueInputOption: 'RAW',
        requestBody: { values: formatted },
      });
    }

    return NextResponse.json({ ok: true, count: resync.count, formatted: true });
  } catch (err: any) {
    return NextResponse.json({ ok: true, count: resync.count, formatted: false, formatError: err?.message });
  }
}

// GET tambem funciona pra facilitar teste no navegador
export async function GET() {
  return POST();
}
