// Status da integracao Sheets: configurado? consegue conectar?
// GET /api/sheets/status

import { NextResponse } from 'next/server';
import { getSheetsStatus, testSheetsConnection } from '@/lib/sheets-sync';

export async function GET() {
  const status = getSheetsStatus();
  if (!status.configured) {
    return NextResponse.json({
      configured: false,
      connected: false,
      title: null,
      error: 'Env vars nao configuradas',
    });
  }

  const test = await testSheetsConnection();
  return NextResponse.json({
    configured: true,
    connected: test.ok,
    title: test.title || null,
    spreadsheetId: status.spreadsheetId,
    error: test.error || null,
  });
}
error || null,
  });
}
}
