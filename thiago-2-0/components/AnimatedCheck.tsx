'use client';

import { useEffect, useRef } from 'react';

interface AnimatedCheckProps {
  checked: boolean;
  size?: number;
  tone?: 'indigo' | 'emerald' | 'coral';
}

const TONE_VAR = {
  indigo:  'var(--c-indigo)',
  emerald: 'var(--c-emerald)',
  coral:   'var(--c-coral)',
};

const TONE_SOFT = {
  indigo:  'var(--c-indigo-soft)',
  emerald: 'var(--c-emerald-soft)',
  coral:   'var(--c-coral-soft)',
};

export function AnimatedCheck({ checked, size = 22, tone = 'indigo' }: AnimatedCheckProps) {
  const pathRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    const p = pathRef.current;
    if (!p) return;
    const len = p.getTotalLength();
    p.style.strokeDasharray = `${len}`;
    p.style.strokeDashoffset = checked ? '0' : `${len}`;
    p.style.transition = 'stroke-dashoffset 320ms cubic-bezier(0.22, 1, 0.36, 1)';
  }, [checked]);

  return (
    <span
      className="relative inline-flex items-center justify-center rounded-full transition-colors"
      style={{
        width: size,
        height: size,
        background: checked ? TONE_VAR[tone] : TONE_SOFT[tone],
        border: `1px solid ${checked ? TONE_VAR[tone] : 'var(--c-border-hi)'}`,
      }}
    >
      <svg
        width={size * 0.55}
        height={size * 0.55}
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden
      >
        <path
          ref={pathRef}
          d="M3 8.5 L6.5 12 L13 4.5"
          stroke={checked ? 'var(--c-bg)' : 'transparent'}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
