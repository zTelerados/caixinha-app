'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/app',          label: 'status',   key: 'status' },
  { href: '/app/glicemia', label: 'glicemia', key: 'glicemia' },
  { href: '/app/quests',   label: 'quests',   key: 'quests' },
  { href: '/app/dossie',   label: 'dossiê',   key: 'dossie' },
];

export function BottomNav() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/app') return pathname === '/app';
    return pathname?.startsWith(href);
  };

  return (
    <nav
      className="glass-blur fixed bottom-0 left-0 right-0 z-40 border-t border-border safe-bottom"
      style={{ background: 'oklch(0.985 0.005 80 / 0.82)' }}
    >
      <div className="mx-auto flex max-w-md items-stretch justify-around px-2 pt-2">
        {TABS.map(tab => {
          const active = isActive(tab.href);
          return (
            <Link
              key={tab.key}
              href={tab.href}
              className="relative flex flex-1 flex-col items-center gap-1.5 py-2 transition-opacity"
              prefetch
            >
              <span
                className="h-[2px] w-6 rounded-full transition-all duration-300"
                style={{
                  background: active ? 'var(--c-indigo)' : 'transparent',
                  transform: active ? 'scaleX(1)' : 'scaleX(0.4)',
                }}
              />
              <span
                className="label-mono"
                style={{
                  color: active ? 'var(--c-ink)' : 'var(--c-muted)',
                  letterSpacing: '0.22em',
                  fontSize: '10.5px',
                }}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
