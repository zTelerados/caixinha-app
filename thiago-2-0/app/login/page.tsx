'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Sigil } from '@/components/Sigil';
import { Wordmark } from '@/components/Wordmark';

type Mode = 'password' | 'magic';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [mode, setMode] = useState<Mode>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [tab, setTab] = useState<'signin' | 'signup'>('signin');

  async function onPasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      if (tab === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.replace('/app');
        router.refresh();
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setInfo('Conta criada. Verifique o email para confirmar (se exigido) e faça login.');
        setTab('signin');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro inesperado.');
    } finally {
      setLoading(false);
    }
  }

  async function onMagicSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/app` },
      });
      if (error) throw error;
      setInfo('Link mágico enviado para o seu email.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro inesperado.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-dvh bg-bg flex flex-col px-6 py-10 safe-top safe-bottom">
      <Link href="/" className="inline-flex items-center gap-2.5">
        <Sigil size={28} />
        <Wordmark size="sm" />
      </Link>

      <section className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full">
        <div className="label-mono mb-3">acesso · vault</div>
        <h1 className="font-display text-5xl text-ink leading-[0.95]">
          entre na sua <span className="font-italic-display text-indigo">jornada</span>
        </h1>
        <p className="font-sans text-muted mt-3">
          seus dados ficam salvos no Supabase e sincronizam entre todos os dispositivos.
        </p>

        <div className="mt-8 flex gap-1 rounded-full p-1" style={{ background: 'var(--c-bg-elev)', border: '1px solid var(--c-border)' }}>
          {(['password', 'magic'] as const).map(m => (
            <button
              key={m}
              type="button"
              onClick={() => { setMode(m); setError(null); setInfo(null); }}
              className="flex-1 rounded-full py-2 label-mono-tight transition-colors"
              style={{
                background: mode === m ? 'var(--c-ink)' : 'transparent',
                color: mode === m ? 'var(--c-bg)' : 'var(--c-muted)',
              }}
            >
              {m === 'password' ? 'senha' : 'magic link'}
            </button>
          ))}
        </div>

        {mode === 'password' && (
          <div className="mt-4 flex gap-1 text-sm">
            {(['signin', 'signup'] as const).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => { setTab(t); setError(null); setInfo(null); }}
                className="px-3 py-1 label-mono-tight transition-colors"
                style={{ color: tab === t ? 'var(--c-ink)' : 'var(--c-muted)', borderBottom: tab === t ? '1px solid var(--c-ink)' : '1px solid transparent' }}
              >
                {t === 'signin' ? 'entrar' : 'criar conta'}
              </button>
            ))}
          </div>
        )}

        <form
          onSubmit={mode === 'password' ? onPasswordSubmit : onMagicSubmit}
          className="mt-6 space-y-3"
        >
          <label className="block">
            <span className="label-mono">email</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-border bg-card px-4 py-3 font-sans text-ink"
              placeholder="voce@exemplo.com"
            />
          </label>
          {mode === 'password' && (
            <label className="block">
              <span className="label-mono">senha</span>
              <input
                type="password"
                required
                autoComplete={tab === 'signin' ? 'current-password' : 'new-password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-border bg-card px-4 py-3 font-sans text-ink"
                placeholder="••••••••"
                minLength={6}
              />
            </label>
          )}

          {error && (
            <div
              className="rounded-xl px-4 py-3 text-sm"
              style={{ background: 'var(--c-coral-soft)', color: 'var(--c-coral)' }}
              role="alert"
            >
              {error}
            </div>
          )}
          {info && (
            <div
              className="rounded-xl px-4 py-3 text-sm"
              style={{ background: 'var(--c-emerald-soft)', color: 'var(--c-emerald)' }}
              role="status"
            >
              {info}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-between rounded-full px-6 py-4 transition-opacity disabled:opacity-50"
            style={{ background: 'var(--c-ink)', color: 'var(--c-bg)' }}
          >
            <span className="label-mono-tight" style={{ color: 'var(--c-bg)' }}>
              {loading ? 'enviando…' : mode === 'magic' ? 'enviar link' : tab === 'signin' ? 'entrar' : 'criar conta'}
            </span>
            <span aria-hidden className="font-italic-display text-2xl">→</span>
          </button>
        </form>
      </section>
    </main>
  );
}
