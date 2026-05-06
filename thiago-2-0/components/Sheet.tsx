'use client';

import { useEffect, type ReactNode } from 'react';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

export function Sheet({ open, onClose, title, children }: SheetProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center">
      <button
        aria-label="Fechar"
        onClick={onClose}
        className="absolute inset-0 bg-ink/30 backdrop-blur-sm animate-fadeIn"
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-md animate-slideUp rounded-t-3xl border border-border bg-card shadow-2xl"
      >
        <div className="flex justify-center pt-2.5">
          <span className="h-1 w-10 rounded-full" style={{ background: 'var(--c-border-hi)' }} />
        </div>
        {title && (
          <header className="px-6 pt-3 pb-4">
            <h2 className="font-display text-3xl text-ink">{title}</h2>
          </header>
        )}
        <div className="px-6 pb-8 safe-bottom">{children}</div>
      </div>
    </div>
  );
}
