import { NextRequest, NextResponse } from 'next/server';
import { routeMessage } from '@/handlers';
import { isAudioMessage, processAudioMessage } from '@/lib/audio';
import { sendWhatsApp } from '@/lib/twilio';

// Deduplication: ignore identical messages from same number within 3s
const recentMessages = new Map<string, { body: string; ts: number }>();
const DEDUP_WINDOW_MS = 3000;

function isDuplicate(phone: string, body: string): boolean {
  const now = Date.now();
  const prev = recentMessages.get(phone);

  if (recentMessages.size > 500) {
    for (const [k, v] of recentMessages) {
      if (now - v.ts > DEDUP_WINDOW_MS * 2) recentMessages.delete(k);
    }
  }

  if (prev && prev.body === body && now - prev.ts < DEDUP_WINDOW_MS) {
    return true;
  }

  recentMessages.set(phone, { body, ts: now });
  return false;
}

const TWIML_EMPTY = '<?xml version="1.0" encoding="UTF-8"?><Response></Response>';
const TWIML_HEADERS = { 'Content-Type': 'text/xml' };

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const from = formData.get('From')?.toString() || '';

    if (from === '') {
      return NextResponse.json({ error: 'Missing params' }, { status: 400 });
    }

    let body = formData.get('Body')?.toString().trim() || '';
    let audioTranscription: string | undefined;

    if (isAudioMessage(formData)) {
      const result = await processAudioMessage(formData);
      if (result) {
        body = result.transcription;
        audioTranscription = result.transcription;
      } else {
        await sendWhatsApp(from, 'Ainda n\u00e3o consigo ouvir \u00e1udios. Manda por texto.');
        return new NextResponse(TWIML_EMPTY, { headers: TWIML_HEADERS });
      }
    }

    if (body === '') {
      return NextResponse.json({ error: 'Missing params' }, { status: 400 });
    }

    if (isDuplicate(from, body)) {
      console.log('Dedup: ignoring duplicate from', from);
      return new NextResponse(TWIML_EMPTY, { headers: TWIML_HEADERS });
    }

    await routeMessage(from, body, audioTranscription);

    return new NextResponse(TWIML_EMPTY, { headers: TWIML_HEADERS });
  } catch (err) {
    console.error('Webhook error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'ok', service: 'Caixinha v8' });
}
