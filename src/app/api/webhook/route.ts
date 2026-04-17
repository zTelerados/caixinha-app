import { NextRequest, NextResponse } from 'next/server';
import { routeMessage } from '@/handlers';
import { isAudioMessage, processAudioMessage } from '@/lib/audio';
import { sendText, parseWebhook, verifyWebhook } from '@/lib/whatsapp';

// ─── Deduplication ──────────────────────────────────────
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

// ─── Twilio legacy response ─────────────────────────────
const TWIML_EMPTY = '<?xml version="1.0" encoding="UTF-8"?><Response></Response>';
const TWIML_HEADERS = { 'Content-Type': 'text/xml' };

function isTwilioRequest(req: NextRequest): boolean {
  const ct = req.headers.get('content-type') || '';
  return ct.includes('application/x-www-form-urlencoded');
}

function isMetaRequest(req: NextRequest): boolean {
  const ua = req.headers.get('user-agent') || '';
  return ua.includes('facebookexternalua') || ua.includes('facebookplatform') || req.headers.has('x-hub-signature-256');
}

// ─── GET — Webhook verification (Meta) ──────────────────
export async function GET(req: NextRequest) {
  // Meta envia GET pra verificar o webhook
  const verification = verifyWebhook(req);
  if (verification) return verification;

  // Fallback: health check
  return NextResponse.json({ status: 'ok', service: 'Caixinha v9' });
}

// ─── POST — Mensagens recebidas ─────────────────────────
export async function POST(req: NextRequest) {
  try {
    const provider = process.env.WHATSAPP_PROVIDER || 'twilio';

    // ── Detectar provider e parsear ──
    if (provider === 'meta' || isMetaRequest(req)) {
      return await handleMetaWebhook(req);
    }

    // Default: Twilio
    return await handleTwilioWebhook(req);
  } catch (err) {
    console.error('Webhook error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// ─── Handler Twilio (legacy, mesmo fluxo de antes) ──────
async function handleTwilioWebhook(req: NextRequest): Promise<NextResponse> {
  const formData = await req.formData();
  const from = formData.get('From')?.toString() || '';

  if (from === '') {
    return new NextResponse(TWIML_EMPTY, { headers: TWIML_HEADERS });
  }

  let body = formData.get('Body')?.toString().trim() || '';
  let audioTranscription: string | undefined;

  if (isAudioMessage(formData)) {
    const result = await processAudioMessage(formData);
    if (result) {
      body = result.transcription;
      audioTranscription = result.transcription;
    } else {
      await sendText(from, 'Ainda não consigo ouvir áudios. Manda por texto.');
      return new NextResponse(TWIML_EMPTY, { headers: TWIML_HEADERS });
    }
  }

  if (body === '') {
    return new NextResponse(TWIML_EMPTY, { headers: TWIML_HEADERS });
  }

  if (isDuplicate(from, body)) {
    console.log('Dedup: ignoring duplicate from', from);
    return new NextResponse(TWIML_EMPTY, { headers: TWIML_HEADERS });
  }

  await routeMessage(from, body, audioTranscription);
  return new NextResponse(TWIML_EMPTY, { headers: TWIML_HEADERS });
}

// ─── Handler Meta Cloud API ─────────────────────────────
async function handleMetaWebhook(req: NextRequest): Promise<NextResponse> {
  // Meta exige resposta 200 imediata, senão reenvia
  // Clonamos o request pra poder ler o body
  const cloned = req.clone();

  // Parsear mensagem
  const incoming = await (await import('@/lib/whatsapp')).parseWebhook(cloned);

  // Se não é mensagem válida (status update, etc), retorna 200 silencioso
  if (!incoming || (!incoming.body && !incoming.mediaUrl)) {
    return NextResponse.json({ status: 'ok' });
  }

  const { phone, body, isButtonReply, buttonPayload } = incoming;

  if (isDuplicate(phone, body || buttonPayload || '')) {
    console.log('Dedup: ignoring duplicate from', phone);
    return NextResponse.json({ status: 'ok' });
  }

  // Se é resposta de botão, usa o payload como mensagem
  const messageBody = isButtonReply && buttonPayload ? buttonPayload : body;

  if (!messageBody) {
    // Áudio ou mídia sem texto — por agora, avisa
    if (incoming.mediaType?.startsWith('audio/')) {
      await sendText(phone, 'Ainda não consigo ouvir áudios. Manda por texto.');
    }
    return NextResponse.json({ status: 'ok' });
  }

  // Rotear mensagem (mesmo fluxo pra qualquer provider)
  await routeMessage(phone, messageBody);

  return NextResponse.json({ status: 'ok' });
}
