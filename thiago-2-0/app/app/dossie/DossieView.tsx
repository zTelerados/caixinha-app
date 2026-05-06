'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import { Profile, ReminderRow, WeightLogRow } from '@/lib/types';
import { Card } from '@/components/Card';
import { Sheet } from '@/components/Sheet';
import { createClient } from '@/lib/supabase/client';
import { usePush } from '@/lib/push';
import {
  REMINDER_TYPES, START_WEIGHT, TARGET_WEIGHT, START_HBA1C, TARGET_HBA1C,
} from '@/lib/constants';
import { todayISO, fmtDate } from '@/lib/utils';

const WeightChart = dynamic(() => import('./WeightChart').then(m => m.WeightChart), {
  ssr: false,
  loading: () => <div className="h-44 rounded-2xl bg-cardSoft animate-pulse" />,
});

interface Props {
  profile: Profile | null;
  weights: WeightLogRow[];
  reminders: ReminderRow[];
  userEmail: string;
}

const PRINCIPLES = [
  'um por dia, sessenta no total.',
  'glicemia é diário; cirurgia é horizonte.',
  'voto por voto, vira identidade.',
  'sem pular insulina. nunca.',
];

export function DossieView({ profile: initialProfile, weights: initialWeights, reminders: initialReminders, userEmail }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [profile, setProfile] = useState(initialProfile);
  const [weights, setWeights] = useState(initialWeights);
  const [reminders, setReminders] = useState(initialReminders);
  const [editOpen, setEditOpen] = useState(false);
  const [weightOpen, setWeightOpen] = useState(false);
  const [editName, setEditName] = useState(profile?.display_name ?? '');
  const [editHba1c, setEditHba1c] = useState(profile?.current_hba1c ?? START_HBA1C);
  const [newWeight, setNewWeight] = useState(profile?.current_weight ?? START_WEIGHT);
  const [weightDate, setWeightDate] = useState(todayISO());
  const push = usePush();

  async function saveProfile() {
    if (!profile) return;
    const updates = { display_name: editName || null, current_hba1c: editHba1c };
    const { data } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', profile.id)
      .select()
      .single();
    if (data) setProfile(data as Profile);
    setEditOpen(false);
  }

  async function saveWeight() {
    if (!profile) return;
    const { data } = await supabase
      .from('weight_log')
      .upsert(
        { user_id: profile.id, weight: newWeight, date: weightDate },
        { onConflict: 'user_id,date' },
      )
      .select()
      .single();
    if (data) {
      setWeights(prev => {
        const filtered = prev.filter(w => w.date !== weightDate);
        return [...filtered, data as WeightLogRow].sort((a, b) => a.date.localeCompare(b.date));
      });
    }
    await supabase.from('profiles').update({ current_weight: newWeight }).eq('id', profile.id);
    setProfile(p => p ? { ...p, current_weight: newWeight } : p);
    setWeightOpen(false);
  }

  async function toggleReminder(r: ReminderRow) {
    const enable = !r.enabled;
    setReminders(prev => prev.map(x => x.id === r.id ? { ...x, enabled: enable } : x));
    if (enable && push.state !== 'subscribed' && push.state !== 'unsupported') {
      await push.subscribe();
    }
    await supabase.from('reminders').update({ enabled: enable }).eq('id', r.id);
  }

  async function changeReminderTime(r: ReminderRow, hour: number, minute: number) {
    setReminders(prev => prev.map(x => x.id === r.id ? { ...x, hour, minute } : x));
    await supabase.from('reminders').update({ hour, minute }).eq('id', r.id);
  }

  async function logout() {
    await supabase.auth.signOut();
    router.replace('/');
    router.refresh();
  }

  const startISO = profile?.start_date ?? todayISO();
  const dayOne = fmtDate(startISO);
  const totalRecords = weights.length + (profile?.total_xp ?? 0);

  return (
    <section className="px-5 pt-4 pb-12 space-y-6 animate-fadeIn">
      <header className="pt-3">
        <span className="label-mono">personagem · sheet</span>
        <h1 className="font-display text-5xl text-ink leading-[0.95] mt-1">
          dossiê<span className="font-italic-display text-indigo">.</span>
        </h1>
        <p className="font-sans text-muted mt-2">{userEmail}</p>
      </header>

      {/* Identidade */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <span className="label-mono">identidade</span>
          <button onClick={() => setEditOpen(true)} className="label-mono-tight text-indigo">editar →</button>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-4">
          <div>
            <div className="label-mono">nome</div>
            <div className="font-display text-3xl text-ink mt-1 leading-none">
              {profile?.display_name || 'sem nome'}
            </div>
          </div>
          <div>
            <div className="label-mono">XP total</div>
            <div className="editorial-num text-3xl text-ink mt-1">{profile?.total_xp ?? 0}</div>
          </div>
          <div>
            <div className="label-mono">início</div>
            <div className="font-mono-tech text-base text-ink mt-1">{dayOne}</div>
          </div>
          <div>
            <div className="label-mono">streak máx · atual</div>
            <div className="font-mono-tech text-base text-ink mt-1">{profile?.streak ?? 0}d</div>
          </div>
        </div>
      </Card>

      {/* Métricas */}
      <Card className="p-6">
        <div className="label-mono mb-3">métricas · vault</div>
        <div className="grid grid-cols-2 gap-y-4 gap-x-6">
          <div>
            <div className="label-mono">peso atual</div>
            <div className="editorial-num text-4xl mt-1">{profile?.current_weight ?? START_WEIGHT}<span className="font-mono-tech text-xs text-muted ml-1">kg</span></div>
            <div className="label-mono-tight text-muted mt-1">→ {TARGET_WEIGHT} kg</div>
          </div>
          <div>
            <div className="label-mono">glicada</div>
            <div className="editorial-num text-4xl mt-1">{(profile?.current_hba1c ?? START_HBA1C).toFixed(1)}</div>
            <div className="label-mono-tight text-muted mt-1">→ {TARGET_HBA1C.toFixed(1)}</div>
          </div>
        </div>
        <button
          onClick={() => setWeightOpen(true)}
          className="mt-5 inline-flex w-full items-center justify-between rounded-full px-5 py-3"
          style={{ background: 'var(--c-cardSoft)', color: 'var(--c-ink)', border: '1px solid var(--c-border)' }}
        >
          <span className="label-mono-tight">registrar peso de hoje</span>
          <span aria-hidden className="font-italic-display text-xl">+</span>
        </button>
      </Card>

      {/* Evolução de peso */}
      <Card className="p-5">
        <div className="label-mono mb-2">evolução · peso</div>
        <WeightChart weights={weights} />
      </Card>

      {/* Princípios */}
      <Card variant="soft" className="p-6">
        <div className="label-mono mb-3">princípios</div>
        <ul className="space-y-3">
          {PRINCIPLES.map((p, i) => (
            <li key={p} className="flex items-baseline gap-3">
              <span className="font-mono-tech text-xs text-muted">{String(i+1).padStart(2, '0')}</span>
              <span className="font-italic-display text-2xl text-ink leading-tight">{p}</span>
            </li>
          ))}
        </ul>
      </Card>

      {/* Lembretes Push */}
      <Card className="p-6">
        <div className="label-mono mb-1">lembretes · push</div>
        <p className="text-xs text-muted mt-1">
          {push.state === 'unsupported'
            ? 'Seu navegador não suporta notificações push.'
            : 'Notificações exigem o app instalado na home (iOS 16.4+).'}
        </p>
        {push.needsHomescreen && push.state !== 'subscribed' && (
          <p className="text-xs mt-2" style={{ color: 'var(--c-coral)' }}>
            Abra Safari → Compartilhar → Adicionar à Tela de Início, e abra dali.
          </p>
        )}
        <div className="mt-4 space-y-3">
          {REMINDER_TYPES.map(rt => {
            const r = reminders.find(x => x.reminder_type === rt.id);
            if (!r) return null;
            return (
              <div key={r.id} className="flex items-center gap-3">
                <span className="flex-1 font-sans text-ink">{rt.label}</span>
                <input
                  type="time"
                  value={`${String(r.hour).padStart(2, '0')}:${String(r.minute).padStart(2, '0')}`}
                  onChange={e => {
                    const [h, m] = e.target.value.split(':').map(Number);
                    if (!isNaN(h) && !isNaN(m)) changeReminderTime(r, h, m);
                  }}
                  className="rounded-lg border border-border bg-card px-2 py-1 font-mono-tech text-sm"
                />
                <button
                  onClick={() => toggleReminder(r)}
                  className="relative h-6 w-11 rounded-full transition-colors"
                  style={{ background: r.enabled ? 'var(--c-indigo)' : 'var(--c-border-hi)' }}
                  aria-label={`${r.enabled ? 'desativar' : 'ativar'} ${rt.label}`}
                >
                  <span
                    className="absolute top-0.5 h-5 w-5 rounded-full bg-bg shadow-sm transition-all"
                    style={{ left: r.enabled ? '22px' : '2px' }}
                  />
                </button>
              </div>
            );
          })}
        </div>
      </Card>

      <button
        onClick={logout}
        className="w-full inline-flex items-center justify-between rounded-full px-6 py-4 transition-opacity"
        style={{ background: 'var(--c-card)', color: 'var(--c-coral)', border: '1px solid var(--c-border)' }}
      >
        <span className="label-mono-tight" style={{ color: 'var(--c-coral)' }}>sair da sessão</span>
        <span aria-hidden className="font-italic-display text-xl">↩</span>
      </button>

      <p className="text-center label-mono-tight text-dim pt-2">
        ◆ {totalRecords} registros · vault Thiago 2.0 ◆
      </p>

      {/* Sheet editar perfil */}
      <Sheet open={editOpen} onClose={() => setEditOpen(false)} title="editar dossiê">
        <div className="space-y-4">
          <label className="block">
            <span className="label-mono">nome</span>
            <input
              type="text"
              value={editName}
              onChange={e => setEditName(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-border bg-card px-4 py-3 font-sans text-ink"
              placeholder="Thiago"
            />
          </label>
          <label className="block">
            <span className="label-mono">glicada · hba1c</span>
            <input
              type="number"
              step="0.1"
              min="4"
              max="15"
              value={editHba1c}
              onChange={e => setEditHba1c(parseFloat(e.target.value))}
              className="mt-1.5 w-full rounded-xl border border-border bg-card px-4 py-3 editorial-num text-3xl text-ink"
            />
          </label>
          <button
            onClick={saveProfile}
            className="w-full inline-flex items-center justify-between rounded-full px-6 py-4"
            style={{ background: 'var(--c-ink)', color: 'var(--c-bg)' }}
          >
            <span className="label-mono-tight" style={{ color: 'var(--c-bg)' }}>salvar</span>
            <span aria-hidden className="font-italic-display text-xl">→</span>
          </button>
        </div>
      </Sheet>

      {/* Sheet peso */}
      <Sheet open={weightOpen} onClose={() => setWeightOpen(false)} title="novo peso">
        <div className="space-y-4">
          <label className="block">
            <span className="label-mono">peso · kg</span>
            <input
              type="number"
              step="0.1"
              min="40"
              max="200"
              value={newWeight}
              onChange={e => setNewWeight(parseFloat(e.target.value))}
              autoFocus
              className="mt-1.5 w-full rounded-xl border border-border bg-card px-4 py-4 editorial-num text-4xl text-ink"
            />
          </label>
          <label className="block">
            <span className="label-mono">data</span>
            <input
              type="date"
              value={weightDate}
              onChange={e => setWeightDate(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-border bg-card px-4 py-3 font-sans text-ink"
            />
          </label>
          <button
            onClick={saveWeight}
            className="w-full inline-flex items-center justify-between rounded-full px-6 py-4"
            style={{ background: 'var(--c-ink)', color: 'var(--c-bg)' }}
          >
            <span className="label-mono-tight" style={{ color: 'var(--c-bg)' }}>salvar peso</span>
            <span aria-hidden className="font-italic-display text-xl">→</span>
          </button>
        </div>
      </Sheet>
    </section>
  );
}
