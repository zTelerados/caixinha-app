import { type ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  variant?: 'default' | 'inverted' | 'soft';
  className?: string;
}

const VARIANTS = {
  default: 'bg-card border border-border',
  inverted: 'border border-ink',
  soft: 'bg-cardSoft border border-border',
};

export function Card({ children, variant = 'default', className = '' }: CardProps) {
  const v = VARIANTS[variant];
  const extra =
    variant === 'inverted'
      ? 'text-bg'
      : '';
  const style =
    variant === 'inverted'
      ? { background: 'var(--c-ink)', color: 'var(--c-bg)' }
      : undefined;
  return (
    <div className={`rounded-2xl ${v} ${extra} ${className}`} style={style}>
      {children}
    </div>
  );
}
