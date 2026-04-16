import { NextRequest, NextResponse } from 'next/server';
import { routeMessage } from '@/handlers';
import { isAudioMessage, processAudioMessage } from '@/lib/audio';
import { sendWhatsApp } from '@/lib/twilio';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const from = formData.get('From')?.toString() || '';

    if (!from) {
      return NextResponse.json({ error: 'Missing params' }, { status: 400 });
    }

    let body = formData.get('Body')?.toString().trim() || '';
    let audioTranscription: string | undefined;

    // Audio handling — try to transcribe before falling back to text
    if (isAudioMessage(formData)) {
      const result = await processAudioMessage(formData);
      if (result) {
        body = result.transcription;
        audioTranscription = result.transcription;
      } else {
        // No OpenAI key or transcription failed
        await sendWhatsApp(
          from,
          'Ainda não consigo ouvir áudios. Manda por texto.',
        );
        return new NextResponse(
          '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
          { headers: { 'Content-Type': 'text/xml' } },
        );
      }
    }

    if (!body) {
      return NextResponse.json({ error: 'Missing params' }, { status: 400 });
    }

    // Await processing — Vercel kills the function after response
    await routeMessage(from, body, audioTranscription);

    // TwiML empty response (Twilio expects this)
    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      { headers: { 'Content-Type': 'text/xml' } }
    );
  } catch (err) {
    console.error('Webhook error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'ok', service: 'Caixinha v8' });
}
