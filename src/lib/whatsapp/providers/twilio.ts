// ══════════════════════════════════════════════════════════
// TWILIO PROVIDER — Fallback / legacy
// ══════════════════════════════════════════════════════════

import { WhatsAppProvider, WhatsAppButton, WhatsAppListSection, IncomingMessage } from '../types';

const TWILIO_SID = process.env.TWILIO_SID || '';
const TWILIO_TOKEN = process.env.TWILIO_TOKEN || '';
const TWILIO_FROM = process.env.TWILIO_NUMBER || '';

function getAuth(): string {
  return Buffer.from(`${TWILIO_SID}:${TWILIO_TOKEN}`).toString('base64');
}

function getUrl(): string {
  return `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`;
}

async function twilioSend(to: string, body: string): Promise<void> {
  const res = await fetch(getUrl(), {
    method: 'POST',
    headers: {
      Authorization: `Basic ${getAuth()}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ To: to, From: TWILIO_FROM, Body: body }),
  });
  if (!res.ok) {
    console.error('Twilio error:', res.status, await res.text());
  }
}

export const twilioProvider: WhatsAppProvider = {
  async sendText(phone: string, text: string): Promise<void> {
    await twilioSend(phone, text);
  },

  // Twilio Sandbox não suporta botões — fallback pra texto numerado
  async sendButtons(phone: string, text: string, buttons: WhatsAppButton[]): Promise<void> {
    const numbered = buttons.map((b, i) => `${i + 1}️⃣ ${b.title}`).join('\n');
    await twilioSend(phone, `${text}\n\n${numbered}`);
  },

  // Twilio Sandbox não suporta listas — fallback pra texto
  async sendList(phone: string, text: string, _buttonLabel: string, sections: WhatsAppListSection[]): Promise<void> {
    const lines: string[] = [];
    for (const section of sections) {
      lines.push(`*${section.title}*`);
      for (const row of section.rows) {
        lines.push(`• ${row.title}${row.description ? ` — ${row.description}` : ''}`);
      }
    }
    await twilioSend(phone, `${text}\n\n${lines.join('\n')}`);
  },

  async parseWebhook(req: Request): Promise<IncomingMessage | null> {
    try {
      const formData = await req.formData();
      const from = formData.get('From')?.toString() || '';
      const body = formData.get('Body')?.toString().trim() || '';

      if (!from) return null;

      // Check for media (audio)
      const numMedia = parseInt(formData.get('NumMedia')?.toString() || '0', 10);
      let mediaUrl: string | undefined;
      let mediaType: string | undefined;
      if (numMedia > 0) {
        mediaUrl = formData.get('MediaUrl0')?.toString();
        mediaType = formData.get('MediaContentType0')?.toString();
      }

      return {
        phone: from,
        body,
        isButtonReply: false, // Twilio sandbox doesn't do buttons
        mediaUrl,
        mediaType,
        raw: Object.fromEntries(formData.entries()),
      };
    } catch (e) {
      console.error('Twilio parseWebhook error:', e);
      return null;
    }
  },

  // Twilio não precisa de verificação de webhook
  verifyWebhook: undefined,
};
