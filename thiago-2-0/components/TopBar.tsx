import { Sigil } from './Sigil';
import { Wordmark } from './Wordmark';
import { daysUntilTarget } from '@/lib/utils';
import { levelFromXp } from '@/lib/constants';

interface TopBarProps {
  xp: number;
  streak: number;
}

export function TopBar({ xp, streak }: TopBarProps) {
  const { level } = levelFromXp(xp);
  const days = daysUntilTarget();
  return (
    <header
      className="glass-blur sticky top-0 z-40 border-b border-border/80 safe-top"
      style={{ background: 'oklch(0.985 0.005 80 / 0.78)' }}
    >
      <div className="mx-auto flex max-w-md items-center justify-between gap-3 px-5 py-3">
        <div className="flex items-center gap-2.5">
          <Sigil size={28} />
          <Wordmark size="sm" />
        </div>
        <div className="flex items-center gap-2">
          <span
            className="rounded-full px-2.5 py-1 label-mono-tight"
            style={{
              background: 'var(--c-indigo-soft)',
              color: 'var(--c-indigo)',
              border: '1px solid oklch(0.85 0.06 270 / 0.5)',
            }}
          >
            NV.{level} · {xp}xp
          </span>
          {streak > 0 && (
            <span
              className="rounded-full px-2.5 py-1 label-mono-tight"
              style={{
                background: 'var(--c-coral-soft)',
                color: 'var(--c-coral)',
              }}
            >
              {streak}d
            </span>
          )}
          <span className="label-mono-tight text-muted">T-{days}d</span>
        </div>
      </div>
    </header>
  );
}
