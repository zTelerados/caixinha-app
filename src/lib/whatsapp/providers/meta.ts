// ══════════════════════════════════════════════════════════
// META CLOUD API PROVIDER — WhatsApp Business Platform
// ══════════════════════════════════════════════════════════

import { WhatsAppProvider, WhatsAppButton, WhatsAppListSection, IncomingMessage } from '../types';
import crypto from 'crypto';

const PHONE_NUMBER_ID = process.env.META_PHONE_NUMBER_ID || '';
const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN || '';
const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || '';
const APP_SECRET = process.env.META_APP_SECRET || '';

const API_URL = `https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}/messages`;

/** Headers padrão pra todas as chamadas à API da Meta */
function getHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${ACCESS_TOKEN}`,
    'Content-Type': 'application/json',
  };
}

/** Envia request pra API de mensagens da Meta */
async function metaSend(payload: object): Promise<void> {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error('Meta API error:', res.status, err);
  }
}

/** Formata número pro padrão Meta (sem whatsapp: prefix, sem +) */
function formatPhone(phone: string): string {
  // Remove "whatsapp:" prefix se vier do formato Twilio
  let clean = phone.replace(/^whatsapp:/, '');
  // Remove "+" se tiver
  clean = clean.replace(/^\+/, '');
  return clean;
}

/** Verifica assinatura do webhook da Meta */
function verifySignature(body: string, signature: string): boolean {
  if (!APP_SECRET) return true; // Skip se não configurou
  const expected = 'sha256=' + crypto.createHmac('sha256', APP_SECRET).update(body).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

export const metaProvider: WhatsAppProvider = {
  async sendText(phone: string, text: string): Promise<void> {
    await metaSend({
      messaging_product: 'whatsapp',
      to: formatPhone(phone),
      type: 'text',
      text: { body: text },
    });
  },

  async sendButtons(phone: string, text: string, buttons: WhatsAppButton[]): Promise<void> {
    // Meta suporta máximo 3 botões em interactive reply_button
    const metaButtons = buttons.slice(0, 3).map((b) => ({
      type: 'reply',
      reply: {
        id: b.id,
        title: b.title.slice(0, 20), // Max 20 chars
      },
    }));

    await metaSend({
      messaging_product: 'whatsapp',
      to: formatPhone(phone),
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text },
        action: {
          buttons: metaButtons,
        },
      },
    });
  },

  async sendList(phone: string, text: string, buttonLabel: string, sections: WhatsAppListSection[]): Promise<void> {
    const metaSections = sections.map((s) => ({
      title: s.title,
      rows: s.rows.map((r) => ({
        id: r.id,
        title: r.title.slice(0, 24),
        description: r.description?.slice(0, 72),
      })),
    }));

    await metaSend({
      messaging_product: 'whatsapp',
      to: formatPhone(phone),
      type: 'interactive',
      interactive: {
        type: 'list',
        body: { text },
        action: {
          button: buttonLabel.slice(0, 20),
          sections: metaSections,
        },
      },
    });
  },

  async parseWebhook(req: Request): Promise<IncomingMessage | null> {
    try {
      const rawBody = await req.text();

      // Verificar assinatura
      const signature = req.headers.get('x-hub-signature-256') || '';
      if (APP_SECRET && signature && !verifySignature(rawBody, signature)) {
        console.error('Meta webhook: invalid signature');
        return null;
      }

      const data = JSON.parse(rawBody);

      // Meta manda vários tipos de webhook. Só queremos mensagens.
      const entry = data?.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;

      if (!value?.messages || value.messages.length === 0) {
        return null; // Status update, não mensagem
      }

      const msg = value.messages[0];
      const phone = msg.from; // Formato: 5521999999999 (sem +)

      // Normalizar pra formato com whatsapp: prefix (compatível com DB existente)
      const normalizedPhone = `whatsapp:+${phone}`;

      // Detectar tipo de mensagem
      if (msg.type === 'interactive') {
        // Resposta de botão ou lista
        const interactive = msg.interactive;
        if (interactive.type === 'button_reply') {
          return {
            phone: normalizedPhone,
            body: interactive.button_reply.title,
            isButtonReply: true,
            buttonPayload: interactive.button_reply.id,
            raw: data,
          };
        }
        if (interactive.type === 'list_reply') {
          return {
            phone: normalizedPhone,
            body: interactive.list_reply.title,
            isButtonReply: true,
            buttonPayload: interactive.list_reply.id,
            raw: data,
          };
        }
      }

      if (msg.type === 'text') {
        return {
          phone: normalizedPhone,
          body: msg.text.body.trim(),
          isButtonReply: false,
          raw: data,
        };
      }

      if (msg.type === 'audio') {
        return {
          phone: normalizedPhone,
          body: '',
          isButtonReply: false,
          mediaUrl: msg.audio.id, // Meta usa media ID, não URL direta
          mediaType: msg.audio.mime_type,
          raw: data,
        };
      }

      // Tipo não suportado (imagem, vídeo, etc)
      return {
        phone: normalizedPhone,
        body: '',
        isButtonReply: false,
        raw: data,
      };
    } catch (e) {
      console.error('Meta parseWebhook error:', e);
      return null;
    }
  },

  verifyWebhook(req: Request): Response | null {
    const url = new URL(req.url);
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('Meta webhook verified');
      return new Response(challenge, { status: 200 });
    }

    console.error('Meta webhook verification failed');
    return new Response('Forbidden', { status: 403 });
  },
};
