'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/Card';
import { AnimatedCheck } from '@/components/AnimatedCheck';
import { Confetti } from '@/components/Confetti';
import { ProgressBar } from '@/components/ProgressBar';
import { useSound } from '@/lib/sound';
import { usePush } from '@/lib/push';
import { createClient } from '@/lib/supabase/client';
import {
  QUESTS, QUEST_GROUP_META, MILESTONES, MAX_DAILY_XP, totalXpForToday,
} from '@/lib/constants';
import { todayISO } from '@/lib/utils';

interface ProfileLite {
  total_xp: number;
  streak: number;
  last_streak_date: string | null;
  start_date: string;
}

interface Props {
  profile: ProfileLite | null;
  todayCompleted: string[];
  unlockedMilestones: string[];
}

const TONE_FOR_GROUP: Record<string, 'coral' | 'indigo' | 'emerald'> = {
  'crítico': 'coral',
  'monitor': 'indigo',
  'físico': 'emerald',
};

export function QuestsView({ profile, todayCompleted, unlockedMilestones }: Props) {
  const [completed, setCompleted] = useState<Set<string>>(new Set(todayCompleted));
  const [unlocked, setUnlocked] = useState<Set<string>>(new Set(unlockedMilestones));
  const [confettiKey, setConfettiKey] = useState<number | null>(null);
  const [pushPrompted, setPushPrompted] = useState(false);
  const { play } = useSound();
  const push = usePush();

  // Disparar pedido de push na primeira visita à aba
  useEffect(() => {
    const flag = sessionStorage.getItem('t20-push-prompt');
    if (!flag && push.state === 'idle' && !pushPrompted) {
      setPushPrompted(true);
      sessionStorage.setItem('t20-push-prompt', '1');
    }
  }, [push.state, pushPrompted]);

  const xpToday = useMemo(() => totalXpForToday(completed), [completed]);

  const grouped = useMemo(() => {
    const map: Record<string, typeof QUESTS> = { 'crítico': [], 'monitor': [], 'físico': [] };
    for (const q of QUESTS) map[q.group].push(q);
    return map;
  }, []);

  async function toggle(questId: string) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const isCompleted = completed.has(questId);
    const next = new Set(completed);
    const today = todayISO();

    if (isCompleted) {
      next.delete(questId);
      setCompleted(next);
      play('uncheck');
      const { error } = await supabase
        .from('daily_quests')
        .delete()
        .eq('user_id', user.id)
        .eq('date', today)
        .eq('quest_id', questId);
      if (error) {
        next.add(questId);
        setCompleted(new Set(next));
      } else {
        const quest = QUESTS.find(q => q.id === questId);
        if (quest) {
          const newXp = Math.max(0, (profile?.total_xp ?? 0) - quest.xp);
          await supabase.from('profiles').update({ total_xp: newXp }).eq('id', user.id);
        }
      }
    } else {
      next.add(questId);
      setCompleted(next);
      play('check');
      const quest = QUESTS.find(q => q.id === questId);
      if (!quest) return;

      const { error } = await supabase
        .from('daily_quests')
        .insert({ user_id: user.id, date: today, quest_id: questId });
      if (error) {
        next.delete(questId);
        setCompleted(new Set(next));
        return;
      }

      const newXp = (profile?.total_xp ?? 0) + quest.xp;
      // Streak: se completou todas as quests críticas hoje e ainda não bateu o dia
      const allCritical = QUESTS.filter(q => q.group === 'crítico')
        .every(q => next.has(q.id));
      let updates: Record<string, unknown> = { total_xp: newXp };
      if (allCritical && profile?.last_streak_date !== today) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const ystISO = yesterday.toISOString().slice(0, 10);
        const newStreak = profile?.last_streak_date === ystISO ? (profile.streak ?? 0) + 1 : 1;
        updates = { ...updates, streak: newStreak, last_streak_date: today };
      }
      await supabase.from('profiles').update(updates).eq('id', user.id);
      if (profile) profile.total_xp = newXp;
    }
  }

  // Detectar milestones (visual; o usuário marca/atinge milestones manualmente abaixo)
  async function unlockMilestone(id: string) {
    if (unlocked.has(id)) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const ms = MILESTONES.find(m => m.id === id);
    if (!ms) return;

    const next = new Set(unlocked);
    next.add(id);
    setUnlocked(next);
    setConfettiKey(Date.now());
    play('levelup');

    const { error } = await supabase
      .from('achievements')
      .insert({ user_id: user.id, milestone_id: id });
    if (error) {
      next.delete(id);
      setUnlocked(new Set(next));
      setConfettiKey(null);
      return;
    }
    const newXp = (profile?.total_xp ?? 0) + ms.xp;
    await supabase.from('profiles').update({ total_xp: newXp }).eq('id', user.id);
    if (profile) profile.total_xp = newXp;
  }

  const dailyPct = (xpToday / MAX_DAILY_XP) * 100;

  return (
    <section className="px-5 pt-4 pb-12 space-y-6 animate-fadeIn">
      <Confetti burstKey={confettiKey} />

      <header className="pt-3">
        <span className="label-mono">rituais · do dia</span>
        <h1 className="font-display text-5xl text-ink leading-[0.95] mt-1">
          quests<span className="font-italic-display text-indigo">.</span>
        </h1>
        <p className="font-sans text-muted mt-2">
          marque o que você fez hoje. cada toque é um voto pelo Thiago de junho de 27.
        </p>
      </header>

      {/* Push permission banner */}
      {pushPrompted && push.state !== 'subscribed' && push.state !== 'unsupported' && (
        <Card className="p-5">
          <div className="label-mono mb-2">lembretes · push</div>
          <p className="font-italic-display text-xl text-ink leading-tight">
            Receba alertas de insulina e glicemia direto no relógio.
          </p>
          {push.needsHomescreen && (
            <p className="text-xs text-muted mt-2">
              Push só funciona com o app instalado na sua home, iOS 16.4+. Se não funcionar,
              abra Safari, toque Compartilhar, Adicionar à Tela de Início, e abra dali.
            </p>
          )}
          <button
            onClick={push.subscribe}
            className="mt-4 inline-flex w-full items-center justify-between rounded-full px-5 py-3"
            style={{ background: 'var(--c-indigo)', color: 'var(--c-bg)' }}
          >
            <span className="label-mono-tight" style={{ color: 'var(--c-bg)' }}>
              {push.state === 'requesting' ? 'autorizando…' : 'autorizar push'}
            </span>
            <span aria-hidden className="font-italic-display text-xl">→</span>
          </button>
        </Card>
      )}

      {/* Daily XP card */}
      <Card className="p-6">
        <div className="flex items-baseline justify-between">
          <div>
            <div className="label-mono">progresso · hoje</div>
            <div className="editorial-num text-6xl mt-1">
              {xpToday}<span className="font-italic-display text-2xl text-muted">/{MAX_DAILY_XP}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="label-mono">streak</div>
            <div className="editorial-num text-5xl mt-1 text-coral">{profile?.streak ?? 0}<span className="font-italic-display text-xl text-muted">d</span></div>
          </div>
        </div>
        <div className="mt-5">
          <ProgressBar pct={dailyPct} tone="indigo" height={6} glow />
        </div>
      </Card>

      {/* Grupos de quests */}
      {(['crítico', 'monitor', 'físico'] as const).map(group => {
        const meta = QUEST_GROUP_META[group];
        const tone = TONE_FOR_GROUP[group];
        const items = grouped[group];
        const groupDone = items.filter(q => completed.has(q.id)).length;
        return (
          <section key={group}>
            <header className="flex items-baseline justify-between mb-3 px-1">
              <div className="flex items-center gap-2">
                <span style={{ color: `var(--c-${tone})` }} className="text-base">{meta.sigil}</span>
                <span className="label-mono">{meta.label}</span>
              </div>
              <span className="font-mono-tech text-xs text-muted">{groupDone}/{items.length}</span>
            </header>
            <Card className="divide-y divide-border overflow-hidden">
              {items.map(q => {
                const isDone = completed.has(q.id);
                return (
                  <button
                    key={q.id}
                    onClick={() => toggle(q.id)}
                    className="w-full flex items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-cardSoft"
                  >
                    <AnimatedCheck checked={isDone} tone={tone} />
                    <span
                      className="flex-1 font-sans text-base transition-colors"
                      style={{
                        color: isDone ? 'var(--c-muted)' : 'var(--c-ink)',
                        textDecoration: isDone ? 'line-through' : 'none',
                        textDecorationColor: 'var(--c-border-hi)',
                      }}
                    >
                      {q.label}
                    </span>
                    <span
                      className="font-mono-tech text-xs"
                      style={{ color: isDone ? `var(--c-${tone})` : 'var(--c-muted)' }}
                    >
                      +{q.xp}xp
                    </span>
                  </button>
                );
              })}
            </Card>
          </section>
        );
      })}

      {/* Milestones */}
      <section>
        <div className="label-mono mb-3 px-1">milestones · jornada</div>
        <ol className="relative pl-6">
          <span
            className="absolute left-2 top-2 bottom-2 w-px"
            style={{ background: 'var(--c-border-hi)' }}
          />
          {MILESTONES.map(m => {
            const ok = unlocked.has(m.id);
            return (
              <li key={m.id} className="relative pb-6">
                <span
                  className="absolute -left-[18px] top-1 inline-block h-3 w-3 rounded-full border-2"
                  style={{
                    background: ok ? 'var(--c-gold)' : 'var(--c-bg)',
                    borderColor: ok ? 'var(--c-gold)' : 'var(--c-border-hi)',
                  }}
                />
                <Card variant={ok ? 'soft' : 'default'} className="p-4">
                  <div className="flex items-baseline justify-between">
                    <span className="label-mono">M{m.month} · mês {m.month}</span>
                    <span className="font-mono-tech text-xs" style={{ color: ok ? 'var(--c-gold)' : 'var(--c-muted)' }}>
                      +{m.xp}xp
                    </span>
                  </div>
                  <p className="font-italic-display text-2xl mt-1 leading-tight"
                     style={{ color: ok ? 'var(--c-ink)' : 'var(--c-inkSoft)' }}>
                    {m.title}
                  </p>
                  {!ok && (
                    <button
                      onClick={() => unlockMilestone(m.id)}
                      className="mt-3 label-mono-tight text-indigo"
                    >
                      marcar como atingido →
                    </button>
                  )}
                  {ok && (
                    <div className="mt-3 label-mono-tight" style={{ color: 'var(--c-gold)' }}>
                      ◆ desbloqueado
                    </div>
                  )}
                </Card>
              </li>
            );
          })}
        </ol>
      </section>
    </section>
  );
}
