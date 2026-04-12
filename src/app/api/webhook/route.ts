import { NextRequest, NextResponse } from 'next/server';
import { routeMessage } from '@/handlers';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const body = formData.get('Body')?.toString().trim() || '';
    const from = formData.get('From')?.toString() || '';

    if (!body || !from) {
      return NextResponse.json({ error: 'Missing params' }, { status: 400 });
    }

    // Fire and forget — Twilio expects fast response
    routeMessage(from, body).catch((err) =>
      console.error('Handler error:', err)
    );

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
