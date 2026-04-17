// ══════════════════════════════════════════════════════════
// WHATSAPP TYPES — Tipos unificados provider-agnóstico
// ══════════════════════════════════════════════════════════

/** Um botão clicável no WhatsApp */
export interface WhatsAppButton {
  id: string;       // payload enviado quando clicam (ex: "pix", "credito")
  title: string;    // texto visível no botão (ex: "💳 Pix") — max 20 chars
}

/** Uma seção de lista interativa (futuro) */
export interface WhatsAppListSection {
  title: string;
  rows: Array<{
    id: string;
    title: string;
    description?: string;
  }>;
}

/** Mensagem normalizada vinda do webhook (qualquer provider) */
export interface IncomingMessage {
  phone: string;           // formato E.164: whatsapp:+5521... (Twilio) ou +5521... (Meta)
  body: string;            // texto da mensagem ou payload do botão
  isButtonReply: boolean;  // true se veio de toque em botão
  buttonPayload?: string;  // id do botão clicado (se isButtonReply)
  mediaUrl?: string;       // URL de mídia (áudio, imagem)
  mediaType?: string;      // tipo MIME
  raw: any;                // payload original do provider pra debug
}

/** Interface que todo provider implementa */
export interface WhatsAppProvider {
  /** Envia mensagem de texto simples */
  sendText(phone: string, text: string): Promise<void>;

  /** Envia mensagem com botões clicáveis (max 3 botões na Meta) */
  sendButtons(phone: string, text: string, buttons: WhatsAppButton[]): Promise<void>;

  /** Envia lista interativa (max 10 itens) — futuro */
  sendList(phone: string, text: string, buttonLabel: string, sections: WhatsAppListSection[]): Promise<void>;

  /** Parseia webhook request pra formato interno. Retorna null se não for mensagem válida. */
  parseWebhook(req: Request): Promise<IncomingMessage | null>;

  /** Verifica webhook (GET) — só Meta usa, Twilio não precisa */
  verifyWebhook?(req: Request): Response | null;
}
