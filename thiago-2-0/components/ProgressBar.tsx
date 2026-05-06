interface ProgressBarProps {
  pct: number;          // 0..100
  tone?: 'indigo' | 'emerald' | 'gold' | 'coral';
  height?: number;
  glow?: boolean;
}

const TONE = {
  indigo:  'var(--c-indigo)',
  emerald: 'var(--c-emerald)',
  gold:    'var(--c-gold)',
  coral:   'var(--c-coral)',
};

export function ProgressBar({ pct, tone = 'indigo', height = 6, glow = false }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <div
      className="relative w-full overflow-hidden rounded-full"
      style={{ height, background: 'var(--c-border)' }}
    >
      <div
        className={glow && clamped >= 100 ? 'animate-pulseGlow' : ''}
        style={{
          width: `${clamped}%`,
          height: '100%',
          background: TONE[tone],
          borderRadius: 9999,
          transition: 'width 0.7s cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      />
    </div>
  );
}
