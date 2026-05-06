// Supabase Edge Function: send-reminder
// Roda via cron a cada 5 min e dispara push notifications
// para lembretes habilitados que casam com o horário atual.
//
// Deploy:
//   supabase functions deploy send-reminder
//   supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... VAPID_SUBJECT=mailto:voce@exemplo.com
//
// Cron (no painel Supabase → Database → Cron):
//   select cron.schedule('thiago-reminders', '*/5 * * * *',
//     $$ select net.http_post(
//          url := 'https://SEU-PROJETO.functions.supabase.co/send-reminder',
//          headers := '{"Authorization":"Bearer SUA_ANON_OU_SERVICE_KEY","Content-Type":"application/json"}'::jsonb
//        ); $$);

// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import webpush from 'https://esm.sh/web-push@3.6.7';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const VAPID_PUBLIC = Deno.env.get('VAPID_PUBLIC_KEY')!;
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY')!;
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:thiago@example.com';

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

const REMINDER_LABELS: Record<string, string> = {
  ins_m: 'Insulina · manhã',
  ins_a: 'Insulina · tarde',
  ins_n: 'Insulina · noite',
  gli_1: 'Glicemia em jejum',
  gli_2: 'Glicemia · antes do almoço',
  gli_3: 'Glicemia · antes do jantar',
  gli_4: 'Glicemia · antes de dormir',
};

function nowInTimezone(tz = 'America/Sao_Paulo'): { hour: number; minute: number } {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = fmt.formatToParts(new Date());
  const hour = parseInt(parts.find(p => p.type === 'hour')!.value, 10);
  const minute = parseInt(parts.find(p => p.type === 'minute')!.value, 10);
  return { hour: hour === 24 ? 0 : hour, minute };
}

Deno.serve(async (_req: Request) => {
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
  const { hour, minute } = nowInTimezone();

  // janela de 5 minutos
  const minStart = minute - 2;
  const minEnd = minute + 2;

  const { data: rems, error } = await supabase
    .from('reminders')
    .select('reminder_type, hour, minute, user_id, profiles!inner(push_subscription)')
    .eq('enabled', true)
    .eq('hour', hour)
    .gte('minute', Math.max(0, minStart))
    .lte('minute', Math.min(59, minEnd));

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  const results: any[] = [];
  for (const r of rems ?? []) {
    const sub = (r as any).profiles?.push_subscription;
    if (!sub) continue;
    const label = REMINDER_LABELS[r.reminder_type] ?? 'Thiago 2.0';
    const payload = JSON.stringify({
      title: 'Thiago 2.0',
      body: `${label} · ritual de hoje`,
      tag: `t20-${r.reminder_type}`,
      data: { url: '/app/quests' },
    });
    try {
      await webpush.sendNotification(sub, payload, { TTL: 600 });
      results.push({ user: r.user_id, type: r.reminder_type, ok: true });
    } catch (e) {
      const status = (e as any)?.statusCode;
      if (status === 404 || status === 410) {
        // assinatura morta, limpa
        await supabase.from('profiles').update({ push_subscription: null }).eq('id', r.user_id);
      }
      results.push({ user: r.user_id, type: r.reminder_type, ok: false, status });
    }
  }

  return new Response(JSON.stringify({ at: { hour, minute }, sent: results.length, results }), {
    headers: { 'content-type': 'application/json' },
  });
});
