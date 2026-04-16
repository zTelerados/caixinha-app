// Debug route for Google Sheets API permission errors
// GET /api/sheets/debug

import { NextResponse } from 'next/server';
import { google } from 'googleapis';

interface DebugInfo {
  envCheck: {
    hasJsonEnv: boolean;
    jsonEnvLength: number | null;
    hasEmailEnv: boolean;
    hasKeyEnv: boolean;
    hasSpreadsheetId: boolean;
    spreadsheetId: string | null;
  };
  parsedCredentials: {
    parseSuccess: boolean;
    clientEmail: string | null;
    projectId: string | null;
    keyStartsWith: string | null;
    keyFormatValid: boolean;
    parseError: string | null;
  };
  authPath: string;
  jwtCreationStatus: {
    success: boolean;
    error: string | null;
  };
  permissionsCheck: {
    attempted: boolean;
    driveEnabled: boolean;
    permissions: any[] | null;
    error: string | null;
  };
  warnings: string[];
}

export async function GET() {
  const debug: DebugInfo = {
    envCheck: {
      hasJsonEnv: false,
      jsonEnvLength: null,
      hasEmailEnv: false,
      hasKeyEnv: false,
      hasSpreadsheetId: false,
      spreadsheetId: null,
    },
    parsedCredentials: {
      parseSuccess: false,
      clientEmail: null,
      projectId: null,
      keyStartsWith: null,
      keyFormatValid: false,
      parseError: null,
    },
    authPath: 'unknown',
    jwtCreationStatus: {
      success: false,
      error: null,
    },
    permissionsCheck: {
      attempted: false,
      driveEnabled: false,
      permissions: null,
      error: null,
    },
    warnings: [],
  };

  // 1. Check environment variables
  const jsonEnv = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  const emailEnv = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const keyEnv = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

  debug.envCheck.hasJsonEnv = !!jsonEnv;
  debug.envCheck.jsonEnvLength = jsonEnv ? jsonEnv.length : null;
  debug.envCheck.hasEmailEnv = !!emailEnv;
  debug.envCheck.hasKeyEnv = !!keyEnv;
  debug.envCheck.hasSpreadsheetId = !!spreadsheetId;
  debug.envCheck.spreadsheetId = spreadsheetId || null;

  // 2. Try to parse JSON credentials
  let parsedEmail: string | null = null;
  let parsedKey: string | null = null;
  let parsedProjectId: string | null = null;

  if (jsonEnv) {
    try {
      const parsed = JSON.parse(jsonEnv);
      debug.parsedCredentials.parseSuccess = true;
      parsedEmail = parsed.client_email || null;
      parsedKey = parsed.private_key || null;
      parsedProjectId = parsed.project_id || null;

      debug.parsedCredentials.clientEmail = parsedEmail;
      debug.parsedCredentials.projectId = parsedProjectId;

      if (parsedKey) {
        debug.parsedCredentials.keyStartsWith = parsedKey.substring(0, 27);
        debug.parsedCredentials.keyFormatValid = parsedKey.startsWith('-----BEGIN PRIVATE KEY-----');
      }

      // Check for double-escaped newlines (common Vercel issue)
      if (parsedKey && parsedKey.includes('\\n')) {
        debug.warnings.push('Key contains literal \\n (escaped newlines) - will be fixed by replace(/\\\\n/g, "\\n")');
      }
    } catch (err: any) {
      debug.parsedCredentials.parseError = err?.message || String(err);
      debug.warnings.push(`Failed to parse GOOGLE_SERVICE_ACCOUNT_JSON: ${debug.parsedCredentials.parseError}`);
    }
  }

  // 3. Determine auth path
  if (parsedEmail && parsedKey) {
    debug.authPath = 'JSON (GOOGLE_SERVICE_ACCOUNT_JSON)';
  } else if (emailEnv && keyEnv) {
    debug.authPath = 'Individual env vars (EMAIL + KEY)';
    parsedEmail = emailEnv;
    parsedKey = keyEnv;
  } else {
    debug.authPath = 'MISSING';
  }

  // 4. Try to create JWT
  if (parsedEmail && parsedKey) {
    try {
      const privateKey = parsedKey.replace(/\\n/g, '\n');
      const jwt = new google.auth.JWT({
        email: parsedEmail,
        key: privateKey,
        scopes: ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive'],
      });
      debug.jwtCreationStatus.success = true;

      // 5. Try to list permissions on the spreadsheet
      if (spreadsheetId) {
        try {
          const drive = google.drive({ version: 'v3', auth: jwt });
          const res = await drive.permissions.list({
            fileId: spreadsheetId,
          });
          debug.permissionsCheck.attempted = true;
          debug.permissionsCheck.driveEnabled = true;
          debug.permissionsCheck.permissions = res.data.permissions || [];
        } catch (err: any) {
          debug.permissionsCheck.attempted = true;
          debug.permissionsCheck.error = err?.message || String(err);

          // Check if it's a Drive API not enabled error
          if (err?.message?.includes('Drive API')) {
            debug.warnings.push('Google Drive API may not be enabled in this project');
          }
        }
      }
    } catch (err: any) {
      debug.jwtCreationStatus.error = err?.message || String(err);
      debug.warnings.push(`Failed to create JWT: ${debug.jwtCreationStatus.error}`);
    }
  } else {
    debug.warnings.push('Missing credentials to create JWT');
  }

  // 6. Additional validation
  if (!spreadsheetId) {
    debug.warnings.push('GOOGLE_SHEETS_SPREADSHEET_ID is not set');
  }

  if (!debug.envCheck.hasJsonEnv && (!debug.envCheck.hasEmailEnv || !debug.envCheck.hasKeyEnv)) {
    debug.warnings.push('No valid authentication method configured');
  }

  return NextResponse.json(debug, { status: 200 });
}
