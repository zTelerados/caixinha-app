'use client';

import Link from 'next/link';
import { Profile, GlucoseReading, WeightLogRow } from '@/lib/types';
import { RadialProgress } from '@/components/RadialProgress';
import { ProgressBar } from '@/components/ProgressBar';
import { Card } from '@/components/Card';
import {
  START_HBA1C, TARGET_HBA1C, START_WEIGHT, TARGET_WEIGHT,
  SPLIT, totalXpForToday, MAX_DAILY_XP, levelFromXp,
} from '@/lib/constants';
import { daysUntilTarget, progressPct, fmtDate } from '@/lib/utils';

interface StatusViewProps {
  profile: Profile | null;
  weights: WeightLogRow[];
  todayGlucose: GlucoseReading[];
  completedQuestIds: string[];
}

export function StatusView({ profile, weights, todayGlucose, completedQuestIds }: StatusViewProps) {
  const xpToday = totalXpForToday(new Set(completedQuestIds));
  const xpTotal = profile?.total_xp ?? 0;
  const { level, current, needed, pct: lvlPct } = levelFromXp(xpTotal);
  const days = daysUntilTarget();
  const startDate = profile?.start_date ?? new Date().toISOString();
  const journeyPct = progressPct(startDate);

  const currentWeight = weights[0]?.weight ?? profile?.current_weight ?? START_WEIGHT;
  const weightProgress = ((START_WEIGHT - currentWeight) / (START_WEIGHT - TARGET_WEIGHT)) * 100;

  const currentHba1c = profile?.current_hba1c ?? START_HBA1C;
  const hba1cProgress = ((START_HBA1C - currentHba1c) / (START_HBA1C - TARGET_HBA1C)) * 100;

  const today = new Date();
  const split = SPLIT[today.getDay()];

  const lastGlucose = todayGlucose[0];

  return (
    <section className="px-5 pt-4 pb-12 space-y-6 animate-fadeIn">
      {/* Hero editorial */}
      <header className="pt-3">
        <div className="flex items-center justify-between">
          <span className="label-mono">capítulo · {Math.max(1, Math.ceil((Date.now() - new Date(startDate).getTime()) / (1000*60*60*24*30)))}</span>
          <span className="label-mono">{fmtDate(today)}</span>
        </div>
        <h1 className="font-display text-5xl text-ink leading-[0.95] mt-2">
          rumo à <span className="font-italic-display text-indigo">mesa</span>,
          <br />
          T-{days} dias.
        </h1>
        <p className="font-sans text-muted mt-2">
          {profile?.display_name ? `${profile.display_name}, ` : ''}cada dia é um capítulo. um por dia, sessenta no total.
        </p>
      </header>

      {/* Jornada radial */}
      <Card className="px-6 py-7 flex flex-col items-center">
        <div className="label-mono mb-1">jornada · 2025 → 2027</div>
        <RadialProgress
          pct={journeyPct}
          size={220}
          stroke={12}
          label={`${journeyPct.toFixed(1)}%`}
          sublabel={`${days} dias restantes`}
        />
        <div className="w-full mt-6 grid grid-cols-3 divide-x divide-border text-center">
          <div className="px-2">
            <div className="label-mono">início</div>
            <div className="font-mono-tech text-sm mt-1 text-ink">{fmtDate(startDate)}</div>
          </div>
          <div className="px-2">
            <div className="label-mono">hoje</div>
            <div className="font-mono-tech text-sm mt-1 text-ink">{fmtDate(today)}</div>
          </div>
          <div className="px-2">
            <div className="label-mono">cirurgia</div>
            <div className="font-mono-tech text-sm mt-1 text-ink">jun/27</div>
          </div>
        </div>
      </Card>

      {/* XP do dia */}
      <Card className="p-6">
        <div className="flex items-baseline justify-between">
          <div>
            <div className="label-mono">xp · hoje</div>
            <div className="editorial-num text-5xl mt-1">
              {xpToday}<span className="font-italic-display text-2xl text-muted">/{MAX_DAILY_XP}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="label-mono">nível</div>
            <div className="editorial-num text-5xl mt-1 text-indigo">{level}</div>
          </div>
        </div>
        <div className="mt-5">
          <div className="flex items-center justify-between mb-2">
            <span className="label-mono-tight text-muted">prog · próximo nível</span>
            <span className="font-mono-tech text-xs text-ink">{current}/{needed}</span>
          </div>
          <ProgressBar pct={lvlPct} tone="indigo" height={6} glow />
        </div>
        <Link
          href="/app/quests"
          className="mt-6 inline-flex w-full items-center justify-between rounded-full px-5 py-3 transition-opacity"
          style={{ background: 'var(--c-indigo-soft)', color: 'var(--c-indigo)' }}
        >
          <span className="label-mono-tight" style={{ letterSpacing: '0.24em' }}>completar quests</span>
          <span aria-hidden className="font-italic-display text-xl">→</span>
        </Link>
      </Card>

      {/* Vitals — tratamentos visuais distintos */}
      <div className="grid grid-cols-2 gap-3">
        {/* Glicada — card branco grande, número editorial */}
        <Card className="p-5 col-span-2">
          <div className="flex items-baseline justify-between">
            <span className="label-mono">glicada · hba1c</span>
            <span className="label-mono-tight text-muted">meta 7.5</span>
          </div>
          <div className="mt-2 flex items-baseline gap-3">
            <span className="editorial-num text-7xl text-ink">{currentHba1c.toFixed(1)}</span>
            <span className="font-italic-display text-2xl text-muted">de {START_HBA1C.toFixed(1)}</span>
          </div>
          <div className="mt-4">
            <ProgressBar pct={Math.max(0, Math.min(100, hba1cProgress))} tone="emerald" height={4} />
          </div>
        </Card>

        {/* Peso — soft card com número compacto */}
        <Card variant="soft" className="p-5">
          <div className="label-mono">peso</div>
          <div className="mt-2">
            <span className="editorial-num text-5xl text-ink">{currentWeight}</span>
            <span className="font-mono-tech text-sm text-muted ml-1">kg</span>
          </div>
          <div className="mt-3 label-mono-tight text-muted">→ {TARGET_WEIGHT} kg</div>
          <div className="mt-2">
            <ProgressBar pct={Math.max(0, Math.min(100, weightProgress))} tone="indigo" height={3} />
          </div>
        </Card>

        {/* Glicemia última — soft */}
        <Card variant="soft" className="p-5">
          <div className="label-mono">última glicemia</div>
          {lastGlucose ? (
            <>
              <div className="mt-2">
                <span className="editorial-num text-5xl text-ink">{lastGlucose.value}</span>
                <span className="font-mono-tech text-sm text-muted ml-1">mg/dL</span>
              </div>
              <div className="mt-3 label-mono-tight text-muted">{lastGlucose.reading_time.slice(0,5)} · {lastGlucose.context}</div>
            </>
          ) : (
            <>
              <div className="mt-2">
                <span className="editorial-num text-5xl text-dim">—</span>
              </div>
              <Link href="/app/glicemia" className="mt-3 inline-block label-mono-tight text-indigo">
                registrar →
              </Link>
            </>
          )}
        </Card>
      </div>

      {/* Treino do dia — card preto editorial */}
      <Card variant="inverted" className="p-6">
        <div className="flex items-baseline justify-between">
          <span className="label-mono" style={{ color: 'oklch(0.78 0.014 60)' }}>treino · {today.toLocaleDateString('pt-BR', { weekday: 'short' })}</span>
          <span className="label-mono-tight" style={{ color: 'var(--c-gold)' }}>{split.tag}</span>
        </div>
        <h2 className="font-display text-4xl mt-3 leading-tight" style={{ color: 'var(--c-bg)' }}>
          {split.desc.split(',').map((part, i) => (
            <span key={i}>
              {i === 0 ? part : <span className="font-italic-display">,{part}</span>}
            </span>
          ))}
        </h2>
        <div className="mt-6 flex gap-2">
          {[0,1,2,3,4,5,6].map(d => (
            <span
              key={d}
              className="flex-1 h-1 rounded-full"
              style={{
                background: d === today.getDay()
                  ? 'var(--c-gold)'
                  : 'oklch(0.32 0.014 60)',
              }}
            />
          ))}
        </div>
      </Card>

      {/* Princípio em itálico */}
      <blockquote className="px-2 py-6 text-center">
        <p className="font-italic-display text-3xl text-inkSoft leading-snug">
          “acumular sessenta dias é virar uma <span className="text-indigo">pessoa</span>.”
        </p>
      </blockquote>
    </section>
  );
}
