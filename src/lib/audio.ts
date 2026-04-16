/**
 * Audio transcription pipeline for WhatsApp voice messages.
 *
 * Flow: isAudioMessage → downloadTwilioMedia → transcribeAudio → processAudioMessage
 */

// ---------------------------------------------------------------------------
// 1. Detection
// ---------------------------------------------------------------------------

export function isAudioMessage(formData: FormData): boolean {
  const numMedia = parseInt(formData.get('NumMedia')?.toString() || '0', 10);
  if (numMedia < 1) return false;

  const contentType = formData.get('MediaContentType0')?.toString() || '';
  return contentType.startsWith('audio/');
}

// ---------------------------------------------------------------------------
// 2. Download from Twilio
// ---------------------------------------------------------------------------

export async function downloadTwilioMedia(mediaUrl: string): Promise<Buffer> {
  const sid = process.env.TWILIO_SID;
  const token = process.env.TWILIO_TOKEN;

  if (!sid || !token) {
    throw new Error('Missing TWILIO_SID or TWILIO_TOKEN');
  }

  const credentials = Buffer.from(`${sid}:${token}`).toString('base64');

  const res = await fetch(mediaUrl, {
    headers: { Authorization: `Basic ${credentials}` },
  });

  if (!res.ok) {
    throw new Error(`Twilio media download failed: ${res.status} ${res.statusText}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

// ---------------------------------------------------------------------------
// 3. Transcribe with OpenAI Whisper
// ---------------------------------------------------------------------------

export async function transcribeAudio(
  audioBuffer: Buffer,
  contentType: string,
): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  // Map content-type to a file extension Whisper accepts
  const extMap: Record<string, string> = {
    'audio/ogg': 'ogg',
    'audio/mpeg': 'mp3',
    'audio/mp4': 'mp4',
    'audio/wav': 'wav',
    'audio/webm': 'webm',
    'audio/x-m4a': 'm4a',
  };
  const ext = extMap[contentType] || 'ogg';

  const blob = new Blob([new Uint8Array(audioBuffer)], { type: contentType });
  const form = new FormData();
  form.append('file', blob, `audio.${ext}`);
  form.append('model', 'whisper-1');
  form.append('language', 'pt');

  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    console.error('Whisper API error:', res.status, body);
    return null;
  }

  const json = await res.json();
  return (json.text as string)?.trim() || null;
}

// ---------------------------------------------------------------------------
// 4. Full pipeline
// ---------------------------------------------------------------------------

export interface AudioResult {
  transcription: string;
}

export async function processAudioMessage(
  formData: FormData,
): Promise<AudioResult | null> {
  try {
    if (!isAudioMessage(formData)) return null;

    // Check for OpenAI key early so we can give a friendly message
    if (!process.env.OPENAI_API_KEY) return null;

    const mediaUrl = formData.get('MediaUrl0')?.toString();
    const contentType = formData.get('MediaContentType0')?.toString() || 'audio/ogg';

    if (!mediaUrl) return null;

    const audioBuffer = await downloadTwilioMedia(mediaUrl);
    const transcription = await transcribeAudio(audioBuffer, contentType);

    if (!transcription) return null;

    return { transcription };
  } catch (err) {
    console.error('Audio processing error:', err);
    return null;
  }
}
