'use client';

import { useEffect, useState } from 'react';

export function ServiceWorkerRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('[Caixinha] SW registered:', reg.scope);
        })
        .catch((err) => {
          console.error('[Caixinha] SW registration failed:', err);
        });
    }
  }, []);

  return null;
}

export function InstallBanner() {
  const [show, setShow] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already in standalone mode (installed)
    const standalone = window.matchMedia('(display-mode: standalone)').matches
      || (window.navigator as any).standalone === true;
    setIsStandalone(standalone);

    if (standalone) return;

    // Check if iOS Safari
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isSafari = /Safari/.test(navigator.userAgent) && !/CriOS|Chrome/.test(navigator.userAgent);

    // Check if dismissed before
    const dismissed = sessionStorage.getItem('caixinha-install-dismissed');

    if (isIOS && isSafari && !dismissed) {
      // Show after a short delay
      const timer = setTimeout(() => setShow(true), 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  if (!show || isStandalone) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 animate-slide-up">
      <div className="bg-caixa-card border border-caixa-border rounded-xl p-4 shadow-2xl max-w-md mx-auto">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 text-2xl">📲</div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-caixa-text">Instale o Caixinha no iPhone</p>
            <p className="text-xs text-caixa-muted mt-1">
              Toque em <span className="inline-block">⎙</span> (compartilhar) e depois em &quot;Adicionar a Tela de Inicio&quot;
            </p>
          </div>
          <button
            onClick={() => {
              setShow(false);
              sessionStorage.setItem('caixinha-install-dismissed', '1');
            }}
            className="flex-shrink-0 text-caixa-muted hover:text-caixa-text transition-colors p-1"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
