// ══════════════════════════════════════════════════════════
// WHATSAPP — Interface pública unificada
// Switch via env WHATSAPP_PROVIDER=meta|twilio
// Lógica de negócio importa daqui e não sabe qual provider.
// ══════════════════════════════════════════════════════════

import { WhatsAppProvider, WhatsAppButton, WhatsAppListSection, IncomingMessage } from './types';
import { twilioProvider } from './providers/twilio';
import { metaProvider } from './providers/meta';

// Re-export types
export type { WhatsAppButton, WhatsAppListSection, IncomingMessage } from './types';

/** Provider ativo baseado em variável de ambiente */
function getProvider(): WhatsAppProvider {
  const provider = process.env.WHATSAPP_PROVIDER || 'twilio';
  if (provider === 'meta') return metaProvider;
  return twilioProvider;
}

// ─── API Pública ────────────────────────────────────────

/** Envia mensagem de texto simples */
export async function sendText(phone: string, text: string): Promise<void> {
  return getProvider().sendText(phone, text);
}

/** Envia mensagem com botões clicáveis (max 3) */
export async function sendButtons(phone: string, text: string, buttons: WhatsAppButton[]): Promise<void> {
  return getProvider().sendButtons(phone, text, buttons);
}

/** Envia lista interativa (max 10 itens por seção) */
export async function sendList(phone: string, text: string, buttonLabel: string, sections: WhatsAppListSection[]): Promise<void> {
  return getProvider().sendList(phone, text, buttonLabel, sections);
}

/** Parseia request do webhook pro formato interno */
export async function parseWebhook(req: Request): Promise<IncomingMessage | null> {
  return getProvider().parseWebhook(req);
}

/** Verifica webhook (GET) — só Meta precisa */
export function verifyWebhook(req: Request): Response | null {
  const provider = getProvider();
  if (provider.verifyWebhook) return provider.verifyWebhook(req);
  return null;
}

// ─── Compatibilidade (alias pro código existente) ───────

/** @deprecated Use sendText() */
export async function sendWhatsApp(to: string, body: string): Promise<void> {
  return sendText(to, body);
}
