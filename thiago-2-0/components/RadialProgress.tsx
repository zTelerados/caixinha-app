interface RadialProgressProps {
  pct: number;        // 0..100
  size?: number;
  stroke?: number;
  label?: string;
  sublabel?: string;
  tone?: 'indigo' | 'emerald' | 'gold';
}

const TONE = {
  indigo:  'var(--c-indigo)',
  emerald: 'var(--c-emerald)',
  gold:    'var(--c-gold)',
};

export function RadialProgress({
  pct,
  size = 220,
  stroke = 14,
  label,
  sublabel,
  tone = 'indigo',
}: RadialProgressProps) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, pct));
  const offset = c * (1 - clamped / 100);

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="var(--c-border)"
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={TONE[tone]}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.7s cubic-bezier(0.22, 1, 0.36, 1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
        {label && (
          <div className="editorial-num text-5xl">{label}</div>
        )}
        {sublabel && (
          <div className="label-mono mt-2">{sublabel}</div>
        )}
      </div>
    </div>
  );
}
