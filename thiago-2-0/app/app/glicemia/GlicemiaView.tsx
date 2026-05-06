'use client';

import { useMemo, useState, useTransition } from 'react';
import dynamic from 'next/dynamic';
import { GlucoseReading } from '@/lib/types';
import { Card } from '@/components/Card';
import { Sheet } from '@/components/Sheet';
import { useSound } from '@/lib/sound';
import { createClient } from '@/lib/supabase/client';
import { GLUCOSE_CONTEXTS, GLUCOSE_TARGET_HIGH, GLUCOSE_TARGET_LOW } from '@/lib/constants';
import { todayISO, nowTimeISO, fmtDate } from '@/lib/utils';

const Chart = dynamic(() => import('./GlucoseChart').then(m => m.GlucoseChart), {
  ssr: false,
  loading: () => <div className="h-56 rounded-2xl bg-cardSoft animate-pulse" />,
});

interface Props {
  initialReadings: GlucoseReading[];
}

export function GlicemiaView({ initialReadings }: Props) {
  const [readings, setReadings] = useState<GlucoseReading[]>(initialReadings);
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const [context, setContext] = useState('jejum');
  const [date, setDate] = useState(todayISO());
  const [time, setTime] = useState(nowTimeISO());
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const { play } = useSound();

  const tir = useMemo(() => {
    if (readings.length === 0) return { low: 0, inRange: 0, high: 0 };
    let low = 0, inR = 0, high = 0;
    for (const r of readings) {
      if (r.value < GLUCOSE_TARGET_LOW) low++;
      else if (r.value > GLUCOSE_TARGET_HIGH) high++;
      else inR++;
    }
    const t = readings.length;
    return {
      low: Math.round((low / t) * 100),
      inRange: Math.round((inR / t) * 100),
      high: Math.round((high / t) * 100),
    };
  }, [readings]);

  const avg = useMemo(() => {
    if (readings.length === 0) return null;
    return Math.round(readings.reduce((s, r) => s + r.value, 0) / readings.length);
  }, [readings]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const v = parseInt(value, 10);
    if (isNaN(v) || v < 20 || v > 600) {
      setError('Valor fora da faixa (20–600 mg/dL).');
      return;
    }
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError('Sessão expirada.'); return; }

    const optimistic: GlucoseReading = {
      id: `tmp-${Date.now()}`,
      user_id: user.id,
      value: v,
      context,
      reading_date: date,
      reading_time: time + ':00',
      created_at: new Date().toISOString(),
    };
    setReadings(prev => [optimistic, ...prev]);
    play('glucose');
    setOpen(false);
    setValue('');

    startTransition(async () => {
      const { data, error } = await supabase
        .from('glucose_readings')
        .insert({
          user_id: user.id,
          value: v,
          context,
          reading_date: date,
          reading_time: time + ':00',
        })
        .select()
        .single();
      if (error) {
        setReadings(prev => prev.filter(r => r.id !== optimistic.id));
        setError(error.message);
      } else if (data) {
        setReadings(prev => prev.map(r => r.id === optimistic.id ? (data as GlucoseReading) : r));
      }
    });
  }

  async function remove(id: string) {
    const prev = readings;
    setReadings(p => p.filter(r => r.id !== id));
    const supabase = createClient();
    const { error } = await supabase.from('glucose_readings').delete().eq('id', id);
    if (error) setReadings(prev);
  }

  return (
    <section className="px-5 pt-4 pb-12 space-y-5 animate-fadeIn">
      <header className="pt-3">
        <span className="label-mono">monitoramento</span>
        <h1 className="font-display text-5xl text-ink leading-[0.95] mt-1">
          glicemia<span className="font-italic-display text-indigo">.</span>
        </h1>
        <p className="font-sans text-muted mt-2">últimos 14 dias · meta 70–180 mg/dL</p>
      </header>

      {/* Métricas TIR */}
      <Card className="p-5">
        <div className="label-mono mb-3">tempo no alvo</div>
        <div className="flex h-3 w-full overflow-hidden rounded-full" style={{ background: 'var(--c-border)' }}>
          <div style={{ width: `${tir.low}%`, background: 'var(--c-coral)' }} />
          <div style={{ width: `${tir.inRange}%`, background: 'var(--c-emerald)' }} />
          <div style={{ width: `${tir.high}%`, background: 'var(--c-gold)' }} />
        </div>
        <div className="mt-3 grid grid-cols-3 text-center divide-x divide-border">
          <div>
            <div className="editorial-num text-3xl" style={{ color: 'var(--c-coral)' }}>{tir.low}%</div>
            <div className="label-mono-tight text-muted mt-1">baixo</div>
          </div>
          <div>
            <div className="editorial-num text-3xl" style={{ color: 'var(--c-emerald)' }}>{tir.inRange}%</div>
            <div className="label-mono-tight text-muted mt-1">no alvo</div>
          </div>
          <div>
            <div className="editorial-num text-3xl" style={{ color: 'var(--c-gold)' }}>{tir.high}%</div>
            <div className="label-mono-tight text-muted mt-1">alto</div>
          </div>
        </div>
        {avg !== null && (
          <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
            <span className="label-mono">média 14d</span>
            <span className="editorial-num text-3xl">{avg}<span className="font-mono-tech text-sm text-muted ml-1">mg/dL</span></span>
          </div>
        )}
      </Card>

      {/* Gráfico */}
      <Card className="p-5">
        <div className="label-mono mb-3">curva · 14 dias</div>
        <Chart readings={readings} />
      </Card>

      {/* Botão registrar */}
      <button
        onClick={() => { setDate(todayISO()); setTime(nowTimeISO()); setOpen(true); }}
        className="w-full inline-flex items-center justify-between rounded-full px-6 py-4 transition-opacity"
        style={{ background: 'var(--c-ink)', color: 'var(--c-bg)' }}
      >
        <span className="label-mono-tight" style={{ color: 'var(--c-bg)' }}>registrar leitura</span>
        <span aria-hidden className="font-italic-display text-2xl">+</span>
      </button>

      {/* Histórico */}
      <div>
        <div className="label-mono mb-3 px-1">histórico</div>
        <div className="space-y-2">
          {readings.length === 0 && (
            <Card className="p-5 text-center">
              <div className="font-italic-display text-2xl text-muted">nada registrado ainda.</div>
              <div className="label-mono-tight text-muted mt-2">comece pela primeira leitura do dia.</div>
            </Card>
          )}
          {readings.map(r => {
            const tone = r.value < GLUCOSE_TARGET_LOW
              ? 'coral' : r.value > GLUCOSE_TARGET_HIGH
              ? 'gold' : 'emerald';
            const toneVar =
              tone === 'coral' ? 'var(--c-coral)'
              : tone === 'gold' ? 'var(--c-gold)'
              : 'var(--c-emerald)';
            return (
              <Card key={r.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span
                    className="inline-block h-10 w-1 rounded-full"
                    style={{ background: toneVar }}
                  />
                  <div>
                    <div className="editorial-num text-3xl text-ink leading-none">{r.value}</div>
                    <div className="label-mono-tight text-muted mt-1.5">{r.context}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono-tech text-sm text-ink">{r.reading_time.slice(0,5)}</div>
                  <div className="label-mono-tight text-muted mt-1">{fmtDate(r.reading_date)}</div>
                  <button
                    onClick={() => remove(r.id)}
                    className="label-mono-tight text-coral mt-1.5"
                  >
                    apagar
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      <Sheet open={open} onClose={() => setOpen(false)} title="nova leitura">
        <form onSubmit={submit} className="space-y-4">
          <label className="block">
            <span className="label-mono">valor · mg/dL</span>
            <input
              type="number"
              required
              autoFocus
              inputMode="numeric"
              min={20}
              max={600}
              value={value}
              onChange={e => setValue(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-border bg-card px-4 py-4 editorial-num text-4xl text-ink"
              placeholder="120"
            />
          </label>
          <label className="block">
            <span className="label-mono">contexto</span>
            <select
              value={context}
              onChange={e => setContext(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-border bg-card px-4 py-3 font-sans text-ink"
            >
              {GLUCOSE_CONTEXTS.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="label-mono">data</span>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-border bg-card px-4 py-3 font-sans text-ink"
              />
            </label>
            <label className="block">
              <span className="label-mono">hora</span>
              <input
                type="time"
                value={time}
                onChange={e => setTime(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-border bg-card px-4 py-3 font-sans text-ink"
              />
            </label>
          </div>
          {error && (
            <div
              className="rounded-xl px-4 py-3 text-sm"
              style={{ background: 'var(--c-coral-soft)', color: 'var(--c-coral)' }}
            >
              {error}
            </div>
          )}
          <button
            type="submit"
            className="w-full inline-flex items-center justify-between rounded-full px-6 py-4"
            style={{ background: 'var(--c-ink)', color: 'var(--c-bg)' }}
          >
            <span className="label-mono-tight" style={{ color: 'var(--c-bg)' }}>salvar leitura</span>
            <span aria-hidden className="font-italic-display text-2xl">→</span>
          </button>
        </form>
      </Sheet>
    </section>
  );
}
