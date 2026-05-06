'use client';

import { useEffect, useState } from 'react';

interface ConfettiProps {
  burstKey: number | null;  // muda para disparar
  duration?: number;
}

const COLORS = [
  'var(--c-indigo)',
  'var(--c-indigo-hi)',
  'var(--c-gold)',
  'var(--c-emerald)',
  'var(--c-coral)',
];

interface Particle {
  id: number;
  x: number;
  y: number;
  rot: number;
  color: string;
  shape: 'square' | 'circle' | 'rect';
  size: number;
}

export function Confetti({ burstKey, duration = 1400 }: ConfettiProps) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (burstKey === null) return;
    const next: Particle[] = Array.from({ length: 32 }, (_, i) => {
      const angle = (Math.random() - 0.5) * Math.PI * 1.6;
      const dist = 140 + Math.random() * 220;
      return {
        id: Date.now() + i,
        x: Math.sin(angle) * dist,
        y: -Math.cos(angle) * dist - 60,
        rot: (Math.random() - 0.5) * 720,
        color: COLORS[i % COLORS.length],
        shape: (['square', 'circle', 'rect'] as const)[i % 3],
        size: 6 + Math.random() * 8,
      };
    });
    setParticles(next);
    setActive(true);
    const t = setTimeout(() => setActive(false), duration);
    return () => clearTimeout(t);
  }, [burstKey, duration]);

  if (!active) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[80] flex items-center justify-center">
      <div className="relative">
        {particles.map(p => (
          <span
            key={p.id}
            className="absolute left-0 top-0 animate-confetti"
            style={{
              ['--cx' as string]: `${p.x}px`,
              ['--cy' as string]: `${p.y}px`,
              ['--cr' as string]: `${p.rot}deg`,
              width: p.size,
              height: p.shape === 'rect' ? p.size * 0.4 : p.size,
              background: p.color,
              borderRadius: p.shape === 'circle' ? '50%' : 1,
            }}
          />
        ))}
      </div>
    </div>
  );
}
